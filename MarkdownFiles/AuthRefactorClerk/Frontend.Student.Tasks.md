# Frontend Tasks — Student (Next.js)

Middleware
- Keep `clerkMiddleware` public route matcher. Remove partner/admin redirect logic or reduce to minimal UX (avoid hardcoded email checks in middleware).
- Allow backend to be authoritative for admin gating (Desktop app).

API Usage
- For per‑student endpoints (applications/memberships/profile), ensure fetches include Clerk backend token in the browser when available; SSR relies on Clerk `__session` cookie.
- Keep public endpoints anonymous (projects list/detail) as today.

UI
- No changes to Clerk SignIn/SignUp flows besides ensuring `afterSignInUrl`/`afterSignUpUrl` paths don’t rely on legacy session bridging.

QA
- Verify apply, withdraw, profile update, uploads work end‑to‑end with unified backend deps.
 - Confirm header fallback (`X-Student-Email`) remains functional in tests/dev without affecting prod.
