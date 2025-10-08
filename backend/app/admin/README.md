# Admin Tools

This directory contains administrative tools for managing your Personal CRM system.

## 🛠️ Available Tools

### 1. **admin_client.py** - Interactive Admin Client
Menu-driven tool for managing users and sync operations.

```bash
python admin_client.py
```

**Features:**
- Test admin authentication
- Check for orphaned users
- Check for missing profiles  
- Run complete user sync
- Clean up orphaned users
- Create missing profiles
- Check user verification status

### 2. **sync_users.py** - Command Line Sync Tool
Automated script for user synchronization between Supabase Auth and your users table.

```bash
# Run complete sync
python sync_users.py sync

# Check for orphaned users only
python sync_users.py check-orphaned

# Check for missing profiles only  
python sync_users.py check-missing
```

### 3. **test_verification.py** - Email Verification Tester
Test script for email verification endpoints.

```bash
python test_verification.py
```

**Tests:**
- Resend verification email
- Email verification with token
- Verification status check

### 4. **verify.py** - Manual User Verification
Direct script to manually verify a user's email in Supabase Auth.

```bash
# Edit the user_id in the file, then run:
python verify.py
```

## 🚀 Quick Start

1. **Navigate to admin directory:**
   ```bash
   cd backend/app/admin
   ```

2. **Ensure your environment is set up:**
   ```bash
   # Make sure your .env file has:
   ADMIN_SECRET=your_admin_secret
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Run the interactive admin client:**
   ```bash
   python admin_client.py
   ```

## 📋 Common Tasks

### Daily Maintenance
```bash
python sync_users.py check-orphaned  # Check for issues
python sync_users.py sync            # Fix any issues
```

### After User Management
```bash
python sync_users.py cleanup-orphaned      # After deleting users
python sync_users.py create-missing-profiles  # After bulk imports
```

### Manual User Verification
```bash
# Edit verify.py with the user ID, then:
python verify.py
```

### Testing Email System
```bash
python test_verification.py  # Test verification endpoints
```

## 🔒 Security Notes

- All tools require proper environment variables
- Admin secret is required for API access
- Service role key needed for Supabase admin operations
- Never commit secrets to version control

## 📚 Documentation

- See `../../docs/AUTH_SYNC_README.md` for detailed sync system documentation
- See `../../docs/VERIFICATION_ENDPOINTS.md` for API endpoint documentation