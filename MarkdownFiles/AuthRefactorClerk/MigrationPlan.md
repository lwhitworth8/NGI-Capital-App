# Migration Plan â€” Deprecate Legacy Auth, Migrate to Clerk

Phase 0 â€” Prep (same day)
- Confirm Clerk envs across apps and backend: `CLERK_ISSUER`, `CLERK_JWKS_URL`, `CLERK_AUDIENCE=backend`, publishable/secret keys configured in runtime envs (not committed).
- Create Clerk org `ngi-capital`; add Admin role; assign members (Andre, Landon). Decide on role/claim naming.
- Add feature flags: `ENABLE_SESSION_BRIDGE`, `ENABLE_ENV_ADMIN_FALLBACK` (defaults: disabled in prod).

Phase 1 â€” Backend Unifier (safe, behind flags)
- Implement `require_clerk_user()` and `require_admin()` in `src/api/auth.py` using only Clerk validation.
- Switch all routers to new deps; keep legacy deps callable but unused.
- Keep `/api/auth/session` enabled only if `ENABLE_SESSION_BRIDGE=1`.
- Mark `/api/auth/login|reset|change` as deprecated: respond 410 Gone with guidance (or keep behind `ENABLE_LEGACY_PASSWORD=0`).

Phase 2 â€” Desktop App Cutover
- Remove `lib/auth.tsx` and any legacy login UI.
- Ensure axios uses Clerk token exclusively; remove `auth_token` storage and 401 session-bridge retry path once backend is Clerkâ€‘only.
- Validate pages and middleware; route admin gating based on backend `GET /api/auth/me` (Clerk-derived), not local email lists.

Phase 3 â€” Student App Alignment
- Keep Clerk middleware; remove partner email redirect logic or reduce to a thin UX suggestion; rely on backend to authorize admin pages.
- Verify perâ€‘student calls attach Clerk token and pass unified backend deps.

Phase 4 â€” Hard Removal
- Delete legacy code in `src/api/main.py` (duplicate auth functions and password endpoints).
- Remove `/api/auth/session` and all references to `auth_token` in code and docs; delete desktop `AuthProvider` remnants.

Phase 5 â€” Security & Docs
- Rotate any exposed secrets; scrub `.env.example` of sensitive values.
- Update README and module docs; run Context7 doc refresh passes for affected modules.
- Run Snyk scans (node/python) at repo root; resolve highs or document noâ€‘fix transitives.

Rollback Plan
- Flags: Reâ€‘enable `ENABLE_SESSION_BRIDGE=1` temporarily if needed.
- If backend break, revert to Phase 1 commit; desktop can still function via bridge.

Acceptance Gates
- QA passes all auth flows per QA.TestPlan.md.
- Snyk high severity clean before prod.
