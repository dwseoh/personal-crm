from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from app.db import supabase_client, supabase_admin
from app.auth_sync import AuthSyncManager
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# ---------------------------
# Request Models
# ---------------------------
class SignupRequest(BaseModel):
    email: str
    password: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ---------------------------
# Helpers
# ---------------------------
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        user = supabase_client.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return user.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token error: {str(e)}")


# ---------------------------
# Routes
# ---------------------------

@router.post("/signup")
def signup(request: SignupRequest):
    try:
        auth_response = supabase_client.auth.sign_up({
            "email": request.email,
            "password": request.password,
        })

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Signup failed")

        # Use AuthSyncManager to create user profile
        try:
            AuthSyncManager.create_user_profile(
                user_id=auth_response.user.id,
                email=request.email,
                name=request.name
            )
        except Exception as profile_error:
            # If profile creation fails, we should clean up the auth user
            logger.error(f"Profile creation failed for {request.email}: {str(profile_error)}")
            try:
                if supabase_admin:
                    supabase_admin.auth.admin.delete_user(auth_response.user.id)
            except:
                pass  # Best effort cleanup
            raise HTTPException(status_code=500, detail="Failed to create user profile")

        return {"message": "User created successfully. Please verify your email."}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Signup error: {str(e)}")


@router.post("/login")
def login(request: LoginRequest):
    try:
        auth_response = supabase_client.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password,
        })

        if not auth_response.session or not auth_response.session.access_token:
            raise HTTPException(status_code=401, detail="Login failed")

        return {"access_token": auth_response.session.access_token, "token_type": "bearer"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")


# ---------------------------
# Admin Routes for Auth Sync
# ---------------------------

@router.post("/admin/sync")
def sync_auth_users():
    """Admin endpoint to sync auth users with users table"""
    try:
        result = AuthSyncManager.sync_all()
        return {
            "message": "Sync completed successfully",
            "details": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync error: {str(e)}")


@router.get("/admin/orphaned-users")
def get_orphaned_users():
    """Admin endpoint to check for orphaned users in users table"""
    try:
        orphaned = AuthSyncManager.get_orphaned_users()
        return {
            "orphaned_users": orphaned,
            "count": len(orphaned)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking orphaned users: {str(e)}")


@router.delete("/admin/cleanup-orphaned")
def cleanup_orphaned_users():
    """Admin endpoint to remove orphaned users from users table"""
    try:
        count = AuthSyncManager.cleanup_orphaned_users()
        return {
            "message": f"Cleaned up {count} orphaned users",
            "count": count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup error: {str(e)}")


@router.get("/admin/missing-profiles")
def get_missing_profiles():
    """Admin endpoint to check for auth users without profiles"""
    try:
        missing = AuthSyncManager.get_missing_profiles()
        return {
            "missing_profiles": [{"id": u.id, "email": u.email} for u in missing],
            "count": len(missing)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking missing profiles: {str(e)}")


@router.post("/admin/create-missing-profiles")
def create_missing_profiles():
    """Admin endpoint to create missing user profiles"""
    try:
        count = AuthSyncManager.create_missing_profiles()
        return {
            "message": f"Created {count} missing profiles",
            "count": count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile creation error: {str(e)}")


@router.delete("/admin/delete-user/{user_id}")
def delete_user_completely(user_id: str):
    """Admin endpoint to delete user from both auth and users table"""
    try:
        # Delete from users table first
        AuthSyncManager.delete_user_profile(user_id)
        
        # Then delete from auth
        if not supabase_admin:
            raise HTTPException(status_code=500, detail="Admin operations not available")
        supabase_admin.auth.admin.delete_user(user_id)
        
        return {"message": f"User {user_id} deleted completely"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete error: {str(e)}")
