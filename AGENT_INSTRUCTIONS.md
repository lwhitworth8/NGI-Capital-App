# AGENT_INSTRUCTIONS

Purpose: finalize the NGI Capital internal app prototype and ensure **all modules are implemented and deployment-ready** for two partners to fully start, account, and manage the holdco and all entities under its umbrella. Context is **Docker-only**, single apex domain with Nginx path routing. Follow ENGINEERING_RULES exactly.

================================================================
READING ORDER (DO NOT EDIT CODE UNTIL COMPLETE)
================================================================
1) ENGINEERING_RULES.md  (authoritative; ASCII only; no hallucinations; GAAP/ASC; pytest required)
2) PROJECT_CONTEXT.md    (scope, modules, business rules, entities, endpoints, TODOs)
4) Source map to scan before acting:
   - src/api/main.py
   - src/api/models.py
   - src/api/routes/*
   - src/db/* (schema, migrations)
   - apps/desktop/src/app/*
   - apps/desktop/src/lib/*
   - apps/desktop/next.config.js
   - docker-compose.dev.yml
   - docker-compose.prod.yml (or create if missing)
   - nginx/nginx.prod.conf (or create if missing)
5) If context runs low at any time: STOP, re-read ENGINEERING_RULES, re-scan the codebase, then continue.

================================================================
NON-NEGOTIABLE CONSTRAINTS
================================================================
- Follow ENGINEERING_RULES.md exactly.
- ASCII only. No Unicode in code, logs, comments, or filenames.
- No hallucinated functions, files, or APIs.
- Minimal dependencies; add only if essential and update requirements.txt.
- No mock data. Tests must use an ephemeral test database (not production).
- GAAP/ASC compliance for accounting modules (double entry, immutability, correct reporting).
- Always run pytest and debug until green before claiming success.

================================================================
PRIMARY GOALS
================================================================
- Accounting is fully enabled and GAAP/ASC compliant.
- **Cap table and investor registry live inside the Entities module (internal).**
- Investor Relations is **internal-only** (for company investors/stakeholders), not public.
- NGI Advisory module exists (clients, projects, tasks).
- Fiscal year logic is Jan 1 – Dec 31.
- Frontend uses relative `/api` so Nginx can route on a single apex domain.
- **All other modules are verified “deployment-ready”; missing pieces are implemented.**
- All tests pass.

================================================================
IMPLEMENTATION TASKS
================================================================

A) ACCOUNTING (FULLY ENABLED)
1) Wire `src/api/routes/accounting.py` into `src/api/main.py` under `/api/accounting`.
2) Implement/complete:
   - Chart of Accounts (COA).
   - JournalEntry and JournalLine with double-entry enforcement (sum debits == sum credits).
   - Posting workflow: journals immutable after posting; corrections via adjusting entries only.
   - Reporting endpoints: P&L, Balance Sheet, Cash Flow (basic but correct).
   - Docstrings reference relevant ASC topics (e.g., 606, 820, 842) where applicable.
3) Tests:
   - `tests/test_accounting_compliance.py` (double entry, immutability, report basics, ASCII-only).

B) ENTITIES MODULE: CAP TABLE + INVESTOR REGISTRY (INTERNAL)
1) UI routes (authenticated):
   - `/entities` (list/select entity)
   - `/entities/[id]/investors`
   - `/entities/[id]/cap-table`
   - `/entities/[id]/equity-transactions`
2) Backend endpoints (authenticated; RBAC: equity_admin or owner):
   - `GET/POST /api/entities/{entity_id}/investors`
   - `GET/POST /api/entities/{entity_id}/cap-table`
   - `GET/POST /api/entities/{entity_id}/equity-transactions`
3) Tests:
   - `tests/test_entities_cap_table.py` (ownership math, invariants)
   - `tests/test_entities_investors_rbac.py` (access control, no cross-entity leakage)

C) INVESTOR RELATIONS (INTERNAL ONLY)
1) Route: `/ir` (authenticated)
   - Sections: updates/milestones, internal docs library, communications log/contact actions
   - **Cap table is not here.**
2) Backend endpoints (authenticated):
   - `GET/POST /api/ir/news`
   - `GET/POST /api/ir/documents`
3) Tests:
   - `tests/test_ir_internal.py` (auth required; no cap table exposure)

D) NGI ADVISORY MODULE
1) UI routes:
   - `/advisory`
   - `/advisory/clients`
   - `/advisory/projects`
   - `/advisory/tasks`
2) Backend CRUD:
   - `/api/advisory/clients`   [GET, POST, PUT, DELETE]
   - `/api/advisory/projects`  [GET, POST, PUT, DELETE]
   - `/api/advisory/tasks`     [GET, POST, PUT, DELETE]
3) Data model & migrations:
   - advisory_clients(id, name, primary_contact, email, phone, created_at, updated_at)
   - advisory_projects(id, client_id, name, status, owner_user_id, start_date, due_date, notes, created_at, updated_at)
   - advisory_tasks(id, project_id, title, status, assignee_user_id, due_date, created_at, updated_at)
   - Add SQLAlchemy models and SQL migration(s).
4) Wire router:
   - `src/api/routes/advisory.py` and `include_router` in `main.py` under `/api/advisory`.
5) Tests:
   - `tests/test_advisory_crud.py` (E2E CRUD + RBAC where applicable).

E) FISCAL YEAR FIX
1) Update `apps/desktop/src/lib/utils/dateUtils.ts` to Jan 1 – Dec 31.
2) Update any consumers relying on earlier fiscal logic.
3) Add/adjust tests for boundaries if applicable.

F) SINGLE-DOMAIN PATH ROUTING & CORS
1) Frontend must call backend using relative paths: `fetch('/api/...')`.
   - `apps/desktop/next.config.js`: ensure rewrites keep `/api/:path*` relative.
   - Remove host-based `NEXT_PUBLIC_API_URL`; if needed, set to `"/api"`.
2) Nginx path routing (per DEPLOYMENT_GUIDE.md):
   - `/`    -> Next.js container (web:3000)
   - `/api` -> FastAPI container (api:8001)
3) FastAPI CORS: restrict production to `https://ngicapitaladvisory.com`.

G) SECURITY, AUTH, RBAC
1) Keep partner-only logic; extend to roles if modeled:
   - roles: owner, admin, finance, equity_admin, advisory_user
2) Enforce:
   - dual approval > $500
   - no self-approval
   - audit trail on financial actions
3) Tests:
   - `tests/test_auth_roles.py`

H) SYSTEM-WIDE VALIDATION & HARDENING (VERIFY/COMPLETE EVERYTHING ELSE)
1) **Authentication & Sessions**  
   - JWT 12h; partner domain enforcement; `/api/auth/*` endpoints complete.  
   - Tests: `tests/test_auth_jwt.py` (login, me, logout, token expiry/invalid).
2) **Dashboard Metrics**  
   - `/api/dashboard/metrics` present and stable; no PII in responses.  
   - Tests: `tests/test_dashboard_metrics.py`.
3) **Document Management & Extraction**  
   - `/api/extract-pdf` workflow works end-to-end with current parser.  
   - If a production-grade parser is essential, add the minimal viable library and update requirements (keep changes small).  
   - Tests: `tests/test_document_system.py` (already referenced), add assertions for key extraction fields.
4) **Internal Controls**  
   - Page and data flow operational; approvals connect to accounting/transactions where applicable.  
   - Tests: `tests/test_internal_controls.py` (basic behaviors + RBAC).
5) **Entities CRUD & Relationships**  
   - Entities list, parent-child links, selection context used by UI.  
   - Tests: `tests/test_entities_api.py` (basic CRUD + scoping).
6) **Reports API (non-accounting)**  
   - `/api/reports` routes present and return deterministic JSON.  
   - Tests: `tests/test_reports_api.py`.
7) **Banking API (if present)**  
   - Ensure endpoints return sane data in dev; no external calls in tests.  
   - Tests: `tests/test_banking_api.py` (skip if not applicable).
8) **Persistence & Migrations**  
   - DB initialization/migrations exist; dev/prod paths documented.  
   - Ensure no feature silently relies on localStorage in production; if it does, route through backend APIs.  
   - Provide SQL migration(s) for any new tables introduced above.
9) **Logging & Errors**  
   - Use project logger; no `print`.  
   - No secrets in logs.  
   - 4xx/5xx paths return JSON with stable shape.
10) **Config & Env**  
   - Required env vars documented; sane defaults for dev; strict in prod.  
   - No secrets in repo.

================================================================
TEST & QUALITY REQUIREMENTS
================================================================
- Install + tests:
  - If Make targets exist: `make install` then `make test` (or `pytest -q`)
  - Else: `pip install -r requirements.txt && pytest -q`
- Fix failures and re-run until green.
- Lint/typecheck/format if targets exist (e.g., `make lint`, `make typecheck`, `make fmt`).
- Tests use an ephemeral test DB (never production).
- No Unicode anywhere.

================================================================
DOCS TO UPDATE
================================================================
- PROJECT_CONTEXT.md:
  - Accounting: “enabled and wired”
  - Entities: cap table + investor registry (internal)
  - IR: internal-only (no public)
  - Advisory: routes + endpoints
  - Fiscal year Jan 1 – Dec 31
  - Confirm Docker-only, relative `/api`
- DEPLOYMENT_GUIDE.md:
  - Docker-only single domain, Nginx path routing, TLS steps, env vars
  - Local Docker testing and production VM steps
- Add any new files to the repo structure where relevant.

================================================================
DELIVERABLES AT COMPLETION
================================================================
1) Implemented code for Accounting (enabled), Entities cap table/investors (internal), IR (internal only), Advisory, fiscal year fix, and `/api` relative usage.  
2) All tests passing (`pytest -q`). Provide a short summary of results.  
3) Updated PROJECT_CONTEXT.md and DEPLOYMENT_GUIDE.md.  
4) A concise change summary printed to the console:
   - files changed
   - new routes and endpoints
   - migrations added
   - exact local Docker commands to run
5) DO NOT push or deploy. Human will review locally in Docker and push to repo.

================================================================
NOTES
================================================================
- This system is for two partners to fully start, account, and manage the holdco and all entities in its umbrella. Treat accounting/reporting as production-grade and GAAP/ASC-compliant.
- If any requirement is ambiguous, STOP and request clarification with concrete options.
