# Onboarding Admin â€“ PRD (NGI Capital Advisory)

## 0) Context & Goal
Simple, partnerâ€‘driven onboarding for Analysts using Google tools. Admins schedule a single interview, issue a manual offer email, collect signed legal documents (DocuSign or manual PDFs), set up an NGI Capital Advisory email (manually), and then grant project access (My Projects). No student onboarding UI in V1; students are informed via email and project leads. All signed docs are stored in the central Documents system. Keep it lean, auditable, and secure.

## 1) Scope (V1)
- One standard template: "Analyst â€“ Standard".
- Steps: Interview (Google Calendar), Offer email (manual), Legal documents (NDA, IP assignment, Unpaid Internship Consent), Email setup (manual), Access granted (enable My Projects), Optional: Additional admin checklist items.
- Instance autoâ€‘created when Application status moves to Offer â†’ Accepted.
- Adminâ€‘only UI to track and mark step completion; upload evidence (signed PDFs) 25 MB max, PDF only.
- Due dates derived relative to project start; overdue flagged and escalated.
- Access to My Projects gated until onboarding instance completed.

## 2) Nonâ€‘Goals (V1)
- Student onboarding page (students receive email notices only).
- Automated account provisioning or Google Drive autoâ€‘folder creation.
- Multiâ€‘round interviews (single interview only).

## 3) State Model
- Instance: in_progress â†’ completed | canceled (allow reâ€‘open to in_progress).
- Step status: pending â†’ sent (if applicable) â†’ completed | failed (admin sets notes & evidence).

## 4) Template & Steps
Template: Analyst â€“ Standard (ordered)
1) Interview (provider: google_calendar)
   - Create/accept interview event; invites to both Andre and Landon + student; reminders 1 day & 10 min.
   - Evidence: google_event_id stored automatically.
2) Offer Email (provider: internal_checklist)
   - Admin manually sends offer. Evidence: optional note; when offer accepted (from Applications), instance autoâ€‘continues.
3) Legal Documents (provider: legal_docs)
   - Docs: NDA, IP Assignment, Unpaid Internship Consent (PDFs). DocuSign allowed later; V1: manual signed PDFs acceptable.
   - Evidence: upload signed PDFs (PDF only, â‰¤25 MB). Stored in central Documents repository and linked to onboarding instance.
4) Email Setup (provider: internal_checklist)
   - Admin manually provisions NGI email; store issued email address in step notes.
5) Access Granted (provider: internal_checklist)
   - Project lead approves onboarding; mark step completed to enable My Projects for student.

Optional admin checklist steps may be added/removed per instance (template is editable for inâ€‘flight instances).

## 5) Due Dates & Escalations
- Derive step due dates as offsets from the project start date (e.g., Legal docs: Dâ€‘7, Email setup: Dâ€‘3, Access granted: Dâ€‘1).
- Overdue steps: flagged red; after 3 days overdue, create a dashboard todo for admins.
- Reminders: email reminders only (manual or automated notifications to admins); interview uses Google Calendar reminders.

## 6) Security & Compliance
- Evidence uploads: PDF only, â‰¤25 MB, stored under `/uploads/advisory-onboarding/{instance_id}/...` and registered in central Documents; never public.
- PII handling: restrict access to admins only; no student selfâ€‘uploads in V1.
- Audit: log all step status changes, evidence uploads, notes edits, reopen/cancel.

## 7) Data Model Mapping (existing tables)
- advisory_onboarding_templates(id, name, description)
- advisory_onboarding_template_steps(id, template_id, step_key, title, provider, config)
- advisory_onboarding_instances(id, student_id, project_id, template_id, status, created_at)
- advisory_onboarding_events(id, instance_id, step_key, status, ts, evidence_url, external_id)

Config suggestions per step
- interview: { duration_min: 30, invite_emails: [andre, landon], reminders: [1d,10m] }
- legal_docs: { doc_types: ['NDA','IP','Consent'], max_size_mb: 25, formats:['pdf'] }
- email_setup: { capture_address: true }
- access_granted: { gate_my_projects: true }

## 8) API Contracts (Illustrative)
Admin
- POST /api/advisory/onboarding/instances { student_id, project_id, template:'analyst_standard' } â†’ { id }
- GET /api/advisory/onboarding/instances?status=&student=&project= â†’ list with progress
- GET /api/advisory/onboarding/instances/{id} â†’ detail with steps and statuses
- POST /api/advisory/onboarding/instances/{id}/steps/{step_key}/mark { status, evidence_url?, external_id?, note? }
- POST /api/advisory/onboarding/instances/{id}/reopen | /cancel
- POST /api/advisory/onboarding/instances/{id}/steps/{step_key}/upload (multipart PDF) â†’ { evidence_url }

System
- POST /api/advisory/hooks/applications/{application_id}/accepted â†’ autoâ€‘create instance and seed steps

## 9) Admin UX Summary
- Instances list: filters by status, student, project; progress ring (% steps complete), due soon/overdue indicators.
- Instance detail: step list with statuses, due dates, action buttons (Mark Pending/Sent/Completed/Failed), evidence upload, notes.
- Interview step: create/attach event; store google_event_id and show link to calendar web UI.
- Legal docs: upload PDFs; attach to Documents system.
- Access gate toggle: On completion of Access Granted, mark instance Completed and enable My Projects access for student.

## 10) Student UX (V1)
- No dedicated onboarding page. Applications detail shows: â€œYou will receive onboarding emails/tasks soon. If not, contact project leads at â€¦â€.
- My Projects appears only after onboarding instance completion.

## 11) Metrics (optional)
- time_to_complete, steps_overdue_count, interview_scheduled_rate, legal_docs_completion_rate.

## 12) Success Criteria
- Admins can complete onboarding endâ€‘toâ€‘end with simple checklists and uploads; docs secured and centrally stored; My Projects access gated correctly; audits recorded; overdue escalations created after 3 days.

## Current Implementation Snapshot (V1 dev)
- Fixed flow per student + project: NGI email, Intern Agreement, optional NDA, uploads, finalize (creates assignment + archives application).
- Only students with a project-scoped Offer application are eligible for flow creation.
- Admin UI implements the checklist; backend exposes flows endpoints and file uploads.

