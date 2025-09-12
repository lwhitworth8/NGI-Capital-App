# Slack Setup Appendix – NGI Capital Advisory

This appendix explains how to connect a single Slack workspace to NGI Capital Advisory and auto‑create private, per‑project channels for project communication. The integration powers notifications (task events, submissions, meetings) and @mentions for team members.

## 1) Model Overview
- One Slack workspace for NGI (recommended name: "NGI Capital Advisory").
- Per project: a private channel `#proj-<project-code>-team` (e.g., `proj-ACM-001-team`).
- Members: leads (Andre/Landon) and onboarded student NGI emails.
- Bot posts: task assignment/updates, submissions, comments, meetings, due soon/overdue, and @channel reminders 10 minutes before meetings.

## 2) Create a Slack App
- Go to https://api.slack.com/apps → "Create New App" → From scratch.
- App name: `NGI Project Bot`; Workspace: NGI Capital Advisory.
- Features → OAuth & Permissions → Scopes (Bot Token Scopes):
  - `channels:manage` (or `conversations:write` in newer models)
  - `channels:read`
  - `groups:read`
  - `groups:write`
  - `users:read.email`
  - `chat:write`
  - `chat:write.customize` (optional, for custom sender names)
  - `im:write` (optional, not required for V1)
- Install App to Workspace → copy the Bot User OAuth Token.
- Basic Information → App Credentials → copy Signing Secret.

Note: Slack scope names may vary (conversations.* supersede channels.*). Use conversations APIs where available.

## 3) Environment Variables (.env)
Set in your deployment environment(s):
- `SLACK_BOT_TOKEN= xoxb-...` (Bot User OAuth Token)
- `SLACK_SIGNING_SECRET= ...`
- `SLACK_CHANNEL_PREFIX= proj-` (channel naming prefix)
- `APP_ORIGIN= http://localhost:3001` (used in links back to the app)

Optional for workspace validation:
- `SLACK_WORKSPACE_ID= TXXXXXXX` (if needed by tooling)

## 4) Channel Naming & Lifecycle
- Default naming: `#proj-<project-code>-team` (lowercase; dashes only).
- Creation: when a project becomes Active and the first student is onboarded, create the channel.
- Membership: invite leads + onboarded student NGI emails (created in onboarding). Re‑invite on membership changes.
- Archival: when the project moves to Past/closed, archive the channel (optional); retain history for reference.

## 5) Events Posted to Slack (V1)
- Task assigned/reassigned (include assignees)
- Submission posted/revised (include task, student, link)
- Comment added (include author, link to task in app)
- Meeting scheduled (date/time; attendees; link to Google Calendar)
- Due soon/overdue summaries (daily digest optional)
- @channel reminder: 10 minutes before each meeting

Each message includes project code, task title, and an app deep link. Keep messages concise; use threads for follow‑ups.

## 6) Implementation Checklist
Backend (FastAPI):
- Add Slack client (e.g., `slack_sdk.WebClient(SLACK_BOT_TOKEN)`).
- Helper functions:
  - `ensure_project_channel(project_code) -> channel_id`
  - `invite_members(channel_id, emails[])`
  - `post_message(channel_id, text, blocks?)`
  - `post_meeting_reminder(channel_id, event_time_ts)`
- Add guards & retries (handle `not_in_channel`, `already_in_channel`, rate limits).

Frontend (Next.js):
- For links to Slack, show channel name and a button "Open Slack" using the `slack://channel?team=<TID>&id=<CID>` deep link where available; fallback to `https://app.slack.com/client/<TID>/<CID>`.

Security:
- Store the bot token securely (never in client bundle). Sign and verify any inbound Slack requests if using Events API (not required for V1 push‑only).

## 7) Permissions & HR Considerations
- Keep channels private; limit membership to project leads and assigned students.
- Ensure NGI email provisioning during onboarding so Slack invitations can be sent to NGI addresses (preferred over personal emails).

## 8) Troubleshooting
- `not_in_channel`: bot must join/invite before posting.
- `channel_name_taken`: append suffix (e.g., `-2`) and record mapping in DB.
- Rate limited: backoff and retry per `Retry-After` header.
- User not found: confirm NGI email exists in Slack workspace; re‑provision if needed.

## 9) Local/Dev Notes
- For dev/testing, you can use a separate Slack workspace and tokens. Keep dev channel prefix distinct (e.g., `dev-proj-`).
- Consider a feature flag `ENABLE_SLACK=1` to disable Slack posts in local runs.

## 10) Open Questions
- Channel archival policy (immediate vs after retention window)
- Map project lifecycle events (Paused/Active/Closed) to Slack channel states explicitly
- Should we mirror in‑app notifications to Slack DMs for critical items? (defer)
