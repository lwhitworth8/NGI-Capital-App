# NGI Capital Advisory — Manager Build Spec (No Settings, Student‑Style Projects)

**Owners:** [lwhitworth@ngicapitaladvisory.com](mailto:lwhitworth@ngicapitaladvisory.com), [anurmamade@ngicapitaladvisory.com](mailto:anurmamade@ngicapitaladvisory.com)
**Scope:** Operational manager only — **Projects, Students, Applications, Coffee Chats, Onboarding**.
**Out of scope:** Finance/KPIs, generic Settings page.

---

## 0) Repo & App Context

* **Backend:** FastAPI + SQLAlchemy + Alembic; auth dep `require_partner_access()` is available.
* **Frontend:** Next.js 14 (App Router) + React + TS + Tailwind + React Query + Lucide.
* **Routing:** Frontend calls **relative** `/api/*` which rewrites to backend origin.
* **Sidebar:** Link to **NGI Capital Advisory** exists.

---

## 1) Information Architecture (no Settings)

**Sidebar → NGI Capital Advisory** `/ngi-advisory`

* **Projects** `/ngi-advisory/projects`
* **Students** `/ngi-advisory/students`
* **Applications** `/ngi-advisory/applications`
* **Coffee Chats** `/ngi-advisory/coffeechats`
* **Onboarding** `/ngi-advisory/onboarding`

> Style: match the provided **student view** projects list (card UI). Manager uses the *same* card with admin affordances.

---

## 2) Access Control

* **Frontend:** Gate the entire `/ngi-advisory/*` subtree — render only if `user.email` ∈ {Whit, Andre}.
* **Backend:** New dep `require_ngiadvisory_admin()` that wraps `require_partner_access()` and enforces the allow‑list.

```py
# src/api/deps.py
NGI_ADVISORY_ADMINS = {
  "lwhitworth@ngicapitaladvisory.com",
  "anurmamade@ngicapitaladvisory.com",
}
```

Use `require_ngiadvisory_admin` on **all** `/api/advisory/*` routes.

---

## 3) Data Model (Alembic)

Create new tables; do **not** use Employees for students.

### 3.1 Tables

* **advisory\_projects**

  * `id, entity_id, client_name, project_name, summary, description, status(enum:draft|active|paused|delivered|closed),`
  * `mode(enum:remote|in_person|hybrid), location_text, start_date, end_date, duration_weeks(int), commitment_hours_per_week(int),`
  * `project_code(unique-ish), project_lead, contact_email, partner_badges(json[]), backer_badges(json[]), tags(json[]),`
  * `hero_image_url, gallery_urls(json[]), apply_cta_text, apply_url, eligibility_notes, notes_internal, created_at, updated_at`.
* **advisory\_students**

  * `id, entity_id, first_name, last_name, email(unique), school, program, grad_year, skills(json), status(enum:prospect|active|paused|alumni), created_at, updated_at`.
* **advisory\_project\_assignments**

  * `id, project_id(fk), student_id(fk), role, hours_planned, active(bool), created_at`.
* **advisory\_applications**

  * `id, entity_id, source(enum:form|referral|other), target_project_id(nullable fk), first_name, last_name, email, school, program, resume_url, notes, status(enum:new|reviewing|interview|offer|rejected|withdrawn), created_at`.
* **advisory\_coffeechats**

  * `id, entity_id, provider(enum:calendly|manual|other), external_id, scheduled_start, scheduled_end, invitee_email, invitee_name, topic, status(enum:scheduled|completed|canceled), raw_payload(jsonb), created_at`.
* **advisory\_onboarding\_templates** / **advisory\_onboarding\_template\_steps**

  * templates: `id, name, description`
  * steps: `id, template_id, step_key, title, provider(enum:internal|docusign|drive_upload|microsoft_teams|custom_url), config(json)`
* **advisory\_onboarding\_instances** / **advisory\_onboarding\_events**

  * instances: `id, student_id, project_id(nullable), template_id, status(enum:in_progress|completed|canceled), created_at`
  * events: `id, instance_id, step_key, status(enum:pending|sent|completed|failed), evidence_url, external_id, ts`

### 3.2 Migration helper

Optional script to migrate any legacy student records from Employees into `advisory_students` and hide the Employees‑based student section.

---

## 4) Backend API (FastAPI)

Mount: `app.include_router(advisory.router, prefix="/api/advisory", tags=["advisory"])`.
All routes require `require_ngiadvisory_admin`.

### 4.1 Projects

```
GET    /api/advisory/projects?entity_id=&status=&mode=&q=
POST   /api/advisory/projects
GET    /api/advisory/projects/{id}
PUT    /api/advisory/projects/{id}
DELETE /api/advisory/projects/{id}   # soft close/archive
```

**ProjectOut** (card + admin fields):

```json
{
  "id": 1,
  "entity_id": 1,
  "client_name": "UC Investments",
  "project_name": "Panama Canal",
  "summary": "Join a bold, student-led initiative...",
  "status": "active",
  "mode": "remote",
  "location_text": "Online",
  "start_date": "2025-09-01",
  "end_date": null,
  "duration_weeks": 12,
  "commitment_hours_per_week": 15,
  "project_code": "ENG-2025-001",
  "project_lead": "Andre Nurmamade",
  "contact_email": "anurmamade@ngicapitaladvisory.com",
  "partner_badges": ["UC Investments"],
  "backer_badges": ["Jagdeep Singh Backer"],
  "tags": ["ESG","Infrastructure"],
  "hero_image_url": "https://.../panama.jpg",
  "apply_cta_text": "Apply now",
  "apply_url": "https://forms.gle/...",
  "eligibility_notes": "UC students only",
  "notes_internal": "priority cohort",
  "assignments": [
    {"id": 9, "student_id": 21, "name": "Jane Kim", "role": "Analyst", "hours_planned": 20, "active": true}
  ]
}
```

### 4.2 Students

```
GET    /api/advisory/students?entity_id=&status=&q=
POST   /api/advisory/students
GET    /api/advisory/students/{id}
PUT    /api/advisory/students/{id}
DELETE /api/advisory/students/{id}
```

### 4.3 Assignments

```
POST   /api/advisory/projects/{project_id}/assignments        # {student_id, role, hours_planned}
PUT    /api/advisory/assignments/{id}
DELETE /api/advisory/assignments/{id}
```

### 4.4 Applications

```
GET    /api/advisory/applications?entity_id=&status=&project_id=&q=
POST   /api/advisory/applications
PUT    /api/advisory/applications/{id}
```

### 4.5 Coffee Chats (Calendly/manual — **no Settings UI**)

```
GET    /api/advisory/coffeechats?entity_id=&status=&provider=
POST   /api/advisory/coffeechats/sync                         # server-side sync using env/secret store
POST   /api/advisory/integrations/calendly/webhook            # webhook receiver
```

**Config:** Provider tokens/webhook secrets live in backend env or secure store; seed/update via admin CLI/script (no UI).

### 4.6 Onboarding

```
GET    /api/advisory/onboarding/templates
POST   /api/advisory/onboarding/templates
PUT    /api/advisory/onboarding/templates/{id}

POST   /api/advisory/onboarding/instances   # {student_id, template_id, project_id?}
GET    /api/advisory/onboarding/instances?student_id=&project_id=
POST   /api/advisory/onboarding/instances/{id}/steps/{step_key}/mark  # {status, evidence_url?}
```

---

## 5) Frontend (Next.js) — Pages & Components

### Routes

```
apps/desktop/src/app/ngi-advisory/page.tsx                 # redirect to /projects
apps/desktop/src/app/ngi-advisory/projects/page.tsx        # card list + designer drawer
apps/desktop/src/app/ngi-advisory/projects/[id]/page.tsx   # detail with assignments
apps/desktop/src/app/ngi-advisory/students/page.tsx
apps/desktop/src/app/ngi-advisory/students/[id]/page.tsx
apps/desktop/src/app/ngi-advisory/applications/page.tsx
apps/desktop/src/app/ngi-advisory/coffeechats/page.tsx
apps/desktop/src/app/ngi-advisory/onboarding/page.tsx
```

### Components

```
apps/desktop/src/components/advisory/ProjectCard.tsx           # renders student-style project card
apps/desktop/src/components/advisory/ProjectDesigner.tsx       # create/edit drawer with live preview
apps/desktop/src/components/advisory/ProjectForm.tsx           # controlled form used by designer
apps/desktop/src/components/advisory/AssignmentsPanel.tsx      # manage students on a project
apps/desktop/src/components/advisory/StudentForm.tsx
apps/desktop/src/components/advisory/ApplicationReviewDrawer.tsx
apps/desktop/src/components/advisory/CoffeeChatTable.tsx
apps/desktop/src/components/advisory/OnboardingBoard.tsx
```

### Projects UI — **Student‑style Cards** (Manager view)

* **List page**

  * Search (`q`), filter by `status`/`mode`, sort by `name|date`.
  * `+ New Project` → opens **ProjectDesigner** drawer.
  * Each **ProjectCard** mirrors the screenshot: hero image, title, status pill (e.g., *Remote*), short blurb, partner/backer badges, dates, commitment, duration, location, skill tags.
  * **Manager affordances:** card action menu → `Edit` (open drawer), `Deactivate/Close`, `Copy link to student view`.
* **ProjectDesigner drawer**

  * **Left:** form fields (below).  **Right:** live **ProjectCard** preview (same component).
  * Buttons: `Save Draft`, `Publish` (sets `status=active`), `Duplicate`.

**Form fields**

* Basics: `project_name`, `client_name`, `summary` (1–2 lines), `description` (long), `project_code` (auto `ENG-YYYY-NNN`).
* Labels: `mode` (`remote|in_person|hybrid`), `location_text`, `status` (`draft|active|paused|delivered|closed`).
* Timing: `start_date`, `end_date`, `duration_weeks`, `commitment_hours_per_week`.
* People: `project_lead`, `contact_email`.
* Badges: `partner_badges[]`, `backer_badges[]`.
* Tags: `tags[]` (chips UX).
* Media: `hero_image_url`, `gallery_urls[]`.
* Student app: `apply_cta_text`, `apply_url`, `eligibility_notes` (displayed to students later).
* Internal: `notes_internal` (hidden from students).

**AssignmentsPanel** (tab within designer or project detail): add/remove students, set role/hours.

### Students UI

* **List:** `Name | Email | School | Program | Status | Actions` (Edit, View, Archive).
* **Detail:** profile + current/past assignments.
* **Create:** simple modal/drawer (unique email required).

### Applications UI

* **List:** `Name | Email | School | Target Project | Status | Created | Actions`.
* **Review Drawer:** view resume/notes → update status; **Convert to Student**; **Attach to Project**.

### Coffee Chats UI

* **List:** `Invitee | Email | Start | End | Status | Provider | Topic`.
* **Actions:** `Sync` (server‑side) and webhook status indicator.

### Onboarding UI

* **Board:** rows=students, columns=steps; cell shows `pending/sent/completed`.
* **Start onboarding:** choose Template for a student (+ optional project).

### Client Types (TS)

```ts
export type AdvisoryProject = { id:number; entity_id:number; client_name:string; project_name:string; summary:string; description?:string; status:string; mode:'remote'|'in_person'|'hybrid'; location_text?:string; start_date?:string; end_date?:string; duration_weeks?:number; commitment_hours_per_week?:number; project_code?:string; project_lead?:string; contact_email?:string; partner_badges?:string[]; backer_badges?:string[]; tags?:string[]; hero_image_url?:string; gallery_urls?:string[]; apply_cta_text?:string; apply_url?:string; eligibility_notes?:string; notes_internal?:string };
export type AdvisoryStudent = { id:number; entity_id:number; first_name:string; last_name:string; email:string; school?:string; program?:string; grad_year?:number; skills?:Record<string,any>; status:'prospect'|'active'|'paused'|'alumni' };
export type AdvisoryApplication = { id:number; entity_id:number; source:'form'|'referral'|'other'; target_project_id?:number; first_name:string; last_name:string; email:string; school?:string; program?:string; resume_url?:string; notes?:string; status:'new'|'reviewing'|'interview'|'offer'|'rejected'|'withdrawn'; created_at:string };
export type AdvisoryCoffeeChat = { id:number; provider:'calendly'|'manual'|'other'; external_id?:string; invitee_email?:string; invitee_name?:string; scheduled_start?:string; scheduled_end?:string; status:'scheduled'|'completed'|'canceled'; topic?:string };
```

### Data Fetching Examples

```ts
const { data: projects } = useQuery({
  queryKey: ["advisory-projects", entityId, status, q],
  queryFn: () => fetch(`/api/advisory/projects?entity_id=${entityId}&status=${status||""}&q=${q||""}`).then(r=>r.json())
});
```

---

## 6) Integrations (no Settings page)

* **Calendly:** backend stores tokens/secrets in env or secure store; implement `/coffeechats/sync` and `/integrations/calendly/webhook`.
* **Legal docs (DocuSign or uploads):** onboarding step provider `docusign` with `config.template_id`, or `drive_upload` using existing Documents module; store `evidence_url` on completion.
* **Teams invites:** step provider `microsoft_teams` or `custom_url`; completion is manual in MVP.

---

## 7) Testing

**Backend (pytest)**

* projects CRUD w/ filters; students CRUD unique email; assignments add/remove; applications status flow & convert‑to‑student; coffeechats webhook upsert; onboarding instance progress; auth required.

**Frontend (Jest/RTL)**

* Projects list renders **student‑style cards**; ProjectDesigner shows live preview and persists create/edit.
* Students list/detail; Applications drawer actions; Coffeechats sync + list; Onboarding board updates step state.

---

## 8) Seed Data (dev)

Script `scripts/seed_ngiadvisory.py`:

* 2 example projects mirroring the screenshot (Panama Canal, Tesla/GM merger) with badges/tags/images and realistic dates.
* 3 students and 2 assignments.
* 3 applications (one targeted to each project).
* 2 coffee chats (scheduled + canceled).
* 1 onboarding template (NDA → Teams invite → W‑9) and an active instance for one student.

---

## 9) Definition of Done (Phase-1)

1. `/ngi-advisory/projects` shows card list; `+ New Project` opens designer; save/publish works; edit uses same drawer.
2. Students CRUD works; assignments manageable from project detail/designer.
3. Applications page operational with review drawer and convert/attach flows.
4. Coffeechats list + sync + webhook captured.
5. Onboarding templates & board operational with evidence links.
6. Access restricted to Whit & Andre at FE and BE layers.

---

Implementation Progress (2025-09-04)

- Backend: Added advisory router with admin guard; implemented projects (list/create/get/update/close), students (list/create/get/update/delete), applications (list/create/update), coffeechats (list + sync stub + Calendly webhook upsert), project assignments (add/update/delete), onboarding (templates CRUD, instances create/list, step status mark). Tables are created lazily via _ensure_tables for MVP.
- Frontend: Added pages under `apps/desktop/src/app/ngi-advisory/`:
  - `page.tsx` redirects to `/ngi-advisory/projects`.
  - `projects/page.tsx` shows card list with a lightweight designer drawer; create/edit persists to API; includes live preview.
  - `students/page.tsx` lists students with basic create/activate/archive actions.
- FE Access Gate: Both pages gate access to the allow-list `{lwhitworth, anurmamade}`.
- API Client: Added advisory helpers in `apps/desktop/src/lib/api.ts` and types in `apps/desktop/src/types/index.ts`.

Next Up

- Implement project detail route with AssignmentsPanel and per-project manage actions.
- Applications page with review drawer (convert-to-student, attach-to-project flows).
- Coffeechats UI with Sync action and webhook status.
- Onboarding board UI and template management minimal UX.
