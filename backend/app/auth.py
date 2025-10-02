from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from app.db import supabase_client
from datetime import datetime, timezone

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

        # Insert user profile into `users` table
        supabase_client.table("users").insert({
            "id": auth_response.user.id,
            "email": request.email,
            "name": request.name,
            "join_date": datetime.now(timezone.utc).isoformat(),
        }).execute()

        return {"message": "User created successfully. Please verify your email."}

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
