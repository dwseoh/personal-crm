from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

# ---------------------------
# Normalization Constants
# ---------------------------
# These constants define the maximum expected values for normalization
# Adjust based on your typical usage patterns
MAX_DAYS_FOR_NORMALIZATION = 365.0  # 1 year
MAX_INTERACTIONS_30D = 50.0  # Expected max interactions in 30 days
MAX_INTERACTIONS_365D = 200.0  # Expected max interactions in 1 year
MAX_INBOUND_30D = 25.0  # Expected max inbound interactions in 30 days
MAX_OUTBOUND_30D = 25.0  # Expected max outbound interactions in 30 days

# Importance range (1-5 scale)
MIN_IMPORTANCE = 1
MAX_IMPORTANCE = 5

# Score weighting (interaction vs importance)
INTERACTION_WEIGHT = 0.8
IMPORTANCE_WEIGHT = 0.2

# Cache settings
CACHE_TTL_SECONDS = 300  # 5 minutes

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
# Caching
# ---------------------------
_feature_matrix_cache: Dict[str, tuple[datetime, Dict]] = {}

def get_cached_feature_matrix(cache_key: str) -> Dict[str, Dict[str, float]] | None:
    """Get cached feature matrix if still valid."""
    now = datetime.now(timezone.utc)
    
    if cache_key in _feature_matrix_cache:
        timestamp, data = _feature_matrix_cache[cache_key]
        if (now - timestamp).total_seconds() < CACHE_TTL_SECONDS:
            logger.debug(f"Cache hit for key: {cache_key}")
            return data
        else:
            logger.debug(f"Cache expired for key: {cache_key}")
            del _feature_matrix_cache[cache_key]
    
    return None

def set_cached_feature_matrix(cache_key: str, data: Dict[str, Dict[str, float]]) -> None:
    """Store feature matrix in cache."""
    now = datetime.now(timezone.utc)
    _feature_matrix_cache[cache_key] = (now, data)
    logger.debug(f"Cached feature matrix for key: {cache_key}")

# ---------------------------
# Helper Functions
# ---------------------------
def parse_datetime(dt_str: str) -> datetime:
    """Helper to parse datetime string and ensure it is offset-aware (UTC)."""
    try:
        dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, AttributeError) as e:
        logger.warning(f"Failed to parse datetime '{dt_str}': {e}")
        return datetime.now(timezone.utc)

def generate_priority_explanation(features: Dict[str, Any]) -> str:
    """Generate human-readable explanation for priority score."""
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
# Priority Scoring
# ---------------------------
def calculate_priority_scores(
    contacts: List[Dict], 
    interactions: List[Dict], 
    limit: int = 10, 
    mode: str = "default",
    use_cache: bool = True,
    cache_key: str | None = None
) -> List[Dict[str, Any]]:
    """
    Calculate priority scores for contacts based on interaction patterns.
    
    Args:
        contacts: List of contact dictionaries
        interactions: List of interaction dictionaries
        limit: Maximum number of results to return
        mode: Scoring mode ('default', 'career', or 'social')
        use_cache: Whether to use caching
        cache_key: Cache key for storing/retrieving results
        
    Returns:
        List of scored contacts sorted by priority
    """
    if mode not in WEIGHT_VECTORS:
        logger.warning(f"Invalid mode '{mode}', using 'default'")
        mode = "default"
    
    # Check cache if enabled
    if use_cache and cache_key:
        cached_result = get_cached_feature_matrix(cache_key)
        if cached_result is not None:
            return cached_result
    
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
        importance = contact.get("importance", MIN_IMPORTANCE) or MIN_IMPORTANCE

        # Calculate features
        parsed = []
        for i in contact_interactions:
            try:
                ts = parse_datetime(i["happened_at"])
                parsed.append({"happened_at": ts, "direction": i.get("direction")})
            except Exception as e:
                logger.warning(f"Failed to parse interaction for contact {contact_id}: {e}")
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

        # Normalize features using constants
        norm_days = min(days_since_last / MAX_DAYS_FOR_NORMALIZATION, 1.0)
        norm_total_30d = min(total_30d / MAX_INTERACTIONS_30D, 1.0)
        norm_total_365d = min(total_365d / MAX_INTERACTIONS_365D, 1.0)
        norm_inbound_30d = min(inbound_30d / MAX_INBOUND_30D, 1.0)
        norm_outbound_30d = min(outbound_30d / MAX_OUTBOUND_30D, 1.0)
        norm_importance = (importance - MIN_IMPORTANCE) / (MAX_IMPORTANCE - MIN_IMPORTANCE)

        # Calculate Score
        interaction_score = (
            weights["days_since_last_interaction"] * norm_days +
            weights["total_interactions_30d"] * (1 - norm_total_30d) +
            weights["total_interactions_365d"] * (1 - norm_total_365d) +
            weights["inbound_30d"] * (1 - norm_inbound_30d) +
            weights["outbound_30d"] * (1 - norm_outbound_30d)
        )
        
        final_score = (INTERACTION_WEIGHT * interaction_score) + (IMPORTANCE_WEIGHT * norm_importance)

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
    result = scored[:limit]
    
    # Cache result if enabled
    if use_cache and cache_key:
        set_cached_feature_matrix(cache_key, result)
    
    return result
