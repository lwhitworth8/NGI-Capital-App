# Student Learning — PRD (V1)

## 0) Context & Goal
Deliver a self‑paced Learning Center that combines breadth across Business Foundations and Accounting with a deep Finance & Valuation track. Students select one of 10 curated US‑listed companies, download an Excel banker package, complete activities (A1–A5) and a capstone (model + memo + deck), receive coaching gated by validators, and build a portfolio aligned to NGI Advisory standards.

## 1) Scope (V1)
- Route `/learning`: modules list, curated company picker, Excel package download.
- Activities A1–A5 + Capstone submission and versioning.
- Coaching side panel (“Project Lead”) and contextual hints.
- Progress bars, streaks, time invested, milestones with “MD notes”.
- Leaderboard showing anonymized price target distribution post‑capstone.

## 2) Out of Scope (V1)
- Cohorts, Slack, oral defense, Google Sheets, arbitrary ticker selection (curated 10 only), public rubric exposure.

## 3) Requirements
- Company Picker: 10 companies (BUD, COST, SHOP, TSLA, UBER, ABNB, DE, GE, KO, GSBD). Persist selection; allow re‑download after refresh.
- Activities: 
  - A1: import/standardize + Drivers Map
  - A2: WC & Debt schedules + CF reconcile
  - A3: drivers + 5‑year projections
  - A4: DCF + sensitivities + sanity checks
  - A5: public comps + short peer memo
- Capstone: model + 1–2 page memo + 3–5 slide deck + football field; submission accepts `.xlsx` + `.pdf`.
- Coaching: validators must pass before feedback; unlimited resubmits with delta view.
- Integrity: block high‑confidence AI finals (model/memo/deck) with guidance to revise.
- Progress & Streaks: tick on ≥15m focused work or activity completion; reset after 8 inactive days.
- Telemetry: emit lesson_view, activity_start, validator_pass/fail, submission_create, feedback_issued, resubmit, streak_tick, time_spent (no PII beyond user_id).
- Accessibility: keyboard‑only flows, focus states, SR labels; chart alt text; theme support.
- Disclaimer: “Educational only, not investment advice” acceptance modal on first module entry.

## 4) Success Criteria
- Students pick a company, download a package, complete A1–A5 and Capstone, receive validator‑gated feedback, and see their anonymized target on the leaderboard.
- Admins review artifacts and see talent signal in the Desktop app; moderation tools function.

