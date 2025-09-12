# Student Applications – QA Checklist

- Newest-first ordering; no filters shown.
- Status chips visible; Updated badge appears only when status changed since last view and clears after viewing.
- Detail displays answers (collapsible), resume snapshot with Download, project link, and no timestamps.
- Withdraw confirm modal works; status updates; Past Applications placement correct.
- Profile incomplete banner shows with CTA to Settings; browse projects CTA present.
- No Coffee Chat or Interview details shown here.
- A11y: focus order, aria-labels for status/badges/buttons, ESC to close modal.
- Perf: large answers collapsed; resume preview lazy.

---
- Skeletons render on initial load; no layout shift when data arrives.
- Status pills carry aria-labels and pass contrast checks.
- Updated badge clears after detail open and persists otherwise.
- Withdraw race handled gracefully; cannot withdraw Joined.
- Resume download sets Content-Disposition; filename preserved.
- Deep link to application detail (if route exists) guarded by auth.
