# NGI Capital Advisory — Student Web App (Full Directions)

This document consolidates everything we’ve discussed into a single build pack for the **NGI Capital Advisory Student Web App**. Name this file `NGICapitalAdvisoryStudentWebApp.md` in your repo.

---

## 0) Objective

Deliver a **student‑facing portal** at **ngicapitaladvisory.com** that:

* Allows UC students (and later `@ngicapitaladvisory.com` accounts) to sign in via Gmail/Clerk.
* Restricts access to approved UC domains and `ngicapitaladvisory.com`.
* Lets students **browse/apply to projects**, **book coffee chats**, and **see their applications**.
* Once accepted, unlocks **My Projects** (workspace: Overview, Resources, Documents).
* Includes a placeholder **Learning Center** module for future content.
* Uses the **same UI/theme** as the Admin app.
* Runs alongside the internal Admin app, with **strict DB and storage isolation**.

---

## 1) Tech Stack

* Follow Same Tech Stack as NGI Capital APP

---

## 2) Repo Layout

```
/apps
  /admin      # Internal control app (Landon & Andre only)
  /student    # Student portal (UC + advisory users)
/packages
  /ui         # shared shadcn components + theme
  /db         # Prisma schemas/clients (advisory + core)
  /config     # tailwind, eslint, tsconfig
/docker
  docker-compose.yml
  Dockerfile.admin
  Dockerfile.student
  /nginx
    default.conf
```

---

## 3) Unified `.env`

At repo root:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
USE_MOCK_AUTH=false # true = offline demo

# Allowed domains
ALLOWED_EMAIL_DOMAINS=berkeley.edu,ucla.edu,ucsd.edu,uci.edu,ucdavis.edu,ucsb.edu,ucsc.edu,ucr.edu,ucmerced.edu,ngicapitaladvisory.com
PARTNER_EMAILS=whit@ngicapital.com,andres@ngicapital.com

# DB
POSTGRES_USER=ngi
POSTGRES_PASSWORD=ngi
ADVISORY_DATABASE_URL=postgresql://ngi:ngi@db:5432/advisory_db
CORE_DATABASE_URL=postgresql://ngi:ngi@db:5432/core_db

# Storage (MinIO local)
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=adminadmin
S3_ENDPOINT=http://minio:9000
ADVISORY_S3_BUCKET=advisory-docs
CORE_S3_BUCKET=core-docs
ADVISORY_S3_ACCESS_KEY_ID=admin
ADVISORY_S3_SECRET_ACCESS_KEY=adminadmin
CORE_S3_ACCESS_KEY_ID=admin
CORE_S3_SECRET_ACCESS_KEY=adminadmin

# URLs
NEXT_PUBLIC_STUDENT_BASE_URL=http://students.localhost
NEXT_PUBLIC_ADMIN_BASE_URL=http://admin.localhost

# Email (Mailpit local)
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_FROM=no-reply@ngicapitaladvisory.com
```

---

## 4) Databases & Prisma

* **Two DBs:** `advisory_db` (student/advisory ops), `core_db` (finance).
* Student app connects only to `advisory_db`.
* Admin app connects to both.

Prisma clients:

```ts
export const advisoryDb = new PrismaClient({
  datasources: { db: { url: process.env.ADVISORY_DATABASE_URL } },
});

export const coreDb = new PrismaClient({
  datasources: { db: { url: process.env.CORE_DATABASE_URL } },
});
```

Key advisory models: `User`, `Profile`, `Project`, `Application`, `ProjectMembership`, `Document`, `Resource`, `AuditLog`.

---

## 5) Auth & Middleware

### Student App Middleware

```ts
import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

const allowed = (process.env.ALLOWED_EMAIL_DOMAINS || '')
  .split(',')
  .map(s=>s.trim().toLowerCase());

export default function middleware(req: Request) {
  const { userId, sessionClaims } = auth();
  const url = new URL(req.url);
  if (!userId) return NextResponse.redirect(new URL('/sign-in', url.origin));
  const email = (sessionClaims?.email || '').toLowerCase();
  const domain = email.split('@')[1];
  if (!allowed.includes(domain)) return NextResponse.redirect(new URL('/blocked', url.origin));
  return NextResponse.next();
}
```

### Admin App Middleware

Restrict to `PARTNER_EMAILS`.

### Clerk Webhook (Admin)

Upsert student record in `advisory_db` when new UC email signs in.

---

## 6) Routing & IA

### Student Portal (ngicapitaladvisory.com)

```
/projects      → browse & detail; Apply; Coffee Chat
/applications  → my applications + status pipeline
/my-projects   → assigned projects; workspace tabs (Overview, Resources, Documents)
/learning      → placeholder
/settings      → profile + resume upload
/blocked       → non‑UC domain
```

### Admin App (/admin/advisory)

```
dashboard
projects        # create/edit; isPublic; coffeeChatCalendly
applications    # move stages; review
people
clients (MSA/SOW)
documents (NDAs/IAs via Documenso)
compliance
settings
```

---

## 7) Public API (Admin → Student)

* `GET /api/public/projects`
* `GET /api/public/projects/:id`
* `POST /api/public/applications`
* `GET /api/public/applications/mine`
* `GET /api/public/memberships/mine`

Backed only by `advisoryDb`. Student app calls same‑origin endpoints via nginx.

---

## 8) Storage Separation

* `advisory-docs` bucket for resumes, NDAs, student files.
* `core-docs` bucket for finance (never touched by Student app).

---

## 9) UI Specs

* **Nav:** Projects | Applications | My Projects (conditional) | Learning | Settings.
* **Projects:** card layout (use snapshot mockup), search/sort, detail page with Apply + Coffee Chat.
* **Applications:** list with status chips (NEW → COFFEE\_CHAT → INTERVIEW → OFFER → ONBOARDING → ACTIVE/COMPLETED/REJECTED).
* **My Projects:** tabs → Overview (SOW summary, deadlines), Resources (uploads/links), Documents (signed PDFs).
* **Learning:** placeholder MDX page.
* **Settings:** profile info + resume upload.

---

## 10) Docker Compose (Local)

Key services: `db` (Postgres), `minio` (S3), `mailpit` (SMTP), `admin`, `student`, `nginx`.

* Visit `http://localhost` → Student portal.
* Visit `http://localhost/admin/` → Admin app.

MinIO console: `http://localhost:9001` → create `advisory-docs` and `core-docs` buckets.

---

## 11) Workflow

1. Student logs in with UC Gmail → Clerk verifies domain → `/projects`.
2. Student applies → Application created in `advisory_db`.
3. Admin reviews in `/admin/advisory/applications`, advances stage.
4. Admin assigns student to project → `My Projects` appears.
5. Student sees project workspace with resources/docs.

---

## 12) Acceptance Checklist

* [ ] Only UC + advisory emails allowed on Student portal.
* [ ] Partners only allowed on Admin app.
* [ ] Student sign‑in creates record in `advisory_db`.
* [ ] Public projects appear in Student `/projects`; Apply works.
* [ ] Applications visible in Admin; stage changes reflected in Student `/applications`.
* [ ] Assignments create `My Projects` for Student.
* [ ] Separate DBs + buckets confirmed; Student never touches core data.

---

## 13) Future Enhancements

* Add Timesheets module (already modeled).
* Expand Learning center (videos, CMS).
* Add project feedback/retros.
* Harden auth with service‑to‑service JWTs.

---

**End of NGI Capital Advisory Student Web App build pack.**
