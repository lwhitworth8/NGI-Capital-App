# NGI Capital Advisory – Student Projects Module (Expanded)

## Overview
Students can browse active/closed Advisory projects, see requirements and time commitments, apply via custom questions, request coffee chats when enabled, and view a single showcase PDF for completed projects.

## List Page
- Default sort: newest first
- Filters: active | closed; search by name/client/tags
- Card content: hero (or gradient), project name, client, summary, badges (majors/tags)
- Accessibility: keyboard focus order; images with alt text; lazy loaded

## Detail Page
- Sections: hero + carousel, summary & description, requirements (majors badges), dates & hours/week, open roles (Analyst) count, gallery, showcase PDF (if closed)
- Apply button: visible when allow_applications=true and status=active
- Coffee Chat: visible only when allow_applications=true; opens slot picker (PST)
- Completed: “Completed” label and showcase item appears after hero in carousel

## Apply Flow
- Up to 10 text prompts, rendered in admin‑defined order
- 500 word limit per response; counter UI; friendly errors
- Uses profile/resume (where applicable) with confirmation step
- Submits to backend; visible in Applications page with status updates

## Coffee Chats (Integration)
- Internal availability with calendar picker (PT): month view shows days with open slots; students select a day and a time.
- Request sent to admins; once accepted, Google Meet invite sent to partners + student.
- Reschedule/cancel guidance via email prompt.

## Visibility
- Only active and closed projects are shown; draft/paused hidden
- If allow_applications=false, hide Apply & Coffee Chat

## Metrics
- Events: project_impression, project_view, project_apply_click, project_application_submitted, project_coffeechat_request, project_showcase_view
- Used to power admin KPIs; raw retained then rolled up after 90 days

## Error & Edge Cases
- No hero image → gradient fallback
- No gallery or showcase → carousel still renders without controls
- Long descriptions wrap gracefully; mobile scrolling within detail (if applicable)

## Acceptance Summary
- Students can discover and understand projects; apply and request chats when enabled; view completed showcases; interactions emit telemetry
