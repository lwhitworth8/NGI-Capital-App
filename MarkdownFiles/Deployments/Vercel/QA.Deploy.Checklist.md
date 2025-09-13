# QA — Deployment Checklist (Production Demo)

Preflight (Infrastructure)
- VM reachable on 80/443; firewall open
- Backend running: `curl http://localhost:8001/api/health` returns 200
- Reverse proxy up (Caddy or Nginx) and serving TLS for `api.ngicapitaladvisory.com`

Preflight (Vercel)
- Student project builds from `production`; domain attached to apex
- Admin project builds from `production`; domain attached to `admin`
- Env vars populated per matrix

Clerk
- Allowed Origins: apex + admin
- AfterSignIn / AfterSignOut URLs set correctly (see Env Matrix)

Functional Smoke
- Student: `/` loads marketing homepage; Sign In works; redirect to `/projects`
- Admin: `/admin/dashboard` loads after sign-in; sidebar links work
- Investor Management: KPIs, Pipeline, Reports load without errors
- Accounting: open key pages (TB, JE list) without 500s
- Advisory: public projects list and details load

Observability
- Backend logs show 200s; no repeated 500s
- Nginx/Caddy logs clean (optional)

Rollback Plan
- If a front-end deploy fails: switch Vercel “Production Branch” back to `main` temporarily or redeploy latest successful build
- If backend fails: `docker compose -f docker-compose.prod.yml logs backend`, revert code, `docker compose … up -d backend`

