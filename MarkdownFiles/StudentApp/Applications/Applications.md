# Student Applications — Overview (Expanded)

A clean page listing a student’s applications with quick access to project pages, read-only application details (answers and the resume snapshot used), and a Withdraw option. If the profile is incomplete, the page shows a clear CTA to complete the profile in Settings; applying is blocked until complete.

- Simple ordering: newest-first; no filters in V1.
- Live statuses with an “Updated” badge when statuses change.
- Detail shows answers (collapsible) and submitted resume snapshot with Download.
- Withdraw with confirm; re-apply from the project page with no cooldown.
- Joined apps remain visible here; will also appear in My Projects (separate module).

## Implementation Notes (V1)
- Public API endpoints:
  - GET /api/public/applications/mine (includes project_name, has_updates badge flag)
  - GET /api/public/applications/{id} (answers + resume snapshot)
  - POST /api/public/applications/{id}/withdraw (update status)
  - POST /api/public/applications/{id}/seen (clear badge)
- Student UI:
  - List at `apps/student/src/app/applications/page.tsx`
  - Detail at `apps/student/src/app/applications/[id]/page.tsx`
  - Withdraw (client) at `apps/student/src/app/applications/[id]/WithdrawButton.tsx`
- Profile gate:
  - Backed by GET /api/public/profile fields (school, program, resume_url); V1 gate checks these fields and links to Settings.

- Past view: toggle via `?view=past`; combines archived applications with current Withdrawn/Rejected (dedup by id).

