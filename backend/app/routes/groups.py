from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from app.core.database import supabase_client
from app.core.rate_limiter import limiter, RateLimits
from app.auth import get_current_user

router = APIRouter(prefix="/groups", tags=["groups"])


# ---------------------------
# Models
# ---------------------------
class GroupRequest(BaseModel):
    name: str
    color: str  # Frontend sends 'color'
    description: str | None = None

class editGroupRequest(BaseModel):
    name: str | None = None
    color: str | None = None  # Frontend sends 'color'
    description: str | None = None

# ---------------------------
# Routes
# ---------------------------

@router.get("/")
@limiter.limit(RateLimits.GROUPS)
def list_groups(request: Request, user=Depends(get_current_user), include_contacts: bool = False):
    try:
        # Fetch all groups for the user
        groups_response = supabase_client.table("groups") \
            .select("*") \
            .eq("user_id", user.id) \
            .execute()
        
        groups = []
        groups_data = groups_response.data or []
        
        # If we need contacts, fetch them all in bulk
        contact_map = defaultdict(list)
        if include_contacts and groups_data:
            from collections import defaultdict
            
            # 1. Get all group IDs
            group_ids = [g["id"] for g in groups_data]
            
            # 2. Fetch all contact-group associations for these groups
            if group_ids:
                cg_response = supabase_client.table("contact_groups") \
                    .select("group_id, contact_id") \
                    .in_("group_id", group_ids) \
                    .execute()
                
                cg_data = cg_response.data or []
                
                # 3. Get all unique contact IDs
                all_contact_ids = list(set(cg["contact_id"] for cg in cg_data))
                
                # 4. Fetch all referenced contacts in one query
                if all_contact_ids:
                    contacts_response = supabase_client.table("contacts") \
                        .select("*") \
                        .eq("user_id", user.id) \
                        .in_("id", all_contact_ids) \
                        .execute()
                    
                    # Create a map of contact_id -> contact_obj
                    contacts_lookup = {c["id"]: c for c in contacts_response.data}
                    
                    # 5. Build the map of group_id -> list[contacts]
                    for cg in cg_data:
                        c_id = cg["contact_id"]
                        g_id = cg["group_id"]
                        if c_id in contacts_lookup:
                            contact_map[g_id].append(contacts_lookup[c_id])

        # Assemble the final response
        for group in groups_data:
            g_dict = dict(group)
            
            # Map label_color to color for frontend consistency
            if "label_color" in g_dict:
                g_dict["color"] = g_dict["label_color"]
            
            # Attach contacts if requested
            if include_contacts:
                g_dict["contacts"] = contact_map.get(g_dict["id"], [])
                
            groups.append(g_dict)
        
        return groups
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching groups: {str(e)}")

@router.post("/")
@limiter.limit(RateLimits.GROUPS)
def create_group(group_request: GroupRequest, request: Request, user=Depends(get_current_user)):
    try:
        response = supabase_client.table("groups").insert({
            "user_id": user.id,
            "name": group_request.name,
            "label_color": group_request.color,  # Map 'color' to 'label_color' for DB
            "description": group_request.description
        }).execute()
        
        # Map label_color to color for frontend consistency
        groups = []
        for group in response.data:
            group_data = dict(group)
            if "label_color" in group_data:
                group_data["color"] = group_data["label_color"]
            groups.append(group_data)
        
        return groups
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating group: {str(e)}")


@router.delete("/{group_id}")
@limiter.limit(RateLimits.GROUPS)
def delete_group(group_id: str, request: Request, user=Depends(get_current_user)):
    try:
        response = supabase_client.table("groups") \
            .delete() \
            .eq("id", group_id) \
            .eq("user_id", user.id) \
            .execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Group not found")

        return {"message": "Group deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting groups: {str(e)}")


@router.patch("/{group_id}")
@limiter.limit(RateLimits.GROUPS)
def edit_group(group_id: str, edit_request: editGroupRequest, request: Request, user=Depends(get_current_user)):
    try:
        # Create update dictionary with only non-None values and map field names
        update_data = {}
        for k, v in edit_request.dict().items():
            if v is not None:
                if k == "color":
                    update_data["label_color"] = v  # Map 'color' to 'label_color' for DB
                else:
                    update_data[k] = v
        
        # Only proceed if there are fields to update
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        response = supabase_client.table("groups") \
            .update(update_data) \
            .eq("id", group_id) \
            .eq("user_id", user.id) \
            .execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Group not found")

        # Map label_color to color for frontend consistency
        group_data = dict(response.data[0])
        if "label_color" in group_data:
            group_data["color"] = group_data["label_color"]
        
        return group_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating group: {str(e)}")


@router.get("/{group_id}/contacts")
@limiter.limit(RateLimits.GROUPS)
def get_group_contacts(group_id: str, request: Request, user=Depends(get_current_user)):
    """Get all contacts that belong to a specific group"""
    try:
        # First verify the group belongs to the user
        group_response = supabase_client.table("groups") \
            .select("*") \
            .eq("id", group_id) \
            .eq("user_id", user.id) \
            .execute()
        
        if not group_response.data:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Get all contact IDs in this group from contact_groups junction table
        contact_groups_response = supabase_client.table("contact_groups") \
            .select("contact_id") \
            .eq("group_id", group_id) \
            .execute()
        
        if not contact_groups_response.data:
            return []
        
        contact_ids = [cg["contact_id"] for cg in contact_groups_response.data]
        
        if not contact_ids:
            return []
        
        # Get all contacts with these IDs that belong to the user
        contacts_response = supabase_client.table("contacts") \
            .select("*") \
            .eq("user_id", user.id) \
            .in_("id", contact_ids) \
            .execute()
        
        return contacts_response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching group contacts: {str(e)}")




'''

post group
patch group
delete group
get all contact ids in group id 
get all group ids in contact id
get all group list



use module contact_groups
'''



