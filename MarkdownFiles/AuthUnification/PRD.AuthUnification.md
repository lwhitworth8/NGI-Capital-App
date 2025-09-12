# Unified Authentication PRD

## Summary
Consolidate all authentication in the NGI Capital App into a single Clerk‑based flow. Remove legacy JWT paths, minimize environment‑based bypasses, and ensure both admin and student clients authenticate consistently.

## Problem
Current auth mixes Clerk sessions, legacy HS256 JWTs, and development bypass flags. This complexity leads to hard‑to‑debug 401s, inconsistent identity data, and potential security gaps.

## Goals
- **Single source of truth**: Only Clerk tokens or sessions are accepted for all API access.
- **Consistent identity object**: `get_current_user` returns a uniform user shape with roles.
- **Reduced bypasses**: Dev shortcuts are scoped to explicit environments and logged.
- **Simpler clients**: Desktop and student apps establish backend sessions through one `/auth/session` bridge.

## Non‑Goals
- Replacing Clerk with another provider.
- Implementing granular RBAC beyond existing partner/student roles.

## Users
- Admin staff using the desktop app.
- Students using the student frontend.
- Developers operating the API in development and test environments.

## Success Metrics
- 0 legacy HS256 tokens issued or accepted in production.
- 90% reduction in auth‑related 401 errors in logs after rollout.
- Automated tests cover Clerk token verification and session bridging.

## Functional Requirements
1. Backend verifies only Clerk session cookies or JWTs.
2. `/auth/session` endpoint exchanges a Clerk token for an HttpOnly cookie.
3. Dev bypasses are disabled unless `ENV=development`.
4. Clients call `/auth/session` once after Clerk sign‑in; no `/auth/login` password flow.
5. Startup check warns if any required `CLERK_*` env vars are missing.

## Technical Overview
- Implement `get_current_user` dependency in `src/api/auth.py` using Clerk JWKS.
- Remove `authenticate_partner` and HS256 verification helpers.
- Drop `DISABLE_ADVISORY_AUTH` and related flags; replace with a single `ALLOW_DEV_BYPASS` scoped to development.
- Update route dependencies to `get_current_user` and add role checks where needed.
- Client libs rely on `Clerk.session.getToken()` and call `/auth/session` to set cookie.

## Dependencies
- Valid `CLERK_JWKS_URL`, `CLERK_ISSUER`, `CLERK_SECRET_KEY` environment variables.
- Clerk SDKs for Next.js clients.

## Rollout Plan
1. Merge backend changes behind feature flag `NEW_AUTH_FLOW`.
2. Update desktop and student apps to use session bridge.
3. Enable `NEW_AUTH_FLOW` in staging; monitor metrics.
4. Remove legacy code paths once stable.

## Open Questions
- Should service accounts (e.g., cron jobs) use API keys instead of Clerk tokens?
- Do we need rate limiting on `/auth/session` to mitigate abuse?

