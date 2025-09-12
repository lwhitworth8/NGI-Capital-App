# Student Applications – Acceptance Criteria

## List & Detail
- Given multiple applications, when viewing the page, then items are sorted by newest-first and show project links, statuses, and a View button.
- Given an application, when opening detail, then answers and the submitted resume snapshot render read-only; a Download button is available.

## Withdraw
- Given an application, when clicking Withdraw and confirming, then the application moves to Withdrawn and is shown under Past Applications; re-apply is possible from the project page immediately.

## Profile Gate
- Given a profile missing required fields, when visiting Applications, then a banner appears with a CTA to Settings and applying is blocked elsewhere until profile is complete.

## Status Updates
- Given an application status changes (e.g., Rejected → Reviewing), when returning to the list, then an Updated badge is shown until the detail is viewed.

## Joined
- Given an application moves to Joined, when viewing detail, then a note indicates “You’ll also see this project under My Projects.”

---
## Badging & Seen
- Given an application changed status since last view, when the student opens detail, then the Updated badge clears and last_seen_at updates via API.

## Security
- Given a student attempts to fetch another student’s application, when the request is made, then a 403 is returned and no details are shown.

## Edge Cases
- Given the resume snapshot cannot be fetched, when opening detail, then a friendly error is shown and a telemetry event recorded.
