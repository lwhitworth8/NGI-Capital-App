# Appendix — Telemetry Events (V1)

All events omit PII beyond internal `user_id`. Used for student experience, content iteration, and talent surfacing.

## Student Events
- lesson_view { user_id, module, unit, lesson, ts }
- activity_start { user_id, activity_id, company, ts }
- time_spent { user_id, activity_id, seconds, ts }
- validator_pass { user_id, activity_id, checks:[...] , ts }
- validator_fail { user_id, activity_id, failures:[{code,cell,msg}], ts }
- submission_create { user_id, activity_id|capstone, files:[...], ts }
- feedback_issued { user_id, activity_id|capstone, rubric_summary:{...}, ts }
- resubmit { user_id, activity_id|capstone, from_version, to_version, ts }
- streak_tick { user_id, day, streak_len, ts }

## Admin Metrics (derived)
- completion_pct by module and overall
- artifact_quality (rubric 0–100)
- improvement_velocity (delta quality / time)
- streak_len

## Governance
- Sample-rate heavy events if needed; retain raw logs with purge window > 12 months; aggregate rollups indefinitely.

