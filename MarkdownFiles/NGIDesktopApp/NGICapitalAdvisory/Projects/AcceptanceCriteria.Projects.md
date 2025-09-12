# Projects Module – Acceptance Criteria (Expanded)

## Create/Edit & Publish
- Given an admin, when they save a draft with partial fields, then the draft is stored and visible in list with status=draft.
- Given a draft with required fields present, when they click Publish, then status becomes active/closed and students can/cannot apply per allow_applications.
- Given missing required fields, when Publish is clicked, then inline errors appear and publish is blocked.

## Project Code
- Given first save, when the record is created, then project_code is generated with format `PROJ-ABC-###` and is only visible to admins.
- Given a subsequent save, when project already has a code, then the code remains unchanged.

## Leads, Team & Open Roles
- Given multi‑lead selection, when saving, then leads persist and display correctly in admin UI.
- Given team_size=N and assigned_analysts=M, when showing derived value, then open_roles=N−M and excludes leads.

## Requirements (Majors)
- Given selected majors, when viewing student detail, then badges show exactly the selected majors.

## Application Questions
- Given 10 prompts, when adding an 11th, then UI prevents addition and explains the limit.
- Given ordered prompts, when rendered to students, then prompts appear in that order.
- Given student responses over 500 words, when submitting, then validation blocks submission with guidance.

## Media Uploads & Gallery
- Given no hero image, when viewing project, then theme gradient hero is displayed.
- Given hero uploaded, when saved, then hero replaces gradient and loads quickly with correct aspect.
- Given gallery images uploaded, when using carousel, then images navigate with keyboard and mouse.

## Student Visibility & Controls
- Given status=draft or paused, when browsing student list/detail, then the project is hidden.
- Given allow_applications=false, when viewing student detail, then Apply and Coffee Chat buttons are hidden.

## Completed Showcase
- Given a closed project with showcase.pdf, when a signed‑in student opens detail, then they can open the PDF from the gallery.

## Metrics
- Given student interactions, when events fire, then they are logged with correct properties (project_id, student_id? where applicable) and included in rollups after 90 days.
