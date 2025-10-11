# Unified Authentication Epics

## Epic 1: Backend Clerk Authentication
- **Story 1.1 – Clerk verifier**: build JWKS‑based verifier in `src/api/auth.py` and expose `verify_clerk_token` helper.
- **Story 1.2 – Dependency swap**: replace `get_current_partner` with `get_current_user` across all route modules under `src/api/routes/`.
- **Story 1.3 – Remove legacy tokens**: delete HS256 signing helpers and `authenticate_partner` endpoint.
- **Story 1.4 – Role enforcement**: ensure `User` model carries `is_partner` flag from Clerk claims or DB lookup.
- **Story 1.5 – Env guardrails**: on startup, log error and abort when required `CLERK_*` variables are absent.

## Epic 2: Harden Dev/Test Bypass
- **Story 2.1 – Remove flags**: delete `DISABLE_ADVISORY_AUTH` and `NEXT_PUBLIC_DISABLE_ADVISORY_AUTH` checks in auth utilities and configs.
- **Story 2.2 – Add gated bypass**: implement `ALLOW_DEV_BYPASS` environment variable; enforce `ENV=development` check in `require_partner_access`.
- **Story 2.3 – Audit logs**: add structured warning log when bypass is used, including request metadata.

## Epic 3: Client Session Simplification
- **Story 3.1 – Remove password login**: delete `/auth/login` FastAPI route and related tests.
- **Story 3.2 – Update desktop client**: in `apps/desktop/src/lib/api.ts`, call `/auth/session` after Clerk sign‑in and eliminate token refresh interceptor.
- **Story 3.3 – Update student frontend**: ensure Next.js middleware posts Clerk token to `/auth/session` and handles 401 by redirecting to Clerk login.
- **Story 3.4 – Cookie reliance**: confirm all subsequent requests rely solely on HttpOnly cookie without manual token headers.

## Epic 4: Configuration & Monitoring
- **Story 4.1 – README update**: list mandatory env vars and describe new flow.
- **Story 4.2 – Startup checks**: implement config validation function executed at FastAPI startup.
- **Story 4.3 – Metrics**: add logging or telemetry counting 401 responses and missing claim failures.

## Epic 5: Migration & Cleanup
- **Story 5.1 – Feature flag**: add `NEW_AUTH_FLOW` setting controlling new verifier and client paths.
- **Story 5.2 – Staging rollout**: enable flag in staging, compare 401 metrics before/after.
- **Story 5.3 – Remove legacy**: after validation, delete HS256 helpers, bypass flags, and feature flag itself.

