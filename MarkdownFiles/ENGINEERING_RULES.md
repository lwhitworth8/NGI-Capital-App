# Engineering Rules – NGI Capital App

## Code Hygiene
- Follow V1 scope in module PRDs; do not gold‑plate.
- Keep changes minimal and focused; don’t modify unrelated files.
- Use existing styles and component patterns; do not introduce new design systems.
- Add tests close to affected code per module Test Plans.

## Security & Auth
- Admin routes gated to Andre/Landon; student portal routes gated by Clerk.
- Enforce strict membership checks for Student My Projects and SPLM endpoints.
- All file serving must be authenticated; no public uploads or links.
- Respect file limits: 10 MB hero/gallery, 25 MB legal docs/showcase PDFs, 500 MB project deliverables.

## Integrations
- Google Calendar: create events with Meet; store `google_event_id`; open Calendar web URL; default reminders 1 day + 10 min; PST in UI.
- Slack: single workspace; per‑project private channel `proj-<code>-team`; invites via emails; post events defined in Slack appendix.
- Secrets: keep tokens in env; never expose to client; use server‑side calls.

## Data & Storage
- Standardize upload paths:
  - Projects media: `/uploads/advisory-projects/{project_id}/hero|gallery|showcase/`
  - Onboarding evidence: `/uploads/advisory-onboarding/{instance_id}/...`
  - SPLM work: `/uploads/advisory-projects/{project_id}/work/{student_id}/tasks/{task_id}/v{n}`
- Register uploads in central Documents with correct tags.

## Performance
- Virtualize long lists when necessary.
- Implement chunked uploads for large files (Content‑Range in V1; tus in V1.1).
- Avoid N+1 queries; use SQL indices where noted in PRDs.

## Testing & Task Tracker
- Write/execute tests per module Test Plans (backend + frontend).
- Do not skip tests that cover new behavior.
- After tests are green AND the user confirms implementation matches MD docs, update `MarkdownFiles/Prototype_v1_MD_Task_Tracker.md` with status, notes, and links.

## Operational
- Keep nginx/proxy body size/timeouts aligned to file size limits.
- Ensure env vars present for Slack/Google when implementing those features.
- Document any migrations/new tables in the relevant module PRD and in commit/PR descriptions.
