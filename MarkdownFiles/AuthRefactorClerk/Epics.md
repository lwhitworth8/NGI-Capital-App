# Epics – Unified Authentication (Clerk)

- Backend: Auth Gateway Unification
  - Create `auth/deps.py` (or consolidate in `src/api/auth.py`) with `require_clerk_user()` and `require_admin()`.
  - Remove legacy JWT verification and `auth_token` usage from `main.py` and routes.
  - Migrate all routers to new deps; delete duplicate auth code in `main.py`.
  - DoD: All protected routes depend on Clerk deps; removing `auth_token` from codebase; tests cover 401/403 cases.

- Backend: Admin Gating via Clerk
  - Configure org slug and optional role claim mapping.
  - Replace env-based allowlists with Clerk checks; keep emergency fallback behind feature flag.
  - DoD: Admin routes pass with org/role member; fail 403 otherwise; fallback tested behind flag.

- Desktop App: Clerk‑Only Migration
  - Remove `lib/auth.tsx` (custom AuthContext) and any local login components.
  - Ensure axios attaches Clerk backend token consistently; remove session-bridge retry path once server is Clerk‑only.
  - Confirm middleware and route redirects use backend role checks (avoid hardcoded email lists).
  - DoD: No `auth_token` storage or password flows; happy‑path and sign‑out tested.

- Student App: Alignment
  - Keep Clerk middleware; simplify partner redirect logic; defer admin gating to backend where possible.
  - Confirm per-student endpoints attach Clerk token and work with unified backend deps.
  - DoD: Public reads anonymous; per‑student writes/verifications work with Clerk token/cookie; tests pass with header fallback.

- Session Bridge Deprecation
  - Keep `/api/auth/session` behind `ENABLE_SESSION_BRIDGE=1` during cutover; remove after verification.
  - DoD: Session bridge usage metric is zero in prod; endpoint deleted post‑cutover.

- Security & Compliance
  - Remove password endpoints; purge secrets and rotate any exposed tokens.
  - Snyk scans: node and python; resolve/highlight remaining items.
  - DoD: High‑severity clean; `.env.example` scrubbed; secrets rotated.

- Observability & Docs
  - Add auth failure dashboards; log redaction; update README/env samples.
  - Context7 doc refresh of module docs impacted by auth changes.
  - DoD: PRD/Test Plans updated by Context7 pass; dashboards show stable metrics.

Status (2025-09-12)
- Backend: Auth Gateway Unification – Done
- Backend: Admin Gating via Clerk – Done
- Desktop App: Clerk‑Only Migration – In Progress
- Student App: Alignment – In Progress
- Session Bridge Deprecation – Pending
- Security & Compliance – Pending
- Observability & Docs – Pending

Risks & Mitigations
- JWT audience/issuer mismatch: expose config via env, relax audience in staging only (`CLERK_VERIFY_AUDIENCE=0`).
- Legacy clients depending on session bridge: canary with `ENABLE_SESSION_BRIDGE=1` and usage telemetry; communicate cutover date.
- Student domain gating errors: whitelist `ngicapitaladvisory.com` for partners and UC domains; add structured logs for rejections.

Dependencies & Sequencing
1) Backend unifier and admin gating
2) Desktop Clerk‑only
3) Student alignment (Phase 3)
4) Session bridge removal (Phase 4)
5) Security/doc gates (Phase 5)
