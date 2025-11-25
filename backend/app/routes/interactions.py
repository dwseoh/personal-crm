from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from app.core.database import supabase_client
from app.core.rate_limiter import limiter, RateLimits
from app.auth import get_current_user

router = APIRouter(prefix="/interactions", tags=["interactions"])

"""
id              UUID / int (PK)
user_id
contact_id      FK → contacts.id
type            text (title)
happened_at     timestamp
direction       enum('inbound','outbound')   -- optional
notes           text
"""

# ---------------------------
# Models
# ---------------------------
class interactionRequest(BaseModel):
    contact_id: str
    type: str
    happened_at: str  # ISO 8601 date string
    direction: str | None = None  # 'inbound' or 'outbound'
    notes: str | None = None


class editInteractionRequest(BaseModel):
    type: str | None = None
    happened_at: str | None = None  # ISO 8601 date string
    direction: str | None = None  # 'inbound' or 'outbound'
    notes: str | None = None


# ---------------------------
# Routes
# ---------------------------

@router.get("/{contact_id}")
@limiter.limit(RateLimits.CONTACTS)
def list_interactions(contact_id:str,request: Request, user=Depends(get_current_user), include_groups: bool = False):
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
            .execute()
        
        return response.data if response.data else []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching interactions: {str(e)}")


@router.get("/user/all")
@limiter.limit(RateLimits.CONTACTS)
def list_user_interactions(request: Request, user=Depends(get_current_user)):
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
def create_interaction(interaction_request: interactionRequest, request: Request, user=Depends(get_current_user)):
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
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating interaction: {str(e)}")


@router.patch("/{interaction_id}")
@limiter.limit(RateLimits.CONTACTS)
def edit_interaction(interaction_id: str, edit_request: editInteractionRequest, request: Request, user=Depends(get_current_user)):
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
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating interaction: {str(e)}")


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
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting interaction: {str(e)}")