# Student Projects – QA Checklist

- Clerk gating enforced; unauthorized redirected to sign‑in.
- List renders with default sort; filters and sort update URL; back/forward works.
- Infinite scroll loads more results with skeletons; no duplicates.
- Empty state message shows when no results.
- Cards: hero/gradient, summary clamp, badges, Completed pill.
- Detail: summary, description, majors badges, dates, hours/week, open roles.
- Apply: visible only when allowed+active; prompts ordered; 500‑word limits; resume update allowed; success confirmation.
- Withdraw: removes application immediately from pool; Applications page reflects.
- Coffee Chat: calendar picker shows days with availability; selecting a day reveals slots; 1 request per project; after accepted, email instruction shown; no join button.
- Showcase: embedded viewer; fullscreen; PDFs lazy‑loaded; closed projects labeled.
- Visibility: draft/paused hidden; allow_applications=false hides Apply & Chat.
- Telemetry: all key events emit with project_id, student_id, session/referrer; error events logged.
- A11y: keyboard navigation; focus states; adequate contrast. Controls have aria-labels (search, sort, mode, location, clear; calendar nav; date/time buttons).
- Performance: smooth scroll; lazy assets; deferred PDF loading.
