# Coffee Chats Admin — Open Questions

## Google Calendar Integration
- Auth model: service account with domain‑wide delegation vs per‑user OAuth; required scopes and token storage.
- Free/busy performance: cache TTL and invalidation strategy when availability updates.
- Event ownership: should accepted events always be owned by the accepter, or a shared calendar organizer?

## Enforcement Details
- Cooldown/blacklist thresholds configurable per term or static?
- Manual overrides: which roles can clear blacklist/cooldown? Audit requirements?

## Data & Privacy
- Retention window for historical requests/events; PII masking in logs and telemetry.
- Do we store Meet links or only event ids and rely on Calendar deep links for Join?

## UX
- Where else to surface upcoming chats (e.g., Project overview, Student homepage)?
- Export (CSV) for reporting — in V1 or V2?
