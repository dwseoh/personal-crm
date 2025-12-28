from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.database import supabase_client
from app.core.rate_limiter import limiter, RateLimits
from app.auth import get_current_user
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any
import math

router = APIRouter(prefix="/analytics", tags=["analytics"])

"""
Analytics API - Matrix-based contact analysis

This module provides intelligent insights based on interaction patterns:
1. Priority Scoring: Rank contacts by who to reach out to next
2. Similarity Analysis: Find contacts with similar interaction patterns
"""

# ---------------------------
# Weight Vectors for Priority Scoring
# ---------------------------
WEIGHT_VECTORS = {
    "default": {
        "days_since_last": 0.4,
        "total_30d": 0.2,
        "total_365d": 0.1,
        "inbound_30d": 0.15,
        "outbound_30d": 0.15
    },
    "career": {
        "days_since_last": 0.3,
        "total_30d": 0.2,
        "total_365d": 0.2,
        "inbound_30d": 0.15,
        "outbound_30d": 0.15
    },
    "social": {
        "days_since_last": 0.5,
        "total_30d": 0.15,
        "total_365d": 0.1,
        "inbound_30d": 0.15,
        "outbound_30d": 0.1
    }
}


# ---------------------------
# Feature Matrix Construction
# ---------------------------
def build_interaction_feature_matrix(user_id: str) -> Dict[str, Dict[str, float]]:
    """
    Build feature matrix for all contacts with interactions
    
    Matrix A where:
    - Rows = contacts
    - Columns = features [days_since_last, total_30d, total_365d, inbound_30d, outbound_30d]
    
    Returns:
    {
        "contact_id": {
            "contact_name": str,
            "days_since_last_interaction": float,
            "total_interactions_30d": int,
            "total_interactions_365d": int,
            "inbound_30d": int,
            "outbound_30d": int
        }
    }
    """
    try:
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        year_ago = now - timedelta(days=365)
        
        # Get all contacts for user
        contacts_response = supabase_client.table("contacts") \
            .select("id, name") \
            .eq("user_id", user_id) \
            .execute()
        
        if not contacts_response.data:
            return {}
        
        # Get all interactions for user
        interactions_response = supabase_client.table("interactions") \
            .select("contact_id, direction, happened_at") \
            .eq("user_id", user_id) \
            .execute()
        
        interactions = interactions_response.data if interactions_response.data else []
        
        # Build feature matrix
        feature_matrix = {}
        
        for contact in contacts_response.data:
            contact_id = contact["id"]
            contact_name = contact["name"]
            
            # Filter interactions for this contact
            contact_interactions = [i for i in interactions if i["contact_id"] == contact_id]
            
            if not contact_interactions:
                # No interactions - set defaults
                feature_matrix[contact_id] = {
                    "contact_name": contact_name,
                    "days_since_last_interaction": 999,  # Very high value
                    "total_interactions_30d": 0,
                    "total_interactions_365d": 0,
                    "inbound_30d": 0,
                    "outbound_30d": 0
                }
                continue
            
            # Parse timestamps and sort
            parsed_interactions = []
            for interaction in contact_interactions:
                try:
                    happened_at = datetime.fromisoformat(interaction["happened_at"].replace('Z', '+00:00'))
                    parsed_interactions.append({
                        "happened_at": happened_at,
                        "direction": interaction.get("direction")
                    })
                except:
                    continue
            
            if not parsed_interactions:
                feature_matrix[contact_id] = {
                    "contact_name": contact_name,
                    "days_since_last_interaction": 999,
                    "total_interactions_30d": 0,
                    "total_interactions_365d": 0,
                    "inbound_30d": 0,
                    "outbound_30d": 0
                }
                continue
            
            # Sort by date (most recent first)
            parsed_interactions.sort(key=lambda x: x["happened_at"], reverse=True)
            
            # Calculate features
            most_recent = parsed_interactions[0]["happened_at"]
            days_since_last = (now - most_recent).days
            
            # Count interactions in time windows
            total_30d = sum(1 for i in parsed_interactions if i["happened_at"] >= thirty_days_ago)
            total_365d = sum(1 for i in parsed_interactions if i["happened_at"] >= year_ago)
            inbound_30d = sum(1 for i in parsed_interactions 
                            if i["happened_at"] >= thirty_days_ago and i["direction"] == "inbound")
            outbound_30d = sum(1 for i in parsed_interactions 
                             if i["happened_at"] >= thirty_days_ago and i["direction"] == "outbound")
            
            feature_matrix[contact_id] = {
                "contact_name": contact_name,
                "days_since_last_interaction": float(days_since_last),
                "total_interactions_30d": total_30d,
                "total_interactions_365d": total_365d,
                "inbound_30d": inbound_30d,
                "outbound_30d": outbound_30d
            }
        
        return feature_matrix
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error building feature matrix: {str(e)}")


# ---------------------------
# Priority Scoring
# ---------------------------
def score_contacts(user_id: str, mode: str = "default", limit: int = 10) -> List[Dict[str, Any]]:
    """
    Score contacts using matrix multiplication: score = A × w
    
    Higher scores = higher priority to reach out
    
    Args:
        user_id: User ID
        mode: Scoring mode (default, career, social)
        limit: Number of top contacts to return
    
    Returns:
        List of contacts with scores and explanations
    """
    try:
        if mode not in WEIGHT_VECTORS:
            raise HTTPException(status_code=400, detail=f"Invalid mode. Choose from: {list(WEIGHT_VECTORS.keys())}")
        
        weights = WEIGHT_VECTORS[mode]
        feature_matrix = build_interaction_feature_matrix(user_id)
        
        if not feature_matrix:
            return []
        
        scored_contacts = []
        
        for contact_id, features in feature_matrix.items():
            # Normalize features (0-1 scale)
            # Days since last: normalize by dividing by max reasonable value (365 days)
            norm_days = min(features["days_since_last"] / 365.0, 1.0)
            
            # Interaction counts: normalize by dividing by reasonable max (50 interactions)
            norm_total_30d = min(features["total_interactions_30d"] / 50.0, 1.0)
            norm_total_365d = min(features["total_interactions_365d"] / 200.0, 1.0)
            norm_inbound_30d = min(features["inbound_30d"] / 25.0, 1.0)
            norm_outbound_30d = min(features["outbound_30d"] / 25.0, 1.0)
            
            # Calculate weighted score
            # For days_since_last, higher days = higher priority (inverse relationship)
            # For interaction counts, lower counts = higher priority (inverse relationship)
            score = (
                weights["days_since_last"] * norm_days +
                weights["total_30d"] * (1 - norm_total_30d) +
                weights["total_365d"] * (1 - norm_total_365d) +
                weights["inbound_30d"] * (1 - norm_inbound_30d) +
                weights["outbound_30d"] * (1 - norm_outbound_30d)
            )
            
            # Generate explanation
            explanation = generate_priority_explanation(features)
            
            scored_contacts.append({
                "contact_id": contact_id,
                "contact_name": features["contact_name"],
                "score": round(score * 100, 1),  # Convert to 0-100 scale
                "explanation": explanation,
                "days_since_last": int(features["days_since_last_interaction"]),
                "total_interactions_30d": features["total_interactions_30d"]
            })
        
        # Sort by score (highest first) and return top N
        scored_contacts.sort(key=lambda x: x["score"], reverse=True)
        return scored_contacts[:limit]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scoring contacts: {str(e)}")


def generate_priority_explanation(features: Dict[str, Any]) -> str:
    """Generate human-readable explanation for priority score"""
    days = int(features["days_since_last_interaction"])
    total_30d = features["total_interactions_30d"]
    
    if days > 180:
        return f"No interaction in {days} days"
    elif days > 90:
        return f"Last contact {days} days ago"
    elif days > 30:
        return f"{days} days since last interaction"
    elif total_30d == 0:
        return "No recent activity"
    elif total_30d < 2:
        return "Low recent activity"
    else:
        return "Maintain regular contact"


# ---------------------------
# Similarity Analysis
# ---------------------------
def get_similar_contacts(user_id: str, contact_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Find contacts with similar interaction patterns using cosine similarity
    
    Similarity = (a · b) / (||a|| × ||b||)
    
    Args:
        user_id: User ID
        contact_id: Reference contact ID
        limit: Number of similar contacts to return
    
    Returns:
        List of similar contacts with similarity scores
    """
    try:
        feature_matrix = build_interaction_feature_matrix(user_id)
        
        if contact_id not in feature_matrix:
            raise HTTPException(status_code=404, detail="Contact not found or has no interactions")
        
        reference_features = feature_matrix[contact_id]
        
        # Extract feature vector for reference contact
        ref_vector = [
            reference_features["days_since_last_interaction"],
            reference_features["total_interactions_30d"],
            reference_features["total_interactions_365d"],
            reference_features["inbound_30d"],
            reference_features["outbound_30d"]
        ]
        
        # Calculate L2 norm of reference vector
        ref_norm = math.sqrt(sum(x**2 for x in ref_vector))
        
        if ref_norm == 0:
            return []
        
        similar_contacts = []
        
        for cid, features in feature_matrix.items():
            if cid == contact_id:
                continue  # Skip self
            
            # Extract feature vector
            vector = [
                features["days_since_last_interaction"],
                features["total_interactions_30d"],
                features["total_interactions_365d"],
                features["inbound_30d"],
                features["outbound_30d"]
            ]
            
            # Calculate L2 norm
            norm = math.sqrt(sum(x**2 for x in vector))
            
            if norm == 0:
                continue
            
            # Calculate cosine similarity
            dot_product = sum(a * b for a, b in zip(ref_vector, vector))
            similarity = dot_product / (ref_norm * norm)
            
            similar_contacts.append({
                "contact_id": cid,
                "contact_name": features["contact_name"],
                "similarity_score": round(similarity * 100, 1),  # Convert to percentage
                "explanation": "Similar interaction patterns"
            })
        
        # Sort by similarity (highest first) and return top N
        similar_contacts.sort(key=lambda x: x["similarity_score"], reverse=True)
        return similar_contacts[:limit]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding similar contacts: {str(e)}")


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
    Get prioritized list of contacts to reach out to
    
    Query Parameters:
    - mode: Scoring mode (default, career, social)
    - limit: Number of contacts to return (default: 10)
    
    Returns:
    [
        {
            "contact_id": "uuid",
            "contact_name": "John Doe",
            "score": 85.5,
            "explanation": "No interaction in 45 days",
            "days_since_last": 45,
            "total_interactions_30d": 0
        }
    ]
    """
    return score_contacts(user.id, mode, limit)


@router.get("/similar-contacts/{contact_id}")
@limiter.limit(RateLimits.GENERAL)
def get_similar_contacts_endpoint(
    contact_id: str,
    request: Request,
    user=Depends(get_current_user),
    limit: int = 5
):
    """
    Get contacts with similar interaction patterns
    
    Path Parameters:
    - contact_id: Reference contact ID
    
    Query Parameters:
    - limit: Number of similar contacts to return (default: 5)
    
    Returns:
    [
        {
            "contact_id": "uuid",
            "contact_name": "Jane Smith",
            "similarity_score": 92.3,
            "explanation": "Similar interaction patterns"
        }
    ]
    """
    return get_similar_contacts(user.id, contact_id, limit)
