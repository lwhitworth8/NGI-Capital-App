# Applications Admin – Test Plan

## 1) Scope
Per‑project Kanban and global table, drag/drop transitions, capacity warning + override, reviewer assignment and notifications, duplicate prevention, detail view (answers/resume/attachments), withdrawals archive, integrations timeline, filters/sorts.

## 2) Data Setup
- Seed projects with team_size and assignments to simulate capacity 0 and >0.
- Seed applications across all lanes and reviewers; create student records with complete/incomplete profiles.
- Seed onboarding/interviews to display in timelines.

## 3) Unit
- Capacity calc openRoles(team_size, assignedAnalysts) and override confirmation logic.
- Duplicate prevention check by (student_email, project_id, status not in ('withdrawn')).
- Aging flag (>7 days) computation.

## 4) Integration
- Kanban move: status update persisted; audit entry written.
- Offer/Joined move with capacity=0: warning + override flow; rationale captured.
- Reviewer assignment: set and change; assigned reviewer sees in‑app badge.
- Attachments: upload and list; stored under /uploads/advisory-applications/{id}/.
- Timeline merges Coffee Chats (read-only) and Onboarding items; read-only display.
- Global filters and search; table pagination and URL sync.

## 5) E2E (Playwright)
- Project Kanban drag/drop across all lanes; cards update instantly.
- Capacity override confirm → status change allowed; audit entry visible.
- Duplicate prevention: applying twice blocked (mock student submit route) unless Withdrawn.
- Withdraw moves to archive; appears in Past Applications.
- Reviewer sees badge on new apps; clearing badge after viewing.

## 6) A11y & Perf
- Keyboard reordering works; table filters accessible.
- Kanban renders smoothly with many cards; table pagination at 100/page performs.

## 7) Exit Criteria
- All P0/P1 pass; no Sev‑1; override audited; duplicates blocked; archives durable.

## 8) Additional Cases
- Attachments type/size: reject non‑PDF and files >25 MB; accept valid PDFs; stored path under /uploads/advisory-applications/{id}/.
- Onboarding completion: application moves to advisory_applications_archived and appears in Past Applications; removed from Kanban.
