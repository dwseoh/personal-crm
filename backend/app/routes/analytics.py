from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.database import supabase_client
from app.core.rate_limiter import limiter, RateLimits
from app.auth import get_current_user
from app.utils.scoring import calculate_priority_scores
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any
import math
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])

# ---------------------------
# Feature Matrix Construction
# ---------------------------
def build_interaction_feature_matrix(user_id: str) -> Dict[str, Dict[str, float]]:
    """
    Build feature matrix for all contacts of a user.
    Returns a dict mapping contact_id to feature dict.
    """
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
        from collections import defaultdict
        interaction_map = defaultdict(list)
        for i in interactions:
            interaction_map[i["contact_id"]].append(i)

        feature_matrix = {}

        for contact in contacts_response.data:
            contact_id = contact["id"]
            contact_name = contact["name"]
            importance = contact.get("importance", 1)
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
                except Exception as e:
                    logger.warning(f"Failed to parse interaction: {e}")
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
        logger.error(f"Error building feature matrix: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to build feature matrix: {str(e)}"
        )

# ---------------------------
# Similarity Analysis
# ---------------------------
def get_similar_contacts(
    user_id: str,
    contact_id: str,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Find contacts with similar interaction patterns using cosine similarity.
    """
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
    """
    Get priority contacts using the consolidated scoring algorithm.
    Uses caching for improved performance.
    """
    try:
        # Fetch contacts and interactions
        contacts_response = supabase_client.table("contacts") \
            .select("*") \
            .eq("user_id", user.id) \
            .execute()
        
        interactions_response = supabase_client.table("interactions") \
            .select("*") \
            .eq("user_id", user.id) \
            .execute()
        
        contacts = contacts_response.data or []
        interactions = interactions_response.data or []
        
        # Use consolidated scoring with caching
        cache_key = f"priority_{user.id}_{mode}_{limit}"
        return calculate_priority_scores(
            contacts=contacts,
            interactions=interactions,
            limit=limit,
            mode=mode,
            use_cache=True,
            cache_key=cache_key
        )
    except Exception as e:
        logger.error(f"Error fetching priority contacts: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch priority contacts: {str(e)}"
        )

@router.get("/similar-contacts/{contact_id}")
@limiter.limit(RateLimits.GENERAL)
def get_similar_contacts_endpoint(
    contact_id: str,
    request: Request,
    user=Depends(get_current_user),
    limit: int = 5
):
    """
    Find contacts with similar interaction patterns.
    """
    try:
        return get_similar_contacts(user.id, contact_id, limit)
    except Exception as e:
        logger.error(f"Error finding similar contacts: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to find similar contacts: {str(e)}"
        )
