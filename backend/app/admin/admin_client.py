#!/usr/bin/env python3
"""
Admin Client - Script to interact with admin endpoints
"""
import sys
import os

# Add the parent directories to the path so we can import from backend
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

import requests
import json
from dotenv import load_dotenv

# Load environment variables from the backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), '../..', '.env'))

BASE_URL = "http://localhost:8000"
ADMIN_SECRET = os.getenv("ADMIN_SECRET")

def make_admin_request(method, endpoint, data=None):
    """Make an authenticated admin request"""
    headers = {
        "Content-Type": "application/json",
        "X-Admin-Secret": ADMIN_SECRET
    }
    
    url = f"{BASE_URL}{endpoint}"
    
    if method.upper() == "GET":
        response = requests.get(url, headers=headers)
    elif method.upper() == "POST":
        response = requests.post(url, headers=headers, json=data)
    elif method.upper() == "DELETE":
        response = requests.delete(url, headers=headers, json=data)
    else:
        raise ValueError(f"Unsupported method: {method}")
    
    return response

def sync_users():
    """Run complete user sync"""
    print("🔄 Running user sync...")
    response = make_admin_request("POST", "/auth/admin/sync")
    
    if response.status_code == 200:
        result = response.json()
        print("✅ Sync completed successfully!")
        print(f"   Details: {result['details']}")
    else:
        print(f"❌ Sync failed: {response.status_code}")
        print(f"   Error: {response.json()}")

def check_orphaned_users():
    """Check for orphaned users"""
    print("🔍 Checking for orphaned users...")
    response = make_admin_request("GET", "/auth/admin/orphaned-users")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Found {result['count']} orphaned users")
        if result['orphaned_users']:
            for user in result['orphaned_users']:
                print(f"   - {user['email']} (ID: {user['id']})")
    else:
        print(f"❌ Check failed: {response.status_code}")
        print(f"   Error: {response.json()}")

def check_missing_profiles():
    """Check for missing profiles"""
    print("🔍 Checking for missing profiles...")
    response = make_admin_request("GET", "/auth/admin/missing-profiles")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Found {result['count']} missing profiles")
        if result['missing_profiles']:
            for user in result['missing_profiles']:
                print(f"   - {user['email']} (ID: {user['id']})")
    else:
        print(f"❌ Check failed: {response.status_code}")
        print(f"   Error: {response.json()}")

def cleanup_orphaned():
    """Clean up orphaned users"""
    print("🧹 Cleaning up orphaned users...")
    response = make_admin_request("DELETE", "/auth/admin/cleanup-orphaned")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ {result['message']}")
    else:
        print(f"❌ Cleanup failed: {response.status_code}")
        print(f"   Error: {response.json()}")

def create_missing_profiles():
    """Create missing profiles"""
    print("👤 Creating missing profiles...")
    response = make_admin_request("POST", "/auth/admin/create-missing-profiles")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ {result['message']}")
    else:
        print(f"❌ Profile creation failed: {response.status_code}")
        print(f"   Error: {response.json()}")

def check_verification_status(user_id):
    """Check user verification status"""
    print(f"🔍 Checking verification status for user: {user_id}")
    response = make_admin_request("GET", f"/auth/verify-status/{user_id}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ User: {result['email']}")
        print(f"   Verified: {result['is_verified']}")
        print(f"   Confirmed at: {result['email_confirmed_at']}")
    else:
        print(f"❌ Status check failed: {response.status_code}")
        print(f"   Error: {response.json()}")

def test_admin_auth():
    """Test admin authentication"""
    print("🔐 Testing admin authentication...")
    
    # Test without admin secret
    headers = {"Content-Type": "application/json"}
    response = requests.get(f"{BASE_URL}/auth/admin/orphaned-users", headers=headers)
    
    if response.status_code == 401:
        print("✅ Properly blocked request without admin secret")
    else:
        print("❌ Security issue: Request without admin secret was allowed")
    
    # Test with wrong admin secret
    headers = {
        "Content-Type": "application/json",
        "X-Admin-Secret": "wrong-secret"
    }
    response = requests.get(f"{BASE_URL}/auth/admin/orphaned-users", headers=headers)
    
    if response.status_code == 403:
        print("✅ Properly blocked request with wrong admin secret")
    else:
        print("❌ Security issue: Request with wrong admin secret was allowed")
    
    # Test with correct admin secret
    response = make_admin_request("GET", "/auth/admin/orphaned-users")
    
    if response.status_code == 200:
        print("✅ Correctly allowed request with valid admin secret")
    else:
        print(f"❌ Valid admin request failed: {response.status_code}")

def main():
    """Main menu"""
    if not ADMIN_SECRET:
        print("❌ ADMIN_SECRET not found in environment variables")
        print("Make sure your .env file has ADMIN_SECRET set")
        return
    
    print("🔧 Personal CRM Admin Client")
    print("=" * 40)
    
    while True:
        print("\nAvailable commands:")
        print("1. Test admin authentication")
        print("2. Check orphaned users")
        print("3. Check missing profiles")
        print("4. Run complete sync")
        print("5. Cleanup orphaned users")
        print("6. Create missing profiles")
        print("7. Check user verification status")
        print("0. Exit")
        
        choice = input("\nEnter your choice (0-7): ").strip()
        
        if choice == "0":
            print("👋 Goodbye!")
            break
        elif choice == "1":
            test_admin_auth()
        elif choice == "2":
            check_orphaned_users()
        elif choice == "3":
            check_missing_profiles()
        elif choice == "4":
            sync_users()
        elif choice == "5":
            cleanup_orphaned()
        elif choice == "6":
            create_missing_profiles()
        elif choice == "7":
            user_id = input("Enter user ID: ").strip()
            if user_id:
                check_verification_status(user_id)
        else:
            print("❌ Invalid choice. Please try again.")

if __name__ == "__main__":
    main()