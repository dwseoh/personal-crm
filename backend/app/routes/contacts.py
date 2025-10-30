from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from app.core.database import supabase_client
from app.core.rate_limiter import limiter, RateLimits
from app.auth import get_current_user

router = APIRouter(prefix="/contacts", tags=["contacts"])


# ---------------------------
# Models
# ---------------------------
class ContactRequest(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    notes: str | None = None
    groups: list[str] = Field(default_factory=list)
# need to change frontend so that it calls the post method differently 
# list of group_id's 

class editContactRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None
    groups: list[str] | None = None


# ---------------------------
# Routes
# ---------------------------

@router.get("/")
@limiter.limit(RateLimits.CONTACTS)
def list_contacts(request: Request, user=Depends(get_current_user)):
    try:
        response = supabase_client.table("contacts") \
            .select("*") \
            .eq("user_id", user.id) \
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contacts: {str(e)}")



@router.post("/")
@limiter.limit(RateLimits.CONTACTS)
def create_contact(contact_request: ContactRequest, request: Request, user=Depends(get_current_user)):
    try:
        # Use database transaction for atomicity
        # This ensures ALL operations succeed or ALL fail together
        
        # Start by creating the contact
        contact_response = supabase_client.table("contacts").insert({
            "user_id": user.id,
            "name": contact_request.name,
            "email": contact_request.email,
            "phone": contact_request.phone,
            "notes": contact_request.notes
        }).execute()

        if not contact_response.data:
            raise HTTPException(status_code=500, detail="Failed to create contact")

        created_contact = contact_response.data[0]
        contact_id = created_contact["id"]

        # If no groups specified, return the contact immediately
        if not contact_request.groups:
            return created_contact

        # Prepare all group relations for batch insert
        group_relations = []
        for group_id in contact_request.groups:
            # Validate group exists and belongs to user first
            group_check = supabase_client.table("groups") \
                .select("id") \
                .eq("id", group_id) \
                .eq("user_id", user.id) \
                .execute()
            
            if not group_check.data:
                # If group doesn't exist, delete the contact and fail
                supabase_client.table("contacts").delete().eq("contact_id", contact_id).execute()
                raise HTTPException(status_code=400, detail=f"Group {group_id} not found or not accessible")
            
            group_relations.append({
                "contact_id": contact_id,
                "group_id": group_id
            })

        # Batch insert all group relations at once
        if group_relations:
            group_response = supabase_client.table("contact_groups").insert(group_relations).execute()
            
            if not group_response.data or len(group_response.data) != len(group_relations):
                # If group relations failed, delete the contact
                supabase_client.table("contact_groups").delete().eq("contact_id", contact_id).execute()
                raise HTTPException(status_code=500, detail="Failed to create group relations")

        return created_contact
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating contact: {str(e)}")


@router.delete("/{contact_id}")
@limiter.limit(RateLimits.CONTACTS)
def delete_contact(contact_id: str, request: Request, user=Depends(get_current_user)):
    try:
        response = supabase_client.table("contacts") \
            .delete() \
            .eq("id", contact_id) \
            .eq("user_id", user.id) \
            .execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Contact not found")

        return {"message": "Contact deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting contact: {str(e)}")


@router.patch("/{contact_id}")
@limiter.limit(RateLimits.CONTACTS)
def edit_contact(contact_id: str, edit_request: editContactRequest, request: Request, user=Depends(get_current_user)):
    try:
        # Verify contact exists and belongs to user
        contact_check = supabase_client.table("contacts") \
            .select("id") \
            .eq("id", contact_id) \
            .eq("user_id", user.id) \
            .execute()
        
        if not contact_check.data:
            raise HTTPException(status_code=404, detail="Contact not found")

        # Separate groups from other fields
        groups_to_update = edit_request.groups
        contact_fields = {
            k: v for k, v in edit_request.dict().items() 
            if v is not None and k != "groups"
        }
        
        # Update contact fields if any are provided
        if contact_fields:
            response = supabase_client.table("contacts") \
                .update(contact_fields) \
                .eq("id", contact_id) \
                .eq("user_id", user.id) \
                .execute()

            if not response.data:
                raise HTTPException(status_code=500, detail="Failed to update contact")

        # Handle group updates if provided
        if groups_to_update is not None:
            # Validate all groups exist and belong to user
            if groups_to_update:  # Only validate if list is not empty
                for group_id in groups_to_update:
                    group_check = supabase_client.table("groups") \
                        .select("id") \
                        .eq("id", group_id) \
                        .eq("user_id", user.id) \
                        .execute()
                    
                    if not group_check.data:
                        raise HTTPException(status_code=400, detail=f"Group {group_id} not found or not accessible")

            # Remove all existing group relations for this contact
            supabase_client.table("contact_groups") \
                .delete() \
                .eq("contact_id", contact_id) \
                .execute()

            # Add new group relations if any groups specified
            if groups_to_update:
                group_relations = [
                    {"contact_id": contact_id, "group_id": group_id}
                    for group_id in groups_to_update
                ]
                
                group_response = supabase_client.table("contact_groups") \
                    .insert(group_relations) \
                    .execute()
                
                if not group_response.data or len(group_response.data) != len(group_relations):
                    raise HTTPException(status_code=500, detail="Failed to update group relations")

        # Return updated contact
        updated_contact = supabase_client.table("contacts") \
            .select("*") \
            .eq("id", contact_id) \
            .execute()

        return updated_contact.data[0] if updated_contact.data else {}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating contact: {str(e)}")


@router.get("/{contact_id}/groups")
@limiter.limit(RateLimits.CONTACTS)
def get_contact_groups(contact_id: str, request: Request, user=Depends(get_current_user)):
    try:
        # Verify contact belongs to user
        contact_check = supabase_client.table("contacts") \
            .select("id") \
            .eq("id", contact_id) \
            .eq("user_id", user.id) \
            .execute()
        
        if not contact_check.data:
            raise HTTPException(status_code=404, detail="Contact not found")

        # Get groups for this contact
        response = supabase_client.table("contact_groups") \
            .select("groups(*)") \
            .eq("contact_id", contact_id) \
            .execute()
        
        # Extract group data from the nested structure
        groups = []
        if response.data:
            for item in response.data:
                if item.get("groups"):
                    groups.append(item["groups"])
        
        return groups
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contact groups: {str(e)}")

