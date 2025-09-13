"""
Auth tests to verify full-access partner (Landon) can access finance endpoints without 403.
"""

from fastapi.testclient import TestClient
from src.api.main import app
from tests.helpers_auth import auth_headers


client = TestClient(app)


def test_lwhitworth_can_access_finance_kpis():
    # Clerk-only tests: pytest bypass allows access without login; or tests may
    # send a local HS256 token that is accepted under test fallback.
    r2 = client.get("/api/finance/kpis", headers=auth_headers("lwhitworth@ngicapitaladvisory.com"))
    assert r2.status_code == 200, r2.text
    data = r2.json()
    # presence of standard keys
    assert "asOf" in data
    assert "cash_position" in data
