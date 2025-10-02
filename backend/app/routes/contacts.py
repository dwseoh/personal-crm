# app/routes/contacts.py
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel
from app.db import supabase_client
from app.auth import get_current_user

router = APIRouter(
    prefix="/contacts",
    tags=["contacts"]
)

# Pydantic models
class ContactCreate(BaseModel):
    name: str
    email: str = None
    phone: str = None
    data: dict = {}

class ContactOut(ContactCreate):
    id: str
    user_id: str
    created_at: str

# Routes
@router.post("/", response_model=ContactOut)
def create_contact(contact: ContactCreate, current_user=Depends(get_current_user)):
    result = supabase_client.table("contacts").insert({
        "user_id": current_user["id"],
        "name": contact.name,
        "email": contact.email,
        "phone": contact.phone,
        "data": contact.data
    }).execute()

    if result.status_code != 201:
        raise HTTPException(status_code=400, detail="Failed to create contact")

    return result.data[0]

@router.get("/", response_model=List[ContactOut])
def list_contacts(current_user=Depends(get_current_user)):
    result = supabase_client.table("contacts").select("*").eq("user_id", current_user["id"]).execute()
    return result.data

@router.get("/{contact_id}", response_model=ContactOut)
def get_contact(contact_id: str, current_user=Depends(get_current_user)):
    result = supabase_client.table("contacts").select("*")\
        .eq("id", contact_id)\
        .eq("user_id", current_user["id"]).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Contact not found")

    return result.data[0]
