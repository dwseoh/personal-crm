from fastapi import APIRouter, HTTPException, Request
from app.core.database import supabase_client


# ---------------------------
# Routes
# ---------------------------


#need to account for when they get rid of the group tag, have to delete