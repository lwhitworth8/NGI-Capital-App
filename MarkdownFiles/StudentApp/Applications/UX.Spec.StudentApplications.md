# Student Applications – UX Spec

## 1) Layout
- Header: "Your Applications" and a small note: “Most recent first”.
- If profile incomplete: sticky banner with text “Complete your profile to apply for projects” and a button to Settings.
- Sections (optional): Active Applications (New/Reviewing/Interview/Offer), Past Applications (Rejected/Withdrawn/Joined). Newest-first within each.

## 2) List Items
- Card shows: Project name (link), status chip, submitted time ago, Updated badge (if status changed since last view), and a View button.
- Click area: clicking project name opens project detail; View opens application detail.

## 3) Application Detail
- Overview: Project name (link), status chip, submitted date.
- Resume snapshot: show filename and a Download PDF button; preview optional (click to open browser viewer if supported).
- Answers: list prompts in order; collapse long responses to 2–3 lines with “Show more/less”. No timestamps displayed.
- Withdraw: button at bottom; opens confirm modal: “Withdrawing removes this application from review. You can re-apply later.” Confirm/Cancel.
- Offer state: small info note: “You’ll receive onboarding emails/tasks soon.”
- Joined state: info note: “You’ll also see this project under My Projects.”

## 4) Empty State
- If no applications: “You haven’t applied to any projects yet.” CTA: “Browse Projects” to /projects.
- If profile incomplete: show banner CTA (as above) and also allow browsing projects (apply remains blocked until complete).

## 5) Microcopy
- Updated badge title: “Status updated since last view”.
- Withdraw confirm: “Withdraw this application now? You can re-apply later from the project page.”
- Incomplete banner: “Complete your profile to apply. Add your resume, phone, LinkedIn, GPA, location, school, major, and graduation year.”

## 6) Interaction & A11y
- Keyboard focus order: list item -> View -> Withdraw (in detail); ESC closes detail modal if used.
- Screen readers: status changes announced; badges have aria-labels.

## 7) Mobile
- Single-column list; detail opens as a full-screen modal; large touch targets; minimal text wrapping issues.

---
## 8) Flows & Components
- List load: show 3–5 skeleton cards while fetching.
- Card layout: project name link (primary), status pill (aria-label), submitted time ago, Updated badge, View button.
- Detail modal: sticky header (project + status), sections (Resume, Answers, Actions), close with Esc or Close button.
- Answers: each prompt bold, response in paragraph; Show more toggles up to full length; remember expand state per item while modal open.
- Withdraw: two-step modal with rationale optional (text area not sent to server in v1; for user context only).

## 9) Status Mapping (Pills)
- New (blue), Reviewing (indigo), Interview (purple), Offer (amber), Joined (green), Rejected (gray/red), Withdrawn (gray). Ensure high contrast modes.

## 10) Badge Behavior
- Show "Updated" if updated_at > last_seen_at; clear after viewing detail or clicking Mark as read (if provided later).
- Store last_seen_at via /seen; fallback: local storage timestamp per application id.

## 11) Download & Preview
- Download button: opens file via new tab or saves; rely on browser PDF handler.
- If inline preview is enabled later, ensure it honors same auth and headers.

## 12) Accessibility Details
- Announce status changes via aria-live region on list mount.
- Modal: labelled-by header, described-by body; focus trapped; close on Esc.
- Buttons: visible focus ring; ensure targets ≥ 44px on mobile.
