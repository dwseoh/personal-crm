from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from app.core.database import supabase_client
from app.core.rate_limiter import limiter, RateLimits
from app.auth import get_current_user

router = APIRouter(prefix="/groups", tags=["groups"])


# ---------------------------
# Models
# ---------------------------
class ContactRequest(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    notes: str | None = None

class editContactRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None



