<div align="center"> 
  <h1>Personal CRM Project</h1>


![GitHub stars](https://img.shields.io/github/stars/dwseoh/personal-crm?style=social)
![GitHub forks](https://img.shields.io/github/forks/dwseoh/personal-crm?style=social)
![GitHub repo size](https://img.shields.io/github/repo-size/dwseoh/personal-crm)
![GitHub top language](https://img.shields.io/github/languages/top/dwseoh/personal-crm)
![GitHub last commit](https://img.shields.io/github/last-commit/dwseoh/personal-crm?color=red)

</div>
<br>


## Overview

**Personal CRM** is a full-stack contact relationship management system built with modern web technologies. It enables users to organize, track, and analyze their professional and personal networks through an intuitive dashboard, comprehensive contact management, and intelligent insights.


## Tech Stack

- **Backend**: FastAPI (Python), Supabase (PostgreSQL), JWT Auth
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Database**: PostgreSQL via Supabase

## Key Features

- **Auth**: Secure registration, JWT tokens, RBAC.
- **Contacts**: CRUD operations, custom groups, importance tracking.
- **Dashboard**: KPI cards, interactive charts, smart insights.
- **Interactions**: Log calls/emails/meetings with history.

## Getting Started

### Backend

1. Clone repo: `git clone <repo-url>`
2. Setup venv: `python3 -m venv venv && source venv/bin/activate`
3. Install deps: `pip install -r requirements.txt`
4. Create `.env` with Supabase/Admin keys.
5. Run: `uvicorn app.main:app --reload`
   - API: `http://localhost:8000/docs`

### Frontend

1. `cd frontend/my-app`
2. `npm install`
3. Create `.env.local` with API/Supabase keys.
4. Run: `npm run dev`
   - App: `http://localhost:3000`

## API Documentation

- **Auth**: `/auth/signup`, `/auth/login`, `/auth/verify-email`
- **Contacts**: `/contacts` (GET, POST), `/contacts/{id}` (PATCH, DELETE)
- **Groups**: `/groups` (CRUD)
- **Interactions**: `/interactions` (CRUD)
- **Dashboard**: `/dashboard/kpis`, `/dashboard/charts`, `/dashboard/insights`

## License

MIT License

