# PRD — Marketing Homepage (V1)

## 0) Context
- Goal: Drive sign-ins and clearly explain NGI Capital Advisory programs to UC undergraduates.
- Audience: UC undergrads (primary). Admins also use the same sign-in, but page content targets students.
- Placement: Student app marketing route at `/` (apps/student). The rest of the student app remains gated; no direct access to projects from marketing.

## 1) Objectives
- Maximize CTR to Sign In.
- Convey the value of Advisory Projects, Learning (Coming Soon), and Student Incubator (Coming Soon) succinctly.
- Maintain a modern, credible visual language (Bloomberg/Google/Apple-inspired) with minimal text-first presentation.

## 2) In Scope (V1)
- Hero with animated headline and fixed dark/blue gradient theme.
- Top navbar with left title and right actions (Sign In + section selectors) — link to in-page anchors only.
- Secondary navbar for section anchors; sticky behavior on scroll (only secondary nav is sticky).
- Sections (in order):
  1) Hero
  2) Advisory Projects
  3) Student Learning (Coming Soon)
  4) Student Incubator (Coming Soon)
  5) Footer (copyright, Terms/Privacy placeholders, social links placeholders)
- Single CTA: Sign In (routes to existing Clerk sign-in). No direct link to /projects.
- Telemetry: marketing_view, nav_click, cta_click using existing /api/public/telemetry/event endpoint.
- SEO: noindex, nofollow for the marketing page.
- Accessibility: color contrast and keyboard focus. Respect prefers-reduced-motion (pause/disable animations).

## 3) Out of Scope (V1)
- No partner logos or social proof.
- No separate marketing routes; all navigation is within-page anchors.
- No "Go to Projects" CTA for signed-in users (always show Sign In from marketing).
- No additional SEO/meta/sitemap.

## 4) Personas & Permissions
- Student: UC undergrad exploring opportunities. Unauthenticated; must sign in to access program content beyond marketing.
- Admin/Partner: May land here; uses same Sign In. After sign-in, existing auth flows route admin to Admin app.

## 5) Information Architecture
- Top Navbar (not sticky): Title left (“NGI Capital Advisory”); right: [Advisory Projects] [Learning] [Incubator] [Sign In]. Links are anchors within page (except Sign In).
- Hero: animated headline and one-sentence subcopy; Sign In primary button.
- Secondary Navbar (sticky): Same items as right-side selectors (excluding Sign In), with persistent blue underline on active section and hover underline; anchors scroll to sections with offset.
- Sections content (text-first, no icons):
  - Advisory Projects
  - Student Learning (Coming Soon)
  - Student Incubator (Coming Soon)
- Footer: auto-updating year; Terms/Privacy placeholders; social links placeholders.

## 6) Copy & Content
- Hero headline: “Launch your [Experiences | Opportunities | Impacts] with NGI Capital Advisory” (animated words rotate every ~3s with fade/slide; infinite loop).
- Hero subcopy (draft): “Hands-on programs designed for UC students to build real skills and join a network of partners, students, and projects.”
- CTA: “Sign In” → `/sign-in`.

- Advisory Projects (value props):
  - Institutional advisory experiences with real client work and impact
  - Partner mentorship and structured feedback
  - Client-ready deliverables, presentations, and references
  - Work on a team of passionate students leading these projects
  - Applications, interviews, and deliverables with clear timelines and expectations

- Student Learning (Coming Soon) (value props):
  - Develop the real-world skills institutional investors require
  - Expand your knowledge to get ahead of the gap
  - A student-first path from fundamentals to applied practice

- Student Incubator (Coming Soon) (value props):
  - From governance and entity setup to accounting, tax, and planning
  - Builder-first guidance with a focus on meaningful, positive impact
  - Capital introductions and future fund readiness

- Navigation labels (exact):
  - “Advisory Projects”
  - “Student Learning (Coming Soon)”
  - “Student Incubator (Coming Soon)”

## 7) Visual Design & Theming
- Fixed theme on marketing page only; do not respect system theme here.
- Hero background: top is solid black, transitioning into a blue gradient rising from the bottom, blending into black above (dark-to-blue from bottom). Next section is white. Alternate for following sections:
  - Projects: light (white)
  - Learning: dark with blue gradient starting at the top and fading downward into black
  - Incubator: light (white)
  - Any additional dark sections follow alternating gradient direction rules as above
- Primary blue: Tailwind `blue-600` (#2563EB).
- Typography: Use the existing default font used across apps (Inter).
- Underline highlight: consistent thickness/animation across both nav bars; persistent underline for active section; blue on hover.

## 8) Behavior & Interaction
- Navigation (both nav bars):
  - Anchors scroll smoothly to sections.
  - Secondary navbar becomes sticky once visible; top navbar remains non-sticky.
  - Active section indicator controlled via IntersectionObserver thresholds (e.g., 0.5 viewport height).
- CTA behavior: “Sign In” always routes to `/sign-in`; no links to `/projects` from marketing.
- Mobile: top navbar simplified (title + Sign In); secondary navbar is horizontally scrollable pill bar with underline hover/active states.
- Reduced motion: disable animation loop for users with prefers-reduced-motion.

## 9) Telemetry
- Endpoint: `POST /api/public/telemetry/event` (existing backend).
- Events:
  - `marketing_view` on page mount: `{ route: '/', ts }`.
  - `nav_click` on anchor click: `{ route: '/', sectionId, ts }`.
  - `cta_click` on “Sign In” click: `{ route: '/', label: 'sign_in', sectionId?: 'hero'|'projects'|'learning'|'incubator', ts }`.
- Privacy: No PII; backend accepts optional email from Clerk or header in dev but not required for marketing view.

## 10) Accessibility
- Color contrast meets WCAG AA.
- Focus styles visible for interactive elements.
- Keyboard navigable anchor links and buttons.
- Respect prefers-reduced-motion.

## 11) Performance
- Target LCP < 2.5s on broadband.
- Avoid layout shift; predefine heights where helpful.
- Defer non-critical JS; keep hero paint light.

## 12) Acceptance Criteria (summary)
- Fixed themed marketing page rendered at `/` with specified sections/order and alternating background rules.
- Anchor navigation with sticky secondary navbar and active blue underline.
- Animated hero words (3s, fade/slide) and reduced-motion fallback.
- Primary CTA “Sign In” routes to `/sign-in` and nowhere else.
- Telemetry events posted as specified.
- Noindex meta set on marketing page.
- A11y and mobile behaviors implemented as described.

## 13) Rollout
- No feature flag; go live once merged and deployed to Vercel.

## 14) Risks & Mitigations
- Animation performance → keep simple fade/slide and respect reduced motion.
- Sticky/nav overlap → use anchor offsets and z-index; test common breakpoints.
- No assets → rely on strong typography/spacing.

## 15) Success Metrics
- Sign-in CTR from marketing.
- Engagement: nav clicks per session.
- Dwell time on page (optional in future).

