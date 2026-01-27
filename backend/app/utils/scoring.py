from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any
from collections import defaultdict

WEIGHT_VECTORS = {
    "default": {
        "days_since_last_interaction": 0.4,
        "total_interactions_30d": 0.2,
        "total_interactions_365d": 0.1,
        "inbound_30d": 0.15,
        "outbound_30d": 0.15
    },
    "career": {
        "days_since_last_interaction": 0.3,
        "total_interactions_30d": 0.2,
        "total_interactions_365d": 0.2,
        "inbound_30d": 0.15,
        "outbound_30d": 0.15
    },
    "social": {
        "days_since_last_interaction": 0.5,
        "total_interactions_30d": 0.15,
        "total_interactions_365d": 0.1,
        "inbound_30d": 0.15,
        "outbound_30d": 0.1
    }
}

def parse_datetime(dt_str: str) -> datetime:
    """Helper to parse datetime string and ensure it is offset-aware (UTC)."""
    try:
        dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return datetime.now(timezone.utc)

def generate_priority_explanation(features: Dict[str, Any]) -> str:
    days = int(features["days_since_last_interaction"])
    total_30d = features["total_interactions_30d"]

    if days > 180:
        return f"No interaction in {days} days"
    if days > 90:
        return f"Last contact {days} days ago"
    if days > 30:
        return f"{days} days since last interaction"
    if total_30d == 0:
        return "No recent activity"
    if total_30d < 2:
        return "Low recent activity"
    return "Maintain regular contact"

def calculate_priority_scores(
    contacts: List[Dict], 
    interactions: List[Dict], 
    limit: int = 10, 
    mode: str = "default"
) -> List[Dict[str, Any]]:
    """
    Calculate priority scores for a list of contacts and interactions entirely in-memory.
    """
    if mode not in WEIGHT_VECTORS:
        mode = "default"
    
    weights = WEIGHT_VECTORS[mode]
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    year_ago = now - timedelta(days=365)

    # Pre-group interactions by contact
    interaction_map = defaultdict(list)
    for i in interactions:
        if i.get("contact_id"):
            interaction_map[i["contact_id"]].append(i)

    scored = []

    for contact in contacts:
        contact_id = contact["id"]
        contact_interactions = interaction_map.get(contact_id, [])
        importance = contact.get("importance", 1) or 1

        # Calculate features
        parsed = []
        for i in contact_interactions:
            try:
                ts = parse_datetime(i["happened_at"])
                parsed.append({"happened_at": ts, "direction": i.get("direction")})
            except Exception:
                continue
        
        if not parsed:
            # Default/Empty features
            days_since_last = 999.0
            total_30d = 0
            total_365d = 0
            inbound_30d = 0
            outbound_30d = 0
        else:
            parsed.sort(key=lambda x: x["happened_at"], reverse=True)
            most_recent = parsed[0]["happened_at"]
            days_since_last = max((now - most_recent).days, 0.0)
            
            total_30d = sum(1 for i in parsed if i["happened_at"] >= thirty_days_ago)
            total_365d = sum(1 for i in parsed if i["happened_at"] >= year_ago)
            inbound_30d = sum(1 for i in parsed if i["happened_at"] >= thirty_days_ago and i.get("direction") == "inbound")
            outbound_30d = sum(1 for i in parsed if i["happened_at"] >= thirty_days_ago and i.get("direction") == "outbound")

        # Normalize features
        norm_days = min(days_since_last / 365.0, 1.0)
        norm_total_30d = min(total_30d / 50.0, 1.0)
        norm_total_365d = min(total_365d / 200.0, 1.0)
        norm_inbound_30d = min(inbound_30d / 25.0, 1.0)
        norm_outbound_30d = min(outbound_30d / 25.0, 1.0)
        norm_importance = (importance - 1) / 4.0  # Normalize 1-5 to 0-1

        # Calculate Score
        interaction_score = (
            weights["days_since_last_interaction"] * norm_days +
            weights["total_interactions_30d"] * (1 - norm_total_30d) +
            weights["total_interactions_365d"] * (1 - norm_total_365d) +
            weights["inbound_30d"] * (1 - norm_inbound_30d) +
            weights["outbound_30d"] * (1 - norm_outbound_30d)
        )
        
        final_score = (0.8 * interaction_score) + (0.2 * norm_importance)

        scored.append({
            "contact_id": contact_id,
            "contact_name": contact["name"],
            "importance": importance,
            "score": round(final_score * 100, 1),
            "explanation": generate_priority_explanation({
                "days_since_last_interaction": days_since_last,
                "total_interactions_30d": total_30d
            }),
            "days_since_last_interaction": int(days_since_last),
            "total_interactions_30d": total_30d
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]
