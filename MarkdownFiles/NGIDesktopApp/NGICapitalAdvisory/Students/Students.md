# NGI Capital Advisory – Students Admin (Expanded)

## Purpose
Manage the Advisory student database: fast list with filters/sort, rich student detail (profile, resume, applications, coffee chats, onboarding), limited admin edits (status override), assign to projects with capacity enforcement, and audit logging.

## Canonical Fields
Managed in the Student Settings (required to apply): phone, LinkedIn URL, GPA, location, school, program/major, grad year, resume. Email is immutable and used to link all records. Admins cannot edit the resume.

## Key Features
- Status lifecycle (Active→Alumni) auto‑update based on grad year, with manual override.
- Virtualized list, 100/page, filters by status/school/major/grad year/has resume/applied project/chat status; search; sort.
- Detail view with resume viewer; applications table; coffee chats and deep links; onboarding summary and CTA.
- Assign to Project flow with capacity enforcement (open roles = team_size − assigned analysts).
- Soft delete to archive and restore; full audit logging of admin actions.

## References
- PRD: ./PRD.StudentsAdmin.md
- UX Spec: ./UX.Spec.StudentsAdmin.md
- Test Plan: ./TestPlan.StudentsAdmin.md
- QA Checklist: ./QAChecklist.StudentsAdmin.md
- Acceptance Criteria: ./AcceptanceCriteria.StudentsAdmin.md
- Open Questions: ./OpenQuestions.StudentsAdmin.md
