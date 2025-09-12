# Coffee Chats Admin — UX Spec (V1)

## 1) Admin Availability Editor
- Month calendar; per‑admin toggle (Andre, Landon); “Both free” overlay (intersection).
- Add availability: click‑drag to add block; choose 15 or 30‑minute slot length; edit via resize/drag/delete.
- Conflict overlay: Google free/busy shading; cannot create blocks overlapping busy times.
- Horizon: navigation limited to the next 4 weeks.

## 2) Student Slot Picker (Portal)
- PST times; day/week list; infinite scroll limited to 4 weeks.
- Disabled if student has pending request, is on cooldown, or blacklisted; UI explains why and when they can try again.
- On selecting a slot: confirm dialog; creates request; shows Pending with selected time.

## 3) Admin Review — Calendar View
- Overlays: availability blocks, requests (color‑coded by status), today marker.
- Interaction: click a request → side panel with student info and actions (Accept, Propose, Cancel, No‑Show, Complete).
- Claim: either admin can Accept an unclaimed request and becomes owner.

## 4) Admin Review — List View
- Filters: status (requested/pending/accepted/completed/canceled/no_show/expired), date range, student email, admin owner.
- Columns: Student, Requested Time (PST), Status, Age, Owner, Actions.
- Bulk: per‑row actions only in V1.

## 5) Accept Flow
- Pre‑check: verify free/busy; if conflict, show warning and offer Propose.
- On Accept: create Google Calendar event with Meet; invite both partners and the student; set reminders (1 day, 10 minutes).
- Student sees Accepted with a Join button linking to their Google Calendar event page.

## 6) Propose Flow
- Suggest alternative time(s) from availability; student sees updated time; email/calendar invite is the source of truth.

## 7) Cancel / No‑show / Completed
- Cancel: choose reason (student/admin); increments cancel_count; blacklist after 2 cancels.
- No‑show: increments no_show_count; apply 7‑day cooldown.
- Completed: mark complete; moves to history.

## 8) Visual States & Microcopy
- Pending: “Awaiting partner confirmation.”
- Accepted: “Scheduled — check your Google Calendar for the Meet link.”
- Cooldown: “You can request again on {date}.”
- Blacklisted: “You can no longer request coffee chats due to repeated cancellations.”

## 9) Error Handling
- Slot conflict after Accept → prompt to Propose.
- Request expired → show Expired and allow new request.
- Calendar API error → retry and show user‑friendly guidance.

## 10) Timezone & A11y
- Use `America/Los_Angeles`; slots correct across DST.
- Keyboard calendar interactions; list filters accessible; clear focus management.
