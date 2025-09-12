# Student Project Lead Manager – UX Spec

## 1) Navigation & Tabs
Leads (per project): Overview | Tasks (Board | List) | Deliverables | Meetings | Timesheets | Resources
Students (per project): Overview | My Tasks | Submit (task detail) | Meetings | Timesheets | Resources

## 2) Overview
- Milestones timeline (weeks); progress bars (% complete, overdue count)
- Capacity panel: planned vs assigned vs actual hours (simple cards)
- Quick actions: Create task, Schedule meeting, Upload package

## 3) Tasks – Board
- Columns: Todo | In Progress | Review | Done | Blocked
- Cards: title, assignee avatars, due date (red if overdue), priority chip, planned hours, milestone tag
- DnD between columns (lead only); students can move self tasks to In Progress/Review
- Filters: assignee (self/all), status, milestone; search title

## 4) Tasks – List
- Table columns: Title, Assignees, Milestone, Due, Priority, Planned Hrs, Status, Actions
- Bulk selection (V1: no bulk actions; single row actions only)

## 5) Task Detail (Lead)
- Header: title, priority, due date, planned hours, milestone
- Assignees editor (multi-select)
- Submission type: Individual | Group (switch)
- Activity: latest submission version (preview/download for supported types), status (accept/reopen), late flag with waiver toggle & note
- Comments: threaded, text-only; inline anchor to a version; @mention hint (handled in Slack in V1)

## 6) Task Detail (Student)
- Instructions, due date, planned hours, milestone
- Upload area: file(s) up to 500 MB each (with chunked progress) OR URL
- Submissions: show latest; link to version history
- Status controls: set to Review when submitting; see lead comments; resubmit to replace latest; Done is lead-controlled

## 7) Deliverables Tab
- List of submissions with filters (task, student, version, late)
- Row: task, student, version, submitted at, late?, accepted?, links/files, download buttons

## 8) Meetings Tab
- Calendar/list of meetings; New Meeting → date/time/recurrence/attendees; posts to Slack

## 9) Timesheets Tab (Lead)
- Week picker (Sun–Sat PST)
- Table: students x tasks with daily hours; totals per day/student/week; variance vs planned

## 10) Timesheets – Student
- Week picker; per-task daily entry with multiple segments; totals; submit/save (no approval)

## 11) Resources
- Project package: multiple files (PPTX/XLSX/DOCX/PDF/etc.) uploaded by leads; version replace; students can download
- Links: optional resource links

## 12) Notifications & Slack
- In‑app toast + badge center for new assignments, comments, submissions
- Slack channel auto-created; posts for key events; optional @channel for meeting reminders at T‑10 min

## 13) A11y & Perf
- Virtualized lists; chunked upload progress; accessible forms; keyboard DnD alternatives
