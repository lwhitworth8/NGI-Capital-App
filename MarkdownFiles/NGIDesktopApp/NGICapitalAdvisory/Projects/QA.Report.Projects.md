# Projects Module - QA Report (V1)

## Summary
Admin Projects for NGI Advisory implemented per PRD. Partners (Andre/Landon) can create, edit, publish, and manage media, multi-leads, majors, and questions with a live student preview. Backend enforces required-on-publish validations.

## What’s Implemented
- Admin list + designer drawer with live preview
- Create draft, update, publish
- Project code auto-generation `PROJ-ABC-###`
- Multi-lead management (Andre/Landon)
- Team size and majors (comma-separated input → stored array)
- Allow applications toggle
- Application questions (max 10, ordered by line)
- Media uploads: hero, gallery, showcase PDF
- Client-side hero cropping (16:9) before upload
- Public student endpoints already present (list/detail)

## Backend Validations
- Required on publish
  - name (4–120), client (2–120), summary (20–200), description (50–4000)
  - team_size ≥ 1, hours/week 1–40, duration_weeks ≥ 1
  - dates: end_date ≥ start_date
  - at least 1 project lead
- Questions capped at 10

## Tests Executed (Pytest)
- tests/test_advisory_projects_module.py
  - Create draft → publish with required fields (PASS)
  - Publish validation missing fields returns 422 (PASS)
  - Questions >10 returns 422 (PASS)
  - Media endpoints save under `/uploads/advisory-projects/{id}/...` (PASS)
  - Project code generation sequences to 001/002 for same ABC (PASS)

Command: `python -m pytest -q tests/test_advisory_projects_module.py`

## Manual Checks
- Designer drawer opens; preview reflects inputs; publish updates list
- Toggle allow applications; status transitions; disabled project_code input
- Upload hero/gallery and see preview; upload showcase

## Outstanding/Deferred (V1.1+)
- Rich majors taxonomy with aliases UI control
 - Size/type enforcement UI hints (hero/gallery ≤10MB JPG/PNG)
- Open role count display (derived) in list
- Metrics/KPIs emission and rollups
- E2E Playwright flow and a11y/perf checks

## Exit Criteria
- Core P0 test cases pass; no sev-1 blockers found
- Ready for stakeholder review (Andre/Landon) and UAT in dev

## E2E (Playwright)
- Added smoke test to validate create + publish + student visibility
  - Files: `apps/desktop/playwright.config.ts`, `apps/desktop/e2e/projects-admin.spec.ts`
  - Run: `cd apps/desktop && npm i && npx playwright install --with-deps && npm run e2e`
