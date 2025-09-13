# Ops Migration Notes — Clerk Unified Auth

Use these settings in production to enforce Clerk-only authentication and remove all legacy fallbacks.

## Required Environment
- CLERK_ISSUER: https://<your-subdomain>.clerk.accounts.dev
- CLERK_JWKS_URL: https://<your-subdomain>.clerk.accounts.dev/.well-known/jwks.json
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_live_...
- CLERK_SECRET_KEY: sk_live_...
- CLERK_AUDIENCE: backend (or match your JWT template)

## Admin Gating
- CLERK_ADMIN_ORG_SLUG: ngi-capital (or your org slug)
- ENABLE_ENV_ADMIN_FALLBACK=0
- ADMIN_EMAILS: empty (avoid allowlist in prod)

## Disable Legacy/Canary Flags
- FORCE_CLERK_ONLY=1
- ENABLE_LEGACY_AUTH=0
- ALLOW_LEGACY_JWT=0
- ENABLE_SESSION_BRIDGE=0
- ENABLE_LEGACY_PASSWORD=0

## Frontend Base URLs
- NEXT_PUBLIC_STUDENT_BASE_URL=https://internal.example.com
- NEXT_PUBLIC_ADMIN_BASE_URL=https://internal.example.com/admin

## Security
- Ensure HTTPS termination at the ingress (nginx/ELB) and set HSTS.
- Rotate any previously exposed tokens and remove password samples from docs.
- Verify `/api/auth/login` and `/api/auth/session` return 410 Gone.

## Post-Deploy Checks
- Admin auth via Clerk org/role works; non-admin receives 403 on admin APIs.
- Student domain gating works per ALLOWED_EMAIL_DOMAINS.
- Backend `/api/health` OK; OpenAPI available at `/docs`.

