# Projects Admin — Addendum (2025-09-11)

This addendum documents the current implementation status and security updates validated via MCP-assisted checks (Context7/Snyk/Firecrawl workflow). It complements, but does not replace, the core PRD.

## Implementation Status
- Student list shows ACTIVE projects only via `GET /api/public/projects`. CLOSED projects are accessible on detail by direct URL.
- Admin APIs implemented: create, update, detail, list, soft-close; plus media uploads (hero, gallery, showcase), ordered questions, leads, and logos.
- Project code generation uses prefix + sequence and prevents collisions implicitly; no explicit 409 path in V1.
- Dev flags: `DISABLE_ADVISORY_AUTH=1` (backend) and `NEXT_PUBLIC_DISABLE_ADVISORY_AUTH=1` (frontend) allow local admin UI without Clerk.

## Security (Snyk)
- Upgrades applied in `requirements.txt` (and verified in the running container):
  - fastapi 0.116.1
  - starlette 0.40.0
  - python-multipart 0.0.18
  - python-jose 3.4.0
  - pypdf 6.0.0
- Snyk recheck results:
  - Node projects: no vulnerable paths found.
  - Python: upgraded items above addressed; remaining high-severity items are transitive with no fix available:
    - `ecdsa` (via python-jose)
    - `future` (via paddleocr → bce-python-sdk)
  - Action: track upstream for patches; consider narrowing OCR deps to reduce exposure if feature is optional.

## Dev Auth & E2E
- Added dev bypass for partner auth when `DISABLE_ADVISORY_AUTH=1` at the guard level (`require_partner_access`) so `/api/auth/me` and partner-guarded endpoints work in local dev and E2E.
- Playwright E2E stabilized for create→publish; media/close/showcase flow hardened and available, may still be sensitive to UI toasts in CI.

## MCP Notes
- Context7: use to keep PRD/UX/AC aligned with code (see Setup_and_Workflow.md for prompts).
- Firecrawl: available to gather current external context (ensure `FIRECRAWL_API_KEY` in env of the MCP client).
- Snyk: `npx -y snyk@latest test --all-projects --severity-threshold=high` run locally; see above for actions taken.

## Next Follow-ups
- Evaluate upgrading FastAPI to a version compatible with Starlette >= 0.40 to resolve the remaining Starlette advisory.
- Metrics events (project_view/apply/etc.) are documented but not enforced end-to-end yet; track as V2.
- Consider a student-visible ‘Completed’ label on detail for CLOSED projects.
