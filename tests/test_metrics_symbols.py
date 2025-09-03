"""
Metrics tests for canonical symbols used by the finance overlay (e.g., ^GSPC).
Uses admin append endpoint to simulate DB having historical data.
"""

from fastapi.testclient import TestClient
from src.api.main import app


client = TestClient(app)


def test_symbol_history_for_spx_present_after_append():
    mid = "^GSPC"
    # Ensure empty state returns 200 with empty flag
    r0 = client.get(f"/api/metrics/{mid}/history")
    assert r0.status_code == 200

    # Append a couple of points
    pts = [
        {"ts": "2021-01-01T00:00:00Z", "value": 3756.07},
        {"ts": "2022-01-03T00:00:00Z", "value": 4796.56},
    ]
    r1 = client.post("/api/metrics/admin/append", json={"metric_id": mid, "label": "S&P 500", "unit": "index", "points": pts})
    assert r1.status_code == 200, r1.text

    # Now history should contain the points in ascending order
    r2 = client.get(f"/api/metrics/{mid}/history")
    assert r2.status_code == 200
    data = r2.json()
    hist = data.get("history") or []
    assert len(hist) == 2
    assert hist[0]["t"] < hist[1]["t"]
