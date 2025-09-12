# Student Project Lead Manager – Overview (Expanded)

Leads manage weekly milestones, tasks, submissions, comments, meetings, timesheets, and resources for each project; students complete assigned tasks, submit deliverables, log hours, and collaborate. Integrates with Slack (per-project private channels) and Google Calendar for meetings. Handles large files (≤500 MB), strict access control, and simple, clear workflows.

References:
- PRD.StudentProjectLeadManager.md
- UX.Spec.StudentProjectLeadManager.md
- TestPlan.StudentProjectLeadManager.md
- QAChecklist.StudentProjectLeadManager.md
- AcceptanceCriteria.StudentProjectLeadManager.md
- OpenQuestions.StudentProjectLeadManager.md

## Implementation Notes (V1)
- Backend routes under `/api/advisory` (see `src/api/routes/plm.py`):
  - `GET /projects/{pid}/tasks` and `POST /projects/{pid}/tasks` implemented.
  - `POST /tasks/{tid}/submit` accepts either JSON body or multipart form:
    - JSON: `{ email, kind: 'url', url }` for link submissions.
    - Multipart: `file` (<= 500 MB) and optional `payload` JSON string.
  - `GET /projects/{pid}/timesheets` scaffolded (entries grouped by student/week).
  - Comments: `POST/GET /tasks/{tid}/comments` (admin), plus public `POST /api/public/tasks/{tid}/comments`.
  - Resources: `POST/GET /projects/{pid}/resources` (link or file; 500 MB cap).
  - Meetings: `POST/GET /projects/{pid}/meetings` (Google Calendar; mock fallback when `ENABLE_GCAL` is off).
  - Deliverables: `GET /projects/{pid}/deliverables`.
  - Acceptance workflow: `POST /tasks/{tid}/accept`, `POST /tasks/{tid}/reopen`, `POST /tasks/{tid}/waive-late`.
  - Milestones: `POST/GET /projects/{pid}/milestones`, `PATCH/DELETE /milestones/{mid}`.
  - Public/student endpoints available for tasks list, comments, submit, timesheet entries, and assigned projects list.
- Frontend Lead Manager UI (`apps/desktop/src/app/ngi-advisory/lead-manager/page.tsx`):
  - Robust grouping logic handles non-array task responses (e.g., 403) without crashing.
  - Panels: Tasks (board), Milestones (list + add/remove), Meetings (schedule + list), Resources (add link + list), Deliverables (list), Timesheets (summary), Comments (post + list).
  - Minimal create/list flows wired to the above endpoints; DnD and granular filters are V1.1.
- Tests:
  - Backend tests added in `tests/test_plm.py` covering task create/list and URL submission.
  - Backend tests extended for comments, meetings, deliverables, and timesheet segments (all green).
  - UI test placeholder added for grouping safety (enable once node deps installed).
