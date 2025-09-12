# NGI Capital Advisory – Admin Projects Module (Expanded)

## Overview
This module enables partners to create, publish, and manage Advisory projects that appear to students. It includes multi‑lead support, team settings (size and requirements), custom application questions, media management, live student preview, visibility controls, and metrics.

## Navigation
- NGI Advisory → Projects
  - List (draft | active | closed)
  - Create (drawer/modal)
  - Edit
  - Live Preview
  - Media (Hero + Gallery)
  - Completed (Showcase PDF)

## Create/Edit Form – Field Spec
- Project name: text, 4–120 chars.
- Client name: text, 2–120 chars.
- Summary: 20–200 chars (used on list cards).
- Description: 50–4000 chars (detail page content).
- Status: draft | active | closed. Students only see active/closed.
- Dates: start_date, end_date (ISO); end ≥ start.
- Duration (weeks): integer ≥ 1.
- Hours/week: integer 1–40.
- Project code: admin‑only; auto on first save; format `PROJ-ABC-###`; non‑editable.
- Project leads: multi‑select (Andre/Landon v1; extensible later).
- Team size: integer ≥ 1; excludes leads; informational.
- Team requirements (majors): multi‑select from curated UC majors list.
- Allow applications: bool; when false, Apply & Coffee Chat hidden for students.
- Tags/Badges (optional): arrays of strings.
- Apply CTA text (optional).
- Hero image: upload; 16:9 recommended; cropping supported; default gradient when absent.
- Gallery images: 0..N uploads; appears on student detail.
- Showcase PDF (after closure): single upload; signed‑in students can view.

## Live Preview
- Renders the student card and detail layouts.
- Actions disabled (Apply, Coffee Chat).
- Mirrors theme and typography of student portal.

## Visibility & Controls
- Students see only active/closed; hidden for draft/paused.
- If allow_applications=false, hide Apply & Coffee Chat.

## Derived Data
- Open role count = team_size − assigned analysts (leads excluded).

## Media & Storage
- Uploads stored under `/uploads/advisory-projects/{id}/...`.
- Gradient fallback hero image (dark/light) when no hero uploaded.
- Gallery carousel keyboard accessible.

## Metrics
- Raw events: impressions, views, apply clicks, submissions, chat requests, showcase views.
- Daily rollups after 90 days; used in admin dashboard.

## Error Handling
- Friendly inline validation messages with examples.
- 422 on invalid publish attempts; 400 on media issues.

## Implementation Notes (no code edit here)
- Multi‑lead/Questions/Requirements likely require new tables or JSON columns.
- Student‑side limits (500 words per response) enforced with server‑side verification.

## References
- PRD: ./PRD.Projects.md
- Epics/Sprints: ./Epics.Projects.md
- Test Plan: ./TestPlan.Projects.md
- QA Checklist: ./QAChecklist.Projects.md
- Acceptance Criteria: ./AcceptanceCriteria.Projects.md
- Open Questions: ./OpenQuestions.Projects.md
