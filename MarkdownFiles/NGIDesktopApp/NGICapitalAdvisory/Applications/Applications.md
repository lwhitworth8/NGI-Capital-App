# Applications Admin – Overview (Expanded)

## Purpose
Manage per‑project application pipelines with Kanban and provide a consolidated global view. Integrate capacity awareness, reviewer assignment, duplicate prevention, and a rich application detail with answer snapshots and resume viewer. Interviews and offers flow through the Onboarding module and appear read‑only in the application timeline.

## Key Features
- Per‑project Kanban; Global table; drag/drop transitions.
- Capacity warnings with partner override; display open roles.
- Reviewer assignment and in‑app notifications.
- Duplicate prevention; withdrawals archived; records retained indefinitely.
- Detail view with answer/resume snapshots, attachments, and timeline of related events (coffee chats/interviews/onboarding).

## References
- PRD: ./PRD.ApplicationsAdmin.md
- UX Spec: ./UX.Spec.ApplicationsAdmin.md
- Test Plan: ./TestPlan.ApplicationsAdmin.md
- QA Checklist: ./QAChecklist.ApplicationsAdmin.md
- Acceptance Criteria: ./AcceptanceCriteria.ApplicationsAdmin.md
- Open Questions: ./OpenQuestions.ApplicationsAdmin.md

Notes: Admin attachments are PDF only, up to 25 MB. Applications remain visible on Kanban until Onboarding completes, then move to Past Applications (archived in advisory_applications_archived).

## Current Development Status (V1 dev)
- Implemented (admin):
  - Project Kanban with HTML5 drag/drop; capacity warning+override confirm on Offer/Joined.
  - Global table with search and status filter; click-through to detail.
  - Detail drawer: status, reviewer (Andre/Landon), resume link, attachments (PDF, 25 MB), reject/withdraw actions.
  - Past Applications: archived view (dedicated page and inline toggle).
  - Reviewer badge: count of new apps assigned to the signed-in reviewer since last “Mark reviewed”.
  - Timeline (read-only): coffee chats and onboarding milestones via student timeline.
- Backend:
  - Extended `advisory_applications` with `reviewer_email`, `rejection_reason`, `answers_json`, `last_activity_at`; allowed `joined` (legacy DBs fall back to `offer`).
  - Added `advisory_application_attachments` and `advisory_applications_archived`.
  - New endpoints: detail, reject, withdraw, list archived, attachments upload/list.
- Remaining (V1 polish / V2):
  - CSV export (global/archived), bulk actions in global view, richer metrics board.
  - Server-side reviewer badge metrics (per reviewer since last seen) and SLA indicators.
  - Full answer snapshots renderer and capacity override rationale capture UI (stored in audit).
