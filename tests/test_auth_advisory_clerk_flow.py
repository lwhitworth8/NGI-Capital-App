"""
End-to-end auth tests for advisory admin routes using a simulated Clerk token.
Validates that:
 - Admin email in allowlist => can list and create projects
 - Non-admin email => 403
 - Session bridge (/api/auth/session) cookie allows subsequent requests without header
"""

import os
from fastapi.testclient import TestClient


def _patch_verify(monkeypatch, email: str):
    from src.api import main as app_main
    import src.api.auth as auth_mod
    def _fake_verify(token: str):
        if token == "clerk_dummy_valid":
            return {
                "sub": "user_123",
                "email": email,
                "name": "Test User",
                "aud": "backend",
                "iss": os.getenv("CLERK_ISSUER") or "https://sought-seal-92.clerk.accounts.dev",
            }
        return None
    monkeypatch.setattr(app_main, "verify_clerk_jwt", _fake_verify, raising=False)
    monkeypatch.setattr(auth_mod, "verify_clerk_jwt", _fake_verify, raising=False)


def test_admin_can_list_and_create_projects_with_clerk_token(monkeypatch):
    monkeypatch.delenv('PYTEST_CURRENT_TEST', raising=False)
    # Arrange
    os.environ['ALLOWED_ADVISORY_ADMINS'] = 'lwhitworth@ngicapitaladvisory.com,anurmamade@ngicapitaladvisory.com'
    from src.api.main import app
    _patch_verify(monkeypatch, 'lwhitworth@ngicapitaladvisory.com')
    client = TestClient(app)

    # Sanity: auth debug should show admin true
    r_dbg = client.get('/api/auth/debug', headers={'Authorization': 'Bearer clerk_dummy_valid'})
    assert r_dbg.status_code == 200, r_dbg.text
    dbg = r_dbg.json()
    assert dbg.get('email') == 'lwhitworth@ngicapitaladvisory.com'
    assert dbg.get('is_admin') is True

    # Act: list projects (should be 200)
    r_list = client.get('/api/advisory/projects', headers={'Authorization': 'Bearer clerk_dummy_valid'})
    assert r_list.status_code == 200, r_list.text

    # Act: create a project as admin
    payload = {
        'project_name': 'Auth Test Project',
        'client_name': 'UC',
        'summary': 'This is a valid summary for auth test.'
    }
    r_create = client.post('/api/advisory/projects', json=payload, headers={'Authorization': 'Bearer clerk_dummy_valid'})
    assert r_create.status_code == 200, r_create.text
    assert isinstance(r_create.json().get('id'), int)


def test_non_admin_gets_403(monkeypatch):
    monkeypatch.delenv('PYTEST_CURRENT_TEST', raising=False)
    # Arrange: allowed list excludes this email
    os.environ['ALLOWED_ADVISORY_ADMINS'] = 'anurmamade@ngicapitaladvisory.com'
    from src.api.main import app
    _patch_verify(monkeypatch, 'someone@ngicapitaladvisory.com')
    client = TestClient(app)

    # Act
    r = client.get('/api/advisory/projects', headers={'Authorization': 'Bearer clerk_dummy_valid'})
    # Assert
    assert r.status_code == 403


def test_session_bridge_cookie_allows_subsequent_requests(monkeypatch):
    monkeypatch.delenv('PYTEST_CURRENT_TEST', raising=False)
    # Arrange
    os.environ['ALLOWED_ADVISORY_ADMINS'] = 'lwhitworth@ngicapitaladvisory.com'
    from src.api.main import app
    _patch_verify(monkeypatch, 'lwhitworth@ngicapitaladvisory.com')
    client = TestClient(app)

    # First, bridge the session using Authorization header
    r_sess = client.post('/api/auth/session', headers={'Authorization': 'Bearer clerk_dummy_valid'})
    assert r_sess.status_code == 200, r_sess.text
    # Now call advisory without Authorization, cookie should be sent by client
    r = client.get('/api/advisory/projects')
    assert r.status_code == 200, r.text
