# PRD — Production Demo Deployment (Vercel + Docker)

Goal
- Deliver a stable, public demo environment before Monday for investor meetings.
- Keep the tech simple: host both Next.js apps on Vercel, run FastAPI backend on a VM via Docker Compose, wire domains with Squarespace DNS, and gate auth via Clerk.

Scope
- Two Vercel projects (monorepo):
  - Student portal at `ngicapitaladvisory.com` (marketing + projects)
  - Admin app at `admin.ngicapitaladvisory.com`
- Backend (FastAPI) served from `api.ngicapitaladvisory.com` on a VM using `docker-compose.prod.yml` (backend-only).
- Clerk-only auth: sign-in on the root site; admins go to Admin dashboard, students to `/projects`.
- Git branches:
  - `main` → Preview deployments
  - `production` → Production deployments (for both Vercel projects)

Out of Scope (for this demo)
- Migration off SQLite to Postgres.
- Multi-region or autoscaling for backend.
- Complex staging environment (we can add later if needed).

Success Criteria
- Domains resolve with valid TLS certs.
- Sign-in works via Clerk; routing sends admins to Admin dashboard and students to `/projects`.
- Admin can load Investor Management, Accounting, and Advisory modules without backend errors.
- Student can browse public Projects and sign in without issues.

Architecture (at-a-glance)
- Vercel Project A (Student): rootDir `apps/student`, `BACKEND_ORIGIN=https://api.ngicapitaladvisory.com`
- Vercel Project B (Admin): rootDir `apps/desktop`, `BACKEND_ORIGIN=https://api.ngicapitaladvisory.com`
- Backend VM: `docker compose -f docker-compose.prod.yml up -d backend`, reverse-proxied by Caddy or Nginx at `api.ngicapitaladvisory.com`

Key Risks & Mitigations
- Backend not publicly reachable → Spin a small VM, open 80/443, run Caddy for TLS; healthcheck endpoint `/api/health`.
- Env vars mismatch → Use the provided Env Matrix and set values in Vercel + VM.
- Clerk domain mismatch → Add both production domains to Clerk dashboard Allowed Origins and redirects.

