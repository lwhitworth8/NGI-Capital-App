# UX Spec — Marketing Homepage (V1)

## Overview
- Route: `/` in apps/student
- Purpose: Drive sign-ins and explain programs with a modern, minimal visual language.
- Theme: Fixed on marketing route (ignore system theme). Blue-600 accents.

## Layout & Structure
1) Top Navbar (non-sticky)
   - Left: text logo/title `NGI Capital Advisory`
   - Right: inline links `[Advisory Projects] [Student Learning (Coming Soon)] [Student Incubator (Coming Soon)] [Sign In]`
   - Links (except Sign In) scroll to in-page anchors.
   - Spacing: 16px vertical, container max-width 1200px, 24px horizontal gutters.

2) Hero Section (ID: `hero`)
   - Height: min 70vh on desktop, 60vh on mobile
   - Headline: "Launch your [Experiences | Opportunities | Impacts] with NGI Capital Advisory"
   - Animated words: rotate every 3s; fade+slide (Y: 6–10px), easing `ease-out`, duration ~300ms; pause on prefers-reduced-motion.
   - Subcopy: One sentence as per PRD.
   - CTA: Primary button "Sign In" → `/sign-in`.
   - Background: solid black at top transitioning to blue gradient from bottom.

3) Secondary Navbar (sticky)
   - Appears below hero (ID: `subnav`).
   - Items: same as top-right (anchors only, excluding Sign In): `Advisory Projects`, `Student Learning (Coming Soon)`, `Student Incubator (Coming Soon)`
   - Sticky at top: `position: sticky; top: 0; z-index: header+1`.
   - Active underline: 2px, `blue-600`, animated width on hover; persistent underline for current section.
   - IntersectionObserver: update active based on section visibility threshold (0.5 viewport height).
   - Mobile: horizontally scrollable pill bar; `overflow-x-auto`, snap to items.

4) Sections
   - Advisory Projects (ID: `projects`) — light theme
     - Title: `Advisory Projects`
     - Lead paragraph: concise summary
     - Bulleted value props (see PRD copy)
   - Student Learning (ID: `learning`) — dark with top-origin blue gradient fading down
     - Title: `Student Learning (Coming Soon)`
     - Two short lines + 2–3 bullets
   - Student Incubator (ID: `incubator`) — light theme
     - Title: `Student Incubator (Coming Soon)`
     - Two short lines + 2–3 bullets

5) Footer
   - Left: `© {currentYear} NGI Capital, Inc.`
   - Right: links: Terms, Privacy (placeholders `#`), socials: LinkedIn/X/Instagram (placeholders `#`).
   - Font-size: 12–13px; border-top divider.

## Visual Design
- Colors
  - Background dark: `#0b0f14` to black; blue gradient with `blue-600` (#2563EB) at ~20–30% opacity overlays.
  - Text on dark: `text-white` for headings; `text-gray-300/400` for body.
  - Text on light: default `text-gray-800` for headings; `text-gray-600` for body.
- Typography
  - Use existing Inter; H1 36–48px desktop, 28–32px mobile; section H2 28–32px; paragraph 14–16px.
- Spacing
  - Section padding: 64–96px vertical desktop; 32–48px mobile.
- States
  - Links: hover underline (blue) with 200ms ease; focus ring around links/buttons for keyboard users.

## Motion & Reduced Motion
- Hero word animation: single-outgoing + single-incoming; use CSS transforms to avoid layout shift.
- prefers-reduced-motion: disable rotation (show first word only) and remove hover underline animation (keep static underline).

## Anchors & Scroll
- Anchor offsets: account for sticky subnav (~56–64px); use scroll-margin-top on section headers.
- Smooth scrolling: `scroll-behavior: smooth` or JS scroll with options.

## Telemetry (UI integration)
- On mount: POST marketing_view `{ route: '/', ts }`.
- On click of subnav/topnav anchor: POST nav_click `{ route: '/', sectionId, ts }` before scroll.
- On CTA click: POST cta_click `{ route: '/', label: 'sign_in', sectionId: <current>?, ts }`.

## Accessibility
- Focus indicator visible and non-obscured.
- Contrast: ensure AA for text on dark backgrounds.
- Keyboard: Tab order through header, nav items, CTA.
- aria-current on active subnav item; role="navigation" for nav bars.

## Responsive Breakpoints
- Mobile (≤640px): simplified top nav (title + Sign In); secondary nav horizontal scroll; larger vertical spacing between items.
- Tablet (641–1024px): two-column hero content if desired; otherwise single column with centered text.
- Desktop (≥1025px): centered hero content with max width; section grids optional but V1 is text-first.

## Copy (final V1 draft)
- Hero subcopy: “Hands-on programs designed for UC students to build real skills and join a network of partners, students, and projects.”
- Advisory Projects bullets (exact):
  - Institutional advisory experiences with real client work and impact
  - Partner mentorship and structured feedback
  - Client-ready deliverables, presentations, and references
  - Work on a team of passionate students leading these projects
  - Applications, interviews, and deliverables with clear timelines and expectations
- Learning lines: “Develop the real-world skills institutional investors require. Expand your knowledge to get ahead of the gap.”
- Incubator lines: “From governance and entity setup to accounting, tax, and planning. Builder-first guidance with a focus on meaningful, positive impact.”

## SEO
- `meta name="robots" content="noindex,nofollow"` on marketing route.

