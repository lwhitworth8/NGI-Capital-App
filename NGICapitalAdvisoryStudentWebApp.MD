# NGI Capital Advisory — Split‑DB Architecture & Student App Build Pack (v1)

**Goal:** Ship a production‑ready Student Portal at **ngicapitaladvisory.com** with strict separation from the internal NGI Capital app and its financial systems. Use **separate databases, buckets, and deployments** from day one; integrate via minimal, audited interfaces only.

---

## 0) High‑Level Architecture

* **Two completely separate apps**

  * **Internal Admin App** (Landon & Andre only) — current NGI Capital control app, private domain (e.g., `https://admin.ngicapital.app`).
  * **Student Portal** — public UC‑only portal at **[https://ngicapitaladvisory.com](https://ngicapitaladvisory.com)**.

* **Two separate databases**

  * `advisory_db` (Student + Advisory operations data): projects, applications, memberships, timesheets (future), documents metadata for interns, client SOW/MSA references.
  * `core_db` (Finance & everything else): financials, accounting, investors, sensitive corp data.

* **Zero direct DB access across apps**

  * No cross‑database queries. Integration ONLY through **service APIs + webhooks** with strict auth.

* **Separate storage**

  * S3/R2 buckets: `advisory-docs` (intern NDAs, IAs, resumes) vs `core-docs` (finance docs). Distinct keys and IAM credentials.

* **Shared identity provider**

  * One **Clerk** instance for convenience, but different **access guards**:

    * Student Portal: UC domains allowlist.
    * Admin App: partner allowlist + role = `PARTNER_ADMIN`.

* **Network & secrets**

  * Separate Vercel projects, separate env vars, separate API keys. Optional: VPC peering later.

---

## 1) Data Ownership & Interfaces

**System of Record (SoR)**

* Student/Advisory entities (Project, Application, Membership, Student Profile) live in `advisory_db`.
* Finance entities live in `core_db`.

**Interfaces (minimal)**

1. **Clerk webhook → Admin App**: Upserts users in `advisory_db` (role STUDENT) when a UC email logs into Student Portal. (Admin app hosts the webhook but writes to `advisory_db`.)
2. **Admin API → Student App (read‑only)**: Student app reads public projects and the student’s own entities via its own backend connected to `advisory_db`.
3. **No push from Student App into core**: If the internal app needs advisory data (e.g., aggregate counts), expose a **read‑only /reports API** from the advisory service, never grant DB creds.

Optional (later): event bus (Inngest/QStash) to replicate narrow facts (e.g., "application.created"). For v1, webhooks + direct API calls are enough.

---

## 2) Domains & Deployments

* **Student Portal**: `https://ngicapitaladvisory.com` (Next.js App Router)
* **Internal Admin**: keep current domain (e.g., `https://admin.ngicapital.app`)
* Separate Vercel projects and Git envs.

---

## 3) Environment Setup

### Student Portal `.env`

```
NEXT_PUBLIC_APP_NAME="NGI Capital Advisory — Student Portal"
NEXT_PUBLIC_BASE_URL="https://ngicapitaladvisory.com"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
ALLOWED_EMAIL_DOMAINS="berkeley.edu,ucla.edu,ucsd.edu,uci.edu,ucdavis.edu,ucsb.edu,ucsc.edu,ucr.edu,ucmerced.edu"
DATABASE_URL=postgresql://.../advisory_db
S3_BUCKET=advisory-docs
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

### Internal Admin `.env`

```
NEXT_PUBLIC_APP_NAME="NGI Capital Admin"
NEXT_PUBLIC_BASE_URL="https://admin.ngicapital.app"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
PARTNER_EMAILS="whit@...,andres@..."
DATABASE_URL=postgresql://.../advisory_db   # Admin also connects to advisory_db for ops
CORE_DATABASE_URL=postgresql://.../core_db   # Finance only; never exposed to Student app
CORE_S3_BUCKET=core-docs
```

> Admin app has **two** DB connections: `advisory_db` (to manage advisory ops) and `core_db` (finance). Student portal uses **only** `advisory_db`.

---

## 4) Advisory Schema (lives in `advisory_db`)

Use the previously approved schema (Projects, Applications, Memberships, Documents, etc.) — unchanged, but ensure NO finance tables reside here. Add these fields for portal UX:

```prisma
model Project {
  id          String   @id @default(cuid())
  name        String
  clientName  String
  description String
  isPublic    Boolean  @default(true)
  allowApplications Boolean @default(true)
  coffeeChatCalendly String?
  // relations (applications, memberships, resources, documents)
}

model User { id String @id @default(cuid()); clerkId String @unique; email String @unique; roles Role[]; profile Profile?; /* ... */ }
```

---

## 5) Student Portal (ngicapitaladvisory.com)

### Routes

```
/              → redirect to /projects after sign‑in
/projects      → browse & detail; apply; coffee chat signup
/applications  → my applications + statuses
/my-projects   → appears once assigned (workspace tabs: Overview, Resources, Documents)
/learning      → placeholder v1
/settings      → profile & resume upload
/blocked       → shown for non‑UC domains
```

### Auth Guards (Clerk + middleware)

* Force Google OAuth; allow only UC domains (middleware deny list). See snippet in prior build pack.

### Data Flow

* Read projects/applications/memberships from **advisory\_db**.
* On first sign‑in, Clerk webhook in **Admin app** upserts student into `advisory_db`.

### UI

* Same shadcn theme/components as internal app; left nav with avatar + Settings.

---

## 6) Internal Admin App Additions

* **Advisory module** continues to be the single management surface for Projects, Applications, Assignments, Documents.
* Admin app reads/writes **only** to `advisory_db` for this module; financial modules continue to use `core_db`.
* Expose a minimal **read‑only public API** (behind Clerk + service token) that the Student app can call:

  * `GET /api/public/projects` (public list)
  * `GET /api/public/projects/:id`
  * `POST /api/public/applications` (create for current student)
  * `GET /api/public/applications/mine`
  * `GET /api/public/memberships/mine`

> These are *separate* from internal admin routes. They operate strictly in `advisory_db`.

---

## 7) Storage Separation

* Student uploads (resumes, signed NDAs) → `advisory-docs` bucket, with IAM scoped to Student app keys.
* Finance docs → `core-docs` bucket, with IAM scoped to Admin app keys.
* No key reuse between apps; rotate quarterly.

---

## 8) Security Defaults (v1‑appropriate)

* **Least privilege**: Student app service account can only `SELECT/INSERT/UPDATE` the subset of tables it owns in `advisory_db`.
* **No cross‑origin API**: each app serves its own API; no CORS except same‑origin.
* **Audit**: write advisory audit logs to `advisory_db.AuditLog` on state changes.
* **Rate limits**: basic rate limiting on application submission endpoint.
* **Secrets**: never share env vars across the two Vercel projects.

---

## 9) Build Tasks (agent checklist)

1. **Provision databases**: `core_db` (existing), `advisory_db` (new). Apply Prisma schema to `advisory_db`.
2. **Create S3/R2 buckets**: `advisory-docs` and `core-docs`; generate distinct IAM users/keys.
3. **Set up domains**: point `ngicapitaladvisory.com` → Student Portal; keep Admin on its private domain.
4. **Student Portal scaffold**: Next.js app with routes above, shared UI package, Clerk auth + domain allowlist middleware.
5. **Admin public API** (read‑only for Student portal): implement endpoints above, backed by `advisory_db` only.
6. **Clerk webhook** in Admin app: upsert student users into `advisory_db` on sign‑in/update.
7. **Project publish flow** in Admin app: add fields `isPublic`, `allowApplications`, `coffeeChatCalendly`.
8. **Student application flow**: submit → record in `advisory_db` → visible in Admin → Applications; stages managed by Admin only.
9. **Membership assignment**: when Admin assigns, Student portal reveals `/my-projects` and workspace.
10. **Learning placeholder**: simple page with curated links (MDX) under `/learning`.
11. **Testing** with `lwhitworth@berkeley.edu`: validate redirect, record creation, project visibility, application round‑trip, membership visibility.
12. **Deploy**: separate Vercel projects; set envs; sanity tests; enable HTTPS.

---

## 10) Acceptance Criteria

* Student portal accessible only to allowed UC domains at **ngicapitaladvisory.com**.
* Student sign‑in creates/updates a record in `advisory_db`; visible in Admin → People.
* Public projects from Admin (`isPublic=true`) appear in Student `/projects`; detail includes coffee chat signup.
* Applications from Student show instantly in Admin; stage updates reflect back on `/applications`.
* Assigning a student to a project in Admin reveals `/my-projects` workspace in Student.
* No credentials or network path from Student app to `core_db` or `core-docs`.
* Separate buckets and IAM keys confirmed.

---

## 11) Future Hardening (post‑pitch)

* Service‑to‑service authentication (JWT with short TTL) for Admin public API.
* Row‑level security (RLS) in Postgres for Student app.
* Event bus (Inngest) for audit/replication.
* WAF on both domains; IP allowlisting for Admin.

---

## 12) Quick Snippets

### Student portal middleware (domain allowlist)

```ts
// apps/student/src/middleware.ts
import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
const allowed = (process.env.ALLOWED_EMAIL_DOMAINS||'').split(',').map(s=>s.trim());
export default function middleware(req: Request){
  const { userId, sessionClaims } = auth();
  const url = new URL(req.url);
  if (!userId) return NextResponse.redirect(new URL('/sign-in', url.origin));
  const email = (sessionClaims?.email ?? sessionClaims?.primaryEmail ?? '').toLowerCase();
  const domain = email.split('@')[1];
  if (!allowed.includes(domain)) return NextResponse.redirect(new URL('/blocked', url.origin));
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next|api/(public|webhooks)|favicon.ico).*)'] };
```

### Admin: publishable project fields

```ts
// in Admin project form
isPublic: boolean; allowApplications: boolean; coffeeChatCalendly?: string
```

---

**Ship the Student Portal on `ngicapitaladvisory.com` using `advisory_db`, keep finance in `core_db`, and integrate via the thin Admin public API + Clerk webhooks.**
