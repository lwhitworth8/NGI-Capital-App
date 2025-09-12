# Students Admin — Addendum (2025-09-11)

This addendum documents the current implementation state for the Students Admin module and complementary security/dev changes.

## Implementation Status
- Admin UI is a read-only database viewer for creation/edit of canonical fields.
  - No “Add Student” control in Admin; students are created automatically on first sign-in to the student app.
  - Students manage canonical fields (resume, phone, LinkedIn, GPA, location, school, program, grad_year) in Settings; Admin cannot edit them.
- Active/Archived views are mutually exclusive (single table shown per selection).
- Admin actions retained: Assign to Project (capacity-aware with override flow), Status Override (with audit), Soft Delete/Restore.

## Auto-Creation Path
- Endpoint: `GET /api/public/profile` (student portal) creates a row in `advisory_students` if one does not exist for the email.
- Allowed domains: `ALLOWED_STUDENT_DOMAINS` (default includes `berkeley.edu`).
- E2E/manual: Signing in with a UC email in the student app and visiting any page that calls `/api/public/profile` creates the record.

## Dev Auth
- Local dev/E2E can set `DISABLE_ADVISORY_AUTH=1` (or `NEXT_PUBLIC_DISABLE_ADVISORY_AUTH=1`) to bypass partner auth for admin pages.
- Ensure these flags are OFF in production.

## Security (Snyk)
- Backend pinned: fastapi 0.116.1, starlette 0.40.0, python-multipart 0.0.18, python-jose 3.4.0, pypdf 6.0.0.
- Node projects: clean.
- Python: remaining high-severity transitives without upstream fixes — `ecdsa` (via python-jose), `future` (via paddleocr).

## Tests
- Playwright: basic Students Admin flows (toggle Active/Archived, Archive/Restore) are covered and pass locally.
- API: `/api/public/profile` auto-creation behavior covered by a unit test.
