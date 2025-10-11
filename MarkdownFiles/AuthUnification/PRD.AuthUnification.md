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

## Implementation Breakdown

### Phase 1 – Backend
1. **Create Clerk verifier** in `src/api/auth.py` using JWKS fetched from `CLERK_JWKS_URL`.
2. **Replace legacy helpers**: remove `authenticate_partner`, HS256 signing utilities in `src/api/auth.py` and `src/api/utils/token.py`.
3. **Introduce `get_current_user`** dependency returning a `User` model with role info.
4. **Update routes**: change all `Depends(get_current_partner)` to `Depends(get_current_user)` across `src/api/routes/*`.
5. **Feature flag**: wrap new logic behind `NEW_AUTH_FLOW` and default to legacy path when flag is false.

### Phase 2 – Client Applications
1. **Desktop app** (`apps/desktop/src/lib/api.ts`): remove `/auth/login` calls and token retry interceptor.
2. **Student frontend**: ensure Next.js middleware uses Clerk for sign‑in and POSTs token to `/auth/session` once.
3. **Session bridge**: verify `/auth/session` endpoint sets an HttpOnly cookie consumed by subsequent requests.

### Phase 3 – Configuration & Cleanup
1. **Environment checks**: on FastAPI startup, assert presence of `CLERK_JWKS_URL`, `CLERK_ISSUER`, and `CLERK_SECRET_KEY`; log fatal if missing.
2. **Deprecate bypass flags**: remove `DISABLE_ADVISORY_AUTH` and `NEXT_PUBLIC_DISABLE_ADVISORY_AUTH`; introduce `ALLOW_DEV_BYPASS` gated by `ENV=development`.
3. **Delete legacy endpoints**: remove `/auth/login` and any HS256 token issuance code after rollout completes.
4. **Documentation**: update README and deployment guides with new flow and required variables.

## Open Questions
- Should service accounts (e.g., cron jobs) use API keys instead of Clerk tokens?
- Do we need rate limiting on `/auth/session` to mitigate abuse?

