"""
Clerk authentication integration tests (mocked) for NGI Capital API.

These tests monkeypatch verify_clerk_jwt to simulate Clerk-issued tokens so we
can validate the backend path without contacting Clerk.
"""

from fastapi.testclient import TestClient
import importlib


def test_clerk_bearer_auth_me(monkeypatch):
    # Import app
    from src.api.main import app
    # Patch verify_clerk_jwt to accept our dummy token (patch auth_deps binding)
    def _fake_verify(token: str):
        # Provide fake claims as Clerk would
        if token == "clerk_dummy_valid":
            return {
                "sub": "user_123",
                "email": "anurmamade@ngicapitaladvisory.com",
                "name": "Andre Nurmamade",
                "aud": "backend",
                "iss": "https://sought-seal-92.clerk.accounts.dev",
            }
        return None
    # Patch the reference used by unified deps and any older paths
    monkeypatch.setattr("src.api.auth_deps.verify_clerk_jwt", _fake_verify, raising=False)
    monkeypatch.setattr("src.api.clerk_auth.verify_clerk_jwt", _fake_verify, raising=False)

    client = TestClient(app)
    # Call protected endpoint with fake Clerk token
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer clerk_dummy_valid"})
    assert r.status_code == 200, r.text
    data = r.json()
    # Debug prints for diagnosis
    print("/api/auth/me response:", data)
    assert data["email"] == "anurmamade@ngicapitaladvisory.com"


def test_clerk_bearer_auth_forbidden(monkeypatch):
    from src.api.main import app
    import src.api.clerk_auth as clerk_auth

    def _reject(_token: str):
        return None

    monkeypatch.setattr(clerk_auth, "verify_clerk_jwt", _reject)

    client = TestClient(app)
    # Invalid token should be rejected
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_token"})
    print("/api/auth/me invalid token status:", r.status_code, r.text)
    assert r.status_code in (401, 403)
