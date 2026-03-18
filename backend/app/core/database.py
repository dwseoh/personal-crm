from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()  # take environment variables from .env.

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
service_role_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Regular client for normal operations
supabase_client: Client = create_client(url, key)

# Admin client for admin operations (user management, etc.)
supabase_admin: Client = create_client(url, service_role_key) if service_role_key else None