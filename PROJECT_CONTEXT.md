# NGI Capital Internal Application - Project Context

## Overview
This is the internal control center application for NGI Capital, originally formed as NGI Capital LLC (July 14, 2025) and converting to NGI Capital, Inc. (C Corporation) to meet UC Investments requirements. The application provides comprehensive financial management, document processing, and multi-entity management capabilities for the two partners: Andre Nurmamade and Landon Whitworth (50/50 ownership).

## Current Status (Updated: 2025-08-30)
- **Application**: Functional with dashboard, document management, and internal controls
- **Frontend URL**: http://localhost:3001 
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs
- **Document Processing**: AI-powered extraction from PDFs
- **Entity Management**: Multi-entity support with LLC to C-Corp conversion tracking

## Entity Structure
- **NGI Capital LLC** - Original entity (Active, EIN: 88-3957014)
- **NGI Capital, Inc.** - C-Corp holding company (Converting from LLC)
- **The Creator Terminal, Inc.** - Product development subsidiary (Pre-formation)
- **NGI Capital Advisory LLC** - Advisory services subsidiary (Pre-formation)

## Login Credentials
- **Andre Nurmamade**: `anurmamade@ngicapitaladvisory.com` / `TempPassword123!`
- **Landon Whitworth**: `lwhitworth@ngicapitaladvisory.com` / `TempPassword123!`

## Tech Stack
- **Backend**: Python FastAPI with SQLAlchemy ORM
- **Frontend**: Next.js 14 with React and TypeScript
- **Database**: SQLite (development), PostgreSQL-ready for production
- **Document Storage**: localStorage with centralized EntityDatabase
- **PDF Processing**: API endpoint with pattern matching extraction
- **Authentication**: JWT tokens with 12-hour expiry
- **Styling**: Tailwind CSS with custom theme system

## Project Structure
NGI Capital App/
├─ src/
│ ├─ api/
│ │ ├─ main.py # Active FastAPI app
│ │ ├─ main_production.py # Full reference implementation
│ │ ├─ auth.py # JWT/auth helpers + deps
│ │ ├─ models.py # SQLAlchemy models (GAAP oriented)
│ │ └─ routes/
│ │ ├─ entities.py # Entities API (included)
│ │ ├─ reports.py # Reports API (included)
│ │ ├─ banking.py # Banking API (included)
│ │ ├─ documents.py # Documents API (included)
│ │ └─ accounting.py # Accounting/transactions (present, NOT included)
│ ├─ db/
│ │ ├─ schema.sql
│ │ └─ accounting_schema.sql
│ └─ utils/
│ ├─ security.py
│ └─ validators.py
├─ apps/
│ └─ desktop/
│ ├─ src/
│ │ ├─ app/
│ │ │ ├─ api/extract-pdf/route.ts # Next API route (simulated)
│ │ │ ├─ dashboard/page.tsx # Dashboard (active)
│ │ │ ├─ login/page.tsx # Login (active)
│ │ │ ├─ layout.tsx # Root layout
│ │ │ └─ globals.css
│ │ ├─ components/ # UI + layout
│ │ └─ lib/
│ │ ├─ api.ts # Axios API client
│ │ ├─ auth.tsx # Auth context
│ │ ├─ utils/dateUtils.ts # Fiscal/calendar utils (see note)
│ │ └─ services/{documentExtraction,entityDatabase}.ts
│ ├─ next.config.js # Rewrites to backend
│ ├─ Dockerfile # Next.js production image
│ └─ package.json
├─ docker-compose.yml # Backend+frontend (prod-style dev)
├─ docker-compose.dev.yml # Dev with hot reload
├─ Dockerfile # Backend (FastAPI) image
├─ nginx/nginx.conf # Optional reverse proxy
├─ .gitignore # Exclude env, build, db, logs
├─ ngi_capital.db # SQLite dev DB
├─ init_users.py # Seed partners + entities
└─ tests/ # Backend/API tests

markdown
Copy code

## Key Files Currently in Use

### Backend
- **src/api/main.py** – Active FastAPI backend  
  Endpoints: `/health`, `/api/health`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/dashboard/metrics`, `/api/entities`, `/api/partners`  
  CORS allows `http://localhost:3001` and production domain  
  Auth via JWT (12h) + partner domain enforced  
  DB: SQLite mounted in Docker  
  Note: `src/api/routes/accounting.py` exists but is not yet included  

### Frontend - New Modules
- **apps/desktop/src/app/accounting/documents/page.tsx** – Document Management  
- **apps/desktop/src/app/accounting/internal-controls/page.tsx** – Internal Controls  
- **apps/desktop/src/lib/services/documentExtraction.ts** – Document Processing  
- **apps/desktop/src/lib/services/entityDatabase.ts** – Entity Data Store  
- **apps/desktop/src/lib/config/documentTypes.ts** – Document Configuration  

### Frontend - Existing
- **apps/desktop/src/app/login/page.tsx** – Login page  
- **apps/desktop/src/app/dashboard/page.tsx** – Dashboard  
- **apps/desktop/src/app/globals.css** – Styling  

---

## Hosting and Deployment Plan

### Architecture
- **Frontend**: Next.js 14 on Vercel → `app.ngicapitaladvisory.com`  
- **Backend API**: FastAPI Docker container on Fly.io / Render / Railway → `api.ngicapitaladvisory.com`  
- **Database**: Managed Postgres (Neon/Supabase/AWS RDS)  
- **Storage**: S3 or equivalent object storage for PDFs  

### DNS & TLS
- `app.ngicapitaladvisory.com` → Vercel  
- `api.ngicapitaladvisory.com` → Backend host  
- `ngicapitaladvisory.com` → Marketing site or redirect  

### Env Vars
- Backend: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_HOURS`, `CORS_ORIGINS`, S3 config  
- Frontend: `NEXT_PUBLIC_API_URL=https://api.ngicapitaladvisory.com`  

### Next.js rewrites (apps/desktop/next.config.js)
```js
const BACKEND_ORIGIN = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

module.exports = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_ORIGIN}/api/:path*` },
    ];
  },
  output: "standalone",
};