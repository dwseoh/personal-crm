from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from app.core.database import supabase_client
from app.core.rate_limiter import limiter, RateLimits
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

        # Create user profile in users table
        try:
            supabase_client.table("users").insert({
                "id": auth_response.user.id,
                "email": signup_request.email,
                "name": signup_request.name
            }).execute()
        except Exception as profile_error:
            logger.error(f"Profile creation failed for {signup_request.email}: {str(profile_error)}")
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
                # Create missing profile
                supabase_client.table("users").insert({
                    "id": auth_response.user.id,
                    "email": auth_response.user.email,
                    "name": auth_response.user.user_metadata.get("name") if auth_response.user.user_metadata else None
                }).execute()
                logger.info(f"Created missing profile for verified user: {auth_response.user.email}")
        except Exception as profile_error:
            logger.error(f"Profile check/creation failed for {auth_response.user.email}: {str(profile_error)}")

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



