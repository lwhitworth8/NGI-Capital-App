"""
Employees/HR API tests
Validates teams/projects/employees flows and default team assignment.
"""

import os
from datetime import datetime
from fastapi.testclient import TestClient
from jose import jwt

from src.api.main import app
from src.api.config import SECRET_KEY, ALGORITHM


client = TestClient(app)


def make_token(email: str = "lwhitworth@ngicapitaladvisory.com") -> str:
    payload = {"sub": email, "iat": datetime.utcnow().timestamp()}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def auth_headers(email: str = "lwhitworth@ngicapitaladvisory.com"):
    return {"Authorization": f"Bearer {make_token(email)}"}


def test_list_teams_initial_creates_defaults():
    r = client.get("/api/teams", params={"entity_id": 1}, headers=auth_headers())
    assert r.status_code == 200
    names = [t["name"].lower() for t in r.json()]
    # Default teams should exist
    assert "executive" in names
    assert "board" in names


def test_create_team_and_list():
    r = client.post("/api/teams", json={"entity_id": 1, "name": "Finance", "description": "Fin"}, headers=auth_headers())
    assert r.status_code == 200
    tid = r.json()["id"]
    assert isinstance(tid, int)
    r2 = client.get("/api/teams", params={"entity_id": 1}, headers=auth_headers())
    names = [t["name"] for t in r2.json()]
    assert "Finance" in names


def test_create_project_and_student_assignment():
    # Create advisory project under entity 2 (treat as advisory)
    pr = client.post("/api/projects", json={"entity_id": 2, "name": "Advisory Project A"}, headers=auth_headers())
    assert pr.status_code == 200
    pid = pr.json()["id"]
    # Create student attached to that project
    er = client.post(
        "/api/employees",
        json={
            "entity_id": 2,
            "name": "Student One",
            "email": "student1@example.com",
            "classification": "student",
            "project_ids": [pid]
        },
        headers=auth_headers()
    )
    assert er.status_code == 200
    eid = er.json()["id"]
    assert isinstance(eid, int)
    # Verify listing shows the project
    lr = client.get("/api/employees", params={"entity_id": 2}, headers=auth_headers())
    assert lr.status_code == 200
    items = lr.json()
    stu = next((x for x in items if x["id"] == eid), None)
    assert stu is not None
    assert any(p["name"] == "Advisory Project A" for p in (stu.get("projects") or []))


def test_executive_auto_team_assignment():
    # Create executive under entity 1
    er = client.post(
        "/api/employees",
        json={
            "entity_id": 1,
            "name": "Exec One",
            "email": "exec1@example.com",
            "classification": "executive",
            "title": "Chief Test Officer"
        },
        headers=auth_headers()
    )
    assert er.status_code == 200
    # Verify they appear on Executive team
    lr = client.get("/api/employees", params={"entity_id": 1}, headers=auth_headers())
    assert lr.status_code == 200
    data = lr.json()
    execs = [e for e in data if (e.get("classification") or "").lower() == "executive"]
    assert any((e.get("team_name") or "").lower() == "executive" for e in execs)


def test_soft_delete_employee():
    # Create
    er = client.post(
        "/api/employees",
        json={
            "entity_id": 1,
            "name": "Temp User",
            "email": "temp@example.com"
        },
        headers=auth_headers()
    )
    eid = er.json()["id"]
    # Delete
    dr = client.delete(f"/api/employees/{eid}", headers=auth_headers())
    assert dr.status_code == 200
    # Verify not listed
    lr = client.get("/api/employees", params={"entity_id": 1}, headers=auth_headers())
    ids = [e["id"] for e in lr.json()]
    assert eid not in ids

