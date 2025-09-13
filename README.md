# NGI Capital Internal Application

Unified internal platform for NGI Capital Advisory LLC. Secure, GAAP‑compliant operations with dual authorization, full audit trail, and role‑gated access for partners and students.

## Architecture
- Backend: FastAPI + SQLAlchemy
- Frontends: Next.js 14 (Admin “desktop”) and Next.js 14 (Student portal)
- Database: SQLite (dev) / PostgreSQL (prod)
- Authentication: Clerk (OIDC/JWT) end‑to‑end; legacy password login and cookie bridge are removed

## Local Development
### Docker (recommended)
```bash
docker compose -f docker-compose.dev.yml up -d --build
```
- Unified app: http://localhost:3001 (Student at `/`, Admin at `/admin`)
- Backend: http://localhost:8001 (health at `/api/health`, docs at `/docs`)

### Manual
```bash
# Backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python scripts\init_database.py
uvicorn src.api.main:app --host 127.0.0.1 --port 8001 --reload

# Admin app
cd apps/desktop
npm install
npm run dev

# Student app
cd ../student
npm install
npm run dev
```

## Authentication (Clerk‑only)
- Frontends managed by Clerk; backend verifies Clerk tokens (JWKS) and session cookies where applicable.
- Admin access is granted by Clerk org/role (configure `CLERK_ADMIN_ORG_SLUG`) or by env allowlist in tests.
- Legacy endpoints removed:
  - `POST /api/auth/login` → 410 Gone
  - `POST /api/auth/session` (cookie bridge) → 410 Gone

## Environment
Set in `.env` or compose environment:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_ISSUER`, `CLERK_JWKS_URL`, `CLERK_AUDIENCE`
- `CLERK_ADMIN_ORG_SLUG` (optional for admin gating)
- `NEXT_PUBLIC_STUDENT_BASE_URL` (default `http://localhost:3001`)
- `ALLOWED_EMAIL_DOMAINS` (student access domains; comma‑separated)

## Testing
```bash
python -m pytest -q
```

## Notes
- Admin and Student apps are reverse‑proxied by nginx at `http://localhost:3001`.
- Backend OpenAPI is available at `http://localhost:8001/docs`.
- For production, disable test/dev allowlists and ensure Clerk org/role is enforced.

