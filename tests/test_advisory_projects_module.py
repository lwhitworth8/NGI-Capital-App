"""
Advisory Projects Module tests (Admin-side)
Validates PRD publish requirements, code generation, leads/questions, and media uploads.
"""

from datetime import datetime, timedelta
from io import BytesIO
import os
from jose import jwt
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.config import SECRET_KEY, ALGORITHM
from src.api.database import get_db
from sqlalchemy import text as sa_text


client = TestClient(app)


def make_token(email: str) -> str:
    now = datetime.utcnow()
    payload = {
        "sub": email,
        "partner_id": 0,
        "iat": now,
        "exp": now + timedelta(hours=1),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def admin_headers(email: str = "anurmamade@ngicapitaladvisory.com"):
    return {"Authorization": f"Bearer {make_token(email)}"}


def _clear_projects():
    with next(get_db()) as db:  # type: ignore
        # Ensure tables exist
        db.execute(sa_text("CREATE TABLE IF NOT EXISTS advisory_projects (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER, client_name TEXT, project_name TEXT, summary TEXT, description TEXT, status TEXT, mode TEXT, location_text TEXT, start_date TEXT, end_date TEXT, duration_weeks INTEGER, commitment_hours_per_week INTEGER, project_code TEXT, project_lead TEXT, contact_email TEXT, partner_badges TEXT, backer_badges TEXT, tags TEXT, hero_image_url TEXT, gallery_urls TEXT, apply_cta_text TEXT, apply_url TEXT, eligibility_notes TEXT, notes_internal TEXT, is_public INTEGER, allow_applications INTEGER, coffeechat_calendly TEXT, team_size INTEGER, team_requirements TEXT, showcase_pdf_url TEXT, created_at TEXT, updated_at TEXT)"))
        db.execute(sa_text("CREATE TABLE IF NOT EXISTS advisory_project_leads (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, email TEXT NOT NULL)"))
        db.execute(sa_text("CREATE TABLE IF NOT EXISTS advisory_project_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, idx INTEGER NOT NULL, prompt TEXT NOT NULL)"))
        db.commit()
        db.execute(sa_text("DELETE FROM advisory_project_leads"))
        db.execute(sa_text("DELETE FROM advisory_project_questions"))
        db.execute(sa_text("DELETE FROM advisory_projects"))
        db.commit()


def test_create_draft_and_publish_flow(tmp_path):
    # Ensure token-based auth path
    os.environ.pop('PYTEST_CURRENT_TEST', None)
    _clear_projects()
    # Create minimal draft
    payload = {
        "project_name": "Panama Canal Upgrade",
        "client_name": "UC Investments",
        "summary": "Join a bold student-led initiative to modernize the canal.",
        "status": "draft",
    }
    r1 = client.post("/api/advisory/projects", json=payload, headers=admin_headers())
    assert r1.status_code == 200
    # Resolve ID by listing (more robust across SQLite connections)
    r_list = client.get("/api/advisory/projects", headers=admin_headers())
    assert r_list.status_code == 200
    items = r_list.json()
    assert isinstance(items, list) and len(items) >= 1
    pid = int(items[0]["id"])

    # Add leads and questions
    r_leads = client.put(f"/api/advisory/projects/{pid}/leads", json={"emails":["anurmamade@ngicapitaladvisory.com"]}, headers=admin_headers())
    assert r_leads.status_code == 200
    r_q = client.put(f"/api/advisory/projects/{pid}/questions", json={"prompts":["Why this project?","Experience?"]}, headers=admin_headers())
    assert r_q.status_code == 200

    # Publish with required fields
    patch = {
        "description": "Detailed scope ..." * 10,
        "team_size": 4,
        "commitment_hours_per_week": 10,
        "duration_weeks": 12,
        "start_date": "2025-09-01",
        "end_date": "2025-12-01",
        "status": "active",
        "allow_applications": 1,
    }
    r_pub = client.put(f"/api/advisory/projects/{pid}", json=patch, headers=admin_headers())
    assert r_pub.status_code == 200

    # Verify detail
    r_get = client.get(f"/api/advisory/projects/{pid}", headers=admin_headers())
    assert r_get.status_code == 200
    data = r_get.json()
    assert data["status"] == "active"


def test_publish_validation_missing_fields_422():
    os.environ.pop('PYTEST_CURRENT_TEST', None)
    _clear_projects()
    # Create draft OK
    r1 = client.post("/api/advisory/projects", json={
        "project_name":"A",
        "client_name":"UC",
        "summary":"Too short"
    }, headers=admin_headers())
    assert r1.status_code == 200
    r_list = client.get("/api/advisory/projects", headers=admin_headers())
    pid = int(r_list.json()[0]["id"])  # type: ignore

    # Attempt publish without meeting PRD lengths
    r_pub = client.put(f"/api/advisory/projects/{pid}", json={"status":"active"}, headers=admin_headers())
    assert r_pub.status_code == 422


def test_questions_max_10():
    os.environ.pop('PYTEST_CURRENT_TEST', None)
    _clear_projects()
    r1 = client.post("/api/advisory/projects", json={
        "project_name":"Proj",
        "client_name":"UC",
        "summary":"This is a valid summary with sufficient length."
    }, headers=admin_headers())
    r_list = client.get("/api/advisory/projects", headers=admin_headers())
    pid = int(r_list.json()[0]["id"])  # type: ignore
    prompts = [f"Q{i}" for i in range(12)]
    r_q = client.put(f"/api/advisory/projects/{pid}/questions", json={"prompts":prompts}, headers=admin_headers())
    assert r_q.status_code == 422


def test_media_uploads_paths_created(tmp_path):
    os.environ.pop('PYTEST_CURRENT_TEST', None)
    _clear_projects()
    r1 = client.post("/api/advisory/projects", json={
        "project_name":"Media Test",
        "client_name":"UC",
        "summary":"This is a valid summary with sufficient length for tests."
    }, headers=admin_headers())
    r_list = client.get("/api/advisory/projects", headers=admin_headers())
    pid = int(r_list.json()[0]["id"])  # type: ignore

    # Hero upload
    hero_content = BytesIO(b"fakeimage")
    r_hero = client.post(
        f"/api/advisory/projects/{pid}/hero",
        headers=admin_headers(),
        files={"file": ("hero.jpg", hero_content, "image/jpeg")}
    )
    assert r_hero.status_code == 200
    assert f"uploads/advisory-projects/{pid}/hero/" in r_hero.json().get("hero_image_url", "")

    # Gallery upload
    gal_content = BytesIO(b"fakeimage2")
    r_gal = client.post(
        f"/api/advisory/projects/{pid}/gallery",
        headers=admin_headers(),
        files={"file": ("g.jpg", gal_content, "image/jpeg")}
    )
    assert r_gal.status_code == 200
    arr = r_gal.json().get("gallery_urls")
    assert isinstance(arr, list) and any(f"uploads/advisory-projects/{pid}/gallery/" in p for p in arr)

    # Showcase upload
    pdf_content = BytesIO(b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n")
    r_show = client.post(
        f"/api/advisory/projects/{pid}/showcase",
        headers=admin_headers(),
        files={"file": ("s.pdf", pdf_content, "application/pdf")}
    )
    assert r_show.status_code == 200
    assert f"uploads/advisory-projects/{pid}/showcase/" in r_show.json().get("showcase_pdf_url", "")


def test_project_code_generation_sequence():
    os.environ.pop('PYTEST_CURRENT_TEST', None)
    _clear_projects()
    # First project -> PROJ-ACM-001
    r1 = client.post("/api/advisory/projects", json={
        "project_name": "Alpha",
        "client_name": "Acme Corp",
        "summary": "This is a valid summary with enough characters to pass."
    }, headers=admin_headers())
    _ = r1
    # Second with same ABC -> ends with 002
    r2 = client.post("/api/advisory/projects", json={
        "project_name": "Another",
        "client_name": "Acme Co",
        "summary": "Another valid summary with enough characters to pass."
    }, headers=admin_headers())
    _ = r2

    # Fetch list and verify codes
    r_list = client.get("/api/advisory/projects", headers=admin_headers())
    codes = [p.get("project_code") for p in r_list.json()]
    acm_codes = [c for c in codes if isinstance(c, str) and c.startswith("PROJ-ACM-")]
    assert any(c.endswith("001") for c in acm_codes)
    assert any(c.endswith("002") for c in acm_codes)


def test_publish_requires_leads_422_message():
    os.environ.pop('PYTEST_CURRENT_TEST', None)
    _clear_projects()
    # Create a valid draft
    r1 = client.post("/api/advisory/projects", json={
        "project_name": "Harbor Optimization",
        "client_name": "UC Logistics",
        "summary": "A comprehensive student project improving port operations efficiency.",
        "status": "draft"
    }, headers=admin_headers())
    assert r1.status_code == 200
    # Get project id
    r_list = client.get("/api/advisory/projects", headers=admin_headers())
    pid = int(r_list.json()[0]["id"])  # type: ignore

    # Attempt to publish with all required fields EXCEPT leads
    patch = {
        "description": "Detailed description of the project scope and expectations." * 2,
        "team_size": 3,
        "commitment_hours_per_week": 8,
        "duration_weeks": 10,
        "start_date": "2025-09-01",
        "end_date": "2025-12-01",
        "status": "active"
    }
    r_pub = client.put(f"/api/advisory/projects/{pid}", json=patch, headers=admin_headers())
    assert r_pub.status_code == 422
    assert 'at least one project lead required' in (r_pub.json().get('detail') or '')


def test_create_draft_appears_in_admin_list_and_publish_shows_in_public():
    os.environ.pop('PYTEST_CURRENT_TEST', None)
    _clear_projects()

    # Create draft
    r1 = client.post("/api/advisory/projects", json={
        "project_name": "Bridge Analytics",
        "client_name": "UC T&I",
        "summary": "A valid summary string long enough to pass requirements.",
        "status": "draft"
    }, headers=admin_headers())
    assert r1.status_code == 200

    # List in admin (no filters) -> should include the project
    r_list = client.get("/api/advisory/projects", headers=admin_headers())
    assert r_list.status_code == 200
    items = r_list.json()
    assert any(p.get('project_name') == 'Bridge Analytics' for p in items)
    pid = int(items[0]['id'])

    # Add a lead, then publish without explicitly setting is_public
    r_leads = client.put(f"/api/advisory/projects/{pid}/leads", json={"emails":["anurmamade@ngicapitaladvisory.com"]}, headers=admin_headers())
    assert r_leads.status_code == 200
    patch = {
        "description": "Detailed description of deliverables and scope." * 2,
        "team_size": 2,
        "commitment_hours_per_week": 8,
        "duration_weeks": 10,
        "start_date": "2025-09-01",
        "end_date": "2025-12-01",
        "status": "active"
    }
    r_pub = client.put(f"/api/advisory/projects/{pid}", json=patch, headers=admin_headers())
    assert r_pub.status_code == 200

    # Verify public listing shows it (status active + default is_public=1 on publish)
    r_public = client.get("/api/public/projects")
    assert r_public.status_code == 200
    pubs = r_public.json()
    assert any(p.get('id') == pid for p in pubs)


def test_publish_without_leads_allowed_when_disabled_env(monkeypatch):
    # In dev, when auth gating is disabled, allow publish without leads
    monkeypatch.setenv('DISABLE_ADVISORY_AUTH', '1')
    _clear_projects()

    r1 = client.post("/api/advisory/projects", json={
        "project_name": "No Leads OK",
        "client_name": "UC",
        "summary": "This summary is sufficiently long for validation.",
        "status": "draft"
    }, headers=admin_headers())
    assert r1.status_code == 200
    r_list = client.get("/api/advisory/projects", headers=admin_headers())
    pid = int(r_list.json()[0]["id"])  # type: ignore

    # Publish without adding leads
    patch = {
        "description": "Detailed description long enough to pass validations." * 2,
        "team_size": 2,
        "commitment_hours_per_week": 8,
        "duration_weeks": 10,
        "start_date": "2025-09-01",
        "end_date": "2025-12-01",
        "status": "active"
    }
    r_pub = client.put(f"/api/advisory/projects/{pid}", json=patch, headers=admin_headers())
    assert r_pub.status_code == 200
