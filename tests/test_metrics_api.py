import os
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)

def test_history_empty_and_append_idempotent():
    # Empty state for a new metric id
    resp = client.get("/api/metrics/test_metric/history")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("empty") is True
    assert data.get("history") == []

    # Append two points
    pts = [
        {"ts": "2020-01-01T00:00:00Z", "value": 1.0},
        {"ts": "2020-02-01T00:00:00Z", "value": 2.0},
    ]
    r2 = client.post("/api/metrics/admin/append", json={"metric_id": "test_metric", "label": "Test Metric", "unit": "index", "points": pts})
    assert r2.status_code == 200, r2.text

    # History should be ascending and length 2
    r3 = client.get("/api/metrics/test_metric/history")
    j = r3.json()
    assert len(j.get("history") or []) == 2
    assert j["history"][0]["t"] < j["history"][1]["t"]

    # Append same points again (idempotent)
    r4 = client.post("/api/metrics/admin/append", json={"metric_id": "test_metric", "points": pts})
    assert r4.status_code == 200
    r5 = client.get("/api/metrics/test_metric/history")
    k = r5.json()
    assert len(k.get("history") or []) == 2

    # Append one new point; count increases by 1
    r6 = client.post("/api/metrics/admin/append", json={"metric_id": "test_metric", "points": [{"ts":"2020-03-01T00:00:00Z","value":3.0}]})
    assert r6.status_code == 200
    r7 = client.get("/api/metrics/test_metric/history")
    m = r7.json()
    assert len(m.get("history") or []) == 3
