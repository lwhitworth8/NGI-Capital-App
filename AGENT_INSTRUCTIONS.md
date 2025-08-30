# AGENT_INSTRUCTIONS

Purpose: finalize the NGI Capital internal app so two partners can fully start, account for, and manage the holdco and all entities. The agent must audit the entire repo, complete any unfinished modules, implement missing features, create or fix tests, debug until all tests pass, and update docs. Stack is Docker-only on a single apex domain with nginx path routing. Follow ENGINEERING_RULES exactly.

================================================================
READING ORDER (NO CODE CHANGES UNTIL COMPLETE)
================================================================
1) ENGINEERING_RULES.md
2) PROJECT_CONTEXT.md
3) DEPLOYMENT_GUIDE.md
4) docs/ACCOUNTING_GAAP_REFERENCE.md
5) docs/us-gaap-egc-template.pdf
6) Source map to scan:
   - src/api/main.py
   - src/api/models.py
   - src/api/routes/*
   - src/db/* (schema and migrations)
   - apps/desktop/src/app/*
   - apps/desktop/src/lib/*
   - apps/desktop/next.config.js
   - docker-compose.dev.yml
   - docker-compose.prod.yml (create if missing)
   - nginx/nginx.prod.conf (create if missing)

If context runs low at any time: STOP, re-read ENGINEERING_RULES, re-scan the repo, then continue.

================================================================
NON-NEGOTIABLE CONSTRAINTS
================================================================
- Follow ENGINEERING_RULES.md exactly.
- ASCII only. No Unicode anywhere.
- No hallucinated code, files, or APIs.
- Minimal dependencies; add only if essential and update requirements.txt.
- No mock data. Use an ephemeral test DB for tests.
- GAAP/ASC compliance throughout accounting.
- Always run pytest and debug until green before claiming success.

================================================================
PRIMARY GOALS
================================================================
- Accounting fully enabled and GAAP/ASC compliant.
- Cap table and investor registry live inside the Entities module (internal).
- Investor Relations is internal-only (company investors/stakeholders), not public.
- NGI Advisory module exists (clients, projects, tasks).
- Fiscal year logic is Jan 1 – Dec 31.
- Frontend uses relative /api so nginx can route at a single apex domain.
- All other modules verified “deployment-ready”; implement missing pieces.
- All tests pass.

================================================================
REPO-WIDE AUDIT AND HARDENING
================================================================
Perform a full audit and fix issues found:
1) Code health: TODOs, dead code, console prints; replace prints with logger.
2) Errors: consistent JSON error shapes; no silent exceptions.
3) Security: JWT 12h, domain check, RBAC on sensitive routes, no secrets in logs.
4) Config/env: required env vars validated at startup; safe defaults for dev; prod strict.
5) Persistence: migrations exist for all new tables; no feature depends on localStorage in prod.
6) API surface: document all routes; ensure CORS and path routing match DEPLOYMENT_GUIDE.
7) Tests: add missing tests; fix flakies; ensure deterministic runs.
8) Docs: bring PROJECT_CONTEXT and DEPLOYMENT_GUIDE to the new state.

================================================================
IMPLEMENTATION TASKS
================================================================

A) ACCOUNTING (FULLY ENABLED)
- Wire src/api/routes/accounting.py into src/api/main.py under /api/accounting.
- Implement/complete:
  - Chart of Accounts.
  - JournalEntry and JournalLine with double-entry enforcement (sum debits == sum credits).
  - Posting workflow: posted entries immutable; corrections via adjusting entries.
  - Reports and shapes per docs/ACCOUNTING_GAAP_REFERENCE.md:
    * Balance Sheet (classified)
    * Income Statement
    * Comprehensive Income
    * Statement of Stockholders’ Equity
    * Cash Flow (indirect)
  - Docstrings reference ASC sections where applicable (606, 820, 842).
- Tests: tests/test_accounting_compliance.py
  - double entry, immutability, BS parity, IS -> Equity tie-in, CF reconciliation, classification checks, ASCII-only.

B) ENTITIES MODULE: CAP TABLE + INVESTOR REGISTRY (INTERNAL)
- UI routes (auth):
  - /entities
  - /entities/[id]/investors
  - /entities/[id]/cap-table
  - /entities/[id]/equity-transactions
- Backend endpoints (auth; RBAC: equity_admin or owner):
  - GET/POST /api/entities/{entity_id}/investors
  - GET/POST /api/entities/{entity_id}/cap-table
  - GET/POST /api/entities/{entity_id}/equity-transactions
- Tests:
  - tests/test_entities_cap_table.py
  - tests/test_entities_investors_rbac.py

C) INVESTOR RELATIONS (INTERNAL ONLY)
- Route: /ir (auth)
  - updates/milestones, internal docs library, communications log
  - cap table NOT shown here
- Endpoints (auth):
  - GET/POST /api/ir/news
  - GET/POST /api/ir/documents
- Tests: tests/test_ir_internal.py

D) NGI ADVISORY MODULE
- UI routes: /advisory, /advisory/clients, /advisory/projects, /advisory/tasks
- Backend CRUD:
  - /api/advisory/clients  [GET, POST, PUT, DELETE]
  - /api/advisory/projects [GET, POST, PUT, DELETE]
  - /api/advisory/tasks    [GET, POST, PUT, DELETE]
- Data model + migrations:
  - advisory_clients, advisory_projects, advisory_tasks
- Router: src/api/routes/advisory.py and include_router in main.py under /api/advisory
- Tests: tests/test_advisory_crud.py

E) FISCAL YEAR FIX
- Update apps/desktop/src/lib/utils/dateUtils.ts to Jan 1 – Dec 31.
- Adjust consumers that rely on old logic.
- Add/update tests if applicable.

F) SINGLE-DOMAIN PATH ROUTING AND CORS
- Frontend calls backend with relative paths: fetch('/api/...').
- apps/desktop/next.config.js: keep rewrites relative for '/api/:path*'.
- CORS in FastAPI: restrict prod to https://ngicapitaladvisory.com.

G) SECURITY, AUTH, RBAC
- Keep partner-only logic; extend to roles if modeled:
  - roles: owner, admin, finance, equity_admin, advisory_user
- Enforce:
  - dual approval > 500
  - no self-approval
  - audit trail on financial actions
- Tests: tests/test_auth_roles.py

H) VERIFY AND COMPLETE EVERY OTHER MODULE
- Auth/JWT: tests/test_auth_jwt.py
- Dashboard metrics: tests/test_dashboard_metrics.py
- Document extraction: tests/test_document_system.py (extend as needed)
- Internal controls: tests/test_internal_controls.py
- Entities API CRUD basics: tests/test_entities_api.py
- Reports API (non-accounting): tests/test_reports_api.py
- Banking API (if present): tests/test_banking_api.py (skip if N/A)
- Logging and error shapes validated

================================================================
TESTS AND QUALITY GATES
================================================================
- Install and run tests:
  - If Makefile exists: make install && make test
  - Else: pip install -r requirements.txt && pytest -q
- Use an ephemeral DB in tests:
  - DATABASE_URL=sqlite:///./.tmp/test.db
  - JWT_SECRET=testing; JWT_EXPIRES_HOURS=12
- Fix failures and re-run until green.
- Run lint/typecheck/format if targets exist.

================================================================
DOCS TO UPDATE
================================================================
- PROJECT_CONTEXT.md:
  - Accounting enabled and wired
  - Entities: cap table + investor registry (internal)
  - IR: internal only
  - Advisory: routes + endpoints
  - Fiscal year Jan 1 – Dec 31
  - Docker-only, relative /api
- DEPLOYMENT_GUIDE.md:
  - Docker-only single domain, nginx path routing, TLS steps, env vars
  - Local Docker testing and production VM steps
- Include any new files in the repo structure.

================================================================
FINAL OUTPUT (WHAT YOU MUST PRINT WHEN DONE)
================================================================
- Summary:
  - Files changed (list)
  - New routes and endpoints
  - Migrations added and how to apply
  - Exact local Docker commands to run
- Test results summary (pytest -q green)
- Statement: “Ready for local review. You can now run the Docker dev stack locally and verify.”
- Do NOT push or deploy.
