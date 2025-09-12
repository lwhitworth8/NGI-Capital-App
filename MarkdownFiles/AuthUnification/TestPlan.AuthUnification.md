# Unified Authentication Test Plan

## Scope
Tests cover backend Clerk verification, dev bypass restrictions, client session bridging, and configuration checks.

## Test Environments
- **Unit tests** run via `pytest` for backend and `npm test` for clients.
- **Integration tests** run in Docker with `NEW_AUTH_FLOW` enabled.

## Test Cases
### Backend
1. **Clerk JWT valid** – request with valid token returns 200 and user context.
2. **Clerk session cookie valid** – cookie established via `/auth/session` allows subsequent requests.
3. **Missing env vars** – startup logs warning and refuses to verify tokens.
4. **Dev bypass disabled in prod** – bypass header/cookie rejected when `ENV!=development`.
5. **Legacy token rejected** – HS256 JWT results in 401.

### Desktop/Student Apps
6. **Session bridge** – after `Clerk.session.getToken`, posting to `/auth/session` sets HttpOnly cookie.
7. **No retry loop** – 401 responses do not trigger automatic token refresh; user is redirected to login.

### Migration
8. **Feature flag off** – legacy paths operate when `NEW_AUTH_FLOW` is false.
9. **Feature flag on** – only Clerk verification is accepted.

## QA Checklist
- [ ] Required `CLERK_*` env vars documented in README.
- [ ] Logs show 401 count metrics before and after rollout.
- [ ] Admin and student flows manually tested in staging.

## Out of Scope
- Performance testing beyond ensuring endpoints respond within existing SLAs.
- Stress testing of Clerk infrastructure.

