# Student Project Lead Manager – PRD (NGI Capital Advisory)

## 0) Context & Goal
A practical project workspace for NGI project leads (Andre, Landon) and assigned student analysts. Leads plan milestones, create and assign tasks, track submissions and revisions, schedule meetings, and monitor weekly timesheets. Students see assigned work, submit deliverables, log hours, and respond to review comments. Strict access: only leads + assigned students. My Projects remains gated until onboarding completes.

## 1) Scope (V1)
- Roles: Leads (Andre/Landon); Students (assigned only). Team can view all tasks in the project.
- Milestones: Lightweight weekly buckets from project start/end; leads can add/remove/change during the project.
- Tasks: Fields (title, description, assignees multi, due date, planned hours, priority L/M/H, status: todo → in_progress → review → done | blocked, submission_type: individual | group).
- Submissions: Students upload deliverables (PDF/DOCX/XLSX/PPTX/PNG/JPG) or URL (incl. Git/Drive). Group vs individual per task.
- Revisions: Comment-driven loop; keep status=review until lead accepts; leads can reopen done → review.
- Files: Deliverables up to 500 MB/file; unlimited file count per task. Comments are text-only (no attachments) with inline anchoring to versions.
- Meetings: Google Calendar meetings (ad hoc/recurring), attendees = selected members or all; default reminders 1 day + 10 min; Slack channel notice.
- Timesheets: Students log hours per task per day; weekly rollup (Sun–Sat, America/Los_Angeles). No approvals in V1; view-only for leads.
- Slack: Single NGI workspace; auto-create private per-project channel (e.g., #proj-<code>-team), invite leads and student NGI emails; basic event posts and @mentions.
- Notifications: In-app for all important events; Slack posts for selected triggers.
- Security: Strict project membership auth; removed students lose access; history remains read-only.

## 2) Non-Goals (V1)
- Advanced sprints/epics, dependencies graphing, burndown, exports.
- In-app file virus scanning; content moderation.
- In-app direct messaging; Slack serves team comms.

## 3) Environment & Dependencies
Recommended additions (documented for implementation):
- Backend (FastAPI):
  - slack_sdk (Slack Web API)
  - google-api-python-client, google-auth, google-auth-oauthlib (Calendar)
  - python-magic (MIME), aiofiles (stream/chunk handling)
- Frontend (Next.js):
  - Optional: tus-js-client for chunked uploads (or bespoke Content-Range API)
- Ops: Increase nginx/proxy body size/timeouts for 500 MB uploads; persistent storage for uploads.
- Env vars:
  - SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_CHANNEL_PREFIX (e.g., proj-)
  - GOOGLE_OAUTH_CLIENT_ID/SECRET (if using OAuth) or service account creds
  - APP_ORIGIN, FILE_MAX_MB=500, COMMENT_MAX_MB=25 (soft for future)

## 4) Data Model (Proposed)
- project_milestones(id, project_id, title, start_date, end_date, order)
- tasks(id, project_id, milestone_id?, title, description, priority, status, submission_type, due_date, planned_hours, created_by, created_at, updated_at)
- task_assignments(id, task_id, student_id)
- task_submissions(id, task_id, student_id, version, kind:file|url, url_or_path, created_at, is_late, waived_late_by?)
- task_comments(id, task_id, author_id, submission_version?, body, created_at)
- project_meetings(id, project_id, google_event_id, title, start_ts, end_ts, attendees_emails JSON, created_by)
- timesheets(id, project_id, student_id, week_start_date, total_hours)
- timesheet_entries(id, timesheet_id, task_id, day (Sun…Sat), segments JSON [{start,end,hours}], hours)
- resources(id, project_id, kind:package|link, title, url_or_path, version)

## 5) API Contracts (Illustrative)
Leads (admin) endpoints
- POST /api/advisory/projects/{pid}/milestones
- CRUD /api/advisory/projects/{pid}/tasks; PATCH status/priority/due/planned_hours
- POST /api/advisory/tasks/{tid}/assign { student_ids, submission_type }
- POST /api/advisory/tasks/{tid}/comments { body, submission_version? }
- POST /api/advisory/tasks/{tid}/reopen
- POST /api/advisory/projects/{pid}/resources (project package upload)
- POST /api/advisory/projects/{pid}/meetings (Calendar create; store google_event_id; post to Slack)
- GET /api/advisory/projects/{pid}/timesheets?week=YYYY-MM-DD

Students endpoints
- GET /api/public/my-projects → list of assigned projects (only after onboarding complete)
- GET /api/public/projects/{pid}/tasks (visible tasks)
- POST /api/public/tasks/{tid}/submit (multipart or JSON { url }) (supports chunked)
- POST /api/public/tasks/{tid}/comments { body, submission_version? }
- POST /api/public/projects/{pid}/timesheets/{week}/entries { task_id, day, segments }

Chunked upload (option):
- POST /api/public/uploads/init → { upload_id }
- PUT /api/public/uploads/{upload_id} with Content-Range slices
- POST /api/public/uploads/{upload_id}/finalize → returns path
- Then POST /tasks/{tid}/submit referencing path

## 6) Slack Integration (V1)
- Single NGI workspace; per-project private channel #proj-<code>-team
- Bot creates channel and invites members (based on NGI emails from onboarding)
- Scopes: conversations.create, conversations.invite, users:read.email, chat:write, chat:write.customize
- Triggers to channel: task assigned/reassigned, submission posted, comment added, meeting scheduled, due soon/overdue, explicit @channel/@user notices
- Env: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_CHANNEL_PREFIX

## 7) Meetings (Google)
- Ad hoc/recurring creation; choose attendees (single/multiple/all members)
- Default reminders 1 day & 10 min; PST display, localized by Google
- Store google_event_id; optionally post Calendar link in Slack

## 8) Timesheets Logic
- Week = Sun–Sat (America/Los_Angeles)
- Students log per task/day; allow multiple segments; sum → daily → weekly totals
- Leads view planned vs actual hours per student and per task (no approvals/locking in V1)
- Late flag independent of hours; over-allocation warning if planned hours across tasks > expected weekly hours (informational only)

## 9) Security & Compliance
- Strict membership checks on all endpoints/files; removed students instantly lose access
- File serving via authenticated routes; never public URLs
- Links allowed (GitHub/Drive/etc.); store title+URL and show a safety prompt

## 10) Notifications (In‑App)
- Students: task assigned/reassigned, due date change, new comment, revision requested, meeting scheduled, due soon/overdue, accepted submission
- Leads: submission posted/revised, student comment, timesheet variance (optional)

## 11) Performance & A11y
- Board and list views; virtualize long lists; chunked uploads with progress
- Keyboard navigation; labeled controls; consistent focus styles

## 12) Success Criteria
- Leads manage milestones/tasks, review deliverables, schedule meetings, and see weekly hours; students can complete tasks and log time; Slack & Calendar integrations function; file handling supports 500 MB; strict access enforced.
