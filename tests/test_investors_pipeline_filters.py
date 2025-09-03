from datetime import datetime
from fastapi.testclient import TestClient
from jose import jwt
from src.api.main import app
from src.api.config import SECRET_KEY, ALGORITHM

client = TestClient(app)


def auth(email: str = "pytest@ngicapitaladvisory.com"):
    payload = {"sub": email, "iat": datetime.utcnow().timestamp()}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {"Authorization": f"Bearer {token}"}


def test_pipeline_stage_filter():
    # Create investor A and B
    a = client.post("/api/investors", json={"legal_name": "Investor A"}, headers=auth()).json()["id"]
    b = client.post("/api/investors", json={"legal_name": "Investor B"}, headers=auth()).json()["id"]
    # Place A to Won, B to Not Started
    client.post("/api/investors/pipeline", json={"entityId": 1, "investorId": a, "stage": "Won"}, headers=auth())
    client.post("/api/investors/pipeline", json={"entityId": 1, "investorId": b, "stage": "Not Started"}, headers=auth())
    # Filter Won
    won = client.get("/api/investors/pipeline", params={"entity_id": 1, "stage": "Won"}, headers=auth())
    assert won.status_code == 200
    rows = won.json()
    # only Won column has items
    assert any(col["stage"] == "Won" and len(col["items"]) >= 1 for col in rows)
    assert all((col["stage"] == "Won" and len(col["items"]) >= 1) or len(col["items"]) == 0 for col in rows)

