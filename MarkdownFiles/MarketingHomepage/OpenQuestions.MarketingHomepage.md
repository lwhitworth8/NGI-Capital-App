# Open Questions — Marketing Homepage (V1)

## Pending Decisions
1) Social links
   - Final URLs for LinkedIn, X, and Instagram (placeholders used for V1).
2) Terms/Privacy
   - Final URLs (placeholders used for V1) and copy location in the repository.
   - TODO: Add simple static pages at `/terms` and `/privacy` (markdown or Next.js routes) and wire footer + sign‑in page links to them. Until then, keep placeholder `#` links consistent across marketing and sign‑in.
3) Copy refinements
   - Wordsmithing for Learning/Incubator short lines; V1 is acceptable, but confirm final tone-of-voice.
4) Analytics expansion (Post-V1)
   - Do we add additional telemetry (e.g., scroll depth, time on page)? Not needed for V1.

## Resolved Decisions (V1)
- Primary blue: Tailwind blue-600 (#2563EB).
- Section labels (exact): “Advisory Projects”, “Student Learning (Coming Soon)”, “Student Incubator (Coming Soon)”.
- In-page anchors only; no separate marketing routes; Sign In only CTA.
- Fixed theme on marketing route; alternating dark/light sections with specified blue gradients.
- No partner logos/social proof in V1; text-first presentation; no icons.
- Telemetry events: marketing_view, nav_click, cta_click; no additional events in V1.
- Noindex on marketing page in V1.
