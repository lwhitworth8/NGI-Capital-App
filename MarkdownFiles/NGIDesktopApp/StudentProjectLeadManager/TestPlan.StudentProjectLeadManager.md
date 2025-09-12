# Student Project Lead Manager – Test Plan

## 1) Scope
Milestones; tasks board/list; assignments and status transitions; submissions and versioning; comments; meetings (Calendar + Slack); timesheets entry and rollup; resources; strict access; large uploads.

## 2) Data Setup
- Project with start/end; milestones auto; tasks across columns; individual+group tasks; multiple students
- Upload project package (various formats); seed submissions including 500 MB boundary (mocked)
- Slack mock bot; Calendar mock

## 3) Unit
- Late detection and waiver logic (PST)
- Planned vs actual hours computation; over-allocation warning
- Group vs individual task completion rules
 - Acceptance/reopen state toggles and milestone ordering

## 4) Integration
- CRUD tasks; assignment; board DnD (lead) and student status changes
- Submissions: chunked upload finalize; version replace; download
- Comments with version anchors
- Meetings: create event; store google_event_id; post Slack message
- Timesheets: per-day segments; weekly totals; variance calculations
- Resources: upload/replace package; student downloads
- Access control: non-members forbidden; removed student loses access immediately
 - Milestones: list/create/update/delete; tasks reflect milestone association

## 5) E2E
- Lead creates tasks; assigns; students submit; lead comments; student revises; lead accepts
- Group task: one submission marks all complete when accepted
- Meeting scheduled; Slack notice posted; reminders
- Timesheets: students log; lead views rollup vs planned

## 6) A11y & Perf
- Board/list keyboard navigation; virtualized long lists
- Chunked upload progress; resumable retry (if implemented)

## 7) Exit Criteria
- Core workflows pass; Slack + Calendar integrations verified; files up to 500 MB accepted; strict auth enforced
 - Milestones visible and manageable; deliverables list accurate; timesheets include segments
