# Students Admin Module – PRD (Expanded)

## 0) Context & Goals
The Students Admin module is the internal database and management surface for student profiles participating in NGI Capital Advisory. Students own their canonical profile via the student Settings page. Admins (Andre/Landon) view and act on these profiles (assign to projects, track applications/chats/onboarding, override status, soft-delete/restore). Email is immutable; profile completeness gates student applications.

## 1) Objectives
- High-signal list with fast filtering/sorting for 10k+ students (virtualized, 100/page).
- Deep student detail with resume preview and consolidated activity (applications, coffee chats, onboarding).
- Capacity-aware Assign to Project flow consistent with Projects module (team_size − assigned analysts).
- Status lifecycle (Active→Alumni) auto-based on grad_year with admin override + audit.
- Strict immutability of email; students own canonical fields (phone, LinkedIn, GPA, location, resume, school, major, grad_year).
- Full audit trail of admin actions; soft delete to archived table.

## 2) Scope (V1)
- List view (filters/sort/search, 100/page, virtualization, URL params).
- Student detail (profile read-only, resume viewer, activity panels, CTA to onboarding, Assign to Project, status override, soft delete/restore).
- Admin cannot create or edit canonical student fields in this UI; students are auto-created on first sign-in and manage their profile via the student app.
- Capacity enforcement in Assign to Project (hard block if no open roles) – pending final confirmation.
- Status auto-update (job or on-read) with override.
- Audit logging for admin actions.

### Out of Scope (V1)
- CSV export, bulk email, private admin notes.
- Admin editing of student resume or canonical fields.
- Accept/decline coffee chats (lives in Coffee Chats module).

## 3) Personas & Access
- Admins: Andre/Landon (and future admins) – full read; limited write.
- Students: manage canonical fields in Student Settings; cannot be edited by admins.
- Security: Clerk auth; require_full_access guard on admin routes.

## 4) Canonical Fields & Ownership
- first_name, last_name (student-managed)
- email (immutable login email)
- school, program/major (student-managed; major from curated taxonomy)
- grad_year (student-managed)
- phone (student-managed; E.164 format)
- linkedin_url (student-managed; valid URL)
- gpa (student-managed; 0.0–4.0)
- location (student-managed; city + state/country)
- resume_url (student-managed; PDF only)
- status (computed Active/Alumni; admin may override)
- last_activity_at (derived; v1: last application submitted time)

Profile completeness (required to apply): resume_url, phone, linkedin_url, gpa, location, school, program/major, grad_year. Student UI enforces this; Admin UI shows an "Incomplete Profile" badge on detail if any are missing.

## 5) Status Lifecycle
- Default computation: Active until cutoff at June 30 of grad_year 23:59 PT; Alumni afterwards.
- Implementation options:
  1) On-read compute & render; persist on write.
  2) Nightly cron that updates where needed.
- Admin override: set explicit status with reason; override flag persists until manually cleared.

## 6) List View Specification
- Columns: Name, Email, School, Program/Major, Grad Year, Status (computed/override), Last Activity, Actions.
- Filters (multi where applicable): Status (Active/Alumni), School, Program/Major, Grad Year (range), Has Resume (Yes/No), Applied to Project (picker), Chat Status (requested/pending/accepted/completed/canceled).
- Sort: Name A–Z, Last Activity (desc default for activity view), Grad Year asc/desc.
- Search: q across first/last/email/school/program.
- Paging: 100/page; virtualization (windowed rendering) with sticky header; URL param sync.
- Empty state: "No students found." with clear filters CTA.

## 7) Student Detail Specification
- Profile (read-only): all canonical fields; immutable email.
- Resume viewer: inline PDF with fullscreen; no zoom; load on view.
- Activity panels:
  - Applications: compact table (project, status, submitted_at); deep-link to Applications module record.
  - Coffee Chats: list with state, time (PST), project context if applicable; deep-link to Coffee Chats for actions.
  - Onboarding: current instance summary with steps state and timestamps; CTA "Start Onboarding" when appropriate.
- Actions:
  - Assign to Project (capacity-aware)
  - Status Override (Active/Alumni + reason)
  - Soft Delete / Restore
- Banners/Badges: "Incomplete Profile" badge if any required field missing; "Alumni (auto)" vs "Alumni (override)" label variants.

## 8) Assign to Project Flow
- Open roles = project.team_size − assigned_analysts (exclude leads).
- Dialog: select Project (active only), show open roles count; choose hours/week (optional note).
- Validate: if open roles <= 0 → show warning banner "No open analyst roles available for this project." with an option to "Proceed anyway" (admin override). Requires a second confirm with rationale for audit.
- Persist: create advisory_project_assignments row { project_id, student_id, role='analyst', hours_planned, active=1 }.
- Post-condition: student detail updates; Projects open role count reflects new assignment.

## 9) Audit & Soft Delete
- AuditLog on: status override, assignment create/delete, soft delete/restore (action, table, record_id, old/new JSON, user_id, timestamp).
- Soft delete archive table proposal: advisory_students_deleted(id, original_id, email, snapshot_json, deleted_at, deleted_by).

## 10) API Contracts (Current / To Add)
Current (advisory.py): GET/PUT/DELETE /api/advisory/students; GET /api/advisory/applications; etc. (Admin create is not used by the UI.)
To add:
- POST /api/advisory/students/{id}/soft-delete
- POST /api/advisory/students/{id}/restore
- POST /api/advisory/students/{id}/assignments
- GET /api/advisory/students/{id}/timeline

## 11) Telemetry & KPIs (Admin)
- admin_students_list_view, admin_students_filter_apply, admin_students_detail_view, admin_students_assign_attempt/success/failure, admin_students_status_override, admin_students_soft_delete/restore.
- KPIs: new students/week, profiles complete %, resumes present %, last activity recency distribution, conversion to onboarding.

## 12) Performance & A11y Budgets
- List interaction < 200ms per filter/sort on typical sets; virtualized DOM < 300 rows.
- PDF viewer lazy loads only when visible.
- Keyboard access: rows/actions/dialogs navigable; focus traps; ARIA labels.

## 13) Errors & Messages\n- Capacity warning: "No open analyst roles available for this project."\n- Override confirm: "Proceed anyway and assign? Add a short rationale for audit."\n- Soft delete confirm: "Archive this student? Their profile will be removed from the active list."\n\n## 14) Risks
- Email immutability vs account merges → explicit migration tool later.
- Capacity calculation drift → ensure consistent source of truth for assignments (active=1) and team_size.

## 15) Success Criteria
- 100% admin actions audited; list handles 10k with smooth scroll; assignment capacity respected; statuses accurate to grad_year.


---
## 16) Profile Completeness Gate (Student Portal Alignment)
- Apply disabled until required fields present: phone, LinkedIn, GPA, location, school, major, grad_year, resume.
- Admin detail shows missing items; Students module links to Settings to complete.
- Students Admin does not edit these fields; only status override and assignments.

## 17) Last Activity Definition (Initial)
- last_activity_at = MAX(last application created_at, last coffee chat accepted_at/completed_at, last onboarding step timestamp) when available.
- V1 fallback: last application created_at if others unavailable.
