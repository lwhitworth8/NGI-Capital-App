# Epics & Sprints — Marketing Homepage (V1)

## Epics
1) Information Architecture & Scaffolding
   - Define sections, anchors, routes, and theme boundaries.
2) Hero & Top Navbar
   - Build headline with animated rotating words; add Sign In CTA; non-sticky top nav.
3) Secondary Navbar (Sticky) & Anchors
   - Sticky behavior; active underline; IntersectionObserver active state; anchor offsets.
4) Advisory Projects Section Content
   - Finalize copy; light theme layout.
5) Student Learning Section (Coming Soon)
   - Dark/blue gradient; concise messaging.
6) Student Incubator Section (Coming Soon)
   - Light theme; concise messaging.
7) Footer & Links
   - Copyright; Terms/Privacy placeholders; social links placeholders.
8) Telemetry
   - marketing_view, nav_click, cta_click wiring.
9) Accessibility & Performance
   - Focus states, contrast checks; reduced-motion; LCP/CLS budget.
10) Testing & QA
   - Playwright E2E; a11y checks; responsive verification.
11) Release
   - No flag; go live on merge (Vercel).

## Sprint Plan (2 Sprints)

### Sprint 1 (Scaffold & Core UX)
- IA & Scaffolding (sections, anchors, theme wrapper)
- Top navbar + hero (animated words, CTA)
- Secondary navbar (sticky; anchor scrolling; active underline)
- Advisory Projects content (copy + layout)
- Telemetry events for view and clicks
- Initial responsive tweaks (mobile nav behavior)

Deliverables:
- Visible page with working anchors, hero animation, Sign In CTA
- marketing_view/nav_click/cta_click posting

### Sprint 2 (Polish, A11y, Tests, Release)
- Learning + Incubator sections
- Footer + noindex meta
- Accessibility pass (focus rings, aria-current)
- Performance polish (animations, LCP checks)
- Playwright E2E tests across breakpoints
- QA checklist run + Acceptance validation
- Merge and deploy

## Estimates (high level)
- Sprint 1: ~2–3 dev-days
- Sprint 2: ~2–3 dev-days

