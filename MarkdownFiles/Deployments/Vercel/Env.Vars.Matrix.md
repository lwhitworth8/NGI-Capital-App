# Env Vars Matrix (Production)

Student (Vercel — apps/student)
- NODE_ENV=production (Vercel default)
- BACKEND_ORIGIN=https://api.ngicapitaladvisory.com
- NEXT_PUBLIC_STUDENT_BASE_URL=https://ngicapitaladvisory.com
- NEXT_PUBLIC_ADMIN_BASE_URL=https://admin.ngicapitaladvisory.com/admin
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
- CLERK_PUBLISHABLE_KEY=pk_live_xxx (duplicate for SSR paths)

Admin (Vercel — apps/desktop)
- NODE_ENV=production (Vercel default)
- BACKEND_ORIGIN=https://api.ngicapitaladvisory.com
- NEXT_PUBLIC_API_URL=https://api.ngicapitaladvisory.com
- NEXT_PUBLIC_STUDENT_BASE_URL=https://ngicapitaladvisory.com
- NEXT_PUBLIC_ADMIN_BASE_URL=https://admin.ngicapitaladvisory.com/admin
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
- CLERK_PUBLISHABLE_KEY=pk_live_xxx

Backend (VM — docker-compose.prod.yml)
- SECRET_KEY=<strong random>
- DATABASE_PATH=/app/data/ngi_capital.db
- LOG_LEVEL=INFO
- CLERK_AUDIENCE=backend
- CLERK_ISSUER=https://<your-clerk-subdomain>.clerk.accounts.dev
- CLERK_JWKS_URL=https://<your-clerk-subdomain>.clerk.accounts.dev/.well-known/jwks.json
- CLERK_VERIFY_AUDIENCE=1
- CLERK_SECRET_KEY=sk_live_xxx
- OPEN_ALL_ADMIN=0
- OPEN_NON_ACCOUNTING=0
- DISABLE_ACCOUNTING_GUARD=0
- ENABLE_ENV_ADMIN_FALLBACK=0
- ADMIN_EMAILS= (leave empty in prod)
- ALLOWED_EMAIL_DOMAINS=berkeley.edu,ucla.edu,ucsd.edu,uci.edu,ucdavis.edu,ucsb.edu,ucsc.edu,ucr.edu,ucmerced.edu,ngicapitaladvisory.com
- CLERK_ADMIN_ORG_SLUG=ngi-capital

Notes
- Do not commit secrets. Set them in Vercel project Settings → Environment Variables and on the VM `.env`.
- For previews (branch ≠ production), you can set separate values or leave unset to avoid accidental access.

