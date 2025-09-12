# Student Projects – PRD (NGI Capital Advisory)

## 0. Context
The Student Projects page lets signed‑in students discover active/closed projects, understand requirements and time commitment, apply via custom questions, request coffee chats (email invite delivery), and view a single showcase PDF for completed projects. Gated by Clerk (current middleware).

## 1. Objectives
- Provide a fast, intuitive browse and detail experience.
- Support filters (majors, mode, location) and sorting (newest, name A–Z, most applied).
- Use infinite scroll with stable query params for navigation.
- Enforce visibility rules: students only see active/closed; draft/paused hidden.
- Apply flow with preloaded resume, update option, 500‑word limits; allow withdraw.
- Coffee chats: 1 request per project; acceptance via email invite; no in‑app join button for v1.
- Completed projects: embedded PDF viewer (fullscreen only), no zoom, performant.
- Telemetry: capture student_id (when available), session/referrer, error events.

## 2. Non‑Goals (V1)
- Public unauthenticated browsing.
- In‑app Google Meet join button.
- Calendly integration.

## 3. Personas & Access
- Student (UC domain; signed‑in via Clerk).
- Access control: middleware‑gated; direct links to hidden/not‑found projects show a friendly "Not available" page.

## 4. Information Architecture
- /projects → list (filters, sort, infinite scroll)
- /projects/[id] → detail (apply form, chat request, gallery + showcase PDF)
- Applications page handles withdraw and status viewing

## 5. Requirements
### 5.1 List
- Sort: default=Newest; options: Name A–Z, Most Applied.
- Filters: majors (multi), mode (remote / in‑person / hybrid), location (text or chips).
- Infinite scroll: fetch next batches as user scrolls; preserve query params (?q=&majors=&mode=&location=&sort=).
- Empty state: "No projects available. Coming soon."

### 5.2 Cards
- Display: hero (or gradient fallback), name, client, summary, badges (majors/tags), completed label when status=closed.
- Accessible images (alt text), keyboard focusable card.

### 5.3 Detail
- Sections: hero carousel (images + showcase PDF if closed), summary + description, requirements (majors badges), dates, hours/week, open roles (Analyst) count, Apply, Coffee Chat.
- PDF viewer: embedded; no zoom; allow fullscreen; lazy‑load on interaction.

### 5.4 Apply
- Visible when allow_applications=true and status=active.
- Prompts: up to 10 text questions (ordered) with 500‑word limits and counters.
- Resume: preloaded from profile; allow updating during apply. Store association/snapshot per application.
- Confirm page/toast on submit; Applications page reflects status.
- Withdraw: allowed from Applications page; removes immediately from applicant pool.

### 5.5 Coffee Chats
- Student chooses a slot from internal availability (PST). One request per project at a time; after one accepted/completed, no more for that project; they can discuss multiple projects in one chat.
- After request: show Pending state and requested time; on acceptance, student sees Accepted state and is instructed to use the email invite to join.
- No in‑app join button in V1.

### 5.6 Visibility
- Active and closed only; draft/paused hidden from list/detail.
- If allow_applications=false → hide Apply and Coffee Chat for that project.

### 5.7 Telemetry
- Capture: project_impression, project_view, project_apply_click, project_application_submitted, project_coffeechat_request, project_showcase_view.
- Include: project_id, student_id (when available), session id, referrer, ts. Log validation/API errors for monitoring.

## 6. API Contracts (current usage)
- GET /api/public/projects → list (supports q, tags (majors), sort)
- GET /api/public/projects/{id} → detail
- POST /api/public/applications → create application
- GET /api/public/applications/mine → current user applications
- Coffee chat availability and request endpoints will be defined by Coffee Chats module; student relies on those for slot list and request submit. For v1, student UI states should reflect Pending/Accepted with email‑only join instructions.

## 7. Performance & A11y
- Infinite scroll batching (e.g., 20 items); images lazy‑load; defer PDF load until clicked.
- Accessible forms and buttons; focus states; keyboard carousel.

## 8. Errors & Edge Cases
- Friendly not‑available page for hidden/missing projects.
- Network timeouts display retry CTA.
- No hero/gallery/showcase → graceful carousel.

## 9. Success Metrics
- ≥95% interaction events captured.
- Filtered search results render < 300ms locally; scroll keeps 60fps.
