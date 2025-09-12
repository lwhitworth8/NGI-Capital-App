# NGI Advisory – Projects Module Epics & Sprints (Expanded)

## Definitions of Done (DoD)
- Code merged with passing unit/integration/e2e tests.
- Lint/type checks clean; accessibility checks triaged.
- Docs updated (PRD, AC, Test Plan).
- Telemetry events validated in dev.

## Dependencies
- Auth/admin gating configured.
- Uploads serving from `/uploads` works.
- Student portal routes render from advisory_public.

## Epic 1: Core Create/Edit & Publish
- Story 1.1 (5): As an admin, I can create a draft project with required and optional fields.
  - AC: Draft save without publish requirements; validation errors inline.
- Story 1.2 (3): As an admin, I can publish a project; students see it accordingly.
  - AC: Status gating; is_public set; allow_applications respected.
- Story 1.3 (5): Live preview matches student view with disabled actions.
  - AC: Same data; no Apply/Coffee Chat.
- Story 1.4 (3): Upload hero image; default gradient when absent.
  - AC: Upload path stored; theme fallback.

## Epic 2: Project Code Generation
- Story 2.1 (3): Auto‑generate `PROJ-ABC-###` on first save.
  - AC: ABC rule + sequence lookup documented; admin‑only; unique.
- Story 2.2 (2): Prevent collisions and handle errors gracefully.
  - AC: 409 path tested; user‑friendly retry.

## Epic 3: Leads, Team & Open Roles
- Story 3.1 (3): Multi‑lead selection (Andre/Landon v1; extensible list)
  - AC: Stored list; rendered in admin UI; hidden from students.
- Story 3.2 (2): Team size informational; excludes leads.
  - AC: Help text; UI validation.
- Story 3.3 (3): Open roles auto‑derived = team_size − assigned analysts.
  - AC: Derived value shown on student detail when project is active.

## Epic 4: Requirements & Tags
- Story 4.1 (3): Admin selects majors from curated taxonomy (chips).
  - AC: Persisted; shown as badges on student detail.
- Story 4.2 (2): Tags/Badges optional; safe defaults.

## Epic 5: Application Questions
- Story 5.1 (5): Admin adds up to 10 text questions; sets display order.
  - AC: Ordering preserved; max enforced.
- Story 5.2 (3): Student responses capped at 500 words per question.
  - AC: Frontend limit + backend validation.

## Epic 6: Gallery & Completed Showcase
- Story 6.1 (3): Admin uploads optional gallery images.
  - AC: Stored paths; nav works in student detail.
- Story 6.2 (3): After closure, admin uploads a single showcase PDF; students can view.
  - AC: Access limited to signed‑in students.

## Epic 7: Metrics
- Story 7.1 (3): Emit raw events for impressions, views, clicks, submissions, chat requests, showcase views.
  - AC: Events logged with correct props; sample queries verified.
- Story 7.2 (3): Daily rollups after 90 days.
  - AC: Rollup job produces aggregates; retention policy applied.

## Sprint Plan (Two Sprints)
### Sprint 1 (Core)
- Epics 1, 2, 4 (majors), 5 (questions), 7.1 (emit events)
- Deliverables: Draft→Publish; preview; code gen; majors; questions; event plumbing.

### Sprint 2 (Enhance)
- Epics 3, 6, 7.2 (rollups), media cropping, UX polish
- Deliverables: multi‑lead; team/open roles; gallery + showcase; rollups; performance/a11y polish.

## Risks
- Upload UX complexity → start with simple crop, add enhancements later.
- Derived open roles accuracy depends on assignments → validate mapping.

