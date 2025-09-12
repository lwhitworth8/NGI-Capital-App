# Students Admin – UX Spec (Expanded)

## 1) Navigation & Layout
- Route: /ngi-advisory/students
- Layout: Two-pane pattern
  - Left: Virtualized table (100/page) with search, filters, sort in header
  - Right: Detail drawer (overlay) or navigate to /ngi-advisory/students/{id}
- Sticky utilities: Add filters, Clear filters, Sort by, Results count

## 2) Table Spec
- Row height ~56px; columns: Name | Email | School | Program | Grad Year | Status | Last Activity | Actions
- Name column includes avatar initials; email truncated with tooltip; status shows chip (Active/Alumni) with override badge if applicable
- Actions menu per row: View | Assign to Project | Status Override | Soft Delete
- Virtualization: window size ~20, overscan 10; keyboard up/down moves row focus; Enter opens detail
- Search: debounced (300ms) across name/email/school/program; Enter submits immediately
- Filters panel
  - Status: multi (Active, Alumni)
  - School: multi (typeahead)
  - Program/Major: multi (taxonomy chips)
  - Grad Year: min/max or discrete chips (2025, 2026, 2027, ...)
  - Has Resume: toggle Yes/No
  - Applied to Project: typeahead project picker
  - Chat Status: multi (requested, pending, accepted, completed, canceled)
- Sort select: Name A–Z | Last Activity (desc) | Grad Year asc/desc
- Empty state: icon + "No students found." link "Clear filters"

## 3) Detail View
- Header: Name (large), Alumni/Active chip (auto/override label), email (copy button)
- Profile section (read-only):
  - Row 1: School | Program/Major | Grad Year
  - Row 2: Phone | LinkedIn (external link) | Location
  - Row 3: GPA | Resume (View inline)
  - Incomplete Profile badge: lists missing fields on hover (resume, phone, LinkedIn, GPA, location, school, major, grad_year)
- Resume viewer: embedded PDF frame placeholder until clicked; then load; fullscreen button; no zoom UI
- Activity timeline (right): segmented tabs or stacked panels
  - Applications: columns (Project, Status, Submitted) + link to Applications record
  - Coffee Chats: status (requested/pending/accepted/completed/canceled), datetime (PST), project context; deep-link to Coffee Chats
  - Onboarding: template name, step count complete/total; CTA "Start Onboarding" if eligible
- Actions bar: Assign to Project | Status Override | Soft Delete/Restore

## 4) Flows
### 4.1 Assign to Project
- Open dialog: select project (active only) with search; shows open roles count (team_size − assigned analysts)
- If open roles <= 0: show inline warning "No open analyst roles available for this project." and present a secondary action "Proceed anyway" that opens an Override confirm (requires rationale)
- Optional fields: hours/week (int), note
- Confirm → success toast → timeline shows new assignment

### 4.2 Status Override
- Open modal: radio (Active/Alumni) + textarea (reason, required ≥ 10 chars)
- Confirm → banner on profile "Status overridden"; audit entry
- Clear override action (if needed) → revert to auto

### 4.3 Soft Delete / Restore
- Soft Delete confirm: explain archive; on success, banner "Student archived"; Actions shows Restore
- Restore confirm: returns to active; audit entry

## 5) Microcopy
- Incomplete profile badge: "Profile incomplete: add resume, phone, LinkedIn, GPA, location, school, major, grad year to apply."
- Assign: "Select a project to add this student as an Analyst."
- Override reason placeholder: "Why are you overriding the status?"

## 6) Keyboard & A11y
- Table rows focusable; Enter opens detail; Esc closes drawer
- Modals: focus trap; labelled inputs; ARIA roles; descriptive error text
- Buttons have discernible names; chips togglable via keyboard

## 7) Performance
- Only visible rows render; memoize cell components; avoid layout shift
- PDF loads on demand; viewer unmounts on drawer close

## 8) Error Handling
- Toasts for success/error with retry; inline field errors in dialogs
- Network retry on list fetch with backoff; keep filter state intact


---
## 9) Cross‑Module Cues
- From Applications: when an application moves to Offer/Accepted, show a banner in student detail to "Start Onboarding".
- From Coffee Chats: show cooldown/blacklist badges with tooltips indicating end date or reason.
- From Projects: in Assign dialog, show current open roles value (read‑only) fetched live.
