# Applications Admin – UX Spec

## 1) Navigation
- Default entry: select Project (typeahead or picker). Kanban for that project shown.
- Toggle to Global View: switch to table of all applications (filters/sort/search) with links back to project Kanbans.

## 2) Project Kanban
- Lanes: New | Reviewing | Interview | Offer | Joined (visible until Onboarding completes) | Rejected | Withdrawn
- Drag‑and‑drop: move cards freely; on entering Offer/Joined with capacity=0, show warning banner with "Proceed anyway" (override) requiring rationale.
- Lane headers: count and %; capacity indicator: "Open roles: X".
- Card content: name, school/program, submitted time ago, reviewer chip, aging chip (>7 days), key tag (e.g., Grad Year).

## 3) Global Table
- Columns: Project, Name, Email, School, Program, Grad Year, Status, Reviewer, Submitted, Aging.
- Filters: project, status, reviewer, school, program, grad year, has resume, date range, aging.
- Search: name/email/school/program; Sort: Submitted (newest), Name A–Z.
- Pagination: 100/page; URL sync for filters and sort.

## 4) Detail Drawer / Page
- Header: name, email, project, status dropdown, reviewer picker, submitted at, aging.
- Profile summary: school/program/grad year; completeness.
- Resume viewer: inline PDF with fullscreen.
- Answers: read‑only, ordered prompts.
- Attachments: upload/review internal PDFs.
- Timeline: items grouped by source
  - Coffee Chats (read-only): requested/accepted/completed
  - Interviews (Onboarding): scheduled/completed entries
  - Offer (Onboarding): issued/accepted
  - Onboarding: instance created, steps progress
- Actions: Reject (free text reason), Withdraw (archive), Reassign reviewer.

## 5) Notifications & Badging
- Assigned reviewer sees in‑app badge for new apps.
- Aging badge on cards: "Aging > 7 days".

## 6) Microcopy
- Capacity warning: "No open analyst roles available. Proceed anyway? Add a short rationale for audit."
- Duplicate apply (student-side): "You have already applied to this project. Withdraw your existing application to re‑apply."
- Withdraw action: "Move this application to archive?"

## 7) A11y & Keyboard
- Kanban: keyboard reordering (Up/Down to focus cards; Ctrl+←/→ move between lanes).
- Table: tabular navigation; filter panel accessible; focus traps in drawer.

## 8) Past Applications
- When Onboarding completes, the application automatically moves from the Kanban to Past Applications (read‑only list). Withdrawn also appears here.
