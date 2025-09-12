# Coffee Chats Admin — Test Plan (V1)

## 1) Scope
Availability editor, student requests, admin accept/propose/cancel/no‑show/completed, Google event creation, one‑pending enforcement, cooldown/blacklist, auto‑expiry, PST display, reminders.

## 2) Data Setup
- Seed availability for Andre and Landon; include overlapping and both‑free segments.
- Seed students with diverse states (none, pending, cooldown, blacklisted).

## 3) Unit
- Free/busy merge and intersection logic; both‑free computation.
- One‑pending enforcement; cooldown (7d) and blacklist (2 cancels) rules.
- Expiry calculation (7 days from request).

## 4) Integration
- POST availability add/remove; GET availability reflects Google free/busy masked slots.
- POST request creation: blocks when pending/cooldown/blacklisted.
- POST accept: creates Google event with Meet; invites include both partners and student; reminders set.
- POST propose: updates time; student sees change.
- POST cancel/no‑show/completed: counters updated; cooldown/blacklist applied.
- Expiry job: moves old requests to expired.

## 5) E2E (Playwright)
- Admin creates blocks; student sees slots; creates request → Pending; admin Accepts (mock event) → Accepted.
- Admin marks No‑show → student enters cooldown; blocked from requesting until cooldown elapses.
- Two cancels → student becomes blacklisted; blocked from requesting.
- Expire path after 7 days (time travel/mock): request becomes Expired and student may request again.

Note: Google Calendar/Meet integration tests are deferred until credentials are configured (ENABLE_GCAL=1 + service account). Current E2E uses mock event creation.

## 6) A11y & Perf
- Keyboard calendar interactions; list filters accessible; no jank when navigating months; slot rendering efficient.

## 7) Exit Criteria
- Tests green for accept/propose/cancel/no‑show/complete; enforcement rules hold; reminders present; event invite targets correct attendees.
