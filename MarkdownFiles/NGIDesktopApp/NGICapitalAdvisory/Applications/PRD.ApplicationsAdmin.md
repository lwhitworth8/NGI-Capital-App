# Applications Admin – PRD (NGI Capital Advisory)

## Addendum – Coffee Chats Relationship (2025‑10‑03)

Clarifications
- Coffee chats are informal pre‑application conversations. They do not automatically change application status.
- Admins may drag applications to a new lane after reviewing outcomes, but no automatic transition occurs upon chat completion.
- The Student project page recommends scheduling a coffee chat before applying.
- If an application already exists for the project and a chat is completed, the system may add an internal timeline note; status remains unchanged until an admin action.

Interactions
- Coffee chat scheduling and requests are managed in each Project’s Coffee Chats tab; see Coffee Chats PRD addendum for API and behaviors (holds, expiry, conflict checks).


## 0) Context & Goals
Admin module for managing student applications to NGI Advisory projects. Provides project-scoped Kanban by default and a switchable global consolidated view. Integrates with Projects (capacity and questions), Students (immutable email, profile completeness), and Onboarding (interviews, offers, joining). No code changes here—this defines the expected behavior.

## 1) Objectives
- Per‑project Kanban pipeline (default) with drag‑and‑drop between stages; global consolidated view (table) for cross‑project triage.
- Clear visibility of capacity (open roles) and aging, with partner override when offering/joining beyond capacity.
- Application detail with answer snapshots, resume preview, reviewer ownership, and timeline of related chats/interviews (read‑only) and onboarding events.
- Simple notifications: in‑app badges for assigned reviewer on new applications; no emails in v1.
- Durable records: keep all applications indefinitely; archive withdrawals separately.

## 2) Views & Scope
- Project Kanban: New → Reviewing → Interview → Offer → Joined, with Rejected and Withdrawn as terminal lanes. Drag‑and‑drop enabled; no guardrails v1; can move Rejected/Withdrawn back to Reviewing.
- Global View (Table): All projects; powerful filtering/sorting; quick triage and navigation to detail.
- Joined remains visible on Kanban until Onboarding completes; then it moves automatically to Past Applications (read‑only).

## 3) Integrations & Ownership
- Interviews & Offers: managed in Onboarding module (Google Calendar similar to Coffee Chats). Applications shows their statuses and times read‑only in the timeline and lanes reflect the intended process stage.
- Capacity: sourced from Projects (team_size − assigned analysts). Applications displays capacity KPIs and enforces warnings with partner override.
- Students: email immutable; profile completeness gate enforced on student portal—admins see completeness indicators in detail.

## 4) Fields & Data Model (current → proposed)
Existing table: advisory_applications(id, entity_id, source, target_project_id, first_name, last_name, email, school, program, resume_url, notes, status, created_at)

Additions (future; no code change yet):
- reviewer_email (Andre or Landon)
- answers_json (snapshot of question answers at submission)
- attachments (PDF files up to 25 MB; stored under /uploads/advisory-applications/{id}/)
- rejection_reason (free text)
- last_activity_at (derived: latest status change, interview, or onboarding event)
- separate table advisory_applications_archived (for Withdrawn and historical archival)

Status set v1:
- new, reviewing, interview, offer, joined, rejected, withdrawn

## 5) Capacity Rule & Override
- Open roles = team_size − assigned analysts (leads excluded). Show open roles at Kanban top; per-card warnings in Offer/Joined lanes when 0.
- Enforcement: warn with "No open analyst roles available" and allow override (two‑step confirm with rationale) to proceed beyond capacity.

## 6) Reviewer Assignment & Notifications
- Assign reviewer = Andre or Landon (single required reviewer). The other admin can see full context and actions.
- New apps: in‑app badge for assigned reviewer; no email.
- Aging: highlight apps > 7 days in New/Reviewing.

## 7) Past Applications / Archival
- To reduce clutter, when an application reaches Joined (post‑onboarding), move to Past Applications view (read‑only) while retaining in DB indefinitely.
- Withdrawn also moves to an Archive view (or separate table) for historical review.

## 8) Application Detail
- Header: Student name, project, status, reviewer, submitted at, aging badge.
- Profile summary: school, program/major, grad year; profile completeness indicator.
- Resume viewer: embedded PDF (fullscreen, no zoom); use stored resume_url snapshot.
- Answers: read‑only snapshot of up to 10 text answers; 500‑word limits enforced on student portal at submission.
- Attachments: admin may upload internal review PDFs; stored under /uploads/advisory-applications/{id}/.
- Timeline: coffee chats (if related), interview/offer (from Onboarding) entries (scheduled or completed), onboarding milestones.
- Actions: Change status (drag/drop or dropdown), Assign/Reassign reviewer, Reject (free text reason), Withdraw (move to archive).

## 9) Filters & Sort (Global & Project Views)
- Filters: project, status, reviewer, school, program/major, grad year, has resume, date range, aging (>7 days).
- Search: name, email, school, program only (no full‑text on answers in v1).
- Sort: submitted date (newest), name A–Z.

## 10) Duplicate Prevention & Withdrawals
- Duplicate: block student from applying twice to the same project unless previous is Withdrawn.
- Withdraw: no reason collected in v1; student may re‑apply without cooldown.

## 11) Metrics & KPIs
- Per‑project funnel counts by lane; global totals.
- Time‑in‑stage (median) and aging distribution; conversion to Interview/Offer/Joined.
- Reviewer load: apps per reviewer, time‑to‑first‑review.

## 12) Permissions & Audit
- Full access: Andre/Landon only.
- Audit all changes: status transitions, reviewer assignment, rejection and reason, override beyond capacity, attachment uploads.

## 13) Non‑Functional
- Performance: Kanban virtualization if needed; table pagination (100 per page) with fast filters.
- A11y: keyboard drag/drop alternatives; labeled controls; readable contrasts.

## 14) Success Criteria
- Smooth drag‑and‑drop; accurate capacity warnings; reviewer notifications; duplicate prevention; complete detail view; durable archives; metrics captured.

## 15) Attachments & Archive Constraints
- Admin attachments: PDF only, max 25 MB per file; stored under /uploads/advisory-applications/{id}/. Upload UI enforces type/size before submit and backend revalidates.
- Archive: use dvisory_applications_archived as a separate table for Withdrawn and Past Applications history. Applications move to archive automatically when Onboarding completes or when explicitly Withdrawn.

## Current Implementation Snapshot (V1 dev)
- Admin UI: Kanban + Global table; detail drawer (status, reviewer, resume, attachments, reject/withdraw); Past Applications; reviewer badge.
- Backend: reviewer/rejection/answers/last_activity columns; attachments + archived tables; detail/reject/withdraw/archived/attachments endpoints.
- Notes: Status 'joined' supported on new DBs; legacy DBs map to 'offer' until migration; Attachments PDF ≤ 25 MB.
