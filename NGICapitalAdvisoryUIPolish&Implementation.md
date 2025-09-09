# NGI Capital Advisory — UI Polish & Implementation Spec (Admin + Student, 2025 Standard)

> **Hotfix addendum (auth & routing):** Fixes the bug where partner emails (e.g., `lwhitworth@ngicapitaladvisory.com`) get routed to the Student app, and enables **Email + Password** alongside Google sign‑in in Clerk. These instructions are additive to the spec below and should be implemented first.

---

## A) Critical Auth & Routing Fixes (apply before UI work)

### A.1 Clerk configuration

1. In **Clerk Dashboard → Authentication → Email, Phone, Username**:

   * Enable **Email Address** as an identifier.
   * Enable **Email + Password** sign‑in (in addition to OAuth).
2. In **Clerk Dashboard → Social Connections**: keep **Google** enabled.
3. In **Clerk Dashboard → Organization/Users**:

   * Add `publicMetadata.role` default = `STUDENT` for new users (Clerk rule or set in webhook below).
4. In **Clerk Dashboard → Redirect URLs**: add both

   * `https://ngicapitaladvisory.com/*`
   * `https://admin.ngicapitaladvisory.com/*`
5. In **Clerk Dashboard → Webhooks**: point to the Admin endpoint `/api/webhooks/clerk` (see A.4). Ensure secret is set.

### A.2 Role & partner resolution (source of truth)

* **Partners list**: from env `PARTNER_EMAILS` (comma-separated). Example: `whitworth@ngicapitaladvisory.com,andres@ngicapitaladvisory.com`.
* **Role assignment**:

  * If email ∈ `PARTNER_EMAILS` → set `role = PARTNER_ADMIN`.
  * Else → `role = STUDENT`.
* Save role to both **Clerk `publicMetadata.role`** and **`advisory_db.User.roles`**.

### A.3 Post sign‑in redirect (unified logic)

Set Clerk components to use `afterSignInUrl="/auth/resolve"` and `afterSignUpUrl="/auth/resolve"` in **both apps**. Implement a shared resolver route that sends users to the correct app based on role.

```ts
// apps/*/src/app/auth/resolve/route.ts
import { auth, currentUser } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.redirect('/sign-in');
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || '';
  const role = (user?.publicMetadata?.role as string) || 'STUDENT';
  const partners = (process.env.PARTNER_EMAILS||'').split(',').map(s=>s.trim().toLowerCase());
  const isPartner = partners.includes(email) || role === 'PARTNER_ADMIN';

  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || '/admin';
  const studentUrl = process.env.NEXT_PUBLIC_STUDENT_BASE_URL || '/';

  return NextResponse.redirect(isPartner ? adminUrl : studentUrl);
}
```

> This guarantees both Email+Password and Google sign‑ins funnel to the right host.

### A.4 Clerk webhook (role upsert)

```ts
// apps/admin/src/app/api/webhooks/clerk/route.ts
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { advisoryDb } from '@ngi/db/clients';

export async function POST(req: Request) {
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  const payload = await req.text();
  const h = Object.fromEntries(headers());
  const evt = wh.verify(payload, {
    'svix-id': h['svix-id']!,
    'svix-timestamp': h['svix-timestamp']!,
    'svix-signature': h['svix-signature']!,
  }) as any;

  if (evt.type === 'user.created' || evt.type === 'user.updated') {
    const email = evt.data.email_addresses?.[0]?.email_address?.toLowerCase();
    const partners = (process.env.PARTNER_EMAILS||'').split(',').map((s:string)=>s.trim().toLowerCase());
    const role = partners.includes(email) ? 'PARTNER_ADMIN' : 'STUDENT';

    await advisoryDb.user.upsert({
      where: { clerkId: evt.data.id },
      create: { clerkId: evt.data.id, email, roles: [role], profile: { create: {} } },
      update: { email, roles: [role] },
    });
  }
  return new Response('ok');
}
```

### A.5 Middleware fixes to prevent cross‑app leakage

**Student app** — block partners from ever landing on Student host and reroute to Admin:

```ts
// apps/student/src/middleware.ts
import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

const allowed = (process.env.ALLOWED_EMAIL_DOMAINS||'').split(',').map(s=>s.trim().toLowerCase());
const partners = (process.env.PARTNER_EMAILS||'').split(',').map(s=>s.trim().toLowerCase());

export default function middleware(req: Request) {
  const { userId, sessionClaims } = auth();
  const url = new URL(req.url);
  if (!userId) return NextResponse.redirect(new URL('/sign-in', url.origin));

  const email = (sessionClaims?.email || sessionClaims?.primaryEmail || '').toLowerCase();
  if (partners.includes(email)) {
    // hard reroute partners to admin
    return NextResponse.redirect(process.env.NEXT_PUBLIC_ADMIN_BASE_URL || 'https://admin.ngicapitaladvisory.com');
  }
  const domain = email.split('@')[1];
  if (!allowed.includes(domain)) return NextResponse.redirect(new URL('/blocked', url.origin));
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next|api/(public|webhooks)|favicon.ico).*)'] };
```

**Admin app** — enforce partners only; students hitting admin are pushed to Student host:

```ts
// apps/admin/src/middleware.ts
import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

const partners = (process.env.PARTNER_EMAILS||'').split(',').map(s=>s.trim().toLowerCase());

export default function middleware(req: Request){
  const { userId, sessionClaims } = auth();
  const url = new URL(req.url);
  if (!userId) return NextResponse.redirect(new URL('/sign-in', url.origin));
  const email = (sessionClaims?.email || '').toLowerCase();
  if (!partners.includes(email)) {
    return NextResponse.redirect(process.env.NEXT_PUBLIC_STUDENT_BASE_URL || 'https://ngicapitaladvisory.com');
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next|api/(public|webhooks)|favicon.ico).*)'] };
```

### A.6 Custom Sign‑in pages (support Google + Email/Password)

Use Clerk’s `<SignIn />` but expose both strategies and set `afterSignInUrl` to `/auth/resolve`.

```tsx
// apps/student/src/app/sign-in/page.tsx (similar in admin)
import { SignIn } from '@clerk/nextjs';
export default function Page(){
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <SignIn
        appearance={{ elements: { card: 'shadow-lg rounded-2xl' } }}
        signUpUrl="/sign-up"
        afterSignInUrl="/auth/resolve"
        afterSignUpUrl="/auth/resolve"
      />
    </div>
  );
}
```

If you need a **fully custom form** for Email+Password (while keeping Google):

* Use Clerk **Password** strategy APIs (`create sign in`, `attempt first factor`, `attempt second factor`).
* Keep the Google button via `<SignInButton />`.

### A.7 Dev‑only Auth Debug Banner

Add a small banner in dev that shows `email`, `role`, and `host` to quickly spot misroutes. Hide in production.

### A.8 Tests (must pass)

* Sign in via **Google** with partner email → lands on **Admin**.
* Sign in via **Email+Password** with partner email → lands on **Admin**.
* Sign in via **Google** with UC email → lands on **Student**.
* Sign in via **Email+Password** with UC email → lands on **Student**.
* Visiting Student host as partner redirects to Admin; visiting Admin host as student redirects to Student.

---

This spec upgrades both **Student** and **Internal Admin** apps to a polished, deployment‑ready experience. It’s written for an LLM agent to implement directly. Keep the split‑DB + unified `.env` + Docker setup from earlier docs.

---

## 0) Global Design System

**Libraries**: Next.js (App Router), Tailwind, shadcn/ui, lucide-react, framer-motion, react-hook-form, zod, TanStack Table.

**Tokens**

* Radius: `rounded-2xl` for cards, `rounded-xl` for inputs.
* Shadows: `shadow-sm`, elevated surfaces use `shadow-lg` with subtle `ring-1 ring-border`.
* Spacing scale: 4/6/8/12/16/24/32.
* Color: use shadcn theme; semantic chips for statuses (info, success, warning, destructive).
* Typography: Inter for UI, 11/13/14/16/18/24/32 sizes; `font-medium` headings.

**Motion** (Framer Motion)

* Page fade: 80ms in, 80ms out.
* List/card entrance: stagger 30ms.
* Button tap: scale 0.98.

**Accessibility**

* WCAG 2.2 AA: contrast ≥ 4.5:1.
* Focus rings: `focus-visible:ring-2 ring-primary`.
* Hit targets ≥ 44px, labels for inputs, `aria-live` toasts.

---

## 0.1 Critical Auth & Routing Fixes (Clerk + multi-app)

> These changes fix the issues where **partner admin emails** (e.g., `lwhitworth@ngicapitaladvisory.com`) are being routed to the **Student** app and where **email/password sign in** fails.

### A) Split access rules by app

* **Student app** must only admit **UC domains**. Remove `ngicapitaladvisory.com` from the student allowlist to prevent partner/admin collisions.
* **Admin app** admits only `PARTNER_EMAILS` (exact list). If staff need student-portal access, provision a separate student account or add a non-partner email.

### B) Clerk configuration

1. In **Clerk Dashboard → Authentication → Email, Phone, Username**:

   * Enable **Email + Password**.
   * Allow **Google OAuth**.
   * Disable other providers.
2. In **Clerk Dashboard → Redirect URLs** add both:

   * `https://ngicapitaladvisory.com/*` (Student)
   * `https://admin.ngicapitaladvisory.com/*` (Admin) or your admin domain.
3. In **Clerk Dashboard → Webhooks**, point to Admin: `/api/webhooks/clerk` (already in spec).

### C) Student app domain allowlist (middleware)

```ts
// apps/student/src/middleware.ts
import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

const allowed = (process.env.ALLOWED_EMAIL_DOMAINS || '')
  .split(',')
  .map(s=>s.trim().toLowerCase())
  .filter(Boolean);

export default function middleware(req: Request) {
  const { userId, sessionClaims } = auth();
  const url = new URL(req.url);
  if (!userId) return NextResponse.redirect(new URL('/sign-in', url.origin));
  const email = (sessionClaims?.email || sessionClaims?.primaryEmail || '').toLowerCase();
  const domain = email.split('@')[1];
  if (!domain || !allowed.includes(domain)) {
    return NextResponse.redirect(new URL('/blocked', url.origin));
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next|api/(public|webhooks)|favicon.ico).*)'] };
```

> **Update your `.env`**: `ALLOWED_EMAIL_DOMAINS` should include **only UC domains**.

### D) Admin app partner allowlist (middleware)

```ts
// apps/admin/src/middleware.ts
import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

const partners = (process.env.PARTNER_EMAILS||'')
  .split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);

export default function middleware(req: Request){
  const { userId, sessionClaims } = auth();
  const url = new URL(req.url);
  if (!userId) return NextResponse.redirect(new URL('/sign-in', url.origin));
  const email = (sessionClaims?.email || '').toLowerCase();
  if (!partners.includes(email)) return NextResponse.redirect(new URL('/', url.origin));
  return NextResponse.next();
}
export const config = { matcher: ['/admin/:path*'] };
```

### E) Post-auth smart redirects (edge-safe)

* Add a **shared util** to compute where a user belongs after sign-in:

```ts
// packages/ui/src/auth/redirects.ts
export function getPostAuthUrl(email: string){
  const partners = (process.env.PARTNER_EMAILS||'')
    .split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  const ucDomains = (process.env.ALLOWED_EMAIL_DOMAINS||'')
    .split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  const domain = email.split('@')[1];
  if (partners.includes(email)) return process.env.NEXT_PUBLIC_ADMIN_BASE_URL || '/admin';
  if (ucDomains.includes(domain)) return process.env.NEXT_PUBLIC_STUDENT_BASE_URL || '/';
  return '/blocked';
}
```

* Use it on sign-in pages for both apps via Clerk’s `afterSignInUrl`/`afterSignUpUrl`:

```tsx
// apps/student/src/app/sign-in/page.tsx (similar in admin)
<SignIn
  routing="path"
  appearance={{ elements: { card: 'shadow-lg rounded-2xl' } }}
  afterSignInUrl={(url, ctx) => getPostAuthUrl(ctx?.user?.primaryEmailAddress?.emailAddress ?? '')}
  afterSignUpUrl={(url, ctx) => getPostAuthUrl(ctx?.user?.primaryEmailAddress?.emailAddress ?? '')}
/>
```

### F) Email + Password sign-in reliability

* Ensure **Email + Password** is enabled (see B1).
* Add `ClerkProvider` at app root with `signInUrl` pointing to your custom `/sign-in` route.
* Verify SMTP sender domain in Clerk (or use magic links temporarily if email sending is blocked in dev).
* Add client‑side validation and clear error surfaces (invalid credentials, unverified email).

### G) Guard against cross-app leakage

* Student middleware should **redirect partner emails to `/blocked`** (or a message linking to Admin URL) to avoid being stuck on student routes.
* Admin middleware blocks everyone except partners; no student can stumble into admin.

---

## 1) Theming & Preferences (both apps)

### 1.1 Theme toggle (light/dark)

* Use `next-themes` with `ThemeProvider attribute="class" defaultTheme="system"`.
* Store user’s choice in `User.profile.theme` and Clerk `publicMetadata.theme` when available.
* Add a **Theme Switcher** in the global header menu and in **Settings**.

**Acceptance**: toggling persists across sessions and devices.

### 1.2 Settings → Resume upload

* Add to Student **Settings** page (and optionally Admin profile):

  * Current resume (filename + uploaded date) + **Replace**/**Remove**.
  * Upload component (drag‑drop + click). Limit: PDF only, ≤ 10MB.
  * Store at `advisory-docs/users/{userId}/resume-{timestamp}.pdf`.
  * Keep latest pointer in `Profile.resumeUrl`.

**Validation**: file type, size, virus-scan hook placeholder.

---

## 2) Student App (ngicapitaladvisory.com)

### 2.0 Layout

* Left nav: **Projects**, **Applications**, **My Projects** (conditional), **Learning**, **Settings**. Avatar + theme toggle in top bar.
* Show breadcrumbs and PageHeader with primary CTA on each page.
* Use `Container max-w-[1200px] mx-auto px-4 md:px-6` layout.

### 2.1 Projects (Browse)

**Header**: title, description, `Search`, `Sort (Newest, Name)`, `Filter tags`, and chips for active filters.

**Card** (grid ≥ 3 columns desktop):

* Hero image (16:9) or generated gradient if missing.
* Title, client chip, summary (2 lines clamp), tags.
* Meta row: Duration, Hours/week, Start date.
* Actions: **View**, **Apply** (if open), **Coffee Chat** (if Calendly set).

**Project Detail**

* Hero banner with client chip, title, and quick meta.
* Right rail sticky card: **Apply** button, Coffee Chat signup (Calendly embed), key details.
* Sections: Overview, Responsibilities, What you’ll learn, Commitment, Leads, Eligibility.
* Footer CTA repeats Apply.

**Apply Modal**

* Fields: Why interested?, Relevant skills, Availability, Resume (prefill if on file), Additional questions per project.
* Submit → success toast → route to **/applications**.

**Empty/Loading States**

* Skeleton cards (6) while loading.
* Empty state: illustration + "No open projects yet" + "Sign up for a coffee chat" CTA.

**Acceptance**: search/sort/filter work together; Apply shows within 150ms; keyboard accessible.

### 2.2 Applications (My Applications)

**Views**: default Table with optional Card view toggle.

**Columns**: Project, Stage (chip), Updated, Actions.

* Actions: View application (drawer with answers), Withdraw (if in NEW/Coffee Chat), Open Project.

**Stage chips**

* NEW (gray), COFFEE\_CHAT (indigo), INTERVIEW (blue), OFFER (amber), ONBOARDING (teal), ACTIVE (green), COMPLETED (green outline), REJECTED (red outline).

**Empty state**

* Card with big CTA: “You haven’t applied yet — **Explore projects**”.

**Acceptance**: updates reflect within 2s after admin change (SWR revalidation or server actions).

### 2.3 My Projects (Workspace)

**Card list** of current memberships. Click opens Workspace.

**Workspace Tabs**

1. **Overview**: SOW summary, deliverables checklist, deadlines timeline, team contacts (lead + mentor), quick links.
2. **Resources**: grid of files/links with tags (PDF, Sheet, Link). Upload if allowed. Click opens new tab.
3. **Documents**: NDA/IA/IP status cards; download links when completed.

**Gates**: If NDA/IA incomplete → banner with steps.

**Acceptance**: Only assigned students can view; 404 otherwise.

### 2.4 Learning (Coming Soon)

* Hero with illustration and copy: “NGI Learning Center — Coming Soon”.
* Subtext: “Foundations of M\&A, PE/VC, valuation, and diligence. Launching Q4.”
* CTA: “Notify me when live” (stores interest on user profile).
* Secondary: 3 curated links (safe evergreen articles) as placeholders.

### 2.5 Settings

* **Profile card**: Name, School (dropdown), LinkedIn URL, Email (read-only from Clerk).
* **Resume card**: upload/replace as §1.2.
* **Theme card**: Light / Dark / System radio group (uses next-themes).
* Save/Cancel with dirty-state detection.

---

## 3) Internal Admin App (Advisory module)

### 3.0 Advisory Dashboard (Home)

* **KPI cards**: Active Projects, Active Students, Pending Applications, Coffee Chats (7d).
* **Pipeline widget**: bar showing counts by stage.
* **Approvals queue**: top 10 items needing attention (e.g., onboarding docs).
* **Recent activity**: audit log list.
* **Quick actions**: + New Project, Import Students, Create Onboarding.

### 3.1 Projects

**Index**: search, filters (Client, Status), table with \[Name, Client, Lead, Status, Start–End, Actions]. Empty state CTA.

**Create / Edit (Wizard)**

* Step 1 — Basics: Name, Client, Summary, Mode (Remote/Hybrid/In‑person), Dates, Hours/week, Lead.
* Step 2 — Details: Description (MDX), Eligibility notes, Tags.
* Step 3 — Student Portal: hero image, `isPublic`, `allowApplications`, `coffeeChatCalendly`.
* Right panel: **Live Student Preview**.
* Save as Draft or Publish. Publishing validates required fields.

**Acceptance**: Publish toggles visibility in Student portal instantly.

### 3.2 Students

* Table with \[Name, Email, School, Status, Projects, Actions].
* Filters: School, Status (Prospect/Active/Alumni).
* **Profile drawer**: identity, resume preview, memberships (add/remove), documents (send NDA/IA), notes.
* **Bulk import**: CSV or Clerk sync.

### 3.3 Applications

**Dual view**: Table and Kanban.

* **Table**: columns \[Name, Email, School, Project, Stage, Applied, Actions]. Inline stage dropdown + “Advance” button.
* **Kanban**: columns per stage; drag and drop.
* Application drawer shows candidate answers, resume, and quick actions: invite to Coffee Chat, schedule interview, move stage, reject with reason.

### 3.4 Coffee Chats

* Integrate with Calendly/Google. “Sync” fetches events into `CoffeeChat` rows.
* Table: Invitee, Email, Start, End, Status, Provider, Project, Notes.
* Actions: Mark completed/no‑show, add notes, open calendar event.

### 3.5 Onboarding

* **Templates**: e.g., “Standard Unpaid Intern (CA)”. Steps: NDA, IA, Policy ack, Resume on file, Mentor assigned.
* Start Onboarding: select student + template (+ optional project). Creates an instance with checklist.
* Table: Student, Template, Status, Steps (x/y), Actions (View, Nudge, Cancel).
* Instance view: progress tracker with step cards; each step links to action (send NDA → Documenso, etc.).

---

## 4) Shared Reusable Components (build once)

### 4.1 `PageHeader`

Props: `title`, `subtitle?`, `primaryCta?`, `secondaryCta?`.

### 4.2 `EmptyState`

Props: `icon`, `title`, `message`, `ctaLabel`, `onCta`, `secondaryCta?`.
Use on every empty table/list.

### 4.3 `StatusChip`

Variant: `new | info | success | warning | destructive | outline` with color mapping.

### 4.4 `FormWizard`

Controls stepped forms (Projects create/edit). Shows progress dots, can save draft.

### 4.5 `Uploader`

Drag‑drop + click; accepts `accept`, `maxSizeMB`, `destKeyBuilder(user)`. Shows progress, error toasts.

### 4.6 `DataTable`

TanStack wrapper with column filters, global search, column visibility, CSV export, row selection, pagination.

---

## 5) Implementation Tasks (LLM checklist)

1. **Install & configure next-themes**; add theme provider at app root; add header switcher + Settings radio group; persist to DB/Clerk.
2. **Build Settings page** (Student): Profile, Resume, Theme cards with RHF + zod.
3. **Projects (Student)**: list/grid/cards; detail with right rail; Apply modal; skeleton/empty states.
4. **Applications (Student)**: table with chips, drawer for details, empty CTA, SWR revalidate.
5. **My Projects (Student)**: workspace tabs with Overview/Resources/Documents; gates for NDA/IA.
6. **Learning (Student)**: Coming Soon hero with notify-me toggle.
7. **Admin Dashboard**: KPIs, pipeline bar, approvals queue, activity feed, quick actions.
8. **Admin Projects**: wizard form + live preview; index table; publish/draft.
9. **Admin Students**: table + profile drawer + bulk import.
10. **Admin Applications**: table + Kanban; drawer actions.
11. **Admin Coffee Chats**: provider sync + table + actions.
12. **Admin Onboarding**: templates + instance progress.
13. **Build shared components**: PageHeader, EmptyState, StatusChip, FormWizard, Uploader, DataTable.
14. **Instrumentation**: toast system, loading/skeletons, error boundaries.

---

## 6) UX Copy (examples)

* Projects empty: “No open projects yet. Check back soon or book a coffee chat to learn more.”
* Applications empty: “Apply to your first project to get started.”
* Learning: “NGI Learning Center — Coming Soon. Want early access? Toggle notifications above.”
* Onboarding step labels: “Sign NDA”, “Sign Internship Agreement”, “Upload Resume”, “Acknowledge Policies”, “Mentor Assigned”.

---

## 7) QA & Acceptance (ship list)

**Cross‑app**

* Theme toggle persists and updates on reload.
* All tables have search, filter, empty state, and CSV export where relevant.
* All actions have success/error toasts.

**Student**

* Projects: apply flow works; Coffee Chat visible when set; empty/skeleton nice.
* Applications: stage changes reflect within 2s.
* My Projects: unauthorized users blocked; NDA/IA gate works.
* Settings: resume replace works; theme select persists.
* Learning: page renders; notify-me saves preference.

**Admin**

* Projects publish toggles student visibility instantly.
* Applications draggable in Kanban & inline stage update works.
* Coffee Chats sync creates rows; status/actions work.
* Onboarding templates can be created and instances progress correctly.

**Performance**

* Lighthouse ≥ 85 on desktop for student pages.
* Images lazy‑load; CLS < 0.02; TTI < 2.5s.

**Accessibility**

* Keyboard navigable; focus visible; labels/aria on forms; Axe reports no critical issues.

---

## 8) Notes for the Agent

* Keep code split by route; colocate components under each route’s folder.
* Use server actions where possible; otherwise SWR for revalidation.
* All forms: RHF + zod; show field‑level errors and a summary.
* Use **feature flags** to hide not‑ready tabs; ship the polished core first (Projects/Applications).

---

**End of UI Polish & Implementation Spec.**
