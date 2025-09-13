# Epics — Vercel Monorepo + Backend Docker

1) Vercel Projects (Monorepo)
- Create two Vercel projects from the same Git repo:
  - Project: NGI Student — Root Directory `apps/student`
  - Project: NGI Admin — Root Directory `apps/desktop`
- Install command: `npm ci --prefix=../..`
- Build command: default (Next.js)
- Production branch: `production` for both projects
- Preview branch: `main` (and all non-production branches)
- Add domains: apex to Student, `admin.` subdomain to Admin
- Set env vars per Env Matrix

2) DNS (Squarespace)
- Point apex and `www` to Vercel
- Point `admin` to Vercel Admin project
- Point `api` to backend VM (A record) or reverse proxy

3) Backend VM + Docker Compose
- Provision small VM (Ubuntu 22.04+)
- Install Docker + Compose plugin
- Clone repo (read-only) and run backend-only via `docker-compose.prod.yml`
- Add reverse proxy (Caddy or Nginx) to terminate TLS for `api.ngicapitaladvisory.com`

4) Clerk Configuration
- Add production domains to Clerk Allowed Origins/Redirects
- Set publishable/secret keys in Vercel + VM
- Admin detection via org/role (CLERK_ADMIN_ORG_SLUG) or env allowlist (disabled in prod)

5) Git Branching & Protections
- Create `production` branch, configure Vercel Production Branch
- Protect `production` (review required) if desired
- Keep `main` for active development and previews

6) QA & Demo Runbook
- Preflight checklist (envs, DNS, TLS, healthchecks)
- Smoke tests across key flows
- Day-of runbook & rollback strategy

