# Email Verification FastAPI Endpoints

## Available Endpoints

### 1. POST `/auth/verify-email`
**Purpose**: Verify user email with token from Supabase email

**Request Body**:
```json
{
  "token": "verification_token_from_email",
  "type": "signup"
}
```

**Response (Success)**:
```json
{
  "message": "Email verified successfully",
  "user": {
    "id": "user_uuid",
    "email": "user@example.com",
    "email_confirmed_at": "2024-01-01T12:00:00Z"
  }
}
```

**Response (Error)**:
```json
{
  "detail": "Invalid or expired verification token"
}
```

### 2. POST `/auth/resend-verification`
**Purpose**: Resend verification email to user

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response (Success)**:
```json
{
  "message": "Verification email sent successfully"
}
```

### 3. GET `/auth/verify-status/{user_id}`
**Purpose**: Check if a user's email is verified (Admin only)

**Headers Required**:
```
X-Admin-Secret: your_admin_secret_here
```

**Response (Success)**:
```json
{
  "user_id": "user_uuid",
  "email": "user@example.com",
  "email_confirmed_at": "2024-01-01T12:00:00Z",
  "is_verified": true
}
```

**Response (Unauthorized)**:
```json
{
  "detail": "Admin secret required. Include X-Admin-Secret header"
}
```

## Frontend Integration

### Verification Page
- Located at `/verify-email`
- Automatically processes verification tokens from email links
- Handles success, error, and expired token states
- Provides resend functionality for expired tokens

### Signup Flow
1. User signs up → Backend creates auth user and profile
2. Supabase sends verification email automatically
3. User clicks link in email → Redirected to `/verify-email?token=...&type=signup`
4. Frontend calls `/auth/verify-email` endpoint
5. On success → Redirect to login page with success message

### Login Page
- Shows success message when user comes from verification
- Includes "Resend Verification" component for unverified users

## Testing

### Manual Testing
1. Start your FastAPI server: `uvicorn app.main:app --reload`
2. Sign up a new user through your frontend
3. Check email for verification link
4. Click link to test verification flow

### API Testing
Use the test script:
```bash
python backend/test_verification.py
```

### cURL Examples

**Verify Email**:
```bash
curl -X POST "http://localhost:8000/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d '{"token": "your_token_here", "type": "signup"}'
```

**Resend Verification**:
```bash
curl -X POST "http://localhost:8000/auth/resend-verification" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Check Status** (Admin only):
```bash
curl -X GET "http://localhost:8000/auth/verify-status/user_uuid_here" \
  -H "X-Admin-Secret: your_admin_secret_here"
```

## Error Handling

The endpoints handle these scenarios:
- Invalid/expired tokens
- Missing user profiles (creates them automatically)
- Network errors
- Supabase API errors
- Missing admin permissions

## Admin Authentication

All admin endpoints (including `/verify-status`) require the `X-Admin-Secret` header:

```bash
curl -X GET "http://localhost:8000/auth/admin/sync" \
  -H "X-Admin-Secret: your_admin_secret_from_env"
```

The admin secret is configured in your `.env` file:
```
ADMIN_SECRET=your_secure_admin_secret_here
```

### Admin Endpoints
- `POST /auth/admin/sync` - Run complete user sync
- `GET /auth/admin/orphaned-users` - Check for orphaned users
- `DELETE /auth/admin/cleanup-orphaned` - Clean up orphaned users
- `GET /auth/admin/missing-profiles` - Check for missing profiles
- `POST /auth/admin/create-missing-profiles` - Create missing profiles
- `DELETE /auth/admin/delete-user/{user_id}` - Delete user completely
- `GET /auth/verify-status/{user_id}` - Check user verification status

### Using the Admin Client
```bash
python backend/admin_client.py
```

## Security Notes

- All admin endpoints require `X-Admin-Secret` header authentication
- Admin secret is stored in environment variables (never in code)
- `/verify-status` endpoint requires admin privileges
- Tokens are validated through Supabase Auth
- User profiles are automatically synced during verification
- Failed verifications don't expose sensitive information
- Unauthorized admin requests return 401/403 status codes