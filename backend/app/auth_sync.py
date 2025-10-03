"""
Auth Sync Module - Handles synchronization between Supabase Auth and custom users table
"""
from app.db import supabase_client, supabase_admin
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


class AuthSyncManager:
    """Manages synchronization between Supabase Auth and users table"""
    
    @staticmethod
    def create_user_profile(user_id: str, email: str, name: str = None):
        """Create user profile in users table after successful auth signup"""
        try:
            user_data = {
                "id": user_id,
                "email": email,
                "join_date": datetime.now(timezone.utc).isoformat(),
            }
            
            if name:
                user_data["name"] = name
                
            result = supabase_client.table("users").insert(user_data).execute()
            logger.info(f"Created user profile for {user_id}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to create user profile for {user_id}: {str(e)}")
            raise
    
    @staticmethod
    def delete_user_profile(user_id: str):
        """Delete user profile from users table"""
        try:
            result = supabase_client.table("users").delete().eq("id", user_id).execute()
            logger.info(f"Deleted user profile for {user_id}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to delete user profile for {user_id}: {str(e)}")
            raise
    
    @staticmethod
    def sync_user_email(user_id: str, new_email: str):
        """Update email in users table when changed in auth"""
        try:
            result = supabase_client.table("users").update({
                "email": new_email
            }).eq("id", user_id).execute()
            
            logger.info(f"Updated email for user {user_id}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to update email for {user_id}: {str(e)}")
            raise
    
    @staticmethod
    def get_orphaned_users():
        """Find users in users table that don't exist in auth"""
        try:
            # Get all users from custom table
            users_result = supabase_client.table("users").select("id, email").execute()
            custom_users = users_result.data
            
            orphaned_users = []
            
            for user in custom_users:
                try:
                    # Try to get user from auth using admin client
                    if supabase_admin:
                        auth_user = supabase_admin.auth.admin.get_user_by_id(user["id"])
                        if not auth_user.user:
                            orphaned_users.append(user)
                    else:
                        # Fallback: assume user exists if we can't check
                        logger.warning("No admin client available, skipping auth check")
                except:
                    # If we can't find the user in auth, they're orphaned
                    orphaned_users.append(user)
            
            return orphaned_users
            
        except Exception as e:
            logger.error(f"Failed to get orphaned users: {str(e)}")
            raise
    
    @staticmethod
    def cleanup_orphaned_users():
        """Remove users from users table that don't exist in auth"""
        try:
            orphaned_users = AuthSyncManager.get_orphaned_users()
            
            for user in orphaned_users:
                AuthSyncManager.delete_user_profile(user["id"])
                logger.info(f"Cleaned up orphaned user: {user['email']}")
            
            return len(orphaned_users)
            
        except Exception as e:
            logger.error(f"Failed to cleanup orphaned users: {str(e)}")
            raise
    
    @staticmethod
    def get_missing_profiles():
        """Find auth users that don't have profiles in users table"""
        try:
            # This requires admin access to list all auth users
            # Note: This might be limited by Supabase plan
            if not supabase_admin:
                raise Exception("Admin client not available - check SUPABASE_SERVICE_ROLE_KEY")
            
            auth_users_response = supabase_admin.auth.admin.list_users()
            auth_users = auth_users_response.users if hasattr(auth_users_response, 'users') else []
            
            missing_profiles = []
            
            for auth_user in auth_users:
                try:
                    # Check if profile exists
                    profile_result = supabase_client.table("users").select("id").eq("id", auth_user.id).execute()
                    
                    if not profile_result.data:
                        missing_profiles.append(auth_user)
                        
                except Exception as e:
                    logger.error(f"Error checking profile for {auth_user.id}: {str(e)}")
            
            return missing_profiles
            
        except Exception as e:
            logger.error(f"Failed to get missing profiles: {str(e)}")
            raise
    
    @staticmethod
    def create_missing_profiles():
        """Create profiles for auth users that don't have them"""
        try:
            missing_users = AuthSyncManager.get_missing_profiles()
            
            for auth_user in missing_users:
                AuthSyncManager.create_user_profile(
                    user_id=auth_user.id,
                    email=auth_user.email,
                    name=auth_user.user_metadata.get("name") if auth_user.user_metadata else None
                )
                logger.info(f"Created missing profile for: {auth_user.email}")
            
            return len(missing_users)
            
        except Exception as e:
            logger.error(f"Failed to create missing profiles: {str(e)}")
            raise


# Convenience functions
def sync_all():
    """Run complete sync - cleanup orphaned users and create missing profiles"""
    try:
        orphaned_count = AuthSyncManager.cleanup_orphaned_users()
        missing_count = AuthSyncManager.create_missing_profiles()
        
        return {
            "orphaned_users_cleaned": orphaned_count,
            "missing_profiles_created": missing_count
        }
        
    except Exception as e:
        logger.error(f"Failed to run complete sync: {str(e)}")
        raise