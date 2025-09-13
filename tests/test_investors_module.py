from datetime import datetime
from fastapi.testclient import TestClient
from jose import jwt
from src.api.main import app
from src.api.config import SECRET_KEY, ALGORITHM

client = TestClient(app)


def auth(email: str = "lwhitworth@ngicapitaladvisory.com"):
    payload = {"sub": email, "iat": datetime.utcnow().timestamp()}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {"Authorization": f"Bearer {token}"}


def test_investor_pipeline_and_kpis():
    # Create investor
    r = client.post("/api/investors", json={"legal_name": "Alpha Ventures", "firm": "Alpha", "email": "alpha@example.com"}, headers=auth())
    assert r.status_code == 200
    inv_id = r.json()["id"]
    # Upsert pipeline under entity 1
    up = client.post("/api/investors/pipeline", json={"entityId": 1, "investorId": inv_id, "stage": "Not Started"}, headers=auth())
    assert up.status_code == 200
    pid = up.json()["id"]
    # Move to Pitched
    pa = client.patch(f"/api/investors/pipeline/{pid}", json={"stage": "Pitched"}, headers=auth())
    assert pa.status_code == 200
    # List pipeline
    pl = client.get("/api/investors/pipeline", params={"entity_id": 1}, headers=auth())
    assert pl.status_code == 200
    stages = pl.json()
    assert any(col["stage"] == "Pitched" and any(it["pipelineId"] == pid for it in col["items"]) for col in stages)
    # KPIs
    k = client.get("/api/investors/kpis", params={"entity_id": 1}, headers=auth())
    assert k.status_code == 200
    data = k.json()
    assert "total" in data and data["total"] >= 1


def test_reports_and_rounds():
    # Create a report
    cr = client.post("/api/investors/reports", json={"entityId": 1, "period": "2025Q2", "type": "Quarterly", "dueDate": "2025-07-31"}, headers=auth())
    assert cr.status_code == 200
    rid = cr.json()["id"]
    # List reports
    lr = client.get("/api/investors/reports", params={"entity_id": 1}, headers=auth())
    assert lr.status_code == 200
    assert lr.json().get("current", {}).get("id") == rid
    # Mark submitted
    pr = client.patch(f"/api/investors/reports/{rid}", json={"status": "Submitted", "submittedAt": datetime.utcnow().isoformat()}, headers=auth())
    assert pr.status_code == 200
    # Rounds
    rr = client.post("/api/investors/rounds", json={"entityId": 1, "roundType": "Seed", "targetAmount": 500000}, headers=auth())
    assert rr.status_code == 200
    # List rounds
    rl = client.get("/api/investors/rounds", params={"entity_id": 1}, headers=auth())
    assert rl.status_code == 200
    rid_round = rl.json()[0]["id"]
    # Add contribution
    ac = client.post(f"/api/investors/rounds/{rid_round}/contribs", json={"amount": 100000, "status": "Soft"}, headers=auth())
    assert ac.status_code == 200
    cl = client.get(f"/api/investors/rounds/{rid_round}/contribs", headers=auth())
    assert cl.status_code == 200 and len(cl.json()) >= 1
