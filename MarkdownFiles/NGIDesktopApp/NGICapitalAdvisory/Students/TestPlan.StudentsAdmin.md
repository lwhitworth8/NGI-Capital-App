# Students Admin - Test Plan (Expanded)

## 0a) Pre-flight (MCP + Security)
- Context7: run a doc refresh comparing PRD/UI/API, incorporate suggested edits.
- Snyk: `npx -y snyk@latest test --all-projects --severity-threshold=high`; backend pinned to fastapi 0.116.1 + starlette 0.40.0 + python-multipart 0.0.18 + python-jose 3.4.0 + pypdf 6.0.0.

## 1) Scope
- Table list (filters/sort/search/paging/virtualization), detail view, resume viewer, assign to project (capacity), status auto/override, soft delete/restore, audit, a11y, performance.

## 2) Data Setup
- 500+ synthetic students across schools/programs/years; 50 with complete profiles; 50 Alumni by grad_year; diverse applications/chats.
- 3 projects: one with open roles, one full; one closed.

## 3) Unit Tests
- statusFromGradYear(grad_year, now) → Active/Alumni around cutoff
- openRoles(team_size, assignedAnalysts) edge cases (0, negative clamp)
- filter/query builders; sort comparators

## 4) Integration Tests
- GET /students with filters (status/school/program/grad_year/has_resume/applied_project)
- GET /api/public/profile auto-creates a student for a UC email and subsequent fetches are idempotent.
- PUT /students/{id} override with required reason → 200 + audit
- POST /students/{id}/assignments with open roles → 200; with 0 open roles → UI shows warning and supports override path (mock endpoint accepts override flag)
- Soft delete/restore endpoints (mock if not implemented yet)
- Detail view merges profile + activity lists

## 5) E2E (Playwright)
- List loads with default; search + filters + sort update URL and results; 100/page; virtualization reduces DOM size
- Open detail; profile readonly; resume viewer fullscreen
- Assign to project flow: success with capacity; warning then override success when capacity is 0
- Status override applied and banner shown; audit entry present (DB/query or log)
- Soft delete hides from list; restore returns student

## 6) Accessibility
- Axe checks for list, dialogs, detail; keyboard navigation through rows and chips

## 7) Performance
- Measure render time under 150ms for filter change (local dev); scrolling 60fps; PDF load deferred

## 8) Exit Criteria
- All P0/P1 pass; no Sev-1; audit events observed; capacity logic consistent with Projects

