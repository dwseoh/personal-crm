# personal-crm# Personal CRM Project - Complete README

## 📋 Project Overview

**Personal CRM** is a full-stack contact relationship management system built with modern web technologies. It enables users to organize, track, and analyze their professional and personal networks through an intuitive dashboard, comprehensive contact management, and intelligent insights.

**Tech Stack:**
- **Backend**: FastAPI (Python), Supabase (PostgreSQL), JWT Authentication
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, DaisyUI
- **Database**: PostgreSQL with Supabase

---

## 🎯 Key Features

### Authentication & Security
- Secure user registration with email verification
- JWT-based authentication tokens
- Role-based access control (RBAC) with admin features
- Automatic user profile synchronization
- Rate limiting on sensitive endpoints

### Contact Management
- Create, read, update, delete (CRUD) contacts with rich data
- Organize contacts into custom groups
- Track contact importance (1-5 scale)
- Store professional details (company, role, location)
- Add detailed notes and interaction history

### Dashboard & Analytics
- **KPI Cards**: Total contacts, new contacts, groups, top group, average importance, high-priority count
- **Interactive Charts**: 
  - Group distribution (donut chart)
  - Importance distribution (bar chart)
  - Location distribution (horizontal bar chart)
  - Role distribution (horizontal bar chart)
- **Smart Insights**:
  - Role clusters (group contacts by profession)
  - Company clusters (identify organizational networks)
  - Location hubs (geographic concentration)
  - Suggested groupings (AI-driven recommendations)
- **Contacts Table**: Sortable, filterable, searchable with pagination

### Interaction Tracking
- Log interactions (calls, emails, meetings, etc.)
- Track interaction direction (inbound/outbound)
- View interaction history per contact
- Timeline of all user interactions

---

## 📁 Project Structure

```
personal-crm/
├── backend/                          # FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI entry point
│   │   ├── auth.py                  # Authentication routes
│   │   ├── core/
│   │   │   ├── database.py          # Supabase client setup
│   │   │   ├── auth_sync.py         # User sync manager
│   │   │   └── rate_limiter.py      # Rate limiting
│   │   ├── routes/
│   │   │   ├── contacts.py          # Contact CRUD
│   │   │   ├── groups.py            # Group management
│   │   │   ├── interactions.py      # Interaction tracking
│   │   │   ├── dashboard.py         # Dashboard analytics
│   │   │   ├── user.py              # User profile
│   │   │   └── contact_groups.py    # Group assignments
│   │   └── admin/
│   │       ├── admin_client.py      # Admin CLI tool
│   │       └── sync_users.py        # User sync script
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env                          # Environment variables
│
├── frontend/my-app/                 # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx             # Home page
│   │   │   ├── layout.tsx           # Root layout
│   │   │   ├── globals.css          # Global styles
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── dashboard/
│   │   │   ├── contacts/
│   │   │   ├── groups/
│   │   │   └── components/
│   │   └── lib/
│   ├── tailwind.config.js
│   ├── next.config.js
│   └── package.json
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (via Supabase)
- Git

### Backend Setup

1. **Clone the repository:**
```bash
git clone <repo-url>
cd personal-crm/backend
```

2. **Create virtual environment:**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables:**
Create a `.env` file in the backend directory:
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_ADMIN_KEY=your_admin_key

# Admin
ADMIN_SECRET=your_admin_secret_key

# CORS
FRONTEND_URL=http://localhost:3000
```

5. **Run the backend:**
```bash
uvicorn app.main:app --reload
```

Backend runs on `http://localhost:8000`
- API docs: `http://localhost:8000/docs` (Swagger UI)
- ReDoc: `http://localhost:8000/redoc`

### Frontend Setup

1. **Navigate to frontend:**
```bash
cd frontend/my-app
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

4. **Run the frontend:**
```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

---

## 📚 API Documentation

### Authentication Endpoints

**POST /auth/signup**
- Register a new user
- Rate limited: 5 requests per hour
- Returns: JWT token

**POST /auth/login**
- Login with email and password
- Rate limited: 10 requests per hour
- Returns: JWT token

**POST /auth/verify-email**
- Verify email with verification token
- Rate limited: 3 requests per hour

**POST /auth/resend-verification**
- Resend verification email
- Rate limited: 2 requests per hour

### Contact Endpoints

**GET /contacts**
- List all user contacts
- Query params: `include_groups` (boolean)
- Returns: Array of contacts

**POST /contacts**
- Create a new contact
- Body: `{name, email, phone, notes, current_role, company, location, importance, groups}`
- Returns: Created contact

**PATCH /contacts/{contact_id}**
- Update contact (only provided fields)
- Body: Partial contact object
- Returns: Updated contact

**DELETE /contacts/{contact_id}**
- Delete a contact
- Returns: Success message

### Group Endpoints

**GET /groups**
- List all user groups
- Returns: Array of groups

**POST /groups**
- Create a new group
- Body: `{name, color, description}`
- Returns: Created group

**PATCH /groups/{group_id}**
- Update group details
- Returns: Updated group

**DELETE /groups/{group_id}**
- Delete a group
- Returns: Success message

### Interaction Endpoints

**GET /interactions/{contact_id}**
- Get interactions for a contact
- Returns: Array of interactions

**GET /interactions/user/all**
- Get all user interactions
- Returns: Array of interactions

**POST /interactions**
- Create a new interaction
- Body: `{contact_id, type, happened_at, direction, notes}`
- Returns: Created interaction

**PATCH /interactions/{interaction_id}**
- Update interaction
- Returns: Updated interaction

**DELETE /interactions/{interaction_id}**
- Delete an interaction
- Returns: Success message

### Dashboard Endpoints

**GET /dashboard/kpis**
- Get KPI metrics
- Returns: KPI data

**GET /dashboard/charts**
- Get chart data
- Returns: Chart datasets

**GET /dashboard/insights**
- Get intelligent insights
- Returns: Clusters and recommendations

---

## 🔐 Authentication Flow

1. **Sign Up**: User registers → Email verification sent → Profile created
2. **Login**: Credentials validated → JWT token issued
3. **Protected Routes**: Token included in Authorization header → Verified server-side
4. **Token Refresh**: Automatic refresh before expiration
5. **Logout**: Token invalidated on client

**Example API Request:**
```bash
curl -X GET "http://localhost:8000/contacts" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🗄️ Database Schema

### Tables

**users**
- id (UUID, PK)
- email (string, unique)
- created_at (timestamp)
- updated_at (timestamp)

**contacts**
- id (UUID, PK)
- user_id (UUID, FK → users)
- name (string)
- email (string)
- phone (string)
- company (string)
- current_role (string)
- location (string)
- importance (int 1-5)
- notes (text)
- created_at (timestamp)
- updated_at (timestamp)

**groups**
- id (UUID, PK)
- user_id (UUID, FK → users)
- name (string)
- color (string)
- description (text)
- created_at (timestamp)
- updated_at (timestamp)

**contact_groups** (Junction Table)
- contact_id (UUID, FK → contacts)
- group_id (UUID, FK → groups)
- created_at (timestamp)

**interactions**
- id (UUID, PK)
- user_id (UUID, FK → users)
- contact_id (UUID, FK → contacts)
- type (string)
- direction (enum: 'inbound', 'outbound')
- notes (text)
- happened_at (timestamp)
- created_at (timestamp)
- updated_at (timestamp)

---

## 📊 Dashboard Features

### KPI Cards
- **Total Contacts**: Count of all contacts
- **New Contacts**: Contacts created this month with trend
- **Total Groups**: Number of groups
- **Largest Group**: Group with most contacts
- **Average Importance**: Mean importance score
- **High Priority**: Count of importance >= 4

### Charts
- **Group Distribution**: Donut chart showing contacts per group
- **Importance Distribution**: Bar chart of importance levels
- **Location Distribution**: Top 10 locations
- **Role Distribution**: Top 10 professional roles

### Insights
- **Role Clusters**: Contacts grouped by profession
- **Company Networks**: Contacts grouped by company
- **Location Hubs**: Geographic concentrations
- **Suggested Groups**: AI recommendations for grouping

### Contacts Table
- Sortable columns: Name, Company, Role, Location, Created
- Filterable: Importance, Groups, Has Company, Has Location
- Searchable: Name, Email, Company, Role, Location
- Pagination: 20 contacts per page
- Bulk actions: Select multiple contacts

---

## 🔒 Security Considerations

- **JWT Tokens**: Issued with 24-hour expiration
- **Rate Limiting**: Applied to auth and sensitive endpoints
- **CORS**: Restricted to frontend origin
- **Input Validation**: All inputs validated with Pydantic
- **SQL Injection Protection**: Parameterized queries via Supabase
- **Admin Routes**: Protected with secret key authentication
- **Password Security**: Handled by Supabase auth
- **Email Verification**: Required for account activation

---

## 🚨 Error Handling

### Common Error Responses

**401 Unauthorized**
```json
{"detail": "Invalid authentication credentials"}
```

**404 Not Found**
```json
{"detail": "Contact not found"}
```

**422 Validation Error**
```json
{"detail": [{"type": "missing", "loc": ["body", "name"], "msg": "Field required"}]}
```

**429 Too Many Requests**
```json
{"detail": "Rate limit exceeded"}
```

---

## 📈 Performance Tips

- **Frontend**: 
  - Implement component memoization for charts
  - Use virtual scrolling for large tables
  - Lazy load dashboard sections
  
- **Backend**:
  - Database indexes on user_id and created_at
  - Cache KPI calculations for 5 minutes
  - Use batch queries for related data
  
- **General**:
  - Enable gzip compression
  - Implement CDN for static assets
  - Monitor API response times

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Open a pull request

---

## 📝 License

This project is licensed under the MIT License.

---

## 📞 Support

For issues or questions:
1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Include error logs and reproduction steps
4. Tag appropriate labels (bug, feature, documentation)

---

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics and forecasting
- [ ] Contact import/export (CSV, vCard)
- [ ] Integration with email providers
- [ ] Calendar integration
- [ ] Contact reminders and follow-ups
- [ ] Team collaboration features
- [ ] Zapier integration

---

**Happy CRMing! 🚀**