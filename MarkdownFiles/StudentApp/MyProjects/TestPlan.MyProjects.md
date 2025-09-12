# My Projects (Student) – Test Plan

## 1) Scope
Access gating; list sections; workspace tabs; task detail submission & revisions; comments & notifications; meetings open calendar; timesheets entry & rollup; resources; 500 MB uploads.

## 2) Data Setup
- One active and one past project; milestones; tasks with individual/group types; comments; meetings; sample large file upload (mocked); timesheet entries.

## 3) Unit/Integration
- Gating: project hidden until onboarding complete; removed student blocked
- Tasks list filters and search; status pill logic (overdue=red)
- Submissions: start/progress/success/fail; resumable retry; late flag if past due
- Comments: anchored to version; notifications fire
- Meetings: open calendar link; Slack reminder acknowledged as informational
- Timesheets: per-day segments; weekly totals; variance vs planned displayed
- Resources: package files download

## 4) E2E
- Open project; submit file (mock large); see progress and success; lead comment triggers in-app notification; resubmit; task approved
- Group task: another assignee submits; both marked complete
- Timesheets: log segments across multiple days; totals correct
- Meetings: open calendar from meeting list

## 5) A11y & Perf
- Axe pass for list and task detail; keyboard nav; virtualized lists where heavy
- Upload progress smooth; recover from network blips (mock)

## 6) Exit Criteria
- All P0/P1 pass; strict access enforced; uploads stable; UX consistent with theme
