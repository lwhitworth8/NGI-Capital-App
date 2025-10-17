# NGI Capital Internal Application

Unified internal platform for NGI Capital Secure

## Architecture
- Backend: FastAPI + SQLAlchemy
- Frontends: Next.js 14 (Admin “desktop”) and Next.js 14 (Student portal)
- Database: SQLite (dev) / PostgreSQL (prod)
- Authentication: Clerk (OIDC/JWT) end‑to‑end;

## Local Development
### Docker (recommended)
```bash
docker compose -f docker-compose.dev.yml up -d --build
```
- Unified app: http://localhost:3001 (Student at `/`, Admin at `/admin`)
- Backend: http://localhost:8001 (health at `/api/health`, docs at `/docs`)


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

