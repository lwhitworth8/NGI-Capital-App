# Projects Module – QA Checklist (Expanded)

## Forms & Validation
- [ ] Required on Publish enforced: name, client, summary, description, ≥1 lead, team size, valid dates, hours/week
- [ ] Field lengths respected; helpful inline errors with examples
- [ ] Save Draft always available (keyboard accessible)

## Project Code
- [ ] Generated on first save; admin‑only; non‑editable
- [ ] Format `PROJ-ABC-###` correct; ABC rule applied; no collisions across saves

## Leads & Team
- [ ] Multi‑lead selection UI: search/select, clear
- [ ] Team size excludes leads; help text present
- [ ] Derived open roles computed visibly where applicable

## Requirements (Majors)
- [ ] Curated list loads; multi‑select chips; removal works
- [ ] Student badges render correctly; theme contrast OK

## Questions
- [ ] Add up to 10; cannot exceed; ordering persists
- [ ] Student response limit 500 words enforced (front + back)

## Media Uploads
- [ ] Hero upload success/failure paths; retry guidance
- [ ] Gradient fallback shows when missing; theme aware
- [ ] Gallery upload and carousel navigation; keyboard accessible
- [ ] Cropping flow intuitive and consistent

## Preview
- [ ] Preview shows student layout; Apply/Coffee Chat disabled
- [ ] Matches actual student detail rendering

## Visibility & Controls
- [ ] Students see ACTIVE projects in list; CLOSED accessible by direct detail URL
- [ ] allow_applications=false hides Apply & Coffee Chat

## Completed Showcase
- [ ] Single PDF upload; appears in carousel; opens viewer
- [ ] Access restricted to signed‑in students; direct link not indexed

## Metrics
- [ ] Events emitted at key interactions with correct project_id and props
- [ ] Rollups job configured; older raw aggregated after 90 days

## A11y & Perf
- [ ] Forms/dialogs keyboard navigable; labels; focus traps
- [ ] Color contrast passes for theme variants
- [ ] List loads quickly; images lazy‑load; no layout shifts

## Cross-Module
- [ ] Coffee Chat hidden when applications disabled
- [ ] Completed projects visible with "Completed" label and showcase link
- [ ] Student Applications reflects new submissions

## MCP & Security Gates
- [ ] Context7 Doc Refresh: run a Context7 session to compare PRD vs code (UI and API) and apply proposed doc updates.
- [ ] Snyk Code/Deps: `snyk test --all-projects --severity-threshold=high` clean for Node; Python: upgraded items (fastapi, starlette, python-multipart, python-jose, pypdf) addressed; remaining high-severity items w/o fixes documented in Addendum.
- [ ] Dev Auth toggle (`DISABLE_ADVISORY_AUTH=1`) used only in local dev; ensure disabled in production.
