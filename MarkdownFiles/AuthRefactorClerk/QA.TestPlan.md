# QA Test Plan — Unified Auth

Environments
- Dev: Clerk test instance, `ENABLE_SESSION_BRIDGE=0`, `ENABLE_ENV_ADMIN_FALLBACK=0` (enable only during canary if needed).
- Prod‑like: Same as above; backend behind correct origins and hosts.

Backend
- 401 when no Clerk token/cookie; 200 with valid Clerk JWT.
- 403 to admin routes for non‑admin Clerk users; 200 for admin role/org members.
- `/auth/me` returns normalized Clerk profile; legacy endpoints return 410.

Desktop App (Admin)
- Auth: Redirect to sign‑in when not authenticated; successful sign‑in lands on dashboard.
- No local login UI present; no localStorage `auth_token` mutations observed.
- API calls carry Clerk token (Authorization header) and succeed.

Student App
- Public pages accessible unauthenticated; per‑student pages require sign‑in.
- Applications list/detail/withdraw; My Projects pages load; profile GET/PATCH.

Negative
- Invalid/expired Clerk token → 401 with retry after re‑auth.
- Attempt admin route as student → 403.

E2E
- Playwright: update/sign‑in via Clerk test helpers or mock token injection; verify key flows above.
