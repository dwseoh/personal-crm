from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.database import supabase_client
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
def list_contacts(user=Depends(get_current_user)):
    try:
        response = supabase_client.table("contacts") \
            .select("*") \
            .eq("user_id", user.id) \
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contacts: {str(e)}")



@router.post("/")
def create_contact(request: ContactRequest, user=Depends(get_current_user)):
    try:
        response = supabase_client.table("contacts").insert({
            "user_id": user.id,
            "name": request.name,
            "email": request.email,
            "phone": request.phone,
            "notes": request.notes
        }).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating contact: {str(e)}")


@router.delete("/{contact_id}")
def delete_contact(contact_id: int, user=Depends(get_current_user)):
    try:
        response = supabase_client.table("contacts") \
            .delete() \
            .eq("contact_user_id", contact_id) \
            .eq("user_id", user.id) \
            .execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Contact not found")

        return {"message": "Contact deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting contact: {str(e)}")


@router.patch("/{contact_id}")
def edit_contact(contact_id: int, request: editContactRequest, user=Depends(get_current_user)):
    try:
        # Create update dictionary with only non-None values
        update_data = {
            k: v for k, v in request.dict().items() 
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

