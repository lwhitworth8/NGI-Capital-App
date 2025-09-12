# Student Projects – Acceptance Criteria

## Visibility & Access
- Given a paused or draft project, when a student navigates directly, then a Not available page appears and the project is not in the list.
- Given an active or closed project, when browsing, then it appears in list with correct labels.

## List, Filters, Sort
- Given applied filters and sort, when navigating back/forward, then the same results are restored from URL params.
- Given an empty result set, when filters apply, then “No projects available. Coming soon.” shows.
- Given scrolled to near end, when intersecting loader, then next page loads without duplicates.

## Detail & Media
- Given no hero image, when opening detail, then a gradient appears.
- Given a closed project with showcase, when viewing carousel, then the PDF is embedded with fullscreen option.

## Apply
- Given allow_applications=true and active, when submitting answers ≤500 words and optional resume update, then application is created and confirmation shown.
- Given >500 words, when submitting, then validation blocks with guidance.

## Withdraw
- Given a submitted application, when withdrawing from Applications page, then it is removed immediately from pool and status updates in UI.

## Coffee Chat
- Given an active project, when requesting a slot, then a Pending state is shown; after acceptance (mock), an Accepted state is shown with instruction to use email invite; only one request per project is allowed.

## Telemetry
- Given navigation and interactions, when events fire, then metrics contain project_id, student_id (if available), session and referrer, and error events appear for failed actions.
