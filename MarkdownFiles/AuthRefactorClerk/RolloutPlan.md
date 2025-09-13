# Rollout Plan — Unified Auth

Pre‑Prod
- Merge backend unifier behind flags; deploy to staging.
- Validate Desktop/Student apps against staging with Clerk.

Status: Completed. Clerk-only flags set in `.env`; targeted tests pass; curl validation plan documented in QA.TestPlan.md.

Canary (Prod)
- Enable unified auth in prod for admin-only subset (Feature flag by org or environment var).
- Monitor 401/403 and API error rates.

Cutover
- Disable `ENABLE_SESSION_BRIDGE`; delete password endpoints.
- Redeploy Desktop with legacy auth code removed.
- Validate admin flows and student flows.

Status: Pending. Scheduled after staging sign-off.

Backout
- If issues: temporarily re‑enable `ENABLE_SESSION_BRIDGE=1` and roll Desktop back to previous tag.
- Re‑enable env allowlist fallback only if critical and time‑boxed (with audit).
