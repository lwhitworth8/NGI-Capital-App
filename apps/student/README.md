# NGI Capital Student App

Next.js 14 app for student-facing experiences. Clerk-only authentication.

## Development
```bash
npm install
npm run dev
```

## Auth & Routing
- Sign-in/up handled by Clerk components.
- `GET /auth/resolve` determines role:
  - Admins (Clerk role/org or `ADMIN_EMAILS`) ? redirect to `/admin/dashboard` (desktop app)
  - Students (email domain in `ALLOWED_EMAIL_DOMAINS`) ? redirect to `/projects`

## Environment
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_ISSUER=https://<your-subdomain>.clerk.accounts.dev
CLERK_JWKS_URL=https://<your-subdomain>.clerk.accounts.dev/.well-known/jwks.json
NEXT_PUBLIC_STUDENT_BASE_URL=http://localhost:3001
ALLOWED_EMAIL_DOMAINS=berkeley.edu,ucla.edu,ucsd.edu,uci.edu,ucdavis.edu,ucsb.edu,ucsc.edu,ucr.edu,ucmerced.edu
ADMIN_EMAILS=
CLERK_ADMIN_ORG_SLUG=
```

## Notes
- Served at `/` behind nginx in dev compose.

