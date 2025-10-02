'''
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import requests
import os
import dotenv

dotenv.load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))

app = FastAPI()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ADMIN_SECRET = os.getenv("ADMIN_SECRET")  # a secret string

class VerifyUserRequest(BaseModel):
    user_id: str

@app.post("/auth/verify-user")
def verify_user(
    request: VerifyUserRequest,
    x_admin_secret: str = Header(None)  # client must send this header
):
    if x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    url = f"{SUPABASE_URL}/auth/v1/admin/users/{request.user_id}"

    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }

    body = {
        "email_confirmed_at": "2025-09-30T00:00:00Z"
    }

    response = requests.put(url, headers=headers, json=body)

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json())

    return {"message": "User email verified", "data": response.json()}

'''

'''

# FastAPI or Python script
import os
import requests
import dotenv

dotenv.load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

url = f"{SUPABASE_URL}/auth/v1/admin/users"
headers = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
}
res = requests.get(url, headers=headers)
print(res.json())  # find the user ID
'''
import os
import requests
from dotenv import load_dotenv
from datetime import datetime

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

user_id = "1ed3c61a-8821-4a43-90ce-3de58149ef9c"  # replace with actual ID

url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}
body = {
    "email_confirmed_at": datetime.utcnow().isoformat() + "Z"
}

res = requests.put(url, headers=headers, json=body)
print(res.status_code)
print(res.json())
