# PRD – Unified Authentication with Clerk

Objectives
- Replace all legacy authentication (local JWT, password endpoints, `auth_token` cookie) with a single, Clerk-based model.
- Enforce consistent authorization on the backend using a central dependency that accepts:
  - Authorization: Bearer <Clerk JWT> (Clerk backend token)
  - Clerk session cookie `__session` (when requests originate from same-site apps)
- Centralize admin gating via Clerk organization/roles; remove scattered env-based allowlists except as a temporary fallback.
- Ensure both Next.js apps derive identity solely from Clerk and send authenticated requests with Clerk tokens or same-site cookies.

Non‑Goals (V1)
- Supporting username/password login or local password reset.
- Multi‑IdP federation beyond Clerk (future).
- Fine‑grained RBAC beyond Admin vs Student (future can use Clerk roles/claims).

Personas & Permissions
- Admin Partner: Access to Desktop Admin app and all admin API routes (Accounting, Advisory Admin, etc.). Must be member of Clerk org `ngi-capital` with role `admin` (or equivalent) OR included in a one‑time emergency allowlist fallback.
- Student: Access to Student app; public Advisory endpoints; per-student endpoints gated by Clerk identity and domain policy.

Functional Requirements
- Backend
  - Single auth dependency `require_clerk_user()` that returns a normalized principal (id, email, roles/orgs).
  - `require_admin()` that derives admin status from Clerk org membership (configurable slug) OR explicit role claim.
  - Remove `/api/auth/login`, `/api/auth/request-password-reset`, `/api/auth/reset-password`, `/api/auth/change-password`.
  - Deprecate `/api/auth/session` (kept behind `ENABLE_SESSION_BRIDGE=1` for a short transition window).
  - All routers use Clerk deps; remove legacy local JWT validation and `auth_token` cookie reads.
- Desktop App
  - Use Clerk provider/hooks (`@clerk/nextjs`) only; remove custom `AuthContext` and legacy login UX.
  - All API calls rely on Clerk backend tokens (axios interceptor obtains token with `template: 'backend'`).
  - Remove localStorage `auth_token` usage.
- Student App
  - Keep Clerk middleware; simplify partner redirect logic to rely on backend role checks instead of front‑middleware hardcoding where feasible.
  - Ensure requests to public endpoints remain anonymous unless needed; attach Clerk token when accessing per-user endpoints.

Security Requirements
- No password processing in app; password reset handled by Clerk.
- Remove dev bypass envs from production builds (`DISABLE_ADVISORY_AUTH`, etc.).
- Validate Clerk JWT via JWKS; enforce `issuer` and (optional) `audience` configured to `backend` template.
- Snyk high‑severity gate must be clean prior to rollout.

Telemetry & Observability
- Log normalized principal (id/email) for requests post‑unification; redact tokens.
- 401/403 metrics to track auth failures after cutover.

Acceptance Criteria
- All admin API routes reject requests without valid Clerk identity.
- Desktop admin UI works end‑to‑end with Clerk only; no local login.
- Student app continues to function; per‑student endpoints validate Clerk identity.
- No references to `auth_token` cookie or legacy `/api/auth/*` password endpoints remain (except behind disabled bridge flag).

Scope & Detailed Flows

- Desktop Admin (Next.js)
  - Identity sourced from Clerk React SDK (`@clerk/nextjs`).
  - API calls include `Authorization: Bearer <Clerk backend token>` via client interceptor; server-side requests are proxied through Nginx and carry Clerk cookies.
  - Route protection via Clerk middleware; admin authorization enforced by backend `require_admin()` using Clerk org/roles.
  - After sign‑in, land on `/admin/dashboard`; after sign‑out, redirect to student landing.

- Student App (Next.js)
  - Public content: marketing, Projects list/detail.
  - Per‑student flows: Applications/My Projects/Profile use Clerk identity. Browser fetch attaches Clerk bearer when available; SSR fetch relies on `__session` cookie; backend verifies both.
  - Domain gating enforced on backend for student identities using `ALLOWED_STUDENT_DOMAINS` (or `ALLOWED_EMAIL_DOMAINS`).

- Backend (FastAPI)
  - `require_clerk_user(request)`: verify Clerk JWT from Authorization or verify Clerk `__session`. Returns `{ id, email, name?, roles?, orgs? }`.
  - `require_admin(user)`: verify admin via Clerk org slug (`CLERK_ADMIN_ORG_SLUG`) or role claim; allow emergency env allowlist only if `ENABLE_ENV_ADMIN_FALLBACK=1`.
  - Admin routers depend on `require_admin`; student public routers accept anonymous where appropriate and use Clerk when needed.

API Contracts (selected)

- `GET /api/auth/me`
  - 200: `{ id: string, email: string, name?: string, authenticated: true, permissions?: string[] }`
  - 401: `{ detail: "Authentication required" }`

- `POST /api/auth/logout`
  - 200: `{ message: "Successfully logged out" }` (also clears legacy cookie if present)

- Public student endpoints under `/api/public/*`
  - Read endpoints (projects): anonymous 200 OK.
  - Per‑student endpoints: 200 OK when Clerk identity or approved fallback header present (dev/test). 403 when domain not allowed. 401 if identity is required and absent (prod).

Environment & Flags

- Clerk: `CLERK_ISSUER`, `CLERK_JWKS_URL`, `CLERK_AUDIENCE=backend`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (server‑side).
- Admin org/roles: `CLERK_ADMIN_ORG_SLUG` (e.g., `ngi-capital`). Optional role claim key if used.
- Fallback controls:
  - `ENABLE_SESSION_BRIDGE` (default 0 in prod): enable temporary `/api/auth/session` cookie bridge.
  - `ENABLE_ENV_ADMIN_FALLBACK` (default 0 in prod): allow env allowlists for admin in emergencies.
  - `ALLOWED_STUDENT_DOMAINS` or `ALLOWED_EMAIL_DOMAINS`: student domain gating.
  - Dev/test convenience remains for public student endpoints (header/query fallback) without enabling in prod.

Security & Hardening

- Verify Clerk JWT via JWKS; enforce `issuer` and, when feasible, `audience`.
- Remove password endpoints; ensure `.env.example` contains no sensitive tokens or sample secrets that look real.
- Production config disables dev bypasses (`DISABLE_ADVISORY_AUTH`, mock student). CORS and TrustedHost allow only deployed origins.
- Tokens never logged; only derived claims (email, sub) may be logged for troubleshooting.

Telemetry & Observability

- Counters: 401/403 rates by route; session bridge usage (expect 0 after cutover).
- Logs: authentication source (Bearer vs session), admin gate decisions (org/role match outcome), with redaction.

QA Gates & Test Strategy

- Unit/Integration
  - Backend: mock `verify_clerk_jwt`/`verify_clerk_session_cookie` to simulate valid/invalid Clerk identities; ensure admin gating behaves by org/role.
  - Public student endpoints: validate anonymous reads and per‑student writes with Clerk, and header fallback in tests.
- E2E
  - Nginx dev: unauthenticated routes redirect to hosted Clerk sign‑in; authenticated flows pass with Clerk token/cookie.
- Snyk gate: high severity must be clean across Node and Python before prod deploy.

Cutover & Backout

- Cutover: disable `ENABLE_SESSION_BRIDGE`, remove legacy endpoints, confirm admin and student flows under Clerk.
- Backout: re‑enable `ENABLE_SESSION_BRIDGE=1` and roll back desktop build if required; maintain logs for RCA.
