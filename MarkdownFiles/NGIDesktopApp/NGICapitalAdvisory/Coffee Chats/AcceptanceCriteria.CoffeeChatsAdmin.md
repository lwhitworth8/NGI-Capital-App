# Coffee Chats Admin — Acceptance Criteria (V1)

## Availability
- Given an admin, when they add availability blocks for the month, then students see corresponding 15/30‑minute slots up to 4 weeks, excluding Google busy times.

## Requests & Enforcement
- Given a student with a pending request, when they attempt a new request, then the system blocks it and explains the one‑pending limit.
- Given a request older than 7 days without acceptance, when the expiry job runs, then the status changes to Expired and the student may request again.
- Given a student with one no‑show, when they attempt a request within 7 days, then the system blocks it and shows the cooldown end date.
- Given two cancellations, when a student attempts a request, then the system blocks it due to blacklist.

## Accept/Propose/Cancel/Complete
- Given a pending request, when an admin Accepts, then a Google Calendar event is created with Meet, both partners + student invited, and reminders set.
- Given a pending request, when an admin Proposes a new time, then the request updates and the student sees the updated time.
- Given an accepted request, when an admin marks Completed, then the status becomes Completed and appears in history.
- Given a request, when an admin marks No‑show or Cancel with reason, then counters update and enforcement (cooldown/blacklist) applies.

## Student Portal
- Given an accepted request, when the student views the request, then they see a Join button that opens their Google Calendar event page.

---
## Timezone & Free/Busy
- Given America/Los_Angeles timezone, when generating slots across DST boundaries, then slot times remain correct in PST/PDT for UI and in event creation.
- Given a last‑minute Google busy event appears, when admin Accepts a conflicting request, then the system blocks and offers Propose.

## Idempotency & Race
- Given duplicate Accept requests with the same request_id, then only one calendar event is created.
- Given two admins attempt Accept concurrently, then only one succeeds; the other is presented with a conflict/propose prompt.
