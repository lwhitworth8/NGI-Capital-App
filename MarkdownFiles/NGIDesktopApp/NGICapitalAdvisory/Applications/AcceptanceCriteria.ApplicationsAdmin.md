# Applications Admin – Acceptance Criteria

## Views
- Given a project, when selected, then the Kanban for that project displays lanes and cards.
- Given Global View toggled, when filtering and sorting, then results reflect all projects and link back to the project Kanban.

## Transitions & Capacity
- Given drag to Offer/Joined with capacity=0, when confirmed with rationale, then the card moves and an audit record captures the override.
- Given drag across any lanes, when dropped, then the status persists and updates counts.

## Detail & Timeline
- Given an application, when opening detail, then the answers snapshot and resume PDF render read-only and the timeline shows coffee chats/interviews/onboarding entries.
- Given reviewer set, when a new app is assigned, then the reviewer sees an in-app badge.

## Duplicate & Withdraw
- Given an existing non-withdrawn application for the same project/student, when a new apply is attempted, then the system blocks submission.
- Given withdraw, when executed, then the application moves to the archive/Past Applications and remains queryable.

## Onboarding Completion & Past Applications
- Given Onboarding is marked completed for an application, when the completion event arrives, then the application is archived to advisory_applications_archived and no longer appears on the Kanban.

## Attachments Constraints
- Given an admin uploads an attachment larger than 25 MB or not a PDF, when uploading, then the UI blocks it and the API rejects it with a clear error.
