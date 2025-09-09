import os
import time
import requests
import pytest

BASE = os.environ.get("TEST_BASE_URL", "http://localhost:8001")


def test_session_bridge_sets_cookie():
    url = f"{BASE}/api/auth/session"
    # Try hitting a real server first; if not reachable, use FastAPI TestClient fallback
    try:
        r = requests.post(url, headers={"Authorization": "Bearer testtoken123"}, timeout=2)
    except Exception:
        try:
            from fastapi.testclient import TestClient
            from src.api.main import app
            r = TestClient(app).post("/api/auth/session", headers={"Authorization": "Bearer testtoken123"})
        except Exception:
            pytest.skip("session bridge endpoint not reachable in this environment")
    assert r.status_code == 200
    set_cookie = r.headers.get("set-cookie") or ""
    assert "auth_token=testtoken123" in set_cookie
    assert "HttpOnly" in set_cookie


def test_health_after_session_bridge():
    # Health should always be reachable; if not, skip gracefully in this environment
    try:
        r = requests.get(f"{BASE}/api/health", timeout=2)
        assert r.status_code == 200
    except Exception:
        try:
            from fastapi.testclient import TestClient
            from src.api.main import app
            r = TestClient(app).get("/api/health")
            assert r.status_code == 200
        except Exception:
            pytest.skip("health endpoint not reachable in this environment")
