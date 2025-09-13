# NGI Capital Admin (Desktop) App

Next.js 14 app for partner administration. Clerk-only authentication; no legacy password login or cookie bridge.

## Features
- Dashboard: KPIs, cash position, approvals, recent transactions
- Accounting: COA, journal entries, GL, reports
- Entities: multi-entity management
- Banking: reconciliation and integrations (Mercury-ready)

## Development
```bash
npm install
npm run dev
```

## Environment
Create `.env.local` or use docker-compose:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_ISSUER=https://<your-subdomain>.clerk.accounts.dev
CLERK_JWKS_URL=https://<your-subdomain>.clerk.accounts.dev/.well-known/jwks.json
CLERK_AUDIENCE=backend
NEXT_PUBLIC_STUDENT_BASE_URL=http://localhost:3001
```

## Auth
- Protected by `@clerk/nextjs` middleware; backend verifies Clerk tokens.
- Admin access via Clerk org/role (configure `CLERK_ADMIN_ORG_SLUG`) or env allowlist in tests.
- Legacy endpoints `/api/auth/login` and `/api/auth/session` are removed (410 Gone).

## Testing
```bash
npm test
```

## Notes
- Reverse-proxied at `/admin` via nginx in dev compose.
- Backend docs at `http://localhost:8001/docs`.

