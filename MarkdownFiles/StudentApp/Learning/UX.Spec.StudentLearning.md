# Student Learning — UX Spec (V1)

## 1) IA & Routes
- `/learning`: module overview + company picker + package download CTA.
- `/learning/activities/:id`: activity workspace (A1–A5) with submission panel and coaching.
- `/learning/capstone`: capstone submission with checklist and final review.

## 2) Screens & Components
- Header tile: current company (ticker, name), change action.
- Company Picker: grid of 10 cards with ticker, name, brief driver summary; select → download package.
- Module Overview: 
  - Business Foundations, Accounting (I/II/Managerial), Finance & Valuation
  - Each shows completion bar and unit-level checkmarks
- Activity Workspace:
  - Left: activity steps, requirements, validator checklist
  - Center: instructions with snippets/examples; upload panel for `.xlsx`/`.pdf`
  - Right: “Project Lead” coach panel (contextual hints; messages)
- Submission Panel:
  - Upload file(s), see status, validator pass/fail, version history (v1→vN), delta summary
- Leaderboard:
  - After capstone: anonymized price target distribution (min/median/max) per company
- Progress widgets: module completion, streak counter, time invested, milestone toasts with “MD notes”
- Disclaimer modal: shown on first module entry; must accept to proceed

## 3) Interactions
- Download flow: selecting a company → generate package → show toast with version and link
- Submission flow: upload model/memo/deck → run validators → gate AI feedback → show fixes or feedback summary
- Resubmission: unlimited; creates versions; diff highlights changed tabs/areas
- Coaching: free‑form questions + quick action tips; link to validator errors
- Integrity: high‑confidence AI‑generated text/model triggers block with polite guidance

## 4) States
- Empty states: no company selected; no submissions yet; validator failures
- Loading: download in progress; running validators; feedback pending
- Error: ingestion unavailable; upload rejected; timeout (retry CTA)

## 5) Theming & A11y
- Respect dark/light; ensure contrast on validator errors and coach panel
- Keyboard navigation across tabs, uploads, and coach; SR labels for controls; alt text for charts

## 6) Telemetry
- Fire events on view, start, validator pass/fail, submission, feedback, resubmit, streak ticks, time spent
- Ensure no PII beyond user_id in payloads

