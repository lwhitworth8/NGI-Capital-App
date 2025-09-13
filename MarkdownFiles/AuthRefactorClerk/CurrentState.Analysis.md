# Current State Analysis — Authentication

Scope: Inventory all auth code and patterns across backend (FastAPI), Desktop app (Next.js Admin), and Student app. Identify duplication, risks, and migration targets to unify on Clerk.

Backend (FastAPI)
- `src/api/main.py`
  - Defines its own `get_current_partner`, `require_partner_access()`, and `require_full_access()` with mixed support for:
    - Legacy JWT (Authorization: Bearer) using local `SECRET_KEY`.
    - HttpOnly cookie `auth_token` (legacy session bridge).
    - Clerk session cookie `__session` and Clerk JWT via `verify_clerk_jwt`/`verify_clerk_session_cookie`.
    - Dev bypass via env (`DISABLE_ADVISORY_AUTH`, `LOCAL_DEV_NOAUTH`) in several places.
  - Exposes `/api/auth/*`: `login`, `logout`, `request-password-reset`, `reset-password`, `change-password`, `session`, `me` (legacy paths used by Desktop API client).
  - Applies `Depends(require_full_access())` to many routers; some paths skip in tests; dev bypass present.
- `src/api/auth.py`
  - Separate authentication module with overlapping logic to `main.py` (duplication). Imports `verify_clerk_jwt`, `verify_clerk_session_cookie`; reads `auth_token` and `__session`; defines `require_partner_access()` and dual‑authorization helper for transactions.
  - Risk: Competing sources of truth; drift and inconsistent behavior likely.
- `src/api/clerk_auth.py`
  - Verifies Clerk JWT via JWKS (`CLERK_JWKS_URL`, `CLERK_ISSUER`, `CLERK_AUDIENCE`). Also verifies Clerk session cookie. Contains cache/timeout logic and basic error handling.
- Gate usage across routes
  - Admin‑sensitive routers include `entities`, `reports`, `banking`, `documents`, `financial_reporting`, `employees`, `investor_relations`, `investors`, `coa`, `mappings`, `aging`, `ar`, `revrec`, `reporting_financials`, `finance`, `tax`.
  - Advisory admin routes (`src/api/routes/advisory.py`) use a custom `require_ngiadvisory_admin()` which wraps `require_partner_access()` and enforces allowed email list from env (`ALLOWED_ADVISORY_ADMINS`, `ADMIN_EMAILS`) with optional dev bypass.
  - Advisory public routes (`src/api/routes/advisory_public.py`) accept Bearer tokens or `X-Student-Email` for dev/test identity; enforce domain policy via env.

Desktop App (Next.js Admin)
- `apps/desktop/src/middleware.ts`
  - `clerkMiddleware()` used to protect routes by default.
  - Matcher covers app + API routes.
- `apps/desktop/src/lib/api.ts`
  - Axios client attaches Clerk token to `Authorization: Bearer <token>` if available (via `window.Clerk.session.getToken()`), else falls back to cookie session.
  - On 401, tries to bridge session by POSTing to `/api/auth/session` (backend sets `auth_token` cookie) and retries original request once.
  - Contains legacy login/password flows (`/api/auth/login`, `request-password-reset`, `change-password`, etc.).
- `apps/desktop/src/lib/auth.tsx`
  - Custom React AuthContext that stores user in localStorage and relies on `apiClient.login()` and `/auth/me`.
  - Contains a best‑effort Clerk sign‑out call but is otherwise separate from Clerk’s React context.
- `apps/desktop/src/app/auth/resolve/route.ts`
  - Uses Clerk server `auth()`/`currentUser()`; redirects based on allowed admin emails; does not set/bridge backend session; duplicates gating logic.

Student App (Next.js)
- `apps/student/src/middleware.ts`
  - `clerkMiddleware()` with public route matcher (projects, learning, sign‑in/up, etc.).
  - Domain gating and partner email redirect logic embedded in middleware (reads `PARTNER_EMAILS`, `ALLOWED_EMAIL_DOMAINS`).
- Sign‑in/Sign‑up pages use `@clerk/nextjs` components. Various components use `useUser`, `useClerk`.
  
Cross‑cutting Observations
- Duplication: Two sources for `require_partner_access` (in `main.py` and `auth.py`), multiple gating layers (backend deps, frontend Clerk middleware, app routes, API client interceptors).
- Mixed identity: Legacy JWT, `auth_token` cookie, Clerk session cookie, Clerk JWT.
- Admin gating is list‑based (env emails) in several places; not centrally enforced via Clerk org/roles.
- Dev toggles: `DISABLE_ADVISORY_AUTH`, `LOCAL_DEV_NOAUTH`, domain gate relaxations — easy to misconfigure in prod without a clear feature‑flag strategy.
- Password flows: `/api/auth/login/reset/change` contradict “Clerk only” direction; these should be removed when deprecating legacy auth.
- Session bridge: `/api/auth/session` exists solely to move a Bearer token into an `auth_token` cookie — a legacy step that should be unnecessary if backend always validates Clerk (`Authorization` or `__session`).

Risk Summary
- Inconsistent enforcement paths create gaps (e.g., different behavior between cookie vs header, dev bypass vs prod). 
- Password endpoints increase attack surface; secrets are present in env/sample files.
- Middleware‑level redirects based on partner lists are duplicated across apps; non‑authoritative vs Clerk org roles.

Initial Targets for Unification
1) Single backend auth dependency: verify Clerk JWT or Clerk session cookie only; remove local JWT/`auth_token` cookie usage.
2) Centralize admin gating via Clerk (org slug or role claim), not env email lists (keep a fallback as a temporary feature flag only).
3) Desktop app: remove custom AuthContext/login UI and rely entirely on Clerk provider/hooks and backend Bearer token.
4) Session bridge endpoint retained temporarily (behind a flag) for compatibility during cutover, then removed.
