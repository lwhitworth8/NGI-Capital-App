# Students Admin – QA Checklist (Expanded)

- Clerk/admin gating for routes
- Dev auth toggle (`DISABLE_ADVISORY_AUTH=1`) allowed only in local dev/E2E; verify disabled for prod
- Table renders 100/page; virtualization active; sticky header
- Search, filters (status/school/major/grad year/has resume/applied project/chat status), sort (name/activity/grad year); URL sync
- Empty state & clear filters control
- Detail shows all canonical fields read-only; email immutable indicator
- Incomplete profile badge logic correct (missing any required field)
- No "Add Student" control in Admin; student records are auto-created on first sign-in to the student app
- Resume viewer embedded; fullscreen; no zoom; loads on demand
- Applications and Chats lists render; deep links function; onboarding CTA visible when eligible
- Assign to Project shows open roles; when 0, warns and offers override; override confirm requires rationale; success creates assignment
- Status auto from grad_year; override requires reason; override and clear reflected immediately with audit
- Soft delete archives; hidden from list; restore returns record
- Audit events created for override, assignment, delete/restore
- A11y: keyboard nav on rows and chips; labelled modals; focus traps
- Perf: filter changes snappy; scroll stays smooth; PDF deferred

## MCP & Security Gates
- [ ] Context7 Doc Refresh: run Context7 against PRD/UI/API and apply doc updates if deltas found.
- [ ] Snyk Code/Deps: Node clean; Python upgrades applied (fastapi/starlette/python-multipart/python-jose/pypdf); remaining transitives documented in Addendum.

