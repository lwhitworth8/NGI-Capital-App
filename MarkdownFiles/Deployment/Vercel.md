NGI Capital Monorepo - Vercel Deploy Guide (Current State)

Scope
- Two Next.js apps on Vercel with separate domains.
- Student app: apps/student (apex)
- Admin app: apps/desktop (admin subdomain)

Project Setup
- Create two Vercel projects: NGI Student and NGI Admin.
- Root Directory:
  - NGI Student: apps/student
  - NGI Admin: apps/desktop
- Build & Install:
  - vercel.json in each app pins install/build. Leave Vercel defaults.
  - Install uses npm workspaces at repo root and npm ci in app dir.
- Node version: 18.x (default is OK).

Env Vars (Student)
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
- CLERK_SECRET_KEY=sk_live_...
- CLERK_ISSUER=https://<your-subdomain>.clerk.accounts.dev
- CLERK_JWKS_URL=https://<your-subdomain>.clerk.accounts.dev/.well-known/jwks.json
- BACKEND_ORIGIN=https://api.<your-domain>
- NEXT_PUBLIC_API_URL=https://api.<your-domain>
- NEXT_PUBLIC_STUDENT_BASE_URL=https://students.<your-domain>
- NEXT_PUBLIC_ADMIN_BASE_URL=https://admin.<your-domain>
- ALLOWED_EMAIL_DOMAINS=berkeley.edu,ucla.edu,...
- NEXT_PUBLIC_FORCE_LOGOUT_ON_LOAD=false

Env Vars (Admin)
- ADMIN_STANDALONE_DOMAIN=1
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
- CLERK_SECRET_KEY=sk_live_...
- CLERK_ISSUER=https://<your-subdomain>.clerk.accounts.dev
- CLERK_JWKS_URL=https://<your-subdomain>.clerk.accounts.dev/.well-known/jwks.json
- BACKEND_ORIGIN=https://api.<your-domain>
- NEXT_PUBLIC_API_URL=https://api.<your-domain>
- NEXT_PUBLIC_STUDENT_BASE_URL=https://students.<your-domain>
- NEXT_PUBLIC_ADMIN_BASE_URL=https://admin.<your-domain>

Domains (done)
- ngicapitaladvisory.com (apex) -> Student project
- admin.ngicapitaladvisory.com -> Admin project
- Squarespace DNS:
  - @ A -> 76.76.21.21 (Vercel)
  - www CNAME -> Vercel value (or cname.vercel-dns.com)
  - admin CNAME -> Vercel value (or cname.vercel-dns.com)
  - api A -> public IPv4 of backend host

Clerk Configuration
- Add both domains to Authorized redirect URLs in Clerk.
- Set publishable/secret keys in both apps.
- Remove dev-only mock flags in production.

- Backend Notes
- The Next apps rewrite /api/* to BACKEND_ORIGIN. Ensure the backend is reachable over HTTPS at api.ngicapitaladvisory.com.
- CORS must allow both frontends:
  - https://students.<your-domain>
  - https://admin.<your-domain>

Known Pitfalls
- Admin root redirect: disabled when ADMIN_STANDALONE_DOMAIN=1.
- Monorepo installs: vercel.json installs at repo root then app.
- Marketing sign-in resolve: admins go to Admin dashboard; others to Projects. Default admin allowlist added.
- Force logout: set NEXT_PUBLIC_FORCE_LOGOUT_ON_LOAD=false in production.
- Images: if loading remote images, configure next.config images.domains as needed.

Smoke Tests
- Student: / loads marketing, /sign-in shows Clerk, /projects loads.
- Admin: / loads admin shell, auth works, API calls succeed.
- Both: /api/health proxies to backend and returns 200.

Current State
- Student and Admin are deployed and healthy.
- Clerk keys are set in Vercel Production envs.
- Production deploys: push to production branch (CI workflow available).

