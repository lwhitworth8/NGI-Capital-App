Vercel Deployment (Gated on CI Green, via CLI)

Overview
- Production deploys are triggered from GitHub Actions only after CI jobs pass.
- We use Vercel CLI with org/project IDs and a Vercel token.

How it works
1) `.github/workflows/ci.yml` runs `frontend` and `backend` jobs on PRs/pushes.
2) On pushes to `main`, the `deploy-vercel` job runs after both succeed and performs CLI deploys for:
   - Student app (`apps/student`)
   - Admin app (`apps/desktop`)
3) Each step uses `npx vercel@latest pull --environment=production` followed by `npx vercel@latest deploy --prod`.

Setup (one-time)
- In Vercel (both projects):
  - Ensure each project’s Root Directory is configured (Admin: `apps/desktop`, Student: `apps/student`).
  - Production Branch = `main` (or your chosen production branch to match CI).
  - Optionally enable “Require successful checks” and select your GitHub checks.
- In GitHub (this repo) add Actions secrets:
  - `VERCEL_TOKEN`: Personal or machine token with deploy rights
  - `VERCEL_ORG_ID`: Vercel org ID
  - `ADMIN_VERCEL_PROJECT_ID`: Admin project ID
  - `STUDENT_VERCEL_PROJECT_ID`: Student project ID

Trigger behavior
- Runs only on `push` to `main` and only after CI jobs (`frontend`, `backend`) succeed.
- Deploys both apps to production.

Alternative (existing)
- `.github/workflows/vercel-deploy-prod.yml` deploys on pushes to `production` branch using the same secrets. Keep it if you want a separate release branch.

Notes
- If you prefer deploying only Admin (and not Student), remove the student step in `ci.yml`.
- If you want preview deploys on PRs, add a separate job using `vercel deploy` without `--prod` and a conditional on `pull_request`.
