#!/usr/bin/env python3
"""
Test script for email verification endpoints
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_resend_verification():
    """Test resending verification email"""
    print("🧪 Testing resend verification...")
    
    # Replace with a test email
    test_email = "test@example.com"
    
    response = requests.post(
        f"{BASE_URL}/auth/resend-verification",
        json={"email": test_email}
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_verify_email():
    """Test email verification with a token"""
    print("🧪 Testing email verification...")
    
    # This would normally be a real token from the email
    test_token = "fake-token-for-testing"
    
    response = requests.post(
        f"{BASE_URL}/auth/verify-email",
        json={
            "token": test_token,
            "type": "signup"
        }
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_verification_status():
    """Test checking verification status"""
    print("🧪 Testing verification status check...")
    
    # Replace with a real user ID
    test_user_id = "fake-user-id"
    
    response = requests.get(f"{BASE_URL}/auth/verify-status/{test_user_id}")
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

if __name__ == "__main__":
    print("🚀 Testing Email Verification Endpoints")
    print("=" * 50)
    
    try:
        test_resend_verification()
        test_verify_email()
        test_verification_status()
        
        print("✅ All tests completed!")
        print("\nNote: Some tests may fail with fake data - that's expected.")
        print("Use real email/tokens/user IDs for actual testing.")
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to the server.")
        print("Make sure your FastAPI server is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Test error: {str(e)}")