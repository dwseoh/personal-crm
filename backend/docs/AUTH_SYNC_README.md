# Auth Sync System

This system keeps your Supabase Auth users synchronized with your custom `users` table in your Personal CRM.


## 🏗️ System Architecture

```
Supabase Auth ←→ Database Triggers ←→ Custom Users Table
     ↕                                        ↕
Admin Tools ←→ AuthSyncManager ←→ Manual Sync Scripts
```

## 📁 File Structure

```
backend/
├── app/core/
│   ├── database.py          # Supabase client setup
│   └── auth_sync.py         # AuthSyncManager class
├── admin/
│   ├── admin_client.py      # Interactive admin tool
│   └── sync_users.py        # Command-line sync script
├── migrations/
│   └── auth_sync_triggers.sql # Database triggers
└── docs/
    ├── AUTH_SYNC_README.md  # This file
    └── VERIFICATION_ENDPOINTS.md
```

## 🚀 Quick Start

### 1. Set Up Database Triggers (One-time setup)
```bash
# Copy SQL from migrations/auth_sync_triggers.sql
# Run it in your Supabase SQL editor
```

### 2. Run Manual Sync
```bash
# From backend directory
cd admin
python sync_users.py sync
```

### 3. Use Interactive Admin Tool
```bash
cd admin
python admin_client.py
```

## 🔧 Components

### 1. **Database Triggers** (Automatic)
- **Location**: `migrations/auth_sync_triggers.sql`
- **Purpose**: Real-time sync when users are deleted/updated in Auth
- **Setup**: Run once in Supabase SQL editor

### 2. **AuthSyncManager** (Core Logic)
- **Location**: `app/core/auth_sync.py`
- **Purpose**: Python class handling all sync operations
- **Methods**:
  - `cleanup_orphaned_users()` - Remove orphaned users
  - `create_missing_profiles()` - Create missing profiles
  - `sync_all()` - Complete sync operation

### 3. **Admin Tools** (Management)
- **admin_client.py**: Interactive menu-driven tool
- **sync_users.py**: Command-line script for automation

### 4. **API Endpoints** (Programmatic Access)
All require `X-Admin-Secret` header:
- `POST /auth/admin/sync` - Run complete sync
- `GET /auth/admin/orphaned-users` - Check orphaned users
- `DELETE /auth/admin/cleanup-orphaned` - Clean orphaned users
- `GET /auth/admin/missing-profiles` - Check missing profiles
- `POST /auth/admin/create-missing-profiles` - Create missing profiles

## 📋 Setup Instructions

### Step 1: Database Setup
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the SQL from `migrations/auth_sync_triggers.sql`
4. Run the SQL to create triggers and policies

### Step 2: Environment Variables
Ensure your `.env` file has:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Required for admin operations
ADMIN_SECRET=your_admin_secret                   # Required for API access
```

### Step 3: Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Step 4: Test the System
```bash
# Navigate to admin directory
cd admin

# Check current sync status
python sync_users.py check-orphaned
python sync_users.py check-missing

# Run complete sync if needed
python sync_users.py sync
```

## 🎮 How to Use

### Command Line Tools

#### Quick Sync Script
```bash
cd backend/admin
python sync_users.py [command]
```

**Commands:**
- `sync` - Run complete sync (default)
- `check-orphaned` - Check for orphaned users only
- `check-missing` - Check for missing profiles only

#### Interactive Admin Client
```bash
cd backend/admin
python admin_client.py
```

**Features:**
- Menu-driven interface
- Test admin authentication
- Check and fix sync issues
- User verification status lookup

### API Endpoints

All admin endpoints require `X-Admin-Secret` header:

```bash
# Check sync status
curl -X GET "http://localhost:8000/auth/admin/orphaned-users" \
  -H "X-Admin-Secret: your_admin_secret"

# Run complete sync
curl -X POST "http://localhost:8000/auth/admin/sync" \
  -H "X-Admin-Secret: your_admin_secret"
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

## 📊 Monitoring & Maintenance

### Automated Monitoring
Set up periodic checks with cron jobs:
```bash
# Add to your crontab (runs daily at 2 AM)
0 2 * * * cd /path/to/backend/admin && python sync_users.py check-orphaned
```

### Manual Monitoring
```bash
# Quick health check
cd backend/admin
python sync_users.py check-orphaned
python sync_users.py check-missing

# Interactive monitoring
python admin_client.py
```

### Logs & Debugging
All operations are logged with timestamps:
- ✅ Successful syncs
- ❌ Failed operations  
- 🧹 Orphaned user cleanups
- 👤 Missing profile creations

## 🔒 Security

### Admin Authentication
- **API Endpoints**: Require `X-Admin-Secret` header
- **Environment Variables**: Store secrets in `.env` (never in code)
- **Service Role**: Has elevated Supabase permissions

### Data Protection
- **Row Level Security**: Users can only access their own data
- **Admin Access**: Controlled via environment variables
- **Audit Trail**: All operations are logged

## 🐛 Troubleshooting

### Common Issues

**"Admin client not available"**
```bash
# Check your .env file has:
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**"Permission denied"**
```bash
# 1. Run database migrations first
# 2. Verify service role key is correct
# 3. Check Supabase project permissions
```

**"Module not found"**
```bash
# Make sure you're in the right directory
cd backend/admin
python sync_users.py

# Or install dependencies
cd backend
pip install -r requirements.txt
```

**Sync not working automatically**
```bash
# 1. Check database triggers are installed
# 2. Verify RLS policies in Supabase
# 3. Check Supabase logs for errors
```

### Getting Help

1. **Check logs** for detailed error messages
2. **Run test commands** to isolate issues
3. **Verify environment** variables are set correctly
4. **Test database connection** with admin client

## 🔄 Workflow Examples

### Daily Maintenance
```bash
cd backend/admin
python sync_users.py check-orphaned  # Check for issues
python sync_users.py sync            # Fix any issues found
```

### After User Management
```bash
# After manually deleting users in Supabase dashboard
python sync_users.py cleanup-orphaned

# After bulk user imports
python sync_users.py create-missing-profiles
```

### Production Deployment
```bash
# Set up monitoring
python admin_client.py  # Test admin access
python sync_users.py sync  # Initial sync
# Add cron job for daily checks
```