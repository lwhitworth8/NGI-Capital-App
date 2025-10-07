# Coffee Chats Admin — PRD (NGI Capital Advisory)

## Addendum – Per‑Project Integration and Global Availability (2025‑10‑03)

This addendum supersedes prior navigation and scoping for Coffee Chats. It aligns Coffee Chats with per‑project admin workflows while keeping availability global per admin.

Summary
- Availability is global per admin (Andre/Landon) and shown within each Project’s Coffee Chats tab based on that project’s leads.
- Students only see availability for the selected project’s leads from that project page; chats are allowed before applying and are recommended pre‑application.
- One active request per student per project at a time.
- Requests expire after 48 hours if not accepted.
- When a student requests a slot, the slot is held immediately (blocking double booking) and conflict-checked against the admin’s Google Calendar on accept.
- Accepting admin becomes the host/owner of the event; all project leads are invited.
- Timezone: display PT; store UTC.
- No‑show policy: a student with 2 no‑shows is temporarily blocked from creating more requests (friendly messaging).
- Admin Coffee Chats are managed inside the Project detail page; legacy standalone Coffee Chats admin pages are deprecated.

UI/UX (Admin – Projects › [id] › Coffee Chats)
- Show an availability calendar/list composed from the project leads’ global availability (15 or 30 minute slots).
- List project‑scoped requests with filters (status, owner), actions (accept, propose, cancel, complete, no‑show), and small header metrics (pending, accepted, completed last 30 days, no‑shows).
- Creating availability is allowed only for project leads (admins in V1), and updates global availability.
- Rich shadcn UI with animated interactions; all actions are audited.

UI/UX (Student – Projects › [id])
- Show coffee chat picker with availability restricted to that project’s leads.
- Allow request before application; recommend coffee chat before applying.
- Friendly policy text (PT timezone, 24‑hour cancellation, 2 no‑shows may limit future requests).

Scheduling & Constraints
- Slot length: 15 or 30 minutes.
- Timezone: always PT for display; persist as UTC ISO.
- Holds: creating a request places a hold on the selected slot (prevents double booking across projects for that admin). Releases on cancel/expire.
- Conflicts: on accept, verify Google Calendar free/busy; if conflict, block acceptance and prompt propose‑new‑time.
- Invitations: accepting admin is host; invite all project leads and the student. Event title template: “Coffee Chat — {Project} — {Student}”. Include 24‑hour cancellation policy in description.
- Expiry: pending requests auto‑expire after 48 hours (configurable later).
- Cooldown/Blacklist: keep existing fields and enforcement.

Data Model Adjustments
- Requests: add `project_id` (required) to `advisory_coffeechat_requests`.
- Availability: remains global per admin via `advisory_coffeechat_availability` keyed by `admin_email`.
- Enforce unique active request per (student_email, project_id).
- Track `no_show_count` for policy enforcement.

API Contracts (updated)
- Public (Student):
  - GET `/public/projects/{pid}/coffeechats/availability`
  - POST `/public/projects/{pid}/coffeechats/requests` { start_ts, end_ts }
- Admin (Project‑scoped views):
  - GET `/advisory/projects/{pid}/coffeechats/availability` (read‐only aggregation of leads’ global availability)
  - GET `/advisory/projects/{pid}/coffeechats/requests`
  - POST `/advisory/coffeechats/requests/{id}/accept | /propose | /cancel | /complete | /no-show`
  - POST `/advisory/coffeechats/availability` (create global block for current admin)
  - DELETE `/advisory/coffeechats/availability/{id}`
- Behavior:
  - Create request holds the slot; accept creates calendar event and sends invites; propose changes times; cancel/complete/no‑show mutate state and audit.

Navigation & Deprecation
- Remove/replace standalone admin pages at `ngi-advisory/availability` and `ngi-advisory/coffeechats/requests` from the primary nav. Keep endpoints temporarily for legacy access if needed; prefer project tab entry point.

Audit & Security
- All actions (set availability, accept, propose, cancel, complete, no‑show) are written to `audit_log` with `project_id`, `admin_email`, and timestamps.
- Admin gating follows existing advisory admin authorization.

Reporting (Minimal)
- Per‑project counts in tab header; additional dashboards can be added later.


## 0) Context & Goals
Internal coffee chat scheduling for NGI Advisory uses Google Calendar and Google Meet. Admins (Andre, Landon) publish availability; students request a slot (PST); an admin accepts or proposes another time; the system creates a Google Calendar event with a Meet link and invites all participants. Anti‑abuse policies (one pending request, cooldown after no‑show, blacklist after repeated cancels) protect partner time.

## 1) Objectives (V1)
- Availability editor: month‑view per admin; 15/30‑minute slots; 4‑week horizon; Google free/busy overlay to mask conflicts.
- Student slot picker: PST display of conflict‑free slots; one pending request per student; auto‑expiry after 7 days.
- Admin actions: accept/decline/propose; claim unowned requests; mark completed/canceled/no_show; enforce cooldown/blacklist.
- Event creation: create Google Calendar event with Meet; invite student and both partners; reminders at 1 day and 10 minutes.
- Telemetry: store operational metrics for dashboard KPIs and audits.

## 2) Scope (V1)
- Availability CRUD per admin with “Both free” overlay (Andre ∩ Landon).
- Student request creation from visible slots; block if student has pending/cooldown/blacklist.
- Admin calendar and list views; accept/propose/cancel/no‑show/completed flows.
- Background expiry of unaccepted requests after 7 days.
- Google Calendar integration for event creation and reminders.

### Out of Scope (V1)
- Recurrence rules builder (use explicit availability blocks).
- Multi‑project selection (single chat may cover multiple projects informally).
- Non‑Google providers.

## 3) Personas & Access
- Admins: manage availability; take actions on requests; review telemetry.
- Students: request one slot at a time; reschedule by cancel + new request; join via Calendar.
- Security: Clerk authentication; admin gating for all admin operations; student portal UC‑domain policy.

## 4) Availability Management
- Month calendar per admin; click‑drag to add blocks; edit by resize/drag/delete.
- Slot granularity: 15 or 30 minutes (toggle).
- Horizon: up to 4 weeks ahead; past dates disabled.
- Free/busy overlay: pull Google Calendar free/busy; do not show conflicting slots. In development without Google credentials, this overlay is disabled.
- Both‑free overlay: robust intersection across admins; mismatched slot sizes and partial overlaps are chunked to the minimal grid (typically 15 minutes) and labeled `either`.

## 5) Student Request Policy
- One pending request per student; new requests blocked until resolved.
- Auto‑expire pending > 7 days; student can request again.
- Cooldown: after 1 no‑show, 7‑day cooldown.
- Blacklist: after 2 cancels, block further requests until cleared by admin.
- Reschedule: handled by cancel + new request; proposal flow from admin allowed.

## 6) Admin Review & Actions
- Views: Calendar overlay of availability + requests; List with filters (status, date range, admin owner, email).
- Accept: verify free/busy, create Google event with Meet, invite both partners + student; reminders set.
- Propose: suggest a new time constrained to availability; student sees updated time.
- Marking: completed, canceled (with reason: student/admin), no_show (actor), expired (auto).
- Claiming: either admin can accept an unclaimed request; the accepter becomes event owner.

## 7) Event Creation (Google)
- Owner: accepting admin (event organizer).
- Title: “Coffee Chat — {Student Name}”.
- Description: “This coffee chat will be over Google Meet. For reschedules or questions, please email the project leads.”
- Conference: auto‑create Google Meet; store link server‑side only.
- Reminders: 1 day and 10 minutes.
- Timezone: America/Los_Angeles for UI; Google localizes per attendee automatically.

## 8) Data Model
- `advisory_coffeechat_availability` (id, admin_email, start_ts, end_ts, slot_len_min, created_at, updated_at)
- `advisory_coffeechat_requests` (id, student_email, requested_start_ts, requested_end_ts, slot_len_min, status, cooldown_until_ts, blacklist_until_ts, created_at, updated_at, claimed_by_admin_email, expires_at_ts, project_context TEXT NULL)
- `advisory_coffeechat_events` (id, request_id, google_event_id, calendar_owner_email, meet_link, created_at, updated_at)
- Optional counters on students: `no_show_count`, `cancel_count` (or computed from requests/events)
- Status enum: requested → pending → accepted | completed | canceled | no_show | expired

## 9) APIs (admin + student)
Student‑facing
- `GET /api/public/coffeechats/availability` → list of slots (PST) within 4 weeks, conflict‑free; includes `type: 'either'|'andre'|'landon'`.
- `POST /api/public/coffeechats/requests` `{ start_ts, end_ts, slot_len_min }` → `{ id, status: 'pending', expires_at_ts }`.
- `GET /api/public/coffeechats/mine` → student’s requests with status and any `cooldown_until_ts` / `blacklist_until_ts`.

Admin‑facing
- `GET /api/advisory/coffeechats/requests` → filterable list by status/admin/date.
- `POST /api/advisory/coffeechats/requests/{id}/accept` → creates Google event; returns `{ status:'accepted', google_event_id, owner }`.
- `POST /api/advisory/coffeechats/requests/{id}/propose` `{ start_ts, end_ts }` → `{ status:'pending', proposed_ts }`.
- `POST /api/advisory/coffeechats/requests/{id}/cancel` `{ reason:'student'|'admin', note? }` → `{ status:'canceled' }`.
- `POST /api/advisory/coffeechats/requests/{id}/complete` → `{ status:'completed' }`.
- `POST /api/advisory/coffeechats/requests/{id}/no-show` `{ actor:'student'|'admin' }` → `{ status:'no_show', cooldown_until_ts }`.

## 10) Background Jobs
- Expiry worker: moves `requested/pending` older than 7 days to `expired` atomically.
- Optional nightly reconciliation with Google Calendar for drift.

## 11) Telemetry & Metrics
- Raw events: requests created, accepted, completed, canceled, no_show, expired.
- KPI: 7‑day counts by status; time‑to‑accept; show in Advisory dashboard.

## 12a) Environment & Integration Readiness
- Real Google integration requires environment vars: `ENABLE_GCAL=1`, `GOOGLE_SERVICE_ACCOUNT_JSON`, optional `GOOGLE_IMPERSONATE_SUBJECT`, and `GOOGLE_CALENDAR_IDS` mapping.
- Until configured, the system runs in mock mode (no free/busy filtering; mock event id + Meet link on Accept). End‑to‑end tests target this mode.

## 12) Error Handling & Concurrency
- Re‑check free/busy at Accept to avoid race conditions; lock during event creation; on conflict fall back to Propose.
- Idempotent Accept for same request id; only one event is created.

## 13) Accessibility & Performance
- Keyboard support: calendar navigation, selection, and actions; list filters tabbable.
- Virtualized rendering for month view if needed; slot generation efficient.

## 14) Privacy & Security
- Meet links not exposed in student UI; “Join” opens Google Calendar web event page.
- Store only necessary event metadata; handle tokens securely with least privilege scopes.
- Admin audit trail records action, before/after, and rationale for cancellations.

## 15) Operational Runbook
- Token rotation: quarterly review of Google auth credentials.
- Calendar mismatch: invalidate availability cache and refresh free/busy.
- Abuse appeal: admin can clear blacklist/cooldown from Students admin.
