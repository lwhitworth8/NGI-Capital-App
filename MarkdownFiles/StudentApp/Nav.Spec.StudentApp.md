# Student App – Navigation Spec

## 1) Top Navigation (Header)
- Projects: `/projects` (acts as home for students)
- Applications: `/applications` (Clerk-gated, signed-in)
- Learning: `/learning` (public, Coming Soon placeholder)
- My Projects: `/my-projects` (Clerk-gated; visible only when the student has at least one active project after onboarding)
- Account: Clerk user menu (Sign in / Sign out / Profile)

Notes
- Projects acts as the landing page for students after sign-in.
- Links respect dark/light theme and existing header components.
- Active route highlight applies to the current tab.
- Collapse to a menu on small screens.

## 2) Footer (Optional)
- Minimal footer; may include copyright and app version later.

## 3) Access Rules
- Public: Home, Projects, Learning (no gating)
- Signed-in only: Applications, My Projects
- Conditional visibility: My Projects appears when onboarding is complete and an active assignment exists.

## 4) Telemetry
- Track nav_click events with { route, position } for basic analytics.

