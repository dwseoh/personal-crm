from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.database import supabase_client
from app.core.rate_limiter import limiter, RateLimits
from app.auth import get_current_user
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any
from collections import defaultdict

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ---------------------------
# Data Fetching Helpers
# ---------------------------

def fetch_dashboard_data(user_id: str):
    """Fetch all necessary data in parallel-ready blocks"""
    try:
        # 1. Fetch all contacts
        contacts_response = supabase_client.table("contacts") \
            .select("id, name, created_at, importance, company, current_role, location") \
            .eq("user_id", user_id) \
            .execute()
        contacts = contacts_response.data or []

        # 2. Fetch all groups
        groups_response = supabase_client.table("groups") \
            .select("id, name, label_color") \
            .eq("user_id", user_id) \
            .execute()
        groups = groups_response.data or []

        # 3. Fetch all contact-group associations
        # We need this to link contacts to groups
        # Note: We can't filter by user_id directly on junction table usually, 
        # but RLS should handle it if set up, or we filter by known contact IDs.
        # Ideally, we'd filter by contact_id in (contacts_ids), but for now let's assume RLS or fetch all.
        # To be safe and efficient without RLS assumptions, let's fetch based on contact IDs if possible,
        # but Supabase 'in' query might be limited.
        # Let's assume the junction table has RLS or we just fetch all and filter in memory if needed (risk of data leak if no RLS? No, usually RLS applies).
        # Prudent approach: Fetch all contact_groups for the contacts we just fetched.
        contact_ids = [c["id"] for c in contacts]
        contact_groups = []
        if contact_ids:
            # Batch fetch if too many? For personal CRM, likely fine.
            cg_response = supabase_client.table("contact_groups") \
                .select("contact_id, group_id") \
                .in_("contact_id", contact_ids) \
                .execute()
            contact_groups = cg_response.data or []

        # 4. Fetch interactions (we need all for "top contact" stats, and recent for timeline)
        # Optimizing: Fetch only minimal fields
        interactions_response = supabase_client.table("interactions") \
            .select("id, contact_id, happened_at") \
            .eq("user_id", user_id) \
            .execute()
        interactions = interactions_response.data or []

        return contacts, groups, contact_groups, interactions

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard data: {str(e)}")


def parse_datetime(dt_str: str) -> datetime:
    """Helper to parse datetime string and ensure it is offset-aware (UTC)."""
    try:
        dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        # Fallback for other formats if necessary, or return current time to avoid crash
        # For now, assume ISO format from Supabase
        return datetime.now(timezone.utc)


# ---------------------------
# In-Memory Calculation Functions
# ---------------------------

def calculate_kpis(contacts: List[Dict], groups: List[Dict], interactions: List[Dict], contact_groups: List[Dict]) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)
    start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    # 1. Total Contacts
    total_contacts = len(contacts)

    # 2. New Contacts & Trend
    recent_contacts_created = [c for c in contacts if parse_datetime(c["created_at"]) >= thirty_days_ago]
    previous_contacts_created = [c for c in contacts if sixty_days_ago <= parse_datetime(c["created_at"]) < thirty_days_ago]
    
    recent_count = len(recent_contacts_created)
    previous_count = len(previous_contacts_created)
    
    if previous_count > 0:
        trend = int(((recent_count - previous_count) / previous_count) * 100)
    else:
        trend = 100 if recent_count > 0 else 0

    # 3. Total Groups
    total_groups_count = len(groups)

    # 4. Largest Group (Top Group)
    group_counts = defaultdict(int)
    for cg in contact_groups:
        group_counts[cg["group_id"]] += 1
    
    top_group = None
    if groups and group_counts:
        # Map group ID to details
        group_map = {g["id"]: g for g in groups}
        top_group_id = max(group_counts, key=group_counts.get)
        if top_group_id in group_map:
            tg = group_map[top_group_id]
            top_group = {
                "name": tg["name"],
                "count": group_counts[top_group_id],
                "color": tg["label_color"]
            }

    # 5. Average Importance
    total_importance = sum(c.get("importance", 0) or 0 for c in contacts if c.get("importance") is not None)
    avg_importance = round(total_importance / total_contacts, 1) if total_contacts > 0 else 0.0

    # 6. High Priority Contacts
    high_priority_count = sum(1 for c in contacts if (c.get("importance") or 0) >= 4)

    # 7. Interactions This Month
    interactions_this_month_count = sum(1 for i in interactions if parse_datetime(i["happened_at"]) >= start_of_month)

    # 8. Top Contact by Interactions
    interaction_counts = defaultdict(int)
    for i in interactions:
        if i.get("contact_id"):
            interaction_counts[i["contact_id"]] += 1
    
    top_contact = None
    if interaction_counts:
        top_contact_id = max(interaction_counts, key=interaction_counts.get)
        # Find contact name
        contact_name = next((c["name"] for c in contacts if c["id"] == top_contact_id), "Unknown")
        top_contact = {
            "name": contact_name,
            "count": interaction_counts[top_contact_id]
        }

    return {
        "total_contacts": total_contacts,
        "new_contacts": recent_count,
        "new_contacts_trend": trend,
        "total_groups": total_groups_count,
        "top_group": top_group,
        "avg_importance": avg_importance,
        "high_priority_count": high_priority_count,
        "interactions_this_month": interactions_this_month_count,
        "top_contact": top_contact
    }


def aggregate_charts(contacts: List[Dict], groups: List[Dict], interactions: List[Dict], contact_groups: List[Dict]) -> Dict[str, Any]:
    # 1. Group Distribution
    group_counts = defaultdict(int)
    for cg in contact_groups:
        group_counts[cg["group_id"]] += 1
    
    group_distribution = []
    for g in groups:
        count = group_counts.get(g["id"], 0)
        if count > 0:
            group_distribution.append({
                "name": g["name"],
                "value": count,
                "color": g["label_color"]
            })
    group_distribution.sort(key=lambda x: x["value"], reverse=True)

    # 2. Importance Distribution
    importance_counts = defaultdict(int)
    for c in contacts:
        imp = c.get("importance", 1) or 1
        importance_counts[imp] += 1
    
    importance_distribution = [
        {"importance": level, "count": importance_counts.get(level, 0)}
        for level in range(1, 6)
    ]

    # 3. Location Distribution
    location_counts = defaultdict(int)
    for c in contacts:
        loc = c.get("location")
        if loc and loc.strip():
            location_counts[loc] += 1
    
    sorted_locations = sorted(location_counts.items(), key=lambda x: x[1], reverse=True)
    top_locations = [{"location": loc, "count": count} for loc, count in sorted_locations[:10]]
    
    other_count = sum(count for _, count in sorted_locations[10:])
    if other_count > 0:
        top_locations.append({"location": "Other", "count": other_count})

    # 4. Role Distribution
    role_counts = defaultdict(int)
    for c in contacts:
        role = c.get("current_role")
        if role and role.strip():
            role_counts[role] += 1
    
    sorted_roles = sorted(role_counts.items(), key=lambda x: x[1], reverse=True)
    role_distribution = [{"role": role, "count": count} for role, count in sorted_roles[:10]]

    # 5. Interactions Timeline (Last 30 days)
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    
    date_counts = defaultdict(int)
    for i in interactions:
        ts = parse_datetime(i["happened_at"])
        if ts >= thirty_days_ago:
            date_str = ts.strftime("%Y-%m-%d")
            date_counts[date_str] += 1
    
    timeline = []
    for i in range(30):
        d = thirty_days_ago + timedelta(days=i)
        date_str = d.strftime("%Y-%m-%d")
        timeline.append({
            "date": date_str,
            "count": date_counts.get(date_str, 0)
        })

    return {
        "group_distribution": group_distribution,
        "importance_distribution": importance_distribution,
        "location_distribution": top_locations,
        "role_distribution": role_distribution,
        "interactions_timeline": timeline
    }


def calculate_insights(contacts: List[Dict], contact_groups: List[Dict]) -> Dict[str, Any]:
    # 1. Role Clusters
    role_groups = defaultdict(list)
    for c in contacts:
        if c.get("current_role"):
            role_groups[c["current_role"]].append(c["name"])
    
    role_clusters = [
        {"role": role, "count": len(names), "contacts": names[:3]}
        for role, names in role_groups.items() if len(names) >= 2
    ]
    role_clusters.sort(key=lambda x: x["count"], reverse=True)

    # 2. Company Clusters
    company_groups = defaultdict(lambda: {"names": [], "importances": []})
    for c in contacts:
        if c.get("company"):
            company_groups[c["company"]]["names"].append(c["name"])
            company_groups[c["company"]]["importances"].append(c.get("importance", 1) or 1)
    
    company_clusters = []
    for company, data in company_groups.items():
        if len(data["names"]) >= 2:
            avg_imp = sum(data["importances"]) / len(data["importances"])
            company_clusters.append({
                "company": company,
                "count": len(data["names"]),
                "avg_importance": avg_importance,
                "contacts": data["names"][:3]
            })
    company_clusters.sort(key=lambda x: (x["count"], x["avg_importance"]), reverse=True)

    # 3. Location Clusters
    location_groups = defaultdict(list)
    for c in contacts:
        if c.get("location"):
            location_groups[c["location"]].append(c["name"])
    
    location_clusters = [
        {"location": loc, "count": len(names), "contacts": names[:3]}
        for loc, names in location_groups.items() if len(names) >= 3
    ]
    location_clusters.sort(key=lambda x: x["count"], reverse=True)

    return {
        "role_clusters": role_clusters[:5],
        "company_clusters": company_clusters[:5],
        "location_clusters": location_clusters[:5]
    }


def calculate_sidebar_stats(contacts: List[Dict], groups: List[Dict], contact_groups: List[Dict]) -> Dict[str, Any]:
    # 1. Top Companies
    company_counts = defaultdict(int)
    for c in contacts:
        if c.get("company"):
            company_counts[c["company"]] += 1
    top_companies = [
        {"company": k, "count": v} 
        for k, v in sorted(company_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    # 2. Top Roles
    role_counts = defaultdict(int)
    for c in contacts:
        if c.get("current_role"):
            role_counts[c["current_role"]] += 1
    top_roles = [
        {"role": k, "count": v} 
        for k, v in sorted(role_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    # 3. Recent Contacts
    # Sort contacts by created_at desc
    sorted_contacts = sorted(
        contacts, 
        key=lambda x: x["created_at"], 
        reverse=True
    )
    recent_contacts = [
        {
            "id": c["id"],
            "name": c["name"],
            "created_at": c["created_at"],
            "importance": c.get("importance", 1)
        }
        for c in sorted_contacts[:5]
    ]

    # 4. Growing Groups (Simplified to just size for now as we don't have historical group data easily available without complex queries)
    # The original query checked created_at of contacts within groups. We can replicate that.
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    # Map contact_id to created_at
    contact_date_map = {c["id"]: parse_datetime(c["created_at"]) for c in contacts}
    
    group_growth = defaultdict(int)
    for cg in contact_groups:
        c_date = contact_date_map.get(cg["contact_id"])
        if c_date and c_date >= thirty_days_ago:
            group_growth[cg["group_id"]] += 1
            
    growing_groups = []
    group_map = {g["id"]: g for g in groups}
    for gid, count in group_growth.items():
        if gid in group_map:
            g = group_map[gid]
            growing_groups.append({
                "name": g["name"],
                "color": g["label_color"],
                "new_count": count
            })
    growing_groups.sort(key=lambda x: x["new_count"], reverse=True)

    # 5. Network Health
    total = len(contacts)
    if total == 0:
        network_health = {"score": 0, "completeness": 0, "balance": 0, "coverage": 0}
    else:
        # Completeness
        complete = sum(1 for c in contacts if c.get("company") and c.get("current_role") and c.get("location"))
        completeness = int((complete / total) * 100)
        
        # Balance
        imp_counts = defaultdict(int)
        for c in contacts:
            imp_counts[c.get("importance", 1) or 1] += 1
        avg_per_level = total / 5
        variance = sum((count - avg_per_level) ** 2 for count in imp_counts.values()) / 5
        std_dev = variance ** 0.5
        max_std_dev = total / 2
        balance = int((1 - (std_dev / max_std_dev)) * 100) if max_std_dev > 0 else 100
        
        # Coverage
        grouped_contact_ids = set(cg["contact_id"] for cg in contact_groups)
        coverage = int((len(grouped_contact_ids) / total) * 100)
        
        score = int((completeness * 0.4) + (balance * 0.3) + (coverage * 0.3))
        network_health = {
            "score": score,
            "completeness": completeness,
            "balance": balance,
            "coverage": coverage
        }

    return {
        "top_companies": top_companies,
        "top_roles": top_roles,
        "recent_contacts": recent_contacts,
        "growing_groups": growing_groups[:5],
        "network_health": network_health,
        "priority_contacts": [] 
    }


# ---------------------------
# Main Endpoint
# ---------------------------

@router.get("/analytics")
@limiter.limit(RateLimits.GENERAL)
def get_dashboard_analytics(request: Request, user=Depends(get_current_user)):
    """
    Get all dashboard analytics data efficiently.
    Fetches raw data in bulk and aggregates in memory to minimize DB calls.
    """
    try:
        user_id = user.id
        
        # Fetch all data in 4 main parallel-ready calls
        contacts, groups, contact_groups, interactions = fetch_dashboard_data(user_id)
        
        # Process data in memory
        kpis = calculate_kpis(contacts, groups, interactions, contact_groups)
        charts = aggregate_charts(contacts, groups, interactions, contact_groups)
        insights = calculate_insights(contacts, contact_groups)
        sidebar = calculate_sidebar_stats(contacts, groups, contact_groups)
        
        return {
            "kpis": kpis,
            "charts": charts,
            "insights": insights,
            "sidebar": sidebar
        }

    except Exception as e:
        print(f"Dashboard analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
