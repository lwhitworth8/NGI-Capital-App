# Test Plan — Student Learning (V1)

## 1) Scope
- Validate the Student Learning flows: company picker, package download, activities A1–A5, capstone submission, coaching, progress, streaks, leaderboard.

## 2) Cases
- Picker: 10 cards render; selection persists; download triggers; re‑download after refresh shows new version.
- Uploads: `.xlsx` for model; `.pdf` for memo/deck; file type/size validation; clear errors.
- Validators: failures list codes + cells + fixes; pass gates coach feedback.
- Versions: resubmits create vN; delta summary highlights changed areas.
- Coach: responds < 60s; references activity context; links to validator items.
- Integrity: AI‑generated memo/deck/model blocked with guidance; resubmission allowed.
- Leaderboard: visible post‑capstone; anonymized; per company; min/median/max shown.
- Progress/Streaks: bars update; streak tick on ≥15m or activity completion; reset after 8 inactive days.
- Accessibility: keyboard‑only navigation; SR labels; chart alt text; color contrast.
- Performance: download p95 < 10s (cached), validators complete in reasonable time; coach p95 < 60s.

## 3) Exit Criteria
- All cases pass across Chromium/Firefox/Safari (desktop). Mobile read-only behaviors render.
- No P0/P1 defects; P2 have workarounds noted.

