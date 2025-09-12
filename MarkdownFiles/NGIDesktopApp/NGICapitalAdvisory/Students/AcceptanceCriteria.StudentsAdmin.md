# Students Admin – Acceptance Criteria (Expanded)

## List & Filters
- Given many students, when filtering by Major and Status, then the list shows only matching rows and the URL reflects filters.
- Given sort by Last Activity, when applied, then rows reorder accordingly and persist during paging.

## Detail & Profile
- Given a student with incomplete profile, when viewing detail, then an "Incomplete Profile" badge appears listing missing fields.
- Given resume present, when clicking View, then the PDF renders inline with a fullscreen option and no zoom UI.

## Assign to Project
- Given open roles > 0, when Assign is confirmed, then an assignment is created and visible in the student timeline.
- Given open roles = 0, when Assign is attempted, then a warning is shown and an override flow is available; when the partner confirms with rationale, the assignment is created and audited.

## Status Lifecycle
- Given grad_year after cutoff, when status computed, then Active is shown; after cutoff, Alumni.
- Given override with reason, when saved, then override chip shows and audit entry exists.

## Soft Delete/Restore
- Given soft delete, when confirmed, then student disappears from list and an archive record is created; restore brings back the student.

## Audit
- Given override, assignment, soft delete/restore, when performed, then an AuditLog entry is persisted with actor, timestamp, table, record_id, and old/new JSON.

