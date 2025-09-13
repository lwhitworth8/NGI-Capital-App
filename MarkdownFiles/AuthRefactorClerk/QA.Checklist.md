# QA Checklist — Unified Auth

- Backend
  - [ ] All admin routers protected by `require_admin()`.
  - [ ] Non‑admin requests receive 403; unauthenticated receive 401.
  - [ ] `/auth/me` returns Clerk‑derived identity; no legacy fields needed.
  - [ ] Legacy `/api/auth/*` password endpoints removed or return 410.

- Desktop App
  - [ ] No local login UI; no references to `auth_token`.
  - [ ] API calls succeed with Clerk backend token; interceptor never stores tokens locally.
  - [ ] Sign‑out signs Clerk out and returns to marketing or sign‑in.

- Student App
  - [ ] Public pages accessible unauthenticated.
  - [ ] Per‑student pages require Clerk; flows succeed.

- Security
  - [ ] Snyk scans pass high‑severity gate.
  - [ ] No secrets in logs; dev bypass disabled in prod.
