from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.database import supabase_client
from app.core.rate_limiter import limiter, RateLimits
from app.auth import get_current_user
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ---------------------------
# KPI Calculation Functions
# ---------------------------

def calculate_total_contacts(user_id: str) -> int:
    """Calculate total number of contacts for a user"""
    try:
        response = supabase_client.table("contacts") \
            .select("id", count="exact") \
            .eq("user_id", user_id) \
            .execute()
        return response.count if response.count is not None else 0
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating total contacts: {str(e)}")


def calculate_new_contacts(user_id: str) -> Dict[str, int]:
    """Calculate new contacts in last 30 days and trend"""
    try:
        # Calculate date 30 days ago
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        sixty_days_ago = datetime.now(timezone.utc) - timedelta(days=60)
        
        # Get contacts from last 30 days
        recent_response = supabase_client.table("contacts") \
            .select("id", count="exact") \
            .eq("user_id", user_id) \
            .gte("created_at", thirty_days_ago.isoformat()) \
            .execute()
        
        recent_count = recent_response.count if recent_response.count is not None else 0
        
        # Get contacts from 30-60 days ago for trend calculation
        previous_response = supabase_client.table("contacts") \
            .select("id", count="exact") \
            .eq("user_id", user_id) \
            .gte("created_at", sixty_days_ago.isoformat()) \
            .lt("created_at", thirty_days_ago.isoformat()) \
            .execute()
        
        previous_count = previous_response.count if previous_response.count is not None else 0
        
        # Calculate trend percentage
        if previous_count > 0:
            trend = int(((recent_count - previous_count) / previous_count) * 100)
        else:
            trend = 100 if recent_count > 0 else 0
        
        return {
            "count": recent_count,
            "trend": trend
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating new contacts: {str(e)}")


def find_top_group(user_id: str) -> Dict[str, Any] | None:
    """Find the group with the most contacts"""
    try:
        # Get all groups for the user
        groups_response = supabase_client.table("groups") \
            .select("id, name, label_color") \
            .eq("user_id", user_id) \
            .execute()
        
        if not groups_response.data:
            return None
        
        # Count contacts for each group
        top_group = None
        max_count = 0
        
        for group in groups_response.data:
            contact_count_response = supabase_client.table("contact_groups") \
                .select("contact_id", count="exact") \
                .eq("group_id", group["id"]) \
                .execute()
            
            count = contact_count_response.count if contact_count_response.count is not None else 0
            
            if count > max_count:
                max_count = count
                top_group = {
                    "name": group["name"],
                    "count": count,
                    "color": group["label_color"]
                }
        
        return top_group
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding top group: {str(e)}")


def calculate_average_importance(user_id: str) -> float:
    """Calculate average importance across all contacts"""
    try:
        response = supabase_client.table("contacts") \
            .select("importance") \
            .eq("user_id", user_id) \
            .execute()
        
        if not response.data:
            return 0.0
        
        importances = [contact["importance"] for contact in response.data if contact.get("importance") is not None]
        
        if not importances:
            return 0.0
        
        return round(sum(importances) / len(importances), 1)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating average importance: {str(e)}")


def count_high_priority_contacts(user_id: str) -> int:
    """Count contacts with importance >= 4"""
    try:
        response = supabase_client.table("contacts") \
            .select("id", count="exact") \
            .eq("user_id", user_id) \
            .gte("importance", 4) \
            .execute()
        
        return response.count if response.count is not None else 0
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error counting high priority contacts: {str(e)}")


def calculate_total_groups(user_id: str) -> int:
    """Calculate total number of groups for a user"""
    try:
        response = supabase_client.table("groups") \
            .select("id", count="exact") \
            .eq("user_id", user_id) \
            .execute()
        
        return response.count if response.count is not None else 0
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating total groups: {str(e)}")


# ---------------------------
# Chart Data Aggregation Functions
# ---------------------------

def aggregate_group_distribution(user_id: str) -> List[Dict[str, Any]]:
    """Aggregate contact distribution across groups"""
    try:
        # Get all groups for the user
        groups_response = supabase_client.table("groups") \
            .select("id, name, label_color") \
            .eq("user_id", user_id) \
            .execute()
        
        if not groups_response.data:
            return []
        
        distribution = []
        for group in groups_response.data:
            # Count contacts in this group
            contact_count_response = supabase_client.table("contact_groups") \
                .select("contact_id", count="exact") \
                .eq("group_id", group["id"]) \
                .execute()
            
            count = contact_count_response.count if contact_count_response.count is not None else 0
            
            if count > 0:  # Only include groups with contacts
                distribution.append({
                    "name": group["name"],
                    "value": count,
                    "color": group["label_color"]
                })
        
        return sorted(distribution, key=lambda x: x["value"], reverse=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error aggregating group distribution: {str(e)}")


def aggregate_importance_distribution(user_id: str) -> List[Dict[str, Any]]:
    """Aggregate contact distribution by importance level"""
    try:
        response = supabase_client.table("contacts") \
            .select("importance") \
            .eq("user_id", user_id) \
            .execute()
        
        if not response.data:
            return []
        
        # Count contacts at each importance level (1-5)
        importance_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        
        for contact in response.data:
            importance = contact.get("importance", 1)
            if importance in importance_counts:
                importance_counts[importance] += 1
        
        # Convert to list format
        distribution = [
            {"importance": level, "count": count}
            for level, count in sorted(importance_counts.items())
        ]
        
        return distribution
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error aggregating importance distribution: {str(e)}")


def aggregate_location_distribution(user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Aggregate contact distribution by location (top N)"""
    try:
        response = supabase_client.table("contacts") \
            .select("location") \
            .eq("user_id", user_id) \
            .execute()
        
        if not response.data:
            return []
        
        # Count contacts per location
        location_counts = {}
        for contact in response.data:
            location = contact.get("location")
            if location and location.strip():  # Only count non-empty locations
                location_counts[location] = location_counts.get(location, 0) + 1
        
        # Sort by count and get top N
        sorted_locations = sorted(location_counts.items(), key=lambda x: x[1], reverse=True)
        top_locations = sorted_locations[:limit]
        
        # Calculate "Other" category if there are more locations
        other_count = sum(count for _, count in sorted_locations[limit:])
        
        distribution = [
            {"location": location, "count": count}
            for location, count in top_locations
        ]
        
        if other_count > 0:
            distribution.append({"location": "Other", "count": other_count})
        
        return distribution
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error aggregating location distribution: {str(e)}")


def aggregate_role_distribution(user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Aggregate contact distribution by role (top N)"""
    try:
        response = supabase_client.table("contacts") \
            .select("current_role") \
            .eq("user_id", user_id) \
            .execute()
        
        if not response.data:
            return []
        
        # Count contacts per role
        role_counts = {}
        for contact in response.data:
            role = contact.get("current_role")
            if role and role.strip():  # Only count non-empty roles
                role_counts[role] = role_counts.get(role, 0) + 1
        
        # Sort by count and get top N
        sorted_roles = sorted(role_counts.items(), key=lambda x: x[1], reverse=True)
        top_roles = sorted_roles[:limit]
        
        distribution = [
            {"role": role, "count": count}
            for role, count in top_roles
        ]
        
        return distribution
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error aggregating role distribution: {str(e)}")


# ---------------------------
# Insights Calculation Functions
# ---------------------------

def find_role_clusters(user_id: str, min_contacts: int = 2, limit: int = 5) -> List[Dict[str, Any]]:
    """Find role clusters (roles with 2+ contacts)"""
    try:
        response = supabase_client.table("contacts") \
            .select("id, name, current_role") \
            .eq("user_id", user_id) \
            .execute()
        
        if not response.data:
            return []
        
        # Group contacts by role
        role_groups = {}
        for contact in response.data:
            role = contact.get("current_role")
            if role and role.strip():
                if role not in role_groups:
                    role_groups[role] = []
                role_groups[role].append(contact["name"])
        
        # Filter clusters with minimum contacts and sort by size
        clusters = [
            {
                "role": role,
                "count": len(contacts),
                "contacts": contacts[:3]  # Preview of first 3 contacts
            }
            for role, contacts in role_groups.items()
            if len(contacts) >= min_contacts
        ]
        
        clusters.sort(key=lambda x: x["count"], reverse=True)
        return clusters[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding role clusters: {str(e)}")


def find_company_clusters(user_id: str, min_contacts: int = 2, limit: int = 5) -> List[Dict[str, Any]]:
    """Find company clusters (companies with 2+ contacts)"""
    try:
        response = supabase_client.table("contacts") \
            .select("id, name, company, importance") \
            .eq("user_id", user_id) \
            .execute()
        
        if not response.data:
            return []
        
        # Group contacts by company
        company_groups = {}
        for contact in response.data:
            company = contact.get("company")
            if company and company.strip():
                if company not in company_groups:
                    company_groups[company] = {
                        "contacts": [],
                        "importances": []
                    }
                company_groups[company]["contacts"].append(contact["name"])
                company_groups[company]["importances"].append(contact.get("importance", 1))
        
        # Filter clusters with minimum contacts and calculate average importance
        clusters = []
        for company, data in company_groups.items():
            if len(data["contacts"]) >= min_contacts:
                avg_importance = round(sum(data["importances"]) / len(data["importances"]), 1)
                clusters.append({
                    "company": company,
                    "count": len(data["contacts"]),
                    "avg_importance": avg_importance,
                    "contacts": data["contacts"][:3]  # Preview of first 3 contacts
                })
        
        # Sort by count, then by average importance
        clusters.sort(key=lambda x: (x["count"], x["avg_importance"]), reverse=True)
        return clusters[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding company clusters: {str(e)}")


def find_location_clusters(user_id: str, min_contacts: int = 3, limit: int = 5) -> List[Dict[str, Any]]:
    """Find location clusters (locations with 3+ contacts)"""
    try:
        response = supabase_client.table("contacts") \
            .select("id, name, location") \
            .eq("user_id", user_id) \
            .execute()
        
        if not response.data:
            return []
        
        # Group contacts by location
        location_groups = {}
        for contact in response.data:
            location = contact.get("location")
            if location and location.strip():
                if location not in location_groups:
                    location_groups[location] = []
                location_groups[location].append(contact["name"])
        
        # Filter clusters with minimum contacts and sort by size
        clusters = [
            {
                "location": location,
                "count": len(contacts),
                "contacts": contacts[:3]  # Preview of first 3 contacts
            }
            for location, contacts in location_groups.items()
            if len(contacts) >= min_contacts
        ]
        
        clusters.sort(key=lambda x: x["count"], reverse=True)
        return clusters[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding location clusters: {str(e)}")


def calculate_network_health_score(user_id: str) -> Dict[str, Any]:
    """Calculate network health score based on data completeness, balance, and coverage"""
    try:
        response = supabase_client.table("contacts") \
            .select("id, company, current_role, location, importance") \
            .eq("user_id", user_id) \
            .execute()
        
        if not response.data:
            return {
                "score": 0,
                "completeness": 0,
                "balance": 0,
                "coverage": 0
            }
        
        total_contacts = len(response.data)
        
        # Calculate completeness (percentage of contacts with complete information)
        complete_count = 0
        for contact in response.data:
            if (contact.get("company") and contact.get("current_role") and contact.get("location")):
                complete_count += 1
        completeness = int((complete_count / total_contacts) * 100) if total_contacts > 0 else 0
        
        # Calculate balance (how evenly distributed importance levels are)
        importance_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for contact in response.data:
            importance = contact.get("importance", 1)
            if importance in importance_counts:
                importance_counts[importance] += 1
        
        # Calculate standard deviation of importance distribution
        # Lower deviation = more balanced = better score
        avg_per_level = total_contacts / 5
        variance = sum((count - avg_per_level) ** 2 for count in importance_counts.values()) / 5
        std_dev = variance ** 0.5
        max_std_dev = total_contacts / 2  # Maximum possible std dev
        balance = int((1 - (std_dev / max_std_dev)) * 100) if max_std_dev > 0 else 100
        
        # Calculate coverage (percentage of contacts in groups)
        contacts_in_groups_response = supabase_client.table("contact_groups") \
            .select("contact_id") \
            .execute()
        
        unique_contacts_in_groups = set()
        if contacts_in_groups_response.data:
            for cg in contacts_in_groups_response.data:
                unique_contacts_in_groups.add(cg["contact_id"])
        
        coverage = int((len(unique_contacts_in_groups) / total_contacts) * 100) if total_contacts > 0 else 0
        
        # Calculate overall score (weighted average)
        score = int((completeness * 0.4) + (balance * 0.3) + (coverage * 0.3))
        
        return {
            "score": score,
            "completeness": completeness,
            "balance": balance,
            "coverage": coverage
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating network health score: {str(e)}")


# ---------------------------
# Sidebar Widgets Data Functions
# ---------------------------

def get_top_companies(user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Get top N companies by contact count"""
    try:
        response = supabase_client.table("contacts") \
            .select("company") \
            .eq("user_id", user_id) \
            .execute()
        
        if not response.data:
            return []
        
        # Count contacts per company
        company_counts = {}
        for contact in response.data:
            company = contact.get("company")
            if company and company.strip():
                company_counts[company] = company_counts.get(company, 0) + 1
        
        # Sort and get top N
        sorted_companies = sorted(company_counts.items(), key=lambda x: x[1], reverse=True)
        
        return [
            {"company": company, "count": count}
            for company, count in sorted_companies[:limit]
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting top companies: {str(e)}")


def get_top_roles(user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Get top N roles by contact count"""
    try:
        response = supabase_client.table("contacts") \
            .select("current_role") \
            .eq("user_id", user_id) \
            .execute()
        
        if not response.data:
            return []
        
        # Count contacts per role
        role_counts = {}
        for contact in response.data:
            role = contact.get("current_role")
            if role and role.strip():
                role_counts[role] = role_counts.get(role, 0) + 1
        
        # Sort and get top N
        sorted_roles = sorted(role_counts.items(), key=lambda x: x[1], reverse=True)
        
        return [
            {"role": role, "count": count}
            for role, count in sorted_roles[:limit]
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting top roles: {str(e)}")


def get_fastest_growing_groups(user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Get groups with most contacts added in last 30 days"""
    try:
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        
        # Get all groups for the user
        groups_response = supabase_client.table("groups") \
            .select("id, name, label_color") \
            .eq("user_id", user_id) \
            .execute()
        
        if not groups_response.data:
            return []
        
        growing_groups = []
        for group in groups_response.data:
            # Get contacts added to this group in last 30 days
            # We need to join with contacts to check created_at
            contact_groups_response = supabase_client.table("contact_groups") \
                .select("contact_id") \
                .eq("group_id", group["id"]) \
                .execute()
            
            if not contact_groups_response.data:
                continue
            
            contact_ids = [cg["contact_id"] for cg in contact_groups_response.data]
            
            if contact_ids:
                # Get count of contacts created in last 30 days
                new_contacts_response = supabase_client.table("contacts") \
                    .select("id", count="exact") \
                    .in_("id", contact_ids) \
                    .gte("created_at", thirty_days_ago.isoformat()) \
                    .execute()
                
                new_count = new_contacts_response.count if new_contacts_response.count is not None else 0
                
                if new_count > 0:
                    growing_groups.append({
                        "name": group["name"],
                        "color": group["label_color"],
                        "new_count": new_count
                    })
        
        # Sort by new_count and return top N
        growing_groups.sort(key=lambda x: x["new_count"], reverse=True)
        return growing_groups[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting fastest growing groups: {str(e)}")


def get_recent_contacts(user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Get N most recently created contacts"""
    try:
        response = supabase_client.table("contacts") \
            .select("id, name, created_at, importance") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()
        
        if not response.data:
            return []
        
        return [
            {
                "id": contact["id"],
                "name": contact["name"],
                "created_at": contact["created_at"],
                "importance": contact.get("importance", 1)
            }
            for contact in response.data
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting recent contacts: {str(e)}")


# ---------------------------
# Main Dashboard Endpoint
# ---------------------------

@router.get("/analytics")
@limiter.limit(RateLimits.GENERAL)
def get_dashboard_analytics(request: Request, user=Depends(get_current_user)):
    """
    Get all dashboard analytics data including KPIs, charts, insights, and sidebar widgets.
    
    Returns comprehensive dashboard data in a single API call for optimal performance.
    """
    try:
        user_id = user.id
        
        # Calculate KPIs
        total_contacts = calculate_total_contacts(user_id)
        new_contacts_data = calculate_new_contacts(user_id)
        total_groups = calculate_total_groups(user_id)
        top_group = find_top_group(user_id)
        avg_importance = calculate_average_importance(user_id)
        high_priority_count = count_high_priority_contacts(user_id)
        
        # Aggregate chart data
        group_distribution = aggregate_group_distribution(user_id)
        importance_distribution = aggregate_importance_distribution(user_id)
        location_distribution = aggregate_location_distribution(user_id)
        role_distribution = aggregate_role_distribution(user_id)
        
        # Calculate insights
        role_clusters = find_role_clusters(user_id)
        company_clusters = find_company_clusters(user_id)
        location_clusters = find_location_clusters(user_id)
        network_health = calculate_network_health_score(user_id)
        
        # Get sidebar widgets data
        top_companies = get_top_companies(user_id)
        top_roles = get_top_roles(user_id)
        growing_groups = get_fastest_growing_groups(user_id)
        recent_contacts = get_recent_contacts(user_id)
        
        # Construct response
        dashboard_data = {
            "kpis": {
                "total_contacts": total_contacts,
                "new_contacts": new_contacts_data["count"],
                "new_contacts_trend": new_contacts_data["trend"],
                "total_groups": total_groups,
                "top_group": top_group,
                "avg_importance": avg_importance,
                "high_priority_count": high_priority_count
            },
            "charts": {
                "group_distribution": group_distribution,
                "importance_distribution": importance_distribution,
                "location_distribution": location_distribution,
                "role_distribution": role_distribution
            },
            "insights": {
                "role_clusters": role_clusters,
                "company_clusters": company_clusters,
                "location_clusters": location_clusters
            },
            "sidebar": {
                "top_companies": top_companies,
                "top_roles": top_roles,
                "growing_groups": growing_groups,
                "recent_contacts": recent_contacts,
                "network_health": network_health
            }
        }
        
        return dashboard_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard analytics: {str(e)}")
