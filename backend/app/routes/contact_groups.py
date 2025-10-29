from fastapi import APIRouter, HTTPException, Request
from app.core.database import supabase_client


# ---------------------------
# Routes
# ---------------------------

def add_new_contact_group_relation(contact_id,group_id):
    try:
        response = supabase_client.table("contact_groups").insert({
            "contact_id":contact_id,
            "group_id":group_id
        }).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating contact: {str(e)}")
    
def remove_contact_group_relation(contact_id,group_id):
    #code here
    try:
        response = supabase_client.table("contact_groups") \
            .delete() \
            .eq("contact_id", contact_id) \
            .eq("group_id", group_id) \
            .execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Group not found")

        return {"message": "Group deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting groups: {str(e)}")
    
#need to account for when they get rid of the group tag, have to delete