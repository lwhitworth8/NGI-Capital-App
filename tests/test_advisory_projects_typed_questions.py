"""
Typed Questions (Text + MCQ) and Applications Close Date tests
"""

from datetime import datetime, timedelta
from jose import jwt
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.config import SECRET_KEY, ALGORITHM
from src.api.database import get_db
from sqlalchemy import text as sa_text


client = TestClient(app)


def _admin_headers(email: str = "anurmamade@ngicapitaladvisory.com"):
    now = datetime.utcnow()
    token = jwt.encode({"sub": email, "iat": now, "exp": now + timedelta(hours=1)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"Authorization": f"Bearer {token}"}


def _clear_advisory_tables():
    with next(get_db()) as db:  # type: ignore
        db.execute(sa_text("CREATE TABLE IF NOT EXISTS advisory_projects (id INTEGER PRIMARY KEY AUTOINCREMENT, project_name TEXT, client_name TEXT, summary TEXT, description TEXT, status TEXT, mode TEXT, start_date TEXT, end_date TEXT, duration_weeks INTEGER, commitment_hours_per_week INTEGER, project_code TEXT, hero_image_url TEXT, gallery_urls TEXT, allow_applications INTEGER, applications_close_date TEXT, created_at TEXT, updated_at TEXT)"))
        db.execute(sa_text("CREATE TABLE IF NOT EXISTS advisory_project_leads (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, email TEXT NOT NULL)"))
        db.execute(sa_text("CREATE TABLE IF NOT EXISTS advisory_project_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, idx INTEGER NOT NULL, prompt TEXT NOT NULL, qtype TEXT, choices_json TEXT)"))
        db.commit()
        db.execute(sa_text("DELETE FROM advisory_project_questions"))
        db.execute(sa_text("DELETE FROM advisory_project_leads"))
        db.execute(sa_text("DELETE FROM advisory_projects"))
        db.commit()


def _basic_publish_patch():
    return {
        "description": "Detailed description long enough to pass publish rules" * 5,
        "team_size": 3,
        "commitment_hours_per_week": 8,
        "duration_weeks": 10,
        "start_date": "2025-09-01",
        "end_date": "2025-12-01",
        "status": "active",
    }


def test_typed_questions_text_and_mcq_flow():
    _clear_advisory_tables()
    # Create draft project
    r = client.post(
        "/api/advisory/projects",
        json={"project_name": "Alpha One", "client_name": "Acme Capital", "summary": "A valid summary string long enough to pass requirements."},
        headers=_admin_headers(),
    )
    assert r.status_code == 200
    # Resolve id
    r_list = client.get("/api/advisory/projects", headers=_admin_headers())
    pid = int(r_list.json()[0]["id"])  # type: ignore
    # Leads required on publish
    r_leads = client.put(f"/api/advisory/projects/{pid}/leads", json={"emails": ["anurmamade@ngicapitaladvisory.com"]}, headers=_admin_headers())
    assert r_leads.status_code == 200
    # Typed questions
    items = [
        {"idx": 0, "type": "text", "prompt": "Why this project?"},
        {"idx": 1, "type": "mcq", "prompt": "Preferred track?", "choices": ["Strategy", "Operations", "Finance"]},
    ]
    r_q = client.put(f"/api/advisory/projects/{pid}/questions", json={"items": items}, headers=_admin_headers())
    assert r_q.status_code == 200
    # Publish
    r_pub = client.put(f"/api/advisory/projects/{pid}", json=_basic_publish_patch(), headers=_admin_headers())
    assert r_pub.status_code == 200
    # Public detail should include typed questions
    d = client.get(f"/api/public/projects/{pid}").json()
    assert isinstance(d.get("questions"), list)
    assert any(q.get("type") == "mcq" and q.get("choices") for q in d["questions"])  # type: ignore
    # Apply with answers (should pass)
    payload = {
        "target_project_id": pid,
        "first_name": "Test",
        "last_name": "User",
        "email": "student@berkeley.edu",
        "answers": [
            {"prompt": "Why this project?", "response": "I am excited to contribute."},
            {"prompt": "Preferred track?", "response": "Strategy"},
        ],
    }
    r_apply = client.post("/api/public/applications", json=payload, headers={"X-Student-Email": "student@berkeley.edu"})
    assert r_apply.status_code == 200, r_apply.text


def test_applications_close_date_enforced():
    _clear_advisory_tables()
    # Create draft
    r = client.post(
        "/api/advisory/projects",
        json={"project_name": "Bravo Two", "client_name": "Beta Capital", "summary": "A valid summary string long enough to pass."},
        headers=_admin_headers(),
    )
    assert r.status_code == 200
    pid = int(client.get("/api/advisory/projects", headers=_admin_headers()).json()[0]["id"])  # type: ignore
    # Set leads
    client.put(f"/api/advisory/projects/{pid}/leads", json={"emails": ["anurmamade@ngicapitaladvisory.com"]}, headers=_admin_headers())
    # Publish with applications_close_date in the past
    patch = _basic_publish_patch()
    patch.update({"allow_applications": 1, "applications_close_date": "2000-01-01"})
    r_pub = client.put(f"/api/advisory/projects/{pid}", json=patch, headers=_admin_headers())
    assert r_pub.status_code == 200
    # Try to apply -> expect 422
    payload = {"target_project_id": pid, "first_name": "T", "last_name": "U", "email": "student@berkeley.edu"}
    r_apply = client.post("/api/public/applications", json=payload, headers={"X-Student-Email": "student@berkeley.edu"})
    assert r_apply.status_code == 422

