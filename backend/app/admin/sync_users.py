#!/usr/bin/env python3
"""
User Sync Script - Run this to manually sync users between Supabase Auth and your users table
"""
import sys
import os

# Add the parent directories to the path so we can import from backend
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

from app.core.auth_sync import AuthSyncManager, sync_all
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def main():
    """Main sync function"""
    print("🔄 Starting user sync between Supabase Auth and users table...")
    
    try:
        # Run complete sync
        result = sync_all()
        
        print("✅ Sync completed successfully!")
        print(f"   - Orphaned users cleaned: {result['orphaned_users_cleaned']}")
        print(f"   - Missing profiles created: {result['missing_profiles_created']}")
        
        if result['orphaned_users_cleaned'] == 0 and result['missing_profiles_created'] == 0:
            print("   - Everything was already in sync! 🎉")
            
    except Exception as e:
        print(f"❌ Sync failed: {str(e)}")
        logger.error(f"Sync error: {str(e)}")
        return 1
    
    return 0


def check_orphaned():
    """Check for orphaned users without cleaning them"""
    print("🔍 Checking for orphaned users...")
    
    try:
        orphaned = AuthSyncManager.get_orphaned_users()
        
        if orphaned:
            print(f"⚠️  Found {len(orphaned)} orphaned users:")
            for user in orphaned:
                print(f"   - {user['email']} (ID: {user['id']})")
        else:
            print("✅ No orphaned users found!")
            
    except Exception as e:
        print(f"❌ Check failed: {str(e)}")
        return 1
    
    return 0


def check_missing():
    """Check for missing profiles without creating them"""
    print("🔍 Checking for missing user profiles...")
    
    try:
        missing = AuthSyncManager.get_missing_profiles()
        
        if missing:
            print(f"⚠️  Found {len(missing)} users without profiles:")
            for user in missing:
                print(f"   - {user.email} (ID: {user.id})")
        else:
            print("✅ All auth users have profiles!")
            
    except Exception as e:
        print(f"❌ Check failed: {str(e)}")
        return 1
    
    return 0


if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "check-orphaned":
            sys.exit(check_orphaned())
        elif command == "check-missing":
            sys.exit(check_missing())
        elif command == "sync":
            sys.exit(main())
        else:
            print("Usage: python sync_users.py [sync|check-orphaned|check-missing]")
            print("  sync           - Run complete sync (default)")
            print("  check-orphaned - Check for orphaned users only")
            print("  check-missing  - Check for missing profiles only")
            sys.exit(1)
    else:
        # Default action is sync
        sys.exit(main())