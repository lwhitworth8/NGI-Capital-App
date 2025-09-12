# Unified Authentication Epics

## Epic 1: Backend Clerk Authentication
- Replace `get_current_partner` with `get_current_user` verifying Clerk JWTs or session cookies.
- Remove HS256 token issuance and validation code.
- Add role checks based on Clerk claims or database roles.
- Log and reject requests missing required env vars.

## Epic 2: Harden Dev/Test Bypass
- Remove `DISABLE_ADVISORY_AUTH` and `NEXT_PUBLIC_DISABLE_ADVISORY_AUTH` flags.
- Introduce `ALLOW_DEV_BYPASS` only honored when `ENV=development`.
- Emit structured warnings when bypass is engaged.

## Epic 3: Client Session Simplification
- Drop `/auth/login` password endpoint and associated API client logic.
- Desktop and student apps call `/auth/session` once post Clerk sign‑in.
- Remove response interceptor retry loops; rely on cookie expiration.

## Epic 4: Configuration & Monitoring
- Document required `CLERK_*` environment variables.
- Add startup check in backend to verify configuration.
- Instrument auth paths to report 401 counts and missing claim errors.

## Epic 5: Migration & Cleanup
- Introduce feature flag `NEW_AUTH_FLOW` to toggle new logic.
- Migrate staging to new flow and collect metrics.
- Remove legacy code paths and flags after stable production rollout.

