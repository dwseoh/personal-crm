from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from app.core.database import supabase_client
from app.core.rate_limiter import limiter, RateLimits
from app.auth import get_current_user

router = APIRouter(prefix="/user", tags=["user"])

# ---------------------------
# Models
# ---------------------------

class editUserInfoRequest(BaseModel):
    name: str | None = None
    phone: str | None = None
    profile_data: list | None = None

class editUserEmailRequest(BaseModel):
    email: str

class editUserPasswordRequest(BaseModel):
    new_password: str

# ---------------------------
# Routes
# ---------------------------

@router.patch("/edit/info")
@limiter.limit(RateLimits.USERS)
def edit_contact (edit_request: editUserInfoRequest, request: Request, user=Depends(get_current_user)):
    try:
        # Create update dictionary with only non-None values
        update_data = {
            k: v for k, v in edit_request.dict().items() 
            if v is not None
        }
        
        # Only proceed if there are fields to update
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        response = supabase_client.table("users") \
            .update(update_data) \
            .eq("user_id", user.id) \
            .execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")

        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating contact: {str(e)}")


