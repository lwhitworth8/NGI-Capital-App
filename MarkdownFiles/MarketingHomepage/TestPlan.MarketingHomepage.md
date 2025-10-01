# Test Plan — Marketing Homepage (V1)

## Scope
End-to-end behaviors for marketing page at `/`, including hero, nav, anchors, sticky subnav, CTA, telemetry, a11y, and responsive layouts.

## Environments
- Local dev via Docker/Nginx (http://localhost:3001)
- Staging/Preview on Vercel

## Browsers & Viewports
- Chromium, Firefox, WebKit
- Viewports: 360×640 (mobile), 768×1024 (tablet), 1440×900 (desktop)

## E2E Scenarios (Playwright)
1) Renders marketing page
   - Assert hero H1 text with any one of rotating words visible
   - Assert top and secondary nav presence
   - Assert noindex meta present
2) Sticky secondary navbar
   - Scroll past hero; assert subnav `position: sticky` and remains at viewport top
3) Anchor navigation
   - Click each subnav item: scrolls to the section (account for offset)
   - Active underline applied to current section (aria-current or class)
   - nav_click telemetry POST fired per click
4) CTA behavior
   - Click “Sign In” in top bar and hero → navigate to `/sign-in`
   - cta_click telemetry POST fired
5) Telemetry on mount
   - marketing_view POST sent once
6) Reduced motion
   - Simulate prefers-reduced-motion; rotating words are static (no timers running)
7) Responsive
   - Mobile: top nav simplified; subnav horizontally scrollable; anchors still work
   - Desktop: all sections visible with correct alternating themes
8) Accessibility
   - Keyboard tabbing: focusable links/buttons in expected order; focus ring visible
   - Contrast checks on key text (manual or tooling)

## Unit/Component Tests (optional light)
- Word rotation helper (if isolated): timing/sequence logic
- Active-section determination logic with simulated intersection ratios

## Telemetry Validation
- Intercept `/api/public/telemetry/event` in tests; assert payload fields for each event type

## Performance Checks
- Ensure hero paints quickly; LCP below 2.5s (informational in CI; not blocking if > dev baseline)

## Regression Risks
- Sticky overlap with content: verify scroll-margin-top; no content hidden under subnav
- Unexpected route changes: ensure anchors don’t navigate away from `/`

