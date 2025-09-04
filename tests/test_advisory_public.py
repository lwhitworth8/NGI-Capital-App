import pytest
from fastapi.testclient import TestClient
from src.api.main import app
from sqlalchemy import text as sa_text
from src.api.database import get_db


@pytest.fixture(autouse=True)
def _setup_tables():
    with next(get_db()) as db:  # type: ignore
        # Ensure tables
        db.execute(sa_text("CREATE TABLE IF NOT EXISTS advisory_projects (id INTEGER PRIMARY KEY AUTOINCREMENT, project_name TEXT, client_name TEXT, summary TEXT, description TEXT, status TEXT, hero_image_url TEXT, tags TEXT, partner_badges TEXT, backer_badges TEXT, start_date TEXT, is_public INTEGER, allow_applications INTEGER, coffeechat_calendly TEXT)"))
        try:
            db.execute(sa_text("ALTER TABLE advisory_projects ADD COLUMN gallery_urls TEXT"))
        except Exception:
            pass
        db.execute(sa_text("CREATE TABLE IF NOT EXISTS advisory_applications (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER, source TEXT, target_project_id INTEGER, first_name TEXT, last_name TEXT, email TEXT, school TEXT, program TEXT, resume_url TEXT, notes TEXT, status TEXT, created_at TEXT)"))
        db.execute(sa_text("CREATE TABLE IF NOT EXISTS advisory_students (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER, first_name TEXT, last_name TEXT, email TEXT UNIQUE, status TEXT, created_at TEXT, updated_at TEXT)"))
        db.commit()


def test_public_projects_and_application_flow():
    client = TestClient(app)
    # Insert a public active project
    with next(get_db()) as db:  # type: ignore
        db.execute(sa_text("DELETE FROM advisory_projects"))
        db.execute(sa_text("INSERT INTO advisory_projects (project_name, client_name, summary, description, status, is_public, allow_applications, start_date) VALUES ('Panama Canal','UC Investments','Join a bold initiative','Details','active',1,1,'2025-09-01')"))
        db.commit()

    # List projects
    r = client.get('/api/public/projects')
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list) and len(items) >= 1
    pid = items[0]['id']

    # Project detail
    r2 = client.get(f'/api/public/projects/{pid}')
    assert r2.status_code == 200

    # Submit an application (UC email)
    payload = {
        'target_project_id': pid,
        'first_name': 'Landon',
        'last_name': 'Whitworth',
        'email': 'lwhitworth@berkeley.edu',
        'school': 'UC Berkeley',
        'program': 'MBA'
    }
    r3 = client.post('/api/public/applications', json=payload)
    assert r3.status_code == 200
    assert isinstance(r3.json().get('id'), int)

    # My applications
    r4 = client.get('/api/public/applications/mine', headers={'X-Student-Email':'lwhitworth@berkeley.edu'})
    assert r4.status_code == 200
    mine = r4.json()
    assert len(mine) >= 1
