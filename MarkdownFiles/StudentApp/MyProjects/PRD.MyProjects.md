# My Projects (Student) – PRD (NGI Capital Advisory)

## 0) Context & Goal
Student-facing project workspace for assigned analysts. Shows current (Active) and Past projects. Per project, students see tasks, submit deliverables, log time, view meetings, and download resources. Strict access: projects are hidden until onboarding is completed by admins; removed students lose access immediately. UI follows the existing theme and component library.

## 1) Objectives (V1)
- Projects list: Active and Past sections. Click into a project workspace.
- Tabs per project: Overview, My Tasks, Submit (task detail), Meetings, Timesheets, Resources.
- Tasks & submissions: group/individual tasks; deliverables up to 500 MB/file; revision loop via comments; late allowed (flag shown).
- Comments & notifications: text-only comments anchored to submission version; in-app notifications for review decisions and comments.
- Meetings: show schedule and “Open in Google Calendar” (no Meet link); Slack reminders also fire.
- Timesheets: per task/day entries with multiple segments; weekly rollup (Sun–Sat, America/Los_Angeles); no approvals.
- Resources: read-only project package downloads and links; students cannot upload resources.

## 2) Out of Scope (V1)
- Email notifications; exports; in-app direct messaging; file preview annotations; advanced reporting.
- Anti-malware scanning (deferred); content moderation of links.

## 3) Access & Gating
- A project appears in Active only when onboarding for that project is completed by admins.
- Past shows completed projects where students can still view prior work and downloads.
- Removing a student from a project revokes access immediately; history remains intact but hidden from the student.

## 4) Projects List
- Active: cards with project name, status, next milestone/week, due-soon count, my planned vs logged hours (this week).
- Past: cards with project name and completion date; link into a read-only workspace to view old work and resources.

## 5) Tasks & Submissions (Rules)
- Task fields respected: title, description, assignees (multi), due date, planned hours, priority (L/M/H), status (todo → in_progress → review → done | blocked), submission_type: individual | group.
- Submissions: file(s) (PDF/DOCX/XLSX/PPTX/PNG/JPG) up to 500 MB each OR URL (Git/Drive/etc.).
- Group tasks: any assignee can submit; acceptance marks all assignees complete and closes the revision loop.
- Individual tasks: each student must submit and be accepted independently.
- Revision loop: comments (text-only) anchored to a version; status remains review until the lead approves; students can resubmit (latest replaces active; history retained internally for audit).
- Late: allowed; flagged if after due date (PST) and visible to student.

## 6) Comments & Notifications
- Comments: text-only thread per task; anchor to submission version; show author and timestamp.
- Notifications (in-app): on comment added, review decision (approved/more changes), task assigned/reassigned, due date change, submission accepted, meeting scheduled, due soon/overdue reminders.

## 7) Meetings
- Display upcoming and past meetings with date/time (PST). Open button deep-links to Google Calendar event; no Meet link shown in-app.
- Slack: per-project channel reminder posts 10 minutes before start.

## 8) Timesheets
- Entry per task per day, supports multiple segments (start/stop or hours only entry) for Sun–Sat (America/Los_Angeles).
- Weekly rollup page shows my totals vs planned hours (informational only). No approval/locking in V1; edits allowed until week boundary.

## 9) Resources
- Read-only download of the project package (multi-files) and any lead-provided links. Students cannot upload resources here.

## 10) Security & Privacy
- Strict membership check on all workspace endpoints; project resources and files served via authenticated routes only.
- Links allowed; show a safety prompt before opening external URLs.
- No scanning in V1; validate file type and size only.

## 11) Data & API (Illustrative)
- GET /api/public/my-projects → [{ project_id, name, status:active|past, next_milestone, due_soon_count, planned_hours_week, logged_hours_week }]
- GET /api/public/projects/{pid}/tasks → visible tasks for student
- GET /api/public/tasks/{tid} → task detail (instructions, due, planned, submission_type, my status/history)
- POST /api/public/tasks/{tid}/submit (multipart file or JSON { url }) (support resumable uploads)
- GET /api/public/tasks/{tid}/comments; POST /api/public/tasks/{tid}/comments
- GET /api/public/projects/{pid}/meetings
- GET/POST /api/public/projects/{pid}/timesheets/{week}
- GET /api/public/projects/{pid}/resources

## 12) Telemetry
- project_open, task_open, submission_upload_start/success/fail, comment_posted, review_decision_viewed, timesheet_entry_saved, meeting_open_calendar.
- Include student_id, project_id, task_id/version where relevant; no file contents logged.

## 13) Performance & A11y
- Chunked uploads with progress, retry on failure; virtualized lists; keyboard navigation; status pills with ARIA labels.

## 14) Success Criteria
- Students can find their projects, complete tasks, iterate on revisions, log hours, and attend meetings; strict access enforced; UX remains simple and consistent with the app.
