from datetime import datetime
from fastapi.testclient import TestClient
from jose import jwt
from src.api.main import app
from src.api.config import SECRET_KEY, ALGORITHM

client = TestClient(app)


def _auth(email: str = "lwhitworth@ngicapitaladvisory.com"):
    payload = {"sub": email, "iat": datetime.utcnow().timestamp()}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {"Authorization": f"Bearer {token}"}


def test_membership_and_entity_scoping():
    # Create employee under entity 1
    r = client.post(
        "/api/employees",
        json={"entity_id": 1, "name": "Alice Test", "email": f"alice_{datetime.utcnow().timestamp()}@example.com"},
        headers=_auth(),
    )
    assert r.status_code == 200
    emp_id = r.json()["id"]
    # Add membership to entity 2
    r2 = client.post(f"/api/employees/{emp_id}/memberships", json={"entityId": 2, "allocationPct": 50, "primary": False}, headers=_auth())
    assert r2.status_code == 200
    # List employees for entity 2 should include this record thanks to membership
    lr = client.get("/api/employees", params={"entity_id": 2}, headers=_auth())
    assert lr.status_code == 200
    items = lr.json()
    assert any(it.get("id") == emp_id for it in items)


def test_employee_todos_crud():
    # Create todo
    cr = client.post("/api/employee-todos", json={"entity_id": 1, "title": "Collect W-9"}, headers=_auth())
    assert cr.status_code == 200
    tid = cr.json()["id"]
    # List
    lr = client.get("/api/employee-todos", params={"entity_id": 1}, headers=_auth())
    assert any(t["id"] == tid for t in lr.json())
    # Patch status
    pr = client.patch(f"/api/employee-todos/{tid}", json={"status": "Done"}, headers=_auth())
    assert pr.status_code == 200
