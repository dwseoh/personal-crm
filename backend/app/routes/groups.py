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
def list_groups(request: Request, user=Depends(get_current_user)):
    try:
        response = supabase_client.table("groups") \
            .select("*") \
            .eq("user_id", user.id) \
            .execute()
        
        # Map label_color to color for frontend consistency
        groups = []
        for group in response.data:
            group_data = dict(group)
            if "label_color" in group_data:
                group_data["color"] = group_data["label_color"]
            groups.append(group_data)
        
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




'''

post group
patch group
delete group
get all contact ids in group id 
get all group ids in contact id
get all group list



use module contact_groups
'''



