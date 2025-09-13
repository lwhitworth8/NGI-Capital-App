# Backend Tasks — FastAPI (Clerk Unification)

Core
- Add `src/api/auth_deps.py` (or consolidate into `src/api/auth.py`) with:
  - `require_clerk_user(request)` — Accept Authorization Bearer Clerk JWT or Clerk `__session`. Return `{ id, email, roles, orgs }`.
  - `require_admin(user)` — Check Clerk org slug (env `CLERK_ADMIN_ORG_SLUG`) or role claim. Optional fallback to `ALLOWED_ADVISORY_ADMINS` only if `ENABLE_ENV_ADMIN_FALLBACK=1`.
- Replace all usages of `require_partner_access()` / `require_full_access()` in `src/api/main.py` and routes with the new deps. Remove duplicate auth logic in `main.py`.

Routes Cleanup
- Remove password endpoints: `/api/auth/login`, `/api/auth/request-password-reset`, `/api/auth/reset-password`, `/api/auth/change-password`.
- Keep `/api/auth/me` but make it return Clerk‑derived profile; remove local partner password/owners fields if not used.
- Keep `/api/auth/session` only if `ENABLE_SESSION_BRIDGE=1` for a short transition; else return 410 Gone.

Verification Logic
- Configure JWKS cache and issuer/audience validation. Fail closed on config errors in prod.
- Accept Clerk backend token (JWT) from Desktop and Student apps; accept `__session` only for same‑site requests.

Admin Gating
- Advisory admin (`src/api/routes/advisory.py`) to use `require_admin()` exclusively.
- Remove email allowlist parsing except behind fallback flag.

Security Hardening
- Remove `DISABLE_ADVISORY_AUTH`, `LOCAL_DEV_NOAUTH` from production builds.
- Ensure CORS/TrustedHost configured for deployed origins only.
- Redact tokens in logs; keep `logs/` free of secrets.

Docs & Tests
- Update README `.env.example` to Clerk‑only.
- Update tests to use Clerk JWT fixtures (or mock `verify_clerk_*`).
- Remove legacy tests covering password endpoints and `auth_token` cookie.
