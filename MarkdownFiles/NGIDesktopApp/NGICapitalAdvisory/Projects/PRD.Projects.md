# NGI Capital Advisory – Projects Module (Admin) PRD

## Addendum – Coffee Chats Tab (2025‑10‑03)

Purpose
- Integrate Coffee Chats management directly into each Project’s detail view while keeping availability global per admin. Students see only the leads’ availability for the selected project.

Admin UI – Project › Coffee Chats
- Availability View: aggregate and display the project leads’ global availability (15/30 min) in PT; read‑only aggregation here, creation/edit is per lead.
- Actions:
  - Manage my availability (lead only): add/delete global blocks.
  - Requests (project‑scoped): list and act on pending/accepted/completed/etc.; accept (host=accepting admin), propose new time, cancel, complete, mark no‑show.
  - Metrics header: pending | accepted | completed (30d) | no‑shows.
- Conflict Avoidance: holds on request creation; Google Calendar free/busy check on accept; conflicts block accept and require propose.
- Policy: 24‑hour cancellation guidance; 2 no‑shows can temporarily block further requests.

Student UX – Projects › [id]
- Show only availability of that project’s leads; allow request prior to application; recommend chat before applying.
- After chat, student can proceed to application (no auto lane change).

Data/API Hooks
- Leads Source: `GET /advisory/projects/{pid}/leads` defines the emails used to aggregate availability.
- Requests are stored with `project_id`; one active request per (student_email, project_id).
- Endpoints reused from Coffee Chats PRD addendum (public + admin project‑scoped).

Navigation Changes
- Coffee Chats admin functionality is accessed from the Project detail tab; standalone global admin pages are deprecated.


## 0. Context
This PRD defines the Admin Projects module for NGI Capital Advisory, which powers student‑facing project discovery and application flows. It aligns with the existing FastAPI + Next.js stack and the advisory tables already present in the backend. No code changes are performed by this PRD; it specifies behavior for implementation.

## 1. Objectives
- Ship a modern, reliable admin workflow to create, publish, and manage Advisory projects.
- Maintain a clear separation of Summary vs Description.
- Support multi‑lead, team size, team requirements (majors), and derived open roles.
- Add custom application questions (text, ordered, limits enforced) per project.
- Provide a live student preview for accuracy and speed.
- Control visibility (draft/active/closed; paused hidden for students) and allow_applications.
- Upload hero + gallery images (with cropping), and attach a single showcase PDF post‑completion.
- Emit telemetry to power dashboard KPIs with raw + rollup retention policy.

## 2. Non‑Goals
- Mobile preview mode.
- Non‑text application question types (file, MCQ) in V1.
- Calendly integration (we use internal availability + Google Meet in Coffee Chats module).
- Public unauthenticated access.

## 3. Personas & Permissions
- Admin Partner (Andre/Landon; future admins): full create/edit/publish; can upload media and showcase PDF.
- Student (signed‑in, UC domains): read only (active/closed projects), can apply and request chats when enabled.

## 4. Information Architecture
- Admin App → NGI Advisory → Projects
  - List (draft/active/closed; filters, search)
  - Create Project (sheet or modal)
  - Edit Project (same form UI)
  - Live Preview (right rail or tab)
  - Media Manager (hero + gallery, cropping)
  - Completed: Showcase PDF

## 5. Detailed Requirements
### 5.1 Fields
- Project name (string, 4–120 chars, required on publish)
- Client name (string, 2–120, required on publish)
- Summary (string, 20–200, required on publish) – concise overview for list card
- Description (rich/markdown plain text, 50–4000, required on publish)
- Status (enum): draft | active | closed. Students see active/closed only.
- Dates: start_date, end_date (ISO 8601). end_date ≥ start_date.
- Duration (weeks) (int ≥ 1)
- Hours/week (int 1–40)
- Project code (string, admin‑only, auto): `PROJ-ABC-###`
- Project leads (multi‑select from admin users; v1 Andre/Landon)
- Team size (int ≥ 1; informational; excludes leads)
- Team requirements (majors): multi‑select from curated taxonomy (see 5.4)
- Allow applications (bool). If false, hide Apply & Coffee Chat for students.
- Hero image (upload; recommended 16:9; cropping supported)
- Gallery images (0..N uploads)
- Tags / Partner badges / Backer badges (optional lists)
- Apply CTA text (optional)
- Showcase PDF (single file; appears after closure)

### 5.2 Derived
- Open role count = team_size − assigned_analysts (leads excluded). Derived in UI from assignments.

### 5.3 Project Code Generation
- Format: `PROJ-ABC-###`
  - ABC: derive from client_name or project_name. Steps: keep alnum; take first 3 letters; upper‑case; pad with X if <3.
  - ###: 3‑digit sequence per ABC, starting at 001; next = max(seq)+1 for that ABC.
- Generated on first save; admin‑only; non‑editable in V1.

### 5.4 Majors Taxonomy (draft)
- Business, Finance, Accounting, Economics, Data Science, Computer Science, Electrical Engineering, Mechanical Engineering, Industrial Engineering, Information Systems, Statistics, Mathematics, Marketing, Operations Research, Design, Communications, Political Science.
- Represented as a curated list; can expand later.

### 5.5 Media Handling
- Upload pathing: `/uploads/advisory-projects/{project_id}/...`
- Default hero: theme‑aware gradient (light/dark) when none uploaded.
- Cropping recommended pattern: object‑fit cover + crop tool on upload (client‑side preview) prior to save.
- Gallery supports left/right navigation; includes showcase PDF in closed state.

### 5.6 Application Questions
- Up to 10 items; each is text prompt; admin sets display order.
- Student response limit: 500 words per question (enforced on student side; validate server‑side length in bytes/words).

### 5.7 Visibility Rules
- Students see only active and closed; draft/paused never shown.
- If allow_applications=false, hide Apply & Coffee Chat for that project.

### 5.8 Student Preview
- Uses student card/detail components; actions disabled.
- Mirrors data exactly as students would see it.

### 5.9 Completed Showcase
- One PDF per project; available to signed‑in students on closed projects.
- Renders as an item in the gallery navigator; clicking opens PDF viewer or download.

### 5.10 Metrics
- Raw events (JSON rows):
  - project_impression { project_id, student_id?, ts }
  - project_view { project_id, student_id?, source, ts }
  - project_apply_click { project_id, student_id, ts }
  - project_application_submitted { project_id, student_id, ts }
  - project_coffeechat_request { project_id, student_id, ts }
  - project_showcase_view { project_id, student_id, ts }
- Rollups:
  - Daily aggregates per project_id; job folds older than 90 days.
- Indices: (project_id, ts), (event_type, ts)

## 6. API Contracts (current + to‑add)
Current (read‑only for students):
- GET `/api/public/projects` → list public active projects (with allow_applications & hero/tags)
- GET `/api/public/projects/{id}` → project detail (includes gallery, tags, badges)

Admin (existing/extend):
- GET `/api/advisory/projects` → list all (filters: status, q)
- POST `/api/advisory/projects` → create
- GET `/api/advisory/projects/{id}` → detail
- PUT `/api/advisory/projects/{id}` → update
- DELETE `/api/advisory/projects/{id}` → set status=closed or hard delete (prefer soft via status)

To add in future (media & extended fields):
- POST `/api/advisory/projects/{id}/hero` (multipart file) → { hero_image_url }
- POST `/api/advisory/projects/{id}/gallery` (multipart file) → { gallery_urls }
- POST `/api/advisory/projects/{id}/showcase` (multipart file) → { showcase_pdf_url }
- PUT `/api/advisory/projects/{id}/questions` → replaces ordered text prompts
- PUT `/api/advisory/projects/{id}/leads` → sets multi‑lead list
- PUT `/api/advisory/projects/{id}/requirements` → sets majors list

Responses should follow current shapes in `advisory.py` and `advisory_public.py` with additional fields added as columns/JSON when implemented.

## 7. Validation & Errors
- 422 on Publish when required fields missing or invalid date ranges.
- 400 for media type/size violations (define max size e.g., 10MB; accepted: jpg/png/pdf for showcase).
- 409 on project code collision (should be prevented by generation; handle gracefully).
- All errors provide user‑friendly messages surfaced in UI toasts.

## 8. Security
- Admin endpoints require admin auth (Andre/Landon) via existing auth guards.
- Student endpoints require sign‑in; public read is permitted only via advisory_public for active/closed projects.
- Uploads served via `/uploads`; ensure links are only shown to signed‑in users; avoid indexing.

## 9. Performance
- Project list paginated (e.g., 20 per page) with search/filter server‑side.
- Images lazy‑load; preview optimized.

## 10. Accessibility & UX
- Keyboard navigable forms and dialogs; labelled fields and buttons.
- Focus management on open/close of Create/Edit dialog.
- Color contrast per theme tokens; motion reduced when prefers‑reduced‑motion.

## 11. Rollout & Flags
- Feature flag (optional) `ADVISORY_PROJECTS_V1` to guard new UI pieces until complete.
- Migrations staged behind a toggle; enable write paths only after deploy.

## 12. Risks & Mitigations
- Media storage growth → organize uploads per project; add cleanup tooling.
- Over‑validation blocking publishing → provide Save Draft always.
- Code generation collisions → robust prefix creation, sequence lookup with lock.

## 13. Success Metrics
- Admin time to publish ≤ 3 minutes for a typical project.
- 0 critical UI errors across supported browsers.
- 95%+ of student views load < 2s on broadband.
