from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.database import supabase_client
from app.core.rate_limiter import limiter, RateLimits
from app.auth import get_current_user
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any
from collections import defaultdict
import math

router = APIRouter(prefix="/analytics", tags=["analytics"])

# ---------------------------
# Weight Vectors for Priority Scoring
# ---------------------------
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

# ---------------------------
# Feature Matrix Construction
# ---------------------------
def build_interaction_feature_matrix(user_id: str) -> Dict[str, Dict[str, float]]:
    try:
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        year_ago = now - timedelta(days=365)

        # Fetch user-scoped contacts
        contacts_response = (
            supabase_client
            .table("contacts")
            .select("id, name, importance")
            .eq("user_id", user_id)
            .execute()
        )

        if not contacts_response.data:
            return {}

        # Fetch user-scoped interactions
        interactions_response = (
            supabase_client
            .table("interactions")
            .select("contact_id, direction, happened_at")
            .eq("user_id", user_id)
            .execute()
        )

        interactions = interactions_response.data or []

        # Pre-group interactions by contact
        interaction_map = defaultdict(list)
        for i in interactions:
            interaction_map[i["contact_id"]].append(i)

        feature_matrix = {}

        for contact in contacts_response.data:
            contact_id = contact["id"]
            contact_name = contact["name"]
            importance = contact.get("importance", 1)  # Default to 1 if not set
            contact_interactions = interaction_map.get(contact_id, [])

            # No interactions
            if not contact_interactions:
                feature_matrix[contact_id] = {
                    "contact_name": contact_name,
                    "importance": importance,
                    "days_since_last_interaction": 999,
                    "total_interactions_30d": 0,
                    "total_interactions_365d": 0,
                    "inbound_30d": 0,
                    "outbound_30d": 0
                }
                continue

            parsed = []
            for i in contact_interactions:
                try:
                    ts = datetime.fromisoformat(
                        i["happened_at"].replace("Z", "+00:00")
                    )
                    if ts.tzinfo is None:
                        ts = ts.replace(tzinfo=timezone.utc)
                    parsed.append({"happened_at": ts, "direction": i.get("direction")})
                except Exception:
                    continue

            if not parsed:
                feature_matrix[contact_id] = {
                    "contact_name": contact_name,
                    "importance": importance,
                    "days_since_last_interaction": 999,
                    "total_interactions_30d": 0,
                    "total_interactions_365d": 0,
                    "inbound_30d": 0,
                    "outbound_30d": 0
                }
                continue

            parsed.sort(key=lambda x: x["happened_at"], reverse=True)

            most_recent = parsed[0]["happened_at"]
            days_since_last = (now - most_recent).days

            feature_matrix[contact_id] = {
                "contact_name": contact_name,
                "importance": importance,
                "days_since_last_interaction": float(days_since_last),
                "total_interactions_30d": sum(
                    1 for i in parsed if i["happened_at"] >= thirty_days_ago
                ),
                "total_interactions_365d": sum(
                    1 for i in parsed if i["happened_at"] >= year_ago
                ),
                "inbound_30d": sum(
                    1 for i in parsed
                    if i["happened_at"] >= thirty_days_ago and i.get("direction") == "inbound"
                ),
                "outbound_30d": sum(
                    1 for i in parsed
                    if i["happened_at"] >= thirty_days_ago and i.get("direction") == "outbound"
                )
            }

        return feature_matrix

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error building feature matrix: {str(e)}"
        )

# ---------------------------
# Priority Scoring
# ---------------------------
def score_contacts(
    user_id: str,
    mode: str = "default",
    limit: int = 10
) -> List[Dict[str, Any]]:

    if mode not in WEIGHT_VECTORS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode. Choose from {list(WEIGHT_VECTORS.keys())}"
        )

    weights = WEIGHT_VECTORS[mode]
    feature_matrix = build_interaction_feature_matrix(user_id)

    if not feature_matrix:
        return []

    scored = []

    for cid, f in feature_matrix.items():
        norm_days = min(f["days_since_last_interaction"] / 365.0, 1.0)
        norm_total_30d = min(f["total_interactions_30d"] / 50.0, 1.0)
        norm_total_365d = min(f["total_interactions_365d"] / 200.0, 1.0)
        norm_inbound_30d = min(f["inbound_30d"] / 25.0, 1.0)
        norm_outbound_30d = min(f["outbound_30d"] / 25.0, 1.0)
        norm_importance = (f["importance"] - 1) / 4.0  # Normalize 1-5 to 0-1

        # Base interaction score (80% weight)
        interaction_score = (
            weights["days_since_last_interaction"] * norm_days +
            weights["total_interactions_30d"] * (1 - norm_total_30d) +
            weights["total_interactions_365d"] * (1 - norm_total_365d) +
            weights["inbound_30d"] * (1 - norm_inbound_30d) +
            weights["outbound_30d"] * (1 - norm_outbound_30d)
        )
        
        # Final score: 80% interaction-based + 20% importance-based
        score = (0.8 * interaction_score) + (0.2 * norm_importance)

        scored.append({
            "contact_id": cid,
            "contact_name": f["contact_name"],
            "importance": f["importance"],
            "score": round(score * 100, 1),
            "explanation": generate_priority_explanation(f),
            "days_since_last_interaction": int(f["days_since_last_interaction"]),
            "total_interactions_30d": f["total_interactions_30d"]
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]

# ---------------------------
# Explanation Generator
# ---------------------------
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

# ---------------------------
# Similarity Analysis
# ---------------------------
def get_similar_contacts(
    user_id: str,
    contact_id: str,
    limit: int = 5
) -> List[Dict[str, Any]]:

    feature_matrix = build_interaction_feature_matrix(user_id)

    if contact_id not in feature_matrix:
        return []

    ref = feature_matrix[contact_id]

    ref_vec = [
        min(ref["days_since_last_interaction"], 365),
        ref["total_interactions_30d"],
        ref["total_interactions_365d"],
        ref["inbound_30d"],
        ref["outbound_30d"]
    ]

    ref_norm = math.sqrt(sum(x * x for x in ref_vec))
    if ref_norm == 0:
        return []

    results = []

    for cid, f in feature_matrix.items():
        if cid == contact_id:
            continue

        vec = [
            min(f["days_since_last_interaction"], 365),
            f["total_interactions_30d"],
            f["total_interactions_365d"],
            f["inbound_30d"],
            f["outbound_30d"]
        ]

        norm = math.sqrt(sum(x * x for x in vec))
        if norm == 0:
            continue

        sim = sum(a * b for a, b in zip(ref_vec, vec)) / (ref_norm * norm)

        results.append({
            "contact_id": cid,
            "contact_name": f["contact_name"],
            "similarity_score": round(sim * 100, 1),
            "explanation": "Similar interaction patterns"
        })

    results.sort(key=lambda x: x["similarity_score"], reverse=True)
    return results[:limit]

# ---------------------------
# API Endpoints
# ---------------------------
@router.get("/priority-contacts")
@limiter.limit(RateLimits.GENERAL)
def get_priority_contacts(
    request: Request,
    user=Depends(get_current_user),
    mode: str = "default",
    limit: int = 10
):
    return score_contacts(user.id, mode, limit)

@router.get("/similar-contacts/{contact_id}")
@limiter.limit(RateLimits.GENERAL)
def get_similar_contacts_endpoint(
    contact_id: str,
    request: Request,
    user=Depends(get_current_user),
    limit: int = 5
):
    return get_similar_contacts(user.id, contact_id, limit)
