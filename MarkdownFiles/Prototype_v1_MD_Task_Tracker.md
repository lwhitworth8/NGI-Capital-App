# Prototype V1 â€” Task Tracker

Instructions: Every agent must update this tracker after completing work and tests are green, and the user confirms the module matches its MD docs. Use statuses: Not Started, In Progress, Ready for QA, Done, Blocked.

## Legend
- Module: Name of the area (link to PRD)
- Status: current state
- Owner: agent initials
- Links: PR(s), MR(s), test runs
- Notes: blockers, follow-ups

## Admin Modules
- Projects (Admin) - `MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Projects/PRD.Projects.md`
  - Status: Ready for QA
  - Owner: codex
  - Links: tests/test_advisory_projects_module.py, apps/desktop/src/app/ngi-advisory/projects/page.tsx, src/api/routes/advisory.py, MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Projects/QA.Report.Projects.md, apps/desktop/e2e/projects-admin.spec.ts, apps/desktop/playwright.config.ts, MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Projects/Addendum.Projects.2025-09-11.md
  - Notes: Backend upgraded (fastapi 0.116.1 + starlette 0.40.0 + python-multipart 0.0.18 + python-jose 3.4.0 + pypdf 6.0.0). Dev auth bypass added (`DISABLE_ADVISORY_AUTH=1`). Playwright tests hardened (create+publish; media/close/showcase). Node deps clean in Snyk; Python remaining transitives documented in Addendum.

- Students (Admin) - `MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Students/PRD.StudentsAdmin.md`
  - Status: Ready for QA
  - Owner: codex
  - Links: tests/test_advisory_students_admin.py, apps/desktop/src/app/ngi-advisory/students/page.tsx, src/api/routes/advisory.py, apps/desktop/src/lib/api.ts
  - Notes: lifecycle cutoff (June 30 PT) + override; archive table + restore; paging 100/page + search/status/sort + resume/applied filters; strict auth; timeline panels; assignments (override when capacity 0 with confirm); audit logs added for key actions.

- Coffee Chats (Admin) â€“ `MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Coffee Chats/PRD.CoffeeChatsAdmin.md`
  - Status: In Progress
  - Owner: codex
  - Links: src/api/routes/coffeechats_internal.py, apps/desktop/src/app/ngi-advisory/availability/page.tsx, apps/desktop/src/app/ngi-advisory/coffeechats/requests/page.tsx, apps/student/src/app/coffeechats/page.tsx, e2e/tests/coffeechats.api.spec.ts
  - Notes: Internal scheduling (Google Calendar + Meet) scaffolded with robust â€œBoth freeâ€ overlay; availability CRUD, student requests, admin actions implemented; expiry job added. Google API is gated by `ENABLE_GCAL` and will be fully tested after service account setup.

- Applications (Admin) – `MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Applications/PRD.ApplicationsAdmin.md`
  - Status: In Progress
  - Owner: codex
  - Links: apps/desktop/src/app/ngi-advisory/applications/page.tsx, apps/desktop/src/app/ngi-advisory/applications/past/page.tsx, src/api/routes/advisory.py, apps/desktop/src/lib/api.ts, apps/desktop/src/components/layout/Sidebar.tsx
  - Notes: Project Kanban + Global table implemented; detail drawer (status, reviewer, resume, attachments, reject/withdraw); Past Applications page; reviewer badge. Backend adds reviewer/attachments/archive endpoints; attachments PDF=25MB; legacy DBs map joined?offer.

- Onboarding (Admin) – `MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Onboarding/PRD.OnboardingAdmin.md`
  - Status: In Progress
  - Owner: codex
  - Links: apps/desktop/src/app/ngi-advisory/onboarding/page.tsx, src/api/routes/advisory.py
  - Notes: Reworked to fixed flow (NGI email, Intern Agreement, optional NDA, uploads, finalize). Finalize creates assignment and archives application. Templates/instances removed from UI.

- Student Project Lead Manager – `MarkdownFiles/NGIDesktopApp/StudentProjectLeadManager/PRD.StudentProjectLeadManager.md` â€“ `MarkdownFiles/NGIDesktopApp/StudentProjectLeadManager/PRD.StudentProjectLeadManager.md`
  - Status: In Progress
  - Owner: codex
  - Links: src/api/routes/plm.py; apps/desktop/src/app/ngi-advisory/lead-manager/page.tsx; apps/desktop/src/lib/api.ts; tests/test_plm.py
  - Notes: Implemented tasks (board), milestones (list/add/delete), submissions (URL + 500 MB cap), comments, resources (link), meetings (Calendar/mock), deliverables list, timesheets (segments + rollup). Backend tests: 4 passed.

## Student Modules
 list (filters/tags, sort incl. Most Applied), visibility (active/closed), Completed pill; detail meta + showcase PDF; dynamic apply prompts (500-word), profile gate, coffee chat calendar picker. Backend: extend public projects list/detail incl. status/mode/location/paging/applied_count/questions; create application stores answers_json. Infinite scroll + URL sync + filter panel + Not Available page + telemetry + unit tests (calendar grouping/formatting, client URL sync) added. A11y labels applied to controls. - `MarkdownFiles/StudentApp/Applications/PRD.StudentApplications.md`\r\n  
  - Status: Ready for QA
  - Owner: codex
  - Links: apps/student/src/app/applications/page.tsx, apps/student/src/app/applications/[id]/page.tsx, apps/student/src/app/applications/[id]/WithdrawButton.tsx, apps/student/src/app/projects/[id]/ApplyWidget.tsx, apps/student/src/app/settings/page.tsx, apps/student/src/lib/api.ts, src/api/routes/advisory_public.py, tests/test_public_applications.py
  - Notes: list + detail page; withdraw; snapshots; newest-first; Updated badge + /seen; Past view toggle. Profile gate requires phone, LinkedIn, GPA, location, school, program, grad_year, resume. Settings updated to edit/save these; backend /profile GET/PATCH extended with validation; DB columns added idempotently.

- My Projects (Student) - `MarkdownFiles/StudentApp/MyProjects/PRD.MyProjects.md`
  - Status: Ready for QA
  - Owner: codex
  - Links: apps/student/src/app/my-projects/page.tsx, apps/student/src/app/my-projects/[id]/page.tsx, apps/student/src/app/my-projects/[id]/tasks/[tid]/page.tsx, apps/student/src/app/my-projects/[id]/timesheets/TimesheetsPanel.tsx, apps/student/src/lib/api.ts, src/api/routes/plm.py, tests/test_my_projects_public.py
  - Notes: Active/Past list; workspace tabs (Overview, My Tasks, Meetings, Timesheets, Resources); Task Detail with file (=500 MB) or URL submission and comments; Timesheets weekly entry (Sun–Sat) with total; header-based student identity supported for public submit/comments/timesheets; respects assignment filtering and file limits.

- Learning (Coming Soon) â€“ `MarkdownFiles/StudentApp/Learning/PRD.StudentLearning.md`
  - Status: Ready for QA
  - Owner: codex
  - Links: apps/student/src/app/learning/page.tsx
  - Notes: Public placeholder with H1 + subtext; no CTAs/forms/links; optional telemetry page_view posted.

## Shared/Infra
- Slack Integration â€“ `MarkdownFiles/NGIDesktopApp/StudentProjectLeadManager/SlackSetup.Appendix.md`
  - Status: Edtied still need to implement .env keys for slack and track it
  - Owner:
  - Links:
  - Notes: single workspace; per-project private channels; required scopes; env vars. Follow-up: fully implement Slack integration and test functionality end-to-end in live workspace.

- Student Nav â€“ `MarkdownFiles/StudentApp/Nav.Spec.StudentApp.md`
  - Status: Not Started
  - Owner:
  - Links:
  - Notes: Projects is landing; Learning is public; Apps/My Projects are gated.

## Admin Modules (Backlog)
- Accounting (Admin) â€“ MarkdownFiles/NGIDesktopApp/Accounting/
  - Status: Not Started
  - Owner:
  - Links:
  - Notes: Next step â€“ review repo and create MD doc set (PRD/UX/Test/QA/AC); then implement per docs.

- Dashboard (Admin) â€“ MarkdownFiles/NGIDesktopApp/Dashboard/
  - Status: Not Started
  - Owner:
  - Links:
  - Notes: Next step â€“ review repo and create MD doc set.

- Employees (Admin) â€“ MarkdownFiles/NGIDesktopApp/Employees/
  - Status: Not Started
  - Owner:
  - Links:
  - Notes: Next step â€“ review repo and create MD doc set.

- Entities (Admin) â€“ MarkdownFiles/NGIDesktopApp/Entities/
  - Status: Not Started
  - Owner:
  - Links:
  - Notes: Next step â€“ review repo and create MD doc set.

- Finance (Admin) â€“ MarkdownFiles/NGIDesktopApp/Finance/
  - Status: Not Started
  - Owner:
  - Links:
  - Notes: Next step â€“ review repo and create MD doc set.

- Investor Management (Admin) â€“ MarkdownFiles/NGIDesktopApp/InvestorManagement/
  - Status: Not Started
  - Owner:
  - Links:
  - Notes: Next step â€“ review repo and create MD doc set.

- Taxes (Admin) â€“ MarkdownFiles/NGIDesktopApp/Taxes/
  - Status: Not Started
  - Owner:
  - Links:
  - Notes: Next step â€“ review repo and create MD doc set.









