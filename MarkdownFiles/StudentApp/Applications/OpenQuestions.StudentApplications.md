# Student Applications – Open Questions

- Detail UI: modal vs dedicated page – prefer modal for V1?
- Resume preview: inline viewer vs always download? (Currently propose Download + optional browser preview on click.)
- Sectioning: split Active vs Past Applications inline, or a simple single list with status chips?
- Badge persistence: should "Updated" clear on detail open or require an explicit "Mark as read" control?

---
- Badge persistence: should we add an explicit "Mark as read" control in V1 or rely solely on opening detail?
- Detail route: provide deep-linkable /applications/{id} route for accessibility and sharability, or modal-only?
- Resume security: require signed URLs or cookie-based auth to fetch snapshots in production?

---
## Resolved Decisions (V1)
- Detail UI: dedicated page (deep-linkable) in V1.
- Resume display: download plus browser preview on click; no inline viewer.
- Sectioning: include Past view toggle via `?view=past` (combines archived with current Withdrawn/Rejected).
- Badge persistence: clear on detail open; no Mark as read control.
- Profile gate fields: gate on school, program (major), and resume only in V1.
- Snapshot fetch: cookie-based auth; signed URLs optional later.
