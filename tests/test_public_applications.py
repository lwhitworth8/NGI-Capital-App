from fastapi.testclient import TestClient
import os
from src.api.main import app
from src.api.database import get_db
from sqlalchemy import text as sa_text
from datetime import datetime, timedelta

client = TestClient(app)

def seed_app(db, email='student@example.com', proj_id=101, created_at=None):
    if created_at is None:
        created_at = (datetime.utcnow() - timedelta(days=1)).isoformat()
    db.execute(sa_text("INSERT INTO advisory_projects (id, project_name, status, is_public) VALUES (:id, 'Proj Name', 'active', 1)"), {"id": proj_id})
    db.execute(sa_text("INSERT INTO advisory_applications (id, target_project_id, email, status, created_at) VALUES (1, :p, :e, 'new', :ca)"), {"p": proj_id, "e": email, "ca": created_at})
    db.commit()

def test_public_applications_endpoints():
    os.environ['ALLOWED_STUDENT_DOMAINS'] = ''
    db = next(get_db())
    try:
        db.execute(sa_text("DELETE FROM advisory_applications"))
        db.execute(sa_text("DELETE FROM advisory_projects"))
        db.execute(sa_text("DELETE FROM advisory_applications_archived"))
        db.commit()
        seed_app(db)
    finally:
        db.close()

    headers = {"X-Student-Email": "student@example.com"}
    # List mine
    r = client.get('/api/public/applications/mine', headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert 'project_name' in data[0]
    assert data[0]['has_updates'] in (True, False)

    # Mark seen
    aid = data[0]['id']
    r2 = client.post(f'/api/public/applications/{aid}/seen', headers=headers)
    assert r2.status_code == 200
    # After seen, has_updates should be False
    r3 = client.get('/api/public/applications/mine', headers=headers)
    assert r3.status_code == 200
    d2 = r3.json()
    assert d2[0]['has_updates'] is False

    # Detail
    rd = client.get(f'/api/public/applications/{aid}', headers=headers)
    assert rd.status_code == 200
    detail = rd.json()
    assert detail['id'] == aid

    # Withdraw and list archived
    rw = client.post(f'/api/public/applications/{aid}/withdraw', headers=headers)
    assert rw.status_code in (200, 403, 422)
    ra = client.get('/api/public/applications/archived', headers=headers)
    assert ra.status_code == 200
    arch = ra.json()
    assert len(arch) >= 1


