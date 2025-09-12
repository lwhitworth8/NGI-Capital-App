# Unified Authentication Test Plan

## Scope
Tests cover backend Clerk verification, dev bypass restrictions, client session bridging, and configuration checks.

## Test Environments
- **Unit tests** run via `pytest` for backend and `npm test` for clients.
- **Integration tests** run in Docker with `NEW_AUTH_FLOW` enabled.

## Test Cases
### Backend
1. **Clerk JWT valid** – `tests/test_auth_clerk.py::test_jwt_allows_request` sends a request with a token from Clerk's JWKS and expects `200` plus populated user info.
2. **Clerk session cookie** – `tests/test_auth_clerk.py::test_session_cookie` hits `/auth/session` then uses the returned cookie to access a protected route.
3. **Missing env vars** – `tests/test_auth_clerk.py::test_missing_env_vars_fail_startup` launches app with `CLERK_JWKS_URL` unset and asserts startup aborts.
4. **Dev bypass disabled** – `tests/test_auth_clerk.py::test_bypass_rejected_in_prod` ensures bypass header returns `403` when `ENV` is not `development`.
5. **Legacy token rejected** – `tests/test_auth_clerk.py::test_legacy_jwt_rejected` posts an HS256 token and expects `401`.

### Desktop/Student Apps
6. **Session bridge** – `apps/desktop` test `src/lib/__tests__/session.spec.ts` validates that posting `Clerk.session.getToken()` to `/auth/session` sets an HttpOnly cookie.
7. **No retry loop** – `src/lib/__tests__/api.spec.ts` ensures the API client does not retry on 401 and instead bubbles the error.

### Migration
8. **Feature flag off** – integration test in `tests/test_auth_flag.py::test_flag_off_uses_legacy` confirms legacy flow works when `NEW_AUTH_FLOW=false`.
9. **Feature flag on** – `tests/test_auth_flag.py::test_flag_on_requires_clerk` asserts HS256 tokens are rejected when the flag is true.

## QA Checklist
- [ ] Required `CLERK_*` env vars documented in README.
- [ ] Logs show 401 count metrics before and after rollout.
- [ ] Admin and student flows manually tested in staging.

## Out of Scope
- Performance testing beyond ensuring endpoints respond within existing SLAs.
- Stress testing of Clerk infrastructure.

