# Student Applications �?" PRD (NGI Capital Advisory)

## 0) Context & Goal
A simple, student-friendly page listing the student�?Ts applications with quick access to project pages, read-only application details (answers and the resume snapshot used at submission), and the ability to withdraw. If the profile is incomplete, students cannot apply and will see a CTA to complete profile (link to Settings). Keep the UX clean and focused on desktop, responsive where practical.

## 1) Scope (V1)
- Applications list: newest first, no filters; status chips visible and live-updating.
- Detail view: answers (read-only, collapsible long text), resume snapshot (downloadable), and a Withdraw action with confirm.
- Profile gate: if incomplete, show CTA to complete profile before any applications exist. No apply action here.
- Notifications: in-app only; show a small "Updated" badge for apps that changed status since last viewed.
- Past view: toggle via `?view=past` combining archived applications with current Withdrawn/Rejected; newest-first.
- Joined handoff: when an app reaches Joined (post-onboarding), still visible here; students will also see it under �?oMy Projects�?? (separate module to define later).

## 2) Out of Scope (V1)
- Email notifications.
- Displaying Coffee Chat statuses here (they live in Coffee Chats section).
- Displaying Interviews/Offer tasks (they surface via Onboarding and can be referenced with a generic next-steps message).
- Filters/sorts beyond �?omost recent first�??.

## 3) Student-visible Statuses
- New, Reviewing, Interview, Offer, Joined, Rejected, Withdrawn.
- Transitions reflect admin actions in real time (e.g., Rejected �+' Reviewing). Status changes should surface as in-app updates and clear the "Updated" badge once viewed.

## 4) Data Model & Snapshots
- Each application stores a snapshot of answers and the resume URL used at submission time; subsequent profile changes do not alter the application snapshot.
- List item shape: { id, project_id, project_name, status, submitted_at, updated_at, has_updates }
- Detail shape: { answers: [{prompt, response}], resume_url_snapshot, submitted_at }

## 5) Actions
- Open project: deep-link to the public project detail.
- View application: opens detail (inline/side panel or dedicated page) showing answers and resume snapshot.
- Withdraw: confirmation modal; on confirm, app becomes Withdrawn and can be re-applied from the project page immediately (no cooldown).
- Reapply: not shown as a button here; students re-apply from the project page after withdrawing.

## 6) Profile Completeness Gate
- Apply is blocked until required fields are present: phone, LinkedIn, GPA, location, school, program/major, grad_year, resume. Show a banner with a "Complete profile" CTA to Settings when any are missing.

## 7) API Contracts
Current
- GET /api/public/applications/mine �+' [{ id, target_project_id, status, created_at }]

To add
- GET /api/public/applications/{id} �+' detail with answers and resume snapshot
- POST /api/public/applications/{id}/withdraw �+' set status=Withdrawn and archive in admin system
- POST /api/public/applications/{id}/seen �+' updates last_seen_at to clear the badge
- GET /api/public/applications/archived �+' returns archived applications for the student (with status/reason and archived_at)

Response includes enough data to render statuses and project links; UI will also pull project info from /api/public/projects/{id} when needed.

## 8) Telemetry & Privacy
- Events: applications_list_view, applications_detail_open, applications_withdraw_click, applications_withdraw_confirm, applications_reapply_click (from project page), applications_badge_clear.
- Include student_id and application_id; do not log answer contents.

## 9) A11y & Performance
- Keyboard navigable list and actions; semantic headings; status pills with accessible labels.
- Collapse/expand answer content; lazy-load resume preview until detail opens.

## 10) Success Criteria
- Students can view all their applications and details clearly, withdraw successfully, and see live status changes. The design remains simple and fast.

---
## 11) State Machine
- new �+' reviewing �+' interview �+' offer �+' joined
- Terminal: rejected, withdrawn
- Admin may revert (e.g., rejected �+' reviewing); student sees changes live.

## 12) Data Model (Detailed)
Application list item
- id: integer
- project_id, project_name
- status: enum as above
- submitted_at: ISO8601
- updated_at: ISO8601
- has_updates: boolean (computed from last_seen_at < updated_at)
- last_seen_at: ISO8601 (client sync; stored to clear badges)

Application detail
- answers: array of { prompt: string, response: string }
- resume_url_snapshot: string (path under /uploads/...)
- submitted_at: ISO8601
- project_link: string URI

## 13) API Contracts (Illustrative)
- GET /api/public/applications/mine �+' 200 [{ id, target_project_id, project_name, status, created_at, updated_at }]
- GET /api/public/applications/{id} �+' 200 { id, project_id, project_name, status, submitted_at, answers:[...], resume_url_snapshot }
- POST /api/public/applications/{id}/withdraw �+' 200 { id, status:'withdrawn' }
- POST /api/public/applications/{id}/seen �+' 200 { id, last_seen_at } (to clear Updated badge)

Errors
- 403 if withdrawing another user�?Ts application
- 409 if already withdrawn
- 404 unknown id

## 14) Telemetry Schema
- applications_list_view { student_id, ts }
- applications_detail_open { student_id, application_id, ts }
- applications_withdraw_click { student_id, application_id, ts }
- applications_withdraw_confirm { student_id, application_id, ts }
- applications_badge_clear { student_id, application_id, ts }

PII: do not log answers; retain events �%�90 days then roll up daily.

## 15) Error Handling & Copy
- Network error: "Couldn�?Tt load applications. Retry."
- Unauthorized: redirect to sign-in.
- Withdraw failed: "Couldn�?Tt withdraw. Please try again." (show error reason if available)

## 16) Security & Privacy
- Authorize all /applications/{id} by student ownership.
- Serve resume snapshots with authenticated access; avoid indexing.
- Immutable snapshots: submitting a new resume later does not change previous application.

## 17) Performance Budgets
- List first contentful paint < 1s (local dev baseline)
- Detail open < 300ms before resume download starts
- Collapse long answers by default (up to 2�?"3 lines) to keep layout stable

## 18) Edge Cases
- Duplicate apply blocked at project submit level (error surfaced there)
- Withdraw after status change: still permitted unless joined; handle race and show final status
- Missing resume snapshot file: show fallback and guidance to contact support

## 19) Operational Notes
- Badge clearing via /seen; fallback to local timestamp if API unavailable (sync later)
- Content-Disposition for resume download should be attachment; filename preserved where possible
