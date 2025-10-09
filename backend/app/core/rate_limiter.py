"""
Rate Limiting Configuration for FastAPI
"""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import os

# For development, use in-memory storage (no Redis required)
# In production, you'd want to use Redis for distributed rate limiting
def get_client_ip(request: Request):
    """Get client IP address for rate limiting"""
    # Check for forwarded headers (useful behind proxies)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to direct client IP
    return request.client.host if request.client else "unknown"

# Create limiter instance with in-memory storage for development
limiter = Limiter(
    key_func=get_client_ip,
    default_limits=["1000/day", "100/hour"],  # Default limits for all endpoints
    storage_uri="memory://"  # Use in-memory storage (no Redis needed for dev)
)

# Custom rate limit exceeded handler
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded"""
    response = JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": f"Rate limit exceeded: {exc.detail}",
            "retry_after": getattr(exc, 'retry_after', None)
        }
    )
    response.headers["Retry-After"] = str(getattr(exc, 'retry_after', 60))
    return response

# Rate limiting decorators for different endpoint types
class RateLimits:
    """Predefined rate limits for different types of endpoints"""
    
    # Authentication endpoints (more restrictive)
    AUTH = "5/minute"
    SIGNUP = "3/minute"  # Even more restrictive for signup
    LOGIN = "10/minute"
    
    # Email verification (moderate)
    EMAIL_VERIFICATION = "10/minute"
    RESEND_EMAIL = "3/minute"
    
    # Admin endpoints (less restrictive for legitimate admin use)
    ADMIN = "30/minute"
    
    # General API endpoints
    GENERAL = "60/minute"
    
    # Contact management
    CONTACTS = "100/minute"
    USERS="10/minute"