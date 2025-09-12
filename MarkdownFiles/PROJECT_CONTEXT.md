# Project Context – NGI Capital App (V1)

## Architecture
- Backend: FastAPI + SQLAlchemy; SQLite dev / Postgres prod ready; JWT + Clerk bridge; Google Calendar + Slack integrations.
- Frontends: Next.js (Admin under /admin; Student portal at root); Nginx reverse proxy; shared UI package.
- Storage: Local uploads in dev (standardized paths); central Documents registry.

## Modules & Status
- Projects (Admin): PRD done; V1 decisions resolved; media/preview/code rules defined. Docs: `MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Projects/`
- Students (Admin): PRD done; status lifecycle & archive schema resolved. Docs: `MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Students/`
- Coffee Chats (Admin): PRD done; availability, cooldown/blacklist, expiry cadence resolved. Docs: `MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Coffee Chats/`
- Applications (Admin): PRD done; bulk & SLAs deferred to V2. Docs: `MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Applications/`
- Onboarding (Admin): PRD done; simple, Google‑first flow; access gate to My Projects. Docs: `MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Onboarding/`
- Student Project Lead Manager: PRD done; tasks, submissions, meetings, timesheets, Slack integration. Docs: `MarkdownFiles/NGIDesktopApp/StudentProjectLeadManager/`
- Student Applications: PRD done; modal details; withdraw; snapshots. Docs: `MarkdownFiles/StudentApp/Applications/`
- My Projects (Student): PRD done; tabs, submissions, timesheets, deep links. Docs: `MarkdownFiles/StudentApp/MyProjects/`
- Learning (Student): Coming Soon placeholder. Docs: `MarkdownFiles/StudentApp/Learning/`

All module docs live under `MarkdownFiles/**` with PRD/UX/Test/QA/AC and OpenQuestions (Resolved Decisions appended).

## Environments & Env Vars
- Slack: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_CHANNEL_PREFIX
- Google: service account credentials (Calendar)
- App: APP_ORIGIN, FILE_MAX_MB (500), COMMENT_MAX_MB (25)

## Development Order (suggested)
1) Projects Admin: confirm media upload & preview; code rules for project code; events and metrics.
2) Students Admin + Applications Admin: core gating and pipelines.
3) Coffee Chats Admin: availability, accept/propose, expiry job.
4) Onboarding Admin: auto‑create instance on Offer Accepted; evidence uploads; My Projects gating.
5) Student Project Lead Manager + My Projects: tasks/submissions/timesheets; meetings; Slack.
6) Learning placeholder.

## Cross‑Module Links
- Projects → Applications (capacity warnings, override)
- Applications → Onboarding (auto instance on Offer Accepted)
- Onboarding → My Projects (gate access on completion)
- SPLM ↔ My Projects (student view mirrors lead workflows)
- Coffee Chats ↔ Onboarding (interview scheduling engine reuse)

## Other Modules (Backlog)
- Accounting — Docs: MarkdownFiles/NGIDesktopApp/Accounting/ — Next step: review repo and create MD doc set (PRD, UX, Test, QA, AC).
- Dashboard — Docs: MarkdownFiles/NGIDesktopApp/Dashboard/ — Next step: review repo and create MD doc set.
- Employees — Docs: MarkdownFiles/NGIDesktopApp/Employees/ — Next step: review repo and create MD doc set.
- Entities — Docs: MarkdownFiles/NGIDesktopApp/Entities/ — Next step: review repo and create MD doc set.
- Finance — Docs: MarkdownFiles/NGIDesktopApp/Finance/ — Next step: review repo and create MD doc set.
- Investor Management — Docs: MarkdownFiles/NGIDesktopApp/InvestorManagement/ — Next step: review repo and create MD doc set.
- Taxes — Docs: MarkdownFiles/NGIDesktopApp/Taxes/ — Next step: review repo and create MD doc set.

