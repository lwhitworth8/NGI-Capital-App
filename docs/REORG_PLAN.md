NGI Capital App — v1 Repo Reorg Plan

Goal: Deliver an enterprise-ready v1 monorepo that is clean, modular, and easy to navigate, with consistent tooling and CI.

Target Top-Level Structure
- apps/
  - desktop/        # Admin (Next.js)
  - student/        # Student portal (Next.js)
- services/
  - api/            # FastAPI backend (move from src/api)
- packages/
  - ui/             # Shared UI lib
  - config/         # Shared lint/ts/prettier configs (future)
- infra/
  - docker/         # Dockerfiles, compose files
  - nginx/          # nginx dev/prod configs
  - k8s/            # manifests (future)
  - ops/production/ # existing prod assets migrated under infra
- db/
  - migrations/     # Alembic (move from root/alembic)
- docs/
  - ADRs, architecture, runbooks (this folder)
- scripts/
  - cli tools, data tasks (non-legacy)
- legacy/
  - api/, scripts/, e2e/, scratch/ (archived; not built by default)

Immediate Cleanup (Phase 0)
1) Stop tracking dev DBs: purge `*.db` from git history later; ensure `.gitignore` covers them (already does).
2) Quarantine legacy and scratch:
   - Move `src/api/legacy/` → `legacy/api/`
   - Move `scripts/legacy/` → `legacy/scripts/`
   - Move scratch files: `.tmp_*`, `temp_*`, `*_backup*`, `*.bak` → `legacy/scratch/`
3) Remove e2e artifacts from git; keep only test sources under `e2e/tests/`.

Refactor Layout (Phase 1)
4) Create `services/api` and move `src/api/*` into it unchanged; update imports and Dockerfile.backend path.
5) Move `alembic/` → `db/migrations/`; configure Alembic `script_location` accordingly.
6) Move `nginx/*.conf` and `ops/production/*` under `infra/` with clear dev vs prod separation.

Tooling Standards (Phase 2)
7) Frontend:
   - Root ESLint config shared by apps; extend in each app as needed. [done]
   - Root Prettier config and .editorconfig. [done]
   - TypeScript base config (project references optional). [done]
8) Backend:
   - Add Ruff + Black + isort via `pyproject.toml`. [done]
   - Enable mypy (incremental; start with `services/api`, ignore missing imports initially). [done]
9) Husky + lint-staged precommit for JS/TS formatting and Python linting. [done]

CI/CD (Phase 3)
10) GitHub Actions `ci.yml`:
    - Job `frontend`: install, lint, type-check, unit tests for both apps.
    - Job `backend`: setup Python 3.11, install, ruff/black check, unit tests (placeholder until tests added).
    - Optional nightly job for Playwright e2e against docker-compose.dev.
11) Keep `vercel-deploy-prod.yml` for Admin deploy; add API build/test gates.

Backend Hardening (Phase 4)
12) Extract domain routers to packages if `services/api` grows further; ensure consistent async DB access.
13) Remove ad-hoc `test_*` endpoints; replace with pytest tests.
14) Parameterize DB: SQLite in dev, Postgres in prod. Add SQLAlchemy URL envs and secrets.

Documentation (Phase 5)
15) Add:
    - `docs/ARCHITECTURE.md` (high level)
    - `docs/DEVELOPMENT.md` (dev stack, tips)
    - `docs/TESTING.md` (unit vs e2e strategy)
    - `docs/OPERATIONS.md` (prod runbooks)

Checklist (Actionable)
- [ ] Create `services/api` and move `src/api/*`
- [ ] Update `Dockerfile.backend` and compose to `services/api`
- [x] Move `alembic/` → `db/migrations/` and update alembic.ini
- [x] Move `nginx/` and `ops/production/` → `infra/`
- [ ] Create `legacy/` and move legacy/scratch/e2e artifacts
- [ ] Add `.editorconfig`, root ESLint/Prettier configs
- [ ] Add `pyproject.toml` with Ruff/Black/isort
- [ ] Add `.github/workflows/ci.yml`
- [ ] Remove ad-hoc test endpoints, add backend tests skeleton
- [ ] Document architecture and development flows

Notes & Risks
- Moving API path impacts imports and Dockerfiles; do in one PR with CI green.
- Playwright e2e can be flaky in CI; keep it nightly.
- Purging DBs from history reduces repo size; coordinate with team.
