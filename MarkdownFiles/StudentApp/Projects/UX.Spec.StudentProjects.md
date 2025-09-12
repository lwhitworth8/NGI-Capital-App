# Student Projects â€“ UX Spec

## 1. List Page
- Header: title, search input (debounced 300ms), filter button (majors, mode, location), sort dropdown.
- Cards grid: 3â€“4 columns desktop, 1â€“2 columns mobile; each card clickable with focus outline.
- Infinite scroll: IntersectionObserver triggers next page; loader skeletons displayed.
- Empty state: centered icon + text â€œNo projects available. Coming soon.â€

## 2. Filters & Sort
- Filters panel:
  - Majors: multi-select chips from curated list (Business, Finance, CS, etc.).
  - Mode: radio buttons (Remote, Inâ€‘person, Hybrid; multi allowed if chips preferred).
  - Location: text or chip set if known cities present.
- Sort: Newest (default), Name Aâ€“Z, Most Applied.
- URL sync: pushState query params; back/forward restores state.

## 3. Card
- Top: hero image (object-cover, 16:9). Fallback: themed gradient.
- Body: project name (bold), client (muted), summary (2â€“3 lines clamp), badges for majors.
- Footer: â€œCompletedâ€ pill if status=closed.

## 4. Detail Page
- Hero carousel: thumbnails or arrows; keyboard left/right; includes showcase PDF item when closed.
- Info block: summary then description.
- Requirements: badges for majors; icons optional.
- Meta: dates, hours/week; open roles (Analyst) count.
- Actions:
  - Apply (active+allowed only)
  - Coffee Chat (active+allowed only)

## 5. Apply Flow
- Modal/sheet with prompts in admin order; perâ€‘field 500â€‘word counters.
- Resume section: show current resume; â€œUpdate resumeâ€ CTA opens upload dialog.
- Submit: success toast + redirect link to Applications page.
- Validation: inline; disable submit until valid.

## 6. Coffee Chat Flow
- Calendar picker (PST): month view highlights days with availability; selecting a day shows time slots.
- Single selection on time click; after request, detail shows Pending; on acceptance, shows Accepted with instruction to use email invite.
- Constraint: one request per project; if already chatted for this project, show an informational message.

## 7. PDF Viewer
- Embedded viewer in carousel item; click to open fullscreen; no zoom UI.
- Lazyâ€‘load: fetch PDF only when viewer slide comes into view.

## 8. Mobile
- Single column list; filters in bottom sheet; detail sections stacked.
- Performance: avoid heavy transitions; use CSS transforms for carousel.

## 9. Error States
- Not available page: â€œThis project isnâ€™t available.â€ CTA back to Projects.
- Network: toast with Retry; maintain filters state.
