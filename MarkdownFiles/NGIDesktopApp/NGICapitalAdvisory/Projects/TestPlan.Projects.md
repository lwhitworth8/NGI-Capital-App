# Projects Module – Test Plan (Expanded)

## 1. Purpose
Ensure Admin Projects and Student consumption meet functional, non-functional, and integration requirements. Tests span frontend (Next.js) and backend (FastAPI) with E2E coverage.

## 1a. Pre-flight (MCP + Security)
- Context7: run a doc refresh comparing PRD/UI/API, incorporate suggested edits.
- Snyk: `npx -y snyk@latest test --all-projects --severity-threshold=high`; backend pinned to fastapi 0.116.1 + starlette 0.40.0 + python-multipart 0.0.18 + python-jose 3.4.0 + pypdf 6.0.0. Track remaining transitive advisories (`ecdsa`, `future`) in Addendum.

## 2. Scope
- Admin: Create/Edit/Publish, preview, code generation, media uploads, majors, questions, visibility rules, completed showcase, metrics.
- Student: list/detail visibility, apply flow, coffee chat visibility, showcase viewing, metrics emission.

## 3. Environments
- Dev with seeded admins (Andre/Landon) and test students.
- SQLite per repo conventions; uploads under `/uploads`.

## 4. Data & Seeding
- Seed: 1 draft project (no publish), 1 active (allow_applications=true), 1 closed with showcase PDF.
- Test users: admin (Andre/Landon), student (`student@berkeley.edu`).

## 5. Test Types & Tools
- Unit: React components (RTL), util functions, code generator.
- Integration: API + UI (MSW for frontend), Pytest for backend.
- E2E: Playwright with headless Chromium.
- A11y: axe automated checks.
- Performance: lighthouse or minimal paint timing assertions.

## 6. Mapping Matrix (samples)
- Story 1.1/1.2: form validation + publish transitions → UI unit + E2E publish.
- Story 1.3: preview accuracy → snapshot + E2E preview toggle.
- Story 2.x: code generation → backend unit + API integration; collision tests.
- Story 3.x: multi‑lead, team size, open roles derived → UI unit + API persistence.
- Story 4.x: majors → UI chips; student badges.
- Story 5.x: questions (≤10, ordered) → UI reorder; response limit.
- Story 6.x: media + showcase → upload success, viewer works for signed‑in students.
- Story 7.x: metrics → event hooks fired; payload correctness.

## 7. Detailed Cases (Given/When/Then)
1) Create Draft
- Given admin opens Create Project
- When they fill minimal fields and Save Draft
- Then draft persists and appears in list with status=draft

2) Publish Requires Fields
- Given draft missing summary
- When clicking Publish
- Then validation error shows and publish blocked

3) Code Generation
- Given first save for client "Acme Alpha"
- When saved
- Then project_code matches `PROJ-ACM-001` (example) and is admin‑only

4) Multi‑Lead & Team Size
- Given selected leads Andre+Landon and team_size=4
- When saved
- Then open roles derive from assignments, leads excluded from count

5) Majors Requirements
- Given majors Finance, CS chosen
- Then student detail shows badges "Finance" and "Computer Science"

6) Questions Limit & Order
- Given 11 prompts added
- Then UI blocks >10 and preserves drag order; student form renders in order

7) Media Upload + Gradient Fallback
- Given no hero image
- Then gradient hero appears; after upload, new hero renders

8) Visibility Rules
- Given project status=paused or draft
- Then student list/detail hide it entirely

9) Completed Showcase
- Given project closed and showcase.pdf uploaded
- Then signed‑in student can open viewer/download

10) Allow Applications=False
- Given allow_applications=false
- Then Apply and Coffee Chat are hidden in student UI

11) Metrics Emission
- Given student views and clicks
- Then events fire with correct project_id and props

## 8. API Tests (Backend)
- POST/PUT validation: 422 for invalid dates; 400 for media types.
- Code collision path: 409 and retriable.
- Public endpoints hide draft/paused.

## 9. E2E Flows (Playwright)
- Admin creates → publishes project → student sees it.
- Admin uploads hero/gallery → student carousel shows images.
- Admin closes project + uploads showcase → student opens PDF.
- Apply available only when allowed; coffee chat button hidden when disallowed.

## 10. A11y & Perf
- Run axe on forms, preview, detail pages.
- Measure image lazy‑load; list rendering under 200ms for 20 items (local).

## 11. Exit Criteria
- 100% pass for P0/P1; no Sev‑1 open; telemetry validated in logs.
