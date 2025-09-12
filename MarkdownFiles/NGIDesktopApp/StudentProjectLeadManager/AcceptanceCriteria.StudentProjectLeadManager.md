# Student Project Lead Manager – Acceptance Criteria

## Access & Security
- Given a non-member tries to access a project workspace, then access is denied; assigned students and leads can access; removed students cannot.

## Tasks & Submissions
- Given a task (individual), when a student submits and lead accepts, then only that student is marked complete; for group tasks, acceptance marks all assignees complete.
- Given a student resubmits, when accepted, then the latest submission replaces the previous as active while history is retained.
- Given a task is past due, when a submission arrives, then it is flagged late; leads may waive lateness with a note.

## Milestones
- Given a project, when a lead creates milestones with start/end/order, then milestones appear in the Milestones list; deleting a milestone removes it from tasks (tasks remain).

## Deliverables
- Given submissions exist, then the Deliverables view lists task title, version, kind (file/url), link (when available), and late status.

## Meetings & Slack
- Given a meeting is created, then a Calendar event with google_event_id is stored, attendees invited, default reminders set, and a Slack channel notice is posted; a @channel reminder posts 10 minutes before.

## Timesheets
- Given students log hours per task/day, then weekly rollups (Sun–Sat PST) are visible to leads; variance vs planned is shown; no approval required.
  - Entries include daily segments.

## Resources
- Given a project package is uploaded, then students can download; leads can upload replacements at any time.
