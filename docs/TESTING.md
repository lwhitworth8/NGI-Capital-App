Testing Strategy (v1)

Overview
- Frontend unit/integration tests live alongside code under each app:
  - Admin: `apps/desktop/src/**/__tests__/*`
  - Student: `apps/student/src/**/__tests__/*`
- Backend tests live under: `services/api/tests/*` (pytest)
- E2E tests live under: `e2e/tests/*` (Playwright)

Frontend (Jest)
- Both apps ship with Jest configs and setup files.
- Commands:
  - Admin: `npm run -w apps/desktop test`
  - Student: `npm run -w apps/student test`
- Lint/type-check:
  - Admin: `npm run -w apps/desktop lint` / `npm run -w apps/desktop type-check`
  - Student: `npm run -w apps/student lint` / `npm run -w apps/student type-check`

Backend (pytest)
- Tests live in `services/api/tests` with async HTTP client fixtures.
- Commands:
  - `pytest -q` (root)
- Notes:
  - `PYTEST_CURRENT_TEST` is set by tests to disable dev-only bypasses in the API.
  - SQLite dev DB is used by default; set `DATABASE_PATH` to override.

E2E (Playwright)
- Structure: `e2e/playwright.config.ts` and `e2e/tests/*`.
- Run: `npm run e2e` (root). Ensure docker dev stack is up.
- Artifacts are ignored in `.gitignore` (playwright-report, test-results).

CI
- Frontend and backend jobs run on PRs and pushes to `main`.
- Production deploy via Vercel CLI runs only after CI passes on pushes to `main`.

