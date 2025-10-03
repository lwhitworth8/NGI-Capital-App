# Appendix — Talent Signal (V1)

## Composite (0–100)
- completion_score (0–100) × 0.30
- artifact_quality (rubric 0–100) × 0.50
- improvement_velocity (0–100) × 0.20
- talent_signal = round(weighted sum)

## Components
- Completion Score: proportion of required activities completed with passing validators; capstone completion boosts to 100.
- Artifact Quality: internal rubric score (Appendix.Rubric.V1.md).
- Improvement Velocity: function of (latest_quality − first_quality) / days_between, normalized to cohort distribution.

## Display
- Student detail: bars for each component; overall badge with short explanation; no numeric rubric breakdown shown to students.
- Admin: full component breakdown, version timeline, per-dimension rubric view.

## Safeguards
- Clamp extreme velocity outliers; require minimum 2 submissions to compute velocity.
- If integrity checks fail 2+ times consecutively, temporarily cap talent_signal until resolved.

