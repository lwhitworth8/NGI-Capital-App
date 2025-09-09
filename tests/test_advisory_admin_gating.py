"""
Backend admin gating tests for Advisory API routes.
Verifies that only NGI admin emails (Landon, Andre) can access /api/advisory/*.
"""

from datetime import datetime, timedelta
from jose import jwt
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.config import SECRET_KEY, ALGORITHM

client = TestClient(app)


def make_token(email: str) -> str:
    now = datetime.utcnow()
    payload = {
        "sub": email,
        "partner_id": 0,
        "iat": now,
        "exp": now + timedelta(hours=1),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def auth_headers(email: str) -> dict:
    return {"Authorization": f"Bearer {make_token(email)}"}


def test_advisory_projects_allows_landon(monkeypatch):
    # Disable pytest env-based auth bypass so token path is exercised
    monkeypatch.delenv('PYTEST_CURRENT_TEST', raising=False)
    res = client.get("/api/advisory/projects", headers=auth_headers("lwhitworth@ngicapitaladvisory.com"))
    # 200 OK and JSON array
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_advisory_projects_allows_andre(monkeypatch):
    monkeypatch.delenv('PYTEST_CURRENT_TEST', raising=False)
    res = client.get("/api/advisory/projects", headers=auth_headers("anurmamade@ngicapitaladvisory.com"))
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_advisory_projects_rejects_other_ngi_email(monkeypatch):
    monkeypatch.delenv('PYTEST_CURRENT_TEST', raising=False)
    res = client.get("/api/advisory/projects", headers=auth_headers("someone@ngicapitaladvisory.com"))
    assert res.status_code == 403
    assert "admin" in (res.json().get("detail", "").lower())


def test_advisory_projects_rejects_external_domain(monkeypatch):
    monkeypatch.delenv('PYTEST_CURRENT_TEST', raising=False)
    res = client.get("/api/advisory/projects", headers=auth_headers("user@berkeley.edu"))
    # Partner auth layer will reject or admin check will; both are 401/403 acceptable.
    assert res.status_code in (401, 403)
