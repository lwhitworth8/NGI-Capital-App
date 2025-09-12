# Agent Instructions – NGI Capital App

## Purpose
This document orients new agents to the NGI Capital App monorepo, how we plan and implement features, and how to use the module PRDs/UX/Test/QA docs. Always keep the Task Tracker current after you complete work and tests pass.

## Monorepo Layout (high‑level)
- Backend (FastAPI): `src/api` (auth, routes, DB models, config)
- Desktop admin app (Next.js): `apps/desktop`
- Student app (Next.js): `apps/student`
- Shared UI: `packages/ui`
- Nginx + Compose: `nginx`, `docker-compose.dev.yml`
- Docs: `MarkdownFiles/**` (module PRDs/UX/Test/QA/AC, OpenQuestions)

## Key Modules & Docs
- Projects (Admin): `MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Projects/`
- Students (Admin): `MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Students/`
- Coffee Chats (Admin): `MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Coffee Chats/`
- Applications (Admin): `MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Applications/`
- Onboarding (Admin): `MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Onboarding/`
- Student Project Lead Manager: `MarkdownFiles/NGIDesktopApp/StudentProjectLeadManager/` (Slack appendix included)
- Student Applications: `MarkdownFiles/StudentApp/Applications/`
- My Projects (Student): `MarkdownFiles/StudentApp/MyProjects/`
- Learning (Student): `MarkdownFiles/StudentApp/Learning/`
- Student nav: `MarkdownFiles/StudentApp/Nav.Spec.StudentApp.md`

Each module has: PRD, UX Spec, Test Plan, QA Checklist, Acceptance Criteria, Open Questions (with V1 Resolved Decisions appended).

## Working Rules (summary)
- Read the module PRD/UX/AC and OpenQuestions (Resolved Decisions) before coding.
- Implement only the scoped V1 behaviors. Defer V2 items to future tasks.
- Security: enforce strict auth on admin routes; gate student access as specified (onboarding, membership).
- File handling: enforce V1 size limits (e.g., 25 MB legal docs, 500 MB deliverables) and types.
- Integrations: use Google Calendar and Slack patterns documented; keep secrets server‑side; do not expose tokens to client.
- Never introduce public file URLs; serve via authenticated routes.
- Prefer additive, surgical changes; avoid unrelated refactors.

## Dev Flow
1) Identify the module and open its docs from `MarkdownFiles/**`.
2) Confirm requirements against current code. If a gap exists, implement minimal changes to satisfy V1.
3) Write/update tests per the module Test Plan; run backend/frontend tests locally.
4) Verify with the module QA Checklist.
5) Update the Task Tracker: set status, link PRs, note test results (see `MarkdownFiles/Prototype_v1_MD_Task_Tracker.md`).
6) Post for review. On user confirmation that the module behavior matches the MD docs and tests are green, mark the task Done.

## Communication & Cross‑links
- Cross‑link new code to its module docs in PR descriptions.
- Update OpenQuestions only if new decisions are required; otherwise append to “Resolved Decisions (V1)” with rationale.
- For integrations (Slack/Google), see:
  - Slack: `MarkdownFiles/NGIDesktopApp/StudentProjectLeadManager/SlackSetup.Appendix.md`
  - Calendar: Coffee Chats / Onboarding PRDs
