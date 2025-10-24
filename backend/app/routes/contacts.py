from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
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

class editContactRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None


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
        response = supabase_client.table("contacts").insert({
            "user_id": user.id,
            "name": contact_request.name,
            "email": contact_request.email,
            "phone": contact_request.phone,
            "notes": contact_request.notes
        }).execute()
        return response.data
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
        # Create update dictionary with only non-None values
        update_data = {
            k: v for k, v in edit_request.dict().items() 
            if v is not None
        }
        
        # Only proceed if there are fields to update
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        response = supabase_client.table("contacts") \
            .update(update_data) \
            .eq("id", contact_id) \
            .eq("user_id", user.id) \
            .execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Contact not found")

        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating contact: {str(e)}")

