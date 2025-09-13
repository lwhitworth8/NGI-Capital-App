# Unified Authentication Refactor — Clerk

Purpose: Replace all legacy/fragmented authentication with a single, Clerk-based model across backend and both Next.js apps. This folder contains PRDs, epics, migration plans, QA and security checklists to deliver a production‑ready, secure rollout.

Files
- CurrentState.Analysis.md — inventory of all current auth touchpoints
- PRD.UnifiedAuth.md — product requirements for unified auth
- Epics.md — work breakdown structure (backend/frontend/security/rollout)
- MigrationPlan.md — phased, safe deprecation of legacy flows
- Backend.Tasks.md — concrete refactor tasks in FastAPI
- Frontend.Desktop.Tasks.md — Next.js Desktop migration tasks
- Frontend.Student.Tasks.md — Student app alignment tasks
- QA.TestPlan.md — test strategy (unit, E2E, manual)
- SecurityChecklist.md — hardening items + Snyk gates
- RolloutPlan.md — environments, flags, canary, backout
- OpenQuestions.md — decisions to finalize

How to use
- Read CurrentState.Analysis.md
- Confirm PRD.UnifiedAuth.md against your needs
- Prioritize Epics.md and execute via MigrationPlan.md
- Gate with QA.TestPlan.md and SecurityChecklist.md prior to prod

Status (2025-09-12)
- Completed: Backend unifier (Clerk deps), router guard switch, advisory gating, Clerk-only staging flags, targeted tests updated and passing.
- In progress: Desktop cleanup (remove remaining local auth assumptions, update tests), Student per-student API verification.
- Pending: Hard removal of legacy endpoints/bridge post-canary, Snyk scans and docs refresh.


Status Update (2025-09-12)
- Completed: Clerk-first auth across backend; admin gating via require_admin; removed session bridge (/api/auth/session returns 410); desktop API client bridge retry removed; tests updated to send admin Authorization; full suite green (145 passed, 2 skipped).
- In Progress: Root README/doc refresh to remove legacy JWT; align Student auth/resolve to Clerk roles/org; final Snyk scan.
- Pending: Remove any dead legacy-flag branches post-canary; validate prod Clerk org gating and disable env allowlist.

Operational Notes
- FORCE_CLERK_ONLY=1; ENABLE_ENV_ADMIN_FALLBACK=0 in prod (tests set to 1 via conftest).
- Admin endpoints require Clerk bearer; tests use HS256 shim.
- No cookie bridge is used by frontends.

