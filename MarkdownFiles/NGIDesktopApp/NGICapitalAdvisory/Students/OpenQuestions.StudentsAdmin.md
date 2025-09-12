# Students Admin – Open Questions (Expanded)

- Capacity enforcement: [Resolved] allow override with warning (two-step confirm with rationale).
- Status cutoff date/time and TZ: confirm June 30 23:59 PT; support quarter/semester variants later?
- Timeline aggregation: unify ordering across applications/chats/onboarding; include profile updates?
- Archive schema: advisory_students_deleted fields (who deleted, reason, snapshot structure) and retention policy.
- Admin-editable set: confirm status-only in V1; any exceptions (e.g., fix misspelled school)?
- "Has Resume" filter: accept only PDF resume_url under uploads, or any URL?
- Last activity definition expansion timeline (include chats/onboarding) and priority.


---
## Resolved Decisions (V1)
- Status cutoff: June 30 23:59 PT; semester or quarter variants in V2.
- Timeline aggregation: include chats and onboarding in V2; profile updates optional.
- Archive: advisory_students_deleted(id, original_id, email, reason, snapshot_json, deleted_at, deleted_by); retain indefinitely.
- Admin editable fields: status only in V1 (typos corrected by student in Settings).
- Has Resume filter: PDF stored under uploads.
- Last activity: expand to include chats and onboarding in V2.
