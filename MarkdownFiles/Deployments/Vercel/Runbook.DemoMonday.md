# Runbook — Demo Monday

T-24h
- Verify DNS propagates: `dig +short ngicapitaladvisory.com` and `admin.ngicapitaladvisory.com`
- Check Clerk Allowed Origins include both domains
- Confirm Vercel projects point to `production` branch; re-deploy if needed

T-1h
- Open three tabs: Student home, Admin dashboard, Backend health
- Sign in as admin, click through: Investor → Reports, Pipeline; Accounting → JEs; Advisory → Projects
- Sign in as student (allowed domain), ensure redirect to `/projects`

During Demo
- Use `https://ngicapitaladvisory.com` for the marketing + sign-in
- For admin views, use `https://admin.ngicapitaladvisory.com/admin/dashboard`
- If anything stalls, refresh; if persistent, switch to the last successful deployment in Vercel (Deployments → Promote)

Fallbacks
- If backend is the issue: tail logs `docker compose -f docker-compose.prod.yml logs -f backend`; restart service
- If Clerk: use the backup admin allowlist (only if absolutely necessary) by temporarily setting `ENABLE_ENV_ADMIN_FALLBACK=1` on the backend VM and restarting

Post Demo
- Turn off any temporary fallbacks; confirm `ENABLE_ENV_ADMIN_FALLBACK=0`

