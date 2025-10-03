# QA Checklist — NGI Learning (V1)

- Company picker shows 10 curated companies; selection persists.
- Downloaded Excel contains all required tabs; Raw Import locked; Drivers Map present.
- Baseline model opens without Excel errors; iteration enabled.
- Color conventions correct; no hardcodes in calc ranges.
- BS balances; CF ties; IS add-backs reconcile.
- Q×P(×take-rate) ties to reported revenue within ±1–2% or variance note exists.
- WC, Debt, Leases, Stock Comp schedules reconcile to statements.
- DCF passes guardrails; sensitivity tables populated.
- Comps EV construction correct and consistent treatment of cash/debt/MI/leases.
- A1–A5 submission flow works; versions tracked; deltas visible.
- Capstone permits model/memo/deck; football field present.
- Coach responds < 60s; validator gating enforced.
- AI-generated finals blocked with friendly guidance; student-authored resubmits allowed.
- Leaderboard shows anonymized distribution after capstone.
- Progress bars, streaks (≥15m or activity), and milestones display correctly; resets after 8 inactive days.
- Telemetry events emitted (lesson_view, activity_start, validator_pass/fail, submission_create, feedback_issued, resubmit, streak_tick, time_spent) with no PII beyond user_id.
- Admin viewer: search works; artifact timeline visible; talent signal (30/50/20) displayed; moderation reissues feedback.
- Accessibility: keyboard-only, focus states, SR labels; chart alt text; contrast.
- Performance: package gen p95 < 10s (cached), coach p95 < 60s; telemetry loss < 1%.

