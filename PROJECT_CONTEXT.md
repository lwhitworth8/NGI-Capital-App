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
```
NGI Capital App/
├─ src/
│  ├─ api/
│  │  ├─ main.py                 # Active FastAPI app
│  │  ├─ main_production.py      # Full reference implementation
│  │  ├─ auth.py                 # JWT/auth helpers + deps
│  │  ├─ models.py               # SQLAlchemy models (GAAP oriented)
│  │  └─ routes/
│  │     ├─ entities.py          # Entities API (included)
│  │     ├─ reports.py           # Reports API (included)
│  │     ├─ banking.py           # Banking API (included)
│  │     ├─ documents.py         # Documents API (included)
│  │     └─ accounting.py        # Accounting/transactions (present, NOT included)
│  ├─ db/
│  │  ├─ schema.sql
│  │  └─ accounting_schema.sql
│  └─ utils/
│     ├─ security.py
│     └─ validators.py
├─ apps/
│  └─ desktop/
│     ├─ src/
│     │  ├─ app/
│     │  │  ├─ api/extract-pdf/route.ts       # Next API route (simulated)
│     │  │  ├─ dashboard/page.tsx             # Dashboard (active)
│     │  │  ├─ login/page.tsx                 # Login (active)
│     │  │  ├─ layout.tsx                     # Root layout
│     │  │  └─ globals.css
│     │  ├─ components/                       # UI + layout
│     │  └─ lib/
│     │     ├─ api.ts                         # Axios API client
│     │     ├─ auth.tsx                       # Auth context
│     │     ├─ utils/dateUtils.ts             # Fiscal/calendar utils (see note)
│     │     └─ services/{documentExtraction,entityDatabase}.ts
│     ├─ next.config.js                       # Rewrites to backend
│     ├─ Dockerfile                           # Next.js production image
│     └─ package.json
├─ docker-compose.yml                         # Backend+frontend (prod-style dev)
├─ docker-compose.dev.yml                     # Dev with hot reload
├─ Dockerfile                                 # Backend (FastAPI) image
├─ nginx/nginx.conf                           # Optional reverse proxy
├─ .gitignore                                 # Exclude env, build, db, logs
├─ ngi_capital.db                             # SQLite dev DB
├─ init_users.py                              # Seed partners + entities
└─ tests/                                     # Backend/API tests
```## Key Files Currently in Use

### Backend
1. **src/api/main.py** – Active FastAPI backend
   - Endpoints: `/health`, `/api/health`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/dashboard/metrics`, `/api/entities`, `/api/partners`
   - CORS: allows `http://localhost:3001` and production domain
   - Auth: JWT (12h), partner domain enforced (`@ngicapitaladvisory.com`)
   - DB: SQLite (`ngi_capital.db` mounted in Docker)
   - Note: `src/api/routes/accounting.py` exists but is NOT included in `main.py` yet

### Frontend - New Modules
1. **apps/desktop/src/app/accounting/documents/page.tsx** - Document Management
   - Upload and process legal/financial documents/accounting documents
   - AI-powered data extraction from PDFs
   - Multi-entity document tracking
   - Re-extraction and viewing capabilities
   - Target data points display

2. **apps/desktop/src/app/accounting/internal-controls/page.tsx** - Internal Controls
   - Control categories with risk levels coming from internal controls document
   - Co-founder approval tracking
   - Entity selector for multi-entity view
   - Document-driven control extraction and accounting systems

3. **apps/desktop/src/lib/services/documentExtraction.ts** - Document Processing
   - Pattern matching for Delaware documents
   - Extracts EIN, formation dates, ownership
   - Confidence scoring
   - Support for 15+ document types

4. **apps/desktop/src/lib/services/entityDatabase.ts** - Entity Data Store
   - Centralized storage for all entity data
   - Merges data from multiple documents
   - Persistent across sessions
   - Used throughout app for reports and controls

5. **apps/desktop/src/lib/config/documentTypes.ts** - Document Configuration
   - 60+ document type definitions
   - 9 categories (formation, governance, equity, etc.)
   - Entity-specific requirements
   - Extractable data points per document

### Frontend - Existing
1. **apps/desktop/src/app/login/page.tsx** - Login page
2. **apps/desktop/src/app/dashboard/page.tsx** - Dashboard
3. **apps/desktop/src/app/globals.css** - Styling with theme support## Important Implementation Details

### Document Processing Flow
1. User uploads PDF document (Certificate of Formation, EIN Letter, etc.)
2. System identifies document type (auto-detect or manual selection)
3. PDF sent to `/api/extract-pdf` endpoint
4. Text extracted and parsed with pattern matching
5. Data stored in EntityDatabase
6. Available throughout app (controls, reports, etc.)

### Extracted Data Points
- **Certificate of Formation**: Entity name, formation date (7/16/2024), Delaware state, registered agent
- **EIN Letter**: EIN (88-3957014), assignment date
- **Operating Agreement**: Members (Andre/Landon), 50/50 ownership dont hardcode this anywhere put it in the databse
- **Bank Resolution**: Authorized signers, Mercury Bank details
- **Internal Controls**: Control categories, risk levels, procedures

### Business Rules Implemented
- **Partner Access Only**: Only @ngicapitaladvisory.com emails can login
- **50/50 Ownership**: Both partners have equal ownership
- **Dual Authorization**: Transactions over $500 require approval
- **No Self-Approval**: Partners cannot approve their own transactions
- **Audit Trail**: All actions are logged
- **Fiscal Year**: Jan 1 to Dec 31 Fiscal Year
- **Entity Conversion**: LLC to C-Corp transition tracking
- **Pre-formation Documents**: Support for future entities

### Database Schema (Updated)
- **Partners Table**: Partner accounts with ownership percentages
- **Entities Table**: Multi-entity support with parent-child relationships
- **Documents Table**: Uploaded documents with extracted data (JSONB)
- **Transactions Table**: Financial transactions with approval workflow
- **Entity Database**: localStorage-based central data store

## Running the Application
- Dev (hot reload): `docker compose -f docker-compose.dev.yml up -d --build`
- Prod-style dev: `docker compose up -d --build`
- Backend health: `http://localhost:8001/health` and `http://localhost:8001/api/health`
- Frontend: `http://localhost:3001`
- Seed DB (if needed): `python init_users.py` (on host; then re-up containers)## Current Limitations & Next Steps

### What's Working
- ✅ Partner/owner login with JWT authentication
- ✅ Dashboard with basic metrics
- ✅ Theme switching (light/dark)
- ✅ Document upload and management system
- ✅ AI-powered PDF data extraction
- ✅ Internal controls dashboard
- ✅ Multi-entity support
- ✅ Entity database with persistent storage
- ✅ Document completeness tracking
- ✅ Re-extraction capabilities

### What Needs Implementation
- [ ] Real database connection (currently using localStorage)
- [ ] Production PDF parsing library (currently simulated)
- [ ] Full accounting module (journal entries, chart of accounts)
- [ ] Transaction approval workflow UI
- [ ] Financial reporting (P&L, Balance Sheet, Cash Flow)
- [ ] Mercury Bank API integration
- [ ] Complete audit trail UI
- [ ] Email notifications
- [ ] Mobile responsive design

### Known Issues
- Fiscal year currently July 1 – June 30 in `apps/desktop/src/lib/utils/dateUtils.ts`; desired is Jan 1 – Dec 31 (see TODO below)
- Accounting API (`src/api/routes/accounting.py`) not wired into `main.py`
- PDF extraction is simulated in Next API route; needs a real parser
- Some frontend persistence relies on localStorage; backend DB integration is partial## Development Notes

### For Next Agents
- Document System: Upload Certificate of Formation and EIN Letter to exercise flows
- Entity Data: Use `EntityDatabaseService` for client-side aggregation
- Fiscal Year TODO: Switch fiscal year to Jan 1 – Dec 31
  - Update: `apps/desktop/src/lib/utils/dateUtils.ts` (getCurrentFiscalYear, getFiscalYearDates, quarter logic)
  - Verify any dashboard/reporting code that consumes fiscal periods
- Ports: Frontend 3001, Backend 8001 (CORS and rewrites configured)
- Credentials: Use either partner account for testing
- Accounting: Consider including `src/api/routes/accounting.py` in `main.py` when DB layer is ready### API Endpoints Available (current)
- `GET /health` – Backend health
- `GET /api/health` – Health (alt path)
- `POST /api/auth/login` – Partner login
- `POST /api/auth/logout` – Logout
- `GET /api/auth/me` – Current user
- `GET /api/dashboard/metrics` – Dashboard metrics
- `GET /api/entities` – Entities list
- `GET /api/partners` – Partners list
- `POST /api/extract-pdf` – Next.js route for simulated PDF extraction### Testing
```python
# Document system tests ensure all pass
pytest tests/test_document_system.py

# Quick test login
python quick_test.py

# Comprehensive tests
python tests/test_login_system.py
```

## Security Considerations
- JWT tokens expire after 12 hours
- Passwords are hashed with bcrypt
- CORS restricted to specific origins
- Partner-only access enforced at API level
- All financial actions require authentication
- Dual authorization for transactions > $500
- No self-approval of transactions

## Business Context
### LLC to C-Corp Conversion
- NGI Capital LLC formed July 14, 2025 in Delaware
- Converting to NGI Capital, Inc. for UC Investments
- Formation costs flow through original LLC
- Cost allocation to subsidiaries tracked
- Pre-formation documents supported

### Key Business Data
- **EIN**: docuement get 
- **Formation Date**: document get
- **State**: Delaware
- **File Number**: Document get
- **Registered Agent**: document get 
- **Address**: need to get from document
- **Fiscal Year**: get from documetn
- **Partners/Owners**: Andre Nurmamade (50%), Landon Whitworth (50%)

## Contact & Requirements
This application is being developed for NGI Capital partners:
- Andre Nurmamade (50% owner)
- Landon Whitworth (50% owner)

The system handles all internal financial operations, entity management, document processing, and compliance reporting for the company and its subsidiaries during the LLC to C-Corp conversion process and for the foresseable future of NGI Capitals operations
.

### Docker Compose (updated)
- Frontend: http://localhost:3001
- Backend API: http://localhost:8001

Run (dev):
- docker compose -f docker-compose.dev.yml up -d --build

Run (prod-style):
- docker compose up -d --build

Notes:
- Frontend talks to backend at http://backend:8001 inside Docker network
- NEXT_PUBLIC_API_URL and rewrites now target backend service name







## Fiscal Year Note
- Previous implementation in pps/desktop/src/lib/utils/dateUtils.ts assumes a fiscal year of July 1 – June 30.
- Desired standard is Jan 1 – Dec 31. Leaving as-is for now; flagged as TODO for the next iteration to update functions and any consumers.

## Changelog (latest update)
- Standardized ports: frontend 3001, backend 8001 (Makefile, Nginx, Compose)
- Next.js rewrites parameterized via BACKEND_ORIGIN; Compose injects envs
- Frontend Dockerfile accepts NEXT_PUBLIC_API_URL and BACKEND_ORIGIN
- Fixed Next.js build failure in pi-test by adding types and env-based URLs
- Added comprehensive .gitignore
- Updated docs to reflect active backend src/api/main.py and docker run flow
