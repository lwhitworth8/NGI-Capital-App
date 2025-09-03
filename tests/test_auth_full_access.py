"""
Auth tests to verify full-access partner (Landon) can access finance endpoints without 403.
"""

from fastapi.testclient import TestClient
from src.api.main import app


client = TestClient(app)


def test_lwhitworth_can_access_finance_kpis():
    # Login as Landon (partners are auto-seeded by login endpoint if missing)
    r = client.post(
        "/api/auth/login",
        json={
            "email": "lwhitworth@ngicapitaladvisory.com",
            "password": "TempPassword123!",
        },
    )
    assert r.status_code == 200, r.text
    token = r.json().get("access_token")
    assert token, "Expected access token in login response"

    # Access finance KPIs (full-access module)
    r2 = client.get("/api/finance/kpis", headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 200, r2.text
    data = r2.json()
    # presence of standard keys
    assert "asOf" in data
    assert "cash_position" in data
