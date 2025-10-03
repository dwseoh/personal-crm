# Auth Sync System

This system keeps your Supabase Auth users synchronized with your custom `users` table.

## Problem Solved

- **Orphaned Users**: When users are deleted from Supabase Auth, they remain in your `users` table
- **Missing Profiles**: When users sign up through Auth but profile creation fails
- **Email Updates**: When users change their email in Auth, it doesn't update in your `users` table

## Components

### 1. Database Triggers (Automatic Sync)

Run the SQL in `migrations/auth_sync_triggers.sql` in your Supabase SQL editor to set up:

- **Auto-delete**: When a user is deleted from Auth, automatically delete from `users` table
- **Auto-update**: When email changes in Auth, automatically update in `users` table
- **Row Level Security**: Proper permissions for user data access

### 2. AuthSyncManager (Manual Sync)

Python class in `app/auth_sync.py` that provides:

- `cleanup_orphaned_users()` - Remove users from `users` table that don't exist in Auth
- `create_missing_profiles()` - Create profiles for Auth users without them
- `sync_all()` - Run complete sync (cleanup + create missing)

### 3. Admin API Endpoints

Added to your auth router:

- `POST /auth/admin/sync` - Run complete sync
- `GET /auth/admin/orphaned-users` - Check for orphaned users
- `DELETE /auth/admin/cleanup-orphaned` - Clean up orphaned users
- `GET /auth/admin/missing-profiles` - Check for missing profiles
- `POST /auth/admin/create-missing-profiles` - Create missing profiles
- `DELETE /auth/admin/delete-user/{user_id}` - Delete user from both Auth and users table

### 4. Command Line Script

Run `python sync_users.py` for manual sync operations:

```bash
# Run complete sync
python sync_users.py sync

# Check for orphaned users (no cleanup)
python sync_users.py check-orphaned

# Check for missing profiles (no creation)
python sync_users.py check-missing
```

## Setup Instructions

### 1. Run Database Migrations

Copy and run the SQL from `migrations/auth_sync_triggers.sql` in your Supabase SQL editor.

### 2. Verify Environment Variables

Make sure your `.env` has:
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 3. Test the System

```bash
# Check current state
python sync_users.py check-orphaned
python sync_users.py check-missing

# Run sync if needed
python sync_users.py sync
```

### 4. Use Admin Endpoints

You can also use the API endpoints:

```bash
# Check sync status
curl -X GET http://localhost:8000/auth/admin/orphaned-users
curl -X GET http://localhost:8000/auth/admin/missing-profiles

# Run sync
curl -X POST http://localhost:8000/auth/admin/sync
```

## How It Works

### Automatic Sync (Recommended)

Once you run the database migrations, sync happens automatically:

1. User deleted from Auth → Automatically deleted from `users` table
2. User email updated in Auth → Automatically updated in `users` table

### Manual Sync (Backup/Recovery)

Use when automatic sync fails or for existing data:

1. **Orphaned Users**: Users in `users` table but not in Auth (deleted externally)
2. **Missing Profiles**: Users in Auth but not in `users` table (signup failures)

### Improved Signup Process

The updated signup process now:

1. Creates user in Supabase Auth
2. Creates profile in `users` table using AuthSyncManager
3. If profile creation fails, cleans up the Auth user (rollback)

## Monitoring

### Regular Checks

Run periodic checks to ensure sync:

```bash
# Add to cron job or scheduled task
python sync_users.py check-orphaned
python sync_users.py check-missing
```

### API Monitoring

Monitor the admin endpoints in your application dashboard.

### Logs

All sync operations are logged. Check your application logs for:
- Successful syncs
- Failed operations
- Orphaned user cleanups
- Missing profile creations

## Security Notes

- Admin endpoints should be protected in production
- Service role key has elevated permissions - keep secure
- Row Level Security policies protect user data access
- Regular users can only access their own data

## Troubleshooting

### "Admin client not available"
- Check `SUPABASE_SERVICE_ROLE_KEY` in your `.env`
- Verify the service role key is correct

### "Permission denied"
- Run the database migrations to set up proper policies
- Check that your service role key has admin permissions

### Sync not working automatically
- Verify database triggers are installed
- Check Supabase logs for trigger errors
- Ensure RLS policies allow the operations