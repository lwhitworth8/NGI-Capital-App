# Frontend Tasks — Desktop (Admin, Next.js)

Clerk Integration
- Ensure `@clerk/nextjs` provider is used at app root; keep middleware matcher as‑is.
- Remove `src/lib/auth.tsx` (custom AuthContext) and any local login components.
- Remove storage/usage of `auth_token` in localStorage.

API Client
- Keep axios interceptor to obtain Clerk backend token (`session.getToken({ template: 'backend' })`).
- Remove 401 session‑bridge retry logic after server is Clerk‑only (and `/api/auth/session` disabled).
- Ensure `/auth/me` renders profile from Clerk principal; remove legacy `login/reset/change` UI flows.

Admin Gating
- Remove hardcoded admin email checks from `app/auth/resolve/route.ts`; redirect logic should rely on backend role via `/auth/me` or Clerk org membership using `@clerk/nextjs/server` if kept server‑side.
- Simplify Desktop vs Student routing: Desktop is admin‑only; non‑admins are redirected to Student portal by marketing site entry points, not via deep in‑app logic.

QA
- Validate all admin pages fetch/load with Clerk tokens only.
- Sign‑out flows use Clerk’s `signOut()`; no cookie/localStorage cleanup needed.
