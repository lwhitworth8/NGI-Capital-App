# My Projects (Student) – UX Spec

## 1) Projects List
- Sections: Active Projects | Past Projects
- Card (Active): name, next milestone (Week N), due-soon count, “This week: planned vs logged hours”, Open button.
- Card (Past): name, completed on date, Open (read-only workspace).
- Empty states: no active projects → “You have no active projects yet.”; prompt indicates onboarding must complete.

## 2) Project Workspace (Tabs)
- Overview: milestones timeline (weeks), due-soon tasks (next 7 days), my planned vs logged hours (this week).
- My Tasks: filterable list (assignee=self, status, milestone) with search by title; columns: Title, Milestone, Due, Priority, Planned Hrs, Status, Actions.
- Submit (Task Detail):
  - Header: title, due (red if overdue), planned hours, milestone, priority chip
  - Instructions: lead’s description
  - Upload area: files (≤500 MB each) with progress (resumable), or URL submission
  - Latest submission: version label; Download button; “View version history” collapsible list
  - Comments: text-only thread; each entry shows author, timestamp, and version anchor
  - Status control: Set to Review when submitting; show “Late” banner if past due
- Meetings: list upcoming/past; Open in Google Calendar button (no Meet link); Slack reminder 10 min before
- Timesheets: week picker (Sun–Sat PST); per-task daily entry; add multiple segments per day; weekly totals; save
- Resources: list of package files (download) and links; read-only

## 3) Notifications
- Toasts and a notifications panel (badge in header) for: assignment/reassignment; due date change; comment added; review approved/changes requested; submission accepted; meeting scheduled/reminder; due soon/overdue

## 4) A11y & Mobile
- Focus management for modals and upload area; ARIA labels for status and comments; keyboard support for list navigation.
- Mobile: single-column; upload shows warning for large files → “Use stable Wi‑Fi.”
