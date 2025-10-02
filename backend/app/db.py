from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()  # take environment variables from .env.

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

supabase_client: Client = create_client(url, key)
