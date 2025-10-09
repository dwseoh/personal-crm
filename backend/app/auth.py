from fastapi import APIRouter, Depends, HTTPException, Header, Request
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from app.core.database import supabase_client, supabase_admin
from app.core.auth_sync import AuthSyncManager
from app.core.rate_limiter import limiter, RateLimits
from datetime import datetime, timezone
import logging
import os

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


class VerifyEmailRequest(BaseModel):
    token: str
    type: str  # "signup" or "email_change"


class ResendVerificationRequest(BaseModel):
    email: str


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


def verify_admin_secret(x_admin_secret: str = Header(None)):
    """Verify admin secret key from header"""
    admin_secret = os.getenv("ADMIN_SECRET")
    
    if not admin_secret:
        raise HTTPException(status_code=500, detail="Admin secret not configured")
    
    if not x_admin_secret:
        raise HTTPException(
            status_code=401, 
            detail="Admin secret required. Include X-Admin-Secret header"
        )
    
    if x_admin_secret != admin_secret:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    
    return True


def verify_admin_user(current_user = Depends(get_current_user)):
    """Verify user is an admin (alternative method using user roles)"""
    # This would check if the user has admin role in your users table
    # For now, we'll use the secret method above
    try:
        # Check if user has admin role in your users table
        user_result = supabase_client.table("users").select("role").eq("id", current_user.id).execute()
        
        if not user_result.data or user_result.data[0].get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        return current_user
    except Exception as e:
        raise HTTPException(status_code=403, detail="Admin verification failed")


# ---------------------------
# Routes
# ---------------------------

@router.post("/signup")
@limiter.limit(RateLimits.SIGNUP)
def signup(signup_request: SignupRequest, request: Request):
    try:
        auth_response = supabase_client.auth.sign_up({
            "email": signup_request.email,
            "password": signup_request.password,
        })

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Signup failed")

        # Use AuthSyncManager to create user profile
        try:
            AuthSyncManager.create_user_profile(
                user_id=auth_response.user.id,
                email=signup_request.email,
                name=signup_request.name
            )
        except Exception as profile_error:
            # If profile creation fails, we should clean up the auth user
            logger.error(f"Profile creation failed for {signup_request.email}: {str(profile_error)}")
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
@limiter.limit(RateLimits.LOGIN)
def login(login_request: LoginRequest, request: Request):
    try:
        auth_response = supabase_client.auth.sign_in_with_password({
            "email": login_request.email,
            "password": login_request.password,
        })

        if not auth_response.session or not auth_response.session.access_token:
            raise HTTPException(status_code=401, detail="Login failed")

        return {"access_token": auth_response.session.access_token, "token_type": "bearer", "user_id": auth_response.user.id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")


@router.post("/verify-email")
@limiter.limit(RateLimits.EMAIL_VERIFICATION)
def verify_email(verify_request: VerifyEmailRequest, request: Request):
    """Verify user email with token from Supabase"""
    try:
        # Verify the email with Supabase
        auth_response = supabase_client.auth.verify_otp({
            "token": verify_request.token,
            "type": verify_request.type
        })

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Invalid or expired verification token")

        # Check if user profile exists, create if missing
        try:
            profile_result = supabase_client.table("users").select("*").eq("id", auth_response.user.id).execute()
            
            if not profile_result.data:
                # Create missing profile (this can happen if verification happens after signup)
                AuthSyncManager.create_user_profile(
                    user_id=auth_response.user.id,
                    email=auth_response.user.email,
                    name=auth_response.user.user_metadata.get("name") if auth_response.user.user_metadata else None
                )
                logger.info(f"Created missing profile for verified user: {auth_response.user.email}")
        
        except Exception as profile_error:
            logger.error(f"Profile check/creation failed for {auth_response.user.email}: {str(profile_error)}")
            # Don't fail verification if profile creation fails, just log it

        return {
            "message": "Email verified successfully",
            "user": {
                "id": auth_response.user.id,
                "email": auth_response.user.email,
                "email_confirmed_at": auth_response.user.email_confirmed_at
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification error: {str(e)}")


@router.post("/resend-verification")
@limiter.limit(RateLimits.RESEND_EMAIL)
def resend_verification(resend_request: ResendVerificationRequest, request: Request):
    """Resend email verification"""
    try:
        # Resend verification email
        auth_response = supabase_client.auth.resend({
            "type": "signup",
            "email": resend_request.email
        })

        return {"message": "Verification email sent successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resend error: {str(e)}")


@router.get("/verify-status/{user_id}")
@limiter.limit(RateLimits.ADMIN)
def get_verification_status(user_id: str, request: Request, admin_verified: bool = Depends(verify_admin_secret)):
    """Check if user email is verified (Admin only)"""
    try:
        if not supabase_admin:
            raise HTTPException(status_code=500, detail="Admin operations not available")
            
        user_response = supabase_admin.auth.admin.get_user_by_id(user_id)
        
        if not user_response.user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "user_id": user_id,
            "email": user_response.user.email,
            "email_confirmed_at": user_response.user.email_confirmed_at,
            "is_verified": user_response.user.email_confirmed_at is not None
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check error: {str(e)}")


# ---------------------------
# Admin Routes for Auth Sync
# ---------------------------

# have to make sure these arent publically accessible

@router.post("/admin/sync")
@limiter.limit(RateLimits.ADMIN)
def sync_auth_users(request: Request, admin_verified: bool = Depends(verify_admin_secret)):
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
@limiter.limit(RateLimits.ADMIN)
def get_orphaned_users(request: Request, admin_verified: bool = Depends(verify_admin_secret)):
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
@limiter.limit(RateLimits.ADMIN)
def cleanup_orphaned_users(request: Request, admin_verified: bool = Depends(verify_admin_secret)):
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
@limiter.limit(RateLimits.ADMIN)
def get_missing_profiles(request: Request, admin_verified: bool = Depends(verify_admin_secret)):
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
@limiter.limit(RateLimits.ADMIN)
def create_missing_profiles(request: Request, admin_verified: bool = Depends(verify_admin_secret)):
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
@limiter.limit(RateLimits.ADMIN)
def delete_user_completely(user_id: str, request: Request, admin_verified: bool = Depends(verify_admin_secret)):
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
