from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, validator
from typing import Literal
from app.core.database import supabase_client
from app.core.rate_limiter import limiter, RateLimits
from app.auth import get_current_user
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interactions", tags=["interactions"])

"""
Interactions API - Track communication history with contacts

Database Schema:
- id: UUID (PK)
- user_id: UUID (FK → users.id)
- contact_id: UUID (FK → contacts.id)
- type: enum('email', 'call', 'dm', 'meet', 'other')
- direction: enum('inbound', 'outbound')
- happened_at: timestamp
- notes: text
- created_at: timestamp
"""

# ---------------------------
# Models
# ---------------------------
class InteractionRequest(BaseModel):
    """
    Create a new interaction
    
    Example:
    {
        "contact_id": "123e4567-e89b-12d3-a456-426614174000",
        "type": "call",
        "direction": "outbound",
        "happened_at": "2025-12-27T15:30:00Z",
        "notes": "Discussed project timeline"
    }
    """
    contact_id: str
    type: Literal['email', 'call', 'dm', 'meet', 'other']
    direction: Literal['inbound', 'outbound']
    happened_at: str  # ISO 8601 date string
    notes: str | None = None
    
    @validator('happened_at')
    def validate_timestamp(cls, v):
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except ValueError:
            raise ValueError('happened_at must be a valid ISO 8601 timestamp')


class EditInteractionRequest(BaseModel):
    """
    Update an existing interaction (partial update)
    
    Example:
    {
        "notes": "Updated notes after follow-up"
    }
    """
    type: Literal['email', 'call', 'dm', 'meet', 'other'] | None = None
    direction: Literal['inbound', 'outbound'] | None = None
    happened_at: str | None = None  # ISO 8601 date string
    notes: str | None = None
    
    @validator('happened_at')
    def validate_timestamp(cls, v):
        if v is not None:
            try:
                datetime.fromisoformat(v.replace('Z', '+00:00'))
                return v
            except ValueError:
                raise ValueError('happened_at must be a valid ISO 8601 timestamp')
        return v


# ---------------------------
# Routes
# ---------------------------

@router.get("/{contact_id}")
@limiter.limit(RateLimits.CONTACTS)
def list_interactions(contact_id: str, request: Request, user=Depends(get_current_user)):
    """
    Get all interactions for a specific contact
    
    Returns:
    [
        {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "user_id": "user-uuid",
            "contact_id": "contact-uuid",
            "type": "call",
            "direction": "outbound",
            "happened_at": "2025-12-27T15:30:00Z",
            "notes": "Discussed project timeline",
            "created_at": "2025-12-27T15:35:00Z"
        }
    ]
    """
    try:
        # Verify contact belongs to user
        contact_check = supabase_client.table("contacts") \
            .select("id") \
            .eq("id", contact_id) \
            .eq("user_id", user.id) \
            .execute()
        
        if not contact_check.data:
            raise HTTPException(status_code=404, detail="Contact not found")

        response = supabase_client.table("interactions") \
            .select("*") \
            .eq("contact_id", contact_id) \
            .order("happened_at", desc=True) \
            .execute()
        
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error fetching interactions for contact {contact_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch interactions for contact: {str(e)}"
        )


@router.get("/user/all")
@limiter.limit(RateLimits.CONTACTS)
def list_user_interactions(request: Request, user=Depends(get_current_user)):
    """
    Get all interactions for the current user across all contacts
    
    Returns interactions sorted by happened_at (most recent first)
    """
    try:
        response = supabase_client.table("interactions") \
            .select("*") \
            .eq("user_id", user.id) \
            .order("happened_at", desc=True) \
            .execute()
        
        return response.data if response.data else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching interactions: {str(e)}")


@router.post("/")
@limiter.limit(RateLimits.CONTACTS)
def create_interaction(interaction_request: InteractionRequest, request: Request, user=Depends(get_current_user)):
    try:
        # Verify contact exists and belongs to user
        contact_check = supabase_client.table("contacts") \
            .select("id") \
            .eq("id", interaction_request.contact_id) \
            .eq("user_id", user.id) \
            .execute()
        
        if not contact_check.data:
            raise HTTPException(status_code=404, detail="Contact not found")

        # Create interaction
        response = supabase_client.table("interactions").insert({
            "user_id": user.id,
            "contact_id": interaction_request.contact_id,
            "type": interaction_request.type,
            "happened_at": interaction_request.happened_at,
            "direction": interaction_request.direction,
            "notes": interaction_request.notes
        }).execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create interaction")

        return response.data[0]
        
    except Exception as e:
        logger.error(f"Error creating interaction for contact {interaction_request.contact_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create interaction: {str(e)}"
        )


@router.patch("/{interaction_id}")
@limiter.limit(RateLimits.CONTACTS)
def edit_interaction(interaction_id: str, edit_request: EditInteractionRequest, request: Request, user=Depends(get_current_user)):
    try:
        # Verify interaction exists and belongs to user
        interaction_check = supabase_client.table("interactions") \
            .select("id") \
            .eq("id", interaction_id) \
            .eq("user_id", user.id) \
            .execute()
        
        if not interaction_check.data:
            raise HTTPException(status_code=404, detail="Interaction not found")

        # Filter out None values to only update provided fields
        update_data = {
            k: v for k, v in edit_request.dict().items() 
            if v is not None
        }
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        response = supabase_client.table("interactions") \
            .update(update_data) \
            .eq("id", interaction_id) \
            .eq("user_id", user.id) \
            .execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update interaction")

        return response.data[0]
        
    except Exception as e:
        logger.error(f"Error updating interaction {interaction_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update interaction: {str(e)}"
        )


@router.delete("/{interaction_id}")
@limiter.limit(RateLimits.CONTACTS)
def delete_interaction(interaction_id: str, request: Request, user=Depends(get_current_user)):
    try:
        # Verify interaction exists and belongs to user
        interaction_check = supabase_client.table("interactions") \
            .select("id") \
            .eq("id", interaction_id) \
            .eq("user_id", user.id) \
            .execute()
        
        if not interaction_check.data:
            raise HTTPException(status_code=404, detail="Interaction not found")

        response = supabase_client.table("interactions") \
            .delete() \
            .eq("id", interaction_id) \
            .eq("user_id", user.id) \
            .execute()

        return {"message": "Interaction deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting interaction {interaction_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete interaction: {str(e)}"
        )