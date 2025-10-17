NGI Capital App — Repo Audit (v1)

Scope: Consolidated inventory of projects, tech, and notable issues to prepare for an enterprise-grade v1.

Overview
- Monorepo using npm workspaces at root (`apps/*`, `packages/*`).
- Frontends: Next.js 15 apps
  - `apps/desktop` (Admin) — Jest unit tests present, Playwright e2e at repo root
  - `apps/student` (Student portal) — Jest unit tests present
- Backend: FastAPI (`services/api`) with SQLAlchemy models and many routers; Alembic migrations in `db/migrations/`.
- Infrastructure: Docker dev stack (nginx + 2 Next apps + FastAPI), production compose/Caddy in `infra/production/` and nginx configs in `infra/nginx/`.
- Packages: `packages/ui` shared UI lib.

Key Paths
- Root
  - `docker-compose.dev.yml`, `Dockerfile.backend`, `Dockerfile.frontend`, nginx configs
  - `requirements.txt` (backend), `package.json` (workspaces)
  - Databases: `ngi_capital.db`, `test_ngi_capital.db` (checked in; ignored by .gitignore now)
  - E2E tests: `e2e/` (Playwright), many artifacts committed historically (now removed locally)
- Backend (`src/api`)
  - Entry: `src/api/main.py` (large FastAPI app)
  - Routers: `src/api/routes/*` (accounting, entities, banking, investors, learning, chatkit, etc.)
  - Models: `src/api/models*.py` (multiple files), `src/api/database*.py`, `src/api/config.py`
  - Integrations: `src/api/integrations/*` (Slack, email, Google Calendar, Workspace)
  - Legacy: `src/api/legacy/main_production.py` (placeholder)
- Frontend (Admin): `apps/desktop`
  - Next.js app with extensive pages under `src/app/*`
  - Component libraries, hooks, lib, tests under `src/components`, `src/hooks`, `src/lib`, `src/__tests__`
  - ChatKit orb: `src/components/chatkit/NGIChatKitAgent.tsx`
- Frontend (Student): `apps/student`
  - Lighter Next.js app for student flows; uses `packages/ui`
- Shared UI: `packages/ui`
  - Tailwind preset, basic component exports

Auth and Security
- Clerk across both frontends; backend verifies Clerk JWT via `src/api/clerk_auth.py`.
- Dev/test bypass toggles in `src/api/auth_deps.py` and `src/api/config.py` (pytest-specific DB selection and admin bypass when testing).
- Nginx reverse proxy in dev: both apps mounted behind `localhost:3001`.

Testing
- Frontend: Jest unit tests inside each app.
- E2E: Playwright under `e2e/` configured to hit dev stack.
- Backend: pytest.ini exists under `backend/pytest.ini` but no `tests/` package is present; several routes include ad-hoc “test” endpoints.

Notable Issues / Inconsistencies
- Large monolithic `src/api/main.py` importing many routers; mixed sync/async db patterns across routes.
- Historical files and scratch artifacts in root: `*.db` files, `temp_*.txt`, `.tmp_*` files.
- `src/api/legacy/` and `scripts/legacy/` exist; unclear if referenced anywhere at runtime.
- E2E artifacts and screenshots had been tracked historically (many deletions staged).
- Missing or inconsistent tooling at repo root:
  - No root ESLint/Prettier shared config; only `apps/desktop` defines ESLint and Prettier deps.
  - No Python formatter/linter standards (e.g., Ruff/Black/isort) configured; only `requirements.txt` and a Makefile.
  - No root TypeScript project references; per-app `tsconfig.json` only.
- Docker dev mounts SQLite database file from host into container; acceptable for dev but brittle and not production-ready.
- CI: Only `.github/workflows/vercel-deploy-prod.yml`; no unified CI for lint/tests across frontend/backend.

Dependencies Snapshot (high level)
- Node: Next.js 15, React 18, Radix UI, Clerk, Tailwind; `@openai/chatkit-react` in Admin.
- Python: FastAPI, SQLAlchemy; dotenv optional; Uvicorn.
- Databases: SQLite (dev); Postgres intended for prod (per docs), but infra not fully represented.

Active vs. Legacy/Unused
- Active: `apps/desktop`, `apps/student`, `src/api`, `packages/ui`, `alembic`, dev docker compose.
- Legacy/Archive candidates: `src/api/legacy`, `scripts/legacy`, scratch `.tmp_*`, `temp_*`, checked-in `*.db` files, ad-hoc test endpoints in routers.

Gaps to Address for v1
- Establish consistent repo structure with clear boundaries for apps/services/packages/infra/docs.
- Centralize dev tooling (lint/format/type-check) and enforce via CI.
- Codify test strategy: frontend unit tests + selective backend tests + optional e2e job.
- Remove or quarantine legacy and scratch code.
- Harden Docker for dev; document prod deploy with Postgres explicitly.
