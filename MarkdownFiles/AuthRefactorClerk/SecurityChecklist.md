# Security Checklist — Unified Auth Rollout

Clerk Config
- [ ] `CLERK_ISSUER`, `CLERK_JWKS_URL`, `CLERK_AUDIENCE=backend` configured in server env.
- [ ] Clerk org/role used for admin gating; emergency env allowlist disabled in prod.

Legacy Removal
- [ ] Remove password endpoints `/api/auth/login|request-password-reset|reset-password|change-password`.
- [ ] Remove `auth_token` cookie and all reads/writes.
- [ ] Remove `DISABLE_ADVISORY_AUTH` & dev bypass toggles from prod images.

Transport & Cookies
- [ ] Only accept Clerk JWT in `Authorization` or `__session` for same-site.
- [ ] Ensure CORS & TrustedHost restricted to prod origins; HTTPS enforced.

Secrets
- [ ] Rotate any exposed keys in `.env` (sample values sanitized).
- [ ] No secrets in logs; redact tokens.

Snyk Gates
- [ ] Node: `npx -y snyk@latest test --all-projects --exclude=test,tests --severity-threshold=high` clean.
- [ ] Python: `npx -y snyk@latest test --file=requirements.txt` clean or remaining transitives documented with plan.

Monitoring
- [ ] 401/403 error rates dashboarded; alert on spikes post‑cutover.
