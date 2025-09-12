from fastapi.testclient import TestClient
from sqlalchemy import text as sa_text
from src.api.main import app
from src.api.database import get_db

client = TestClient(app)

def seed_projects(db):
    db.execute(sa_text("DELETE FROM advisory_applications"))
    db.execute(sa_text("DELETE FROM advisory_projects"))
    db.commit()
    # Active and closed should be visible
    db.execute(sa_text("INSERT INTO advisory_projects (id, project_name, client_name, summary, status, is_public, start_date, allow_applications, mode, location_text, tags) VALUES (1,'Alpha','Client A','Summary A','active',1, datetime('now','-10 days'),1,'remote','Berkeley','[\"Finance\"]')"))
    db.execute(sa_text("INSERT INTO advisory_projects (id, project_name, client_name, summary, status, is_public, start_date, allow_applications, mode, location_text, tags) VALUES (2,'Beta','Client B','Summary B','closed',1, datetime('now','-20 days'),0,'in_person','San Francisco','[\"CS\"]')"))
    # Draft/paused should be hidden
    db.execute(sa_text("INSERT INTO advisory_projects (id, project_name, client_name, summary, status, is_public, start_date, allow_applications) VALUES (3,'Gamma','Client C','Summary C','draft',1, datetime('now'),1)"))
    db.execute(sa_text("INSERT INTO advisory_projects (id, project_name, client_name, summary, status, is_public, start_date, allow_applications) VALUES (4,'Delta','Client D','Summary D','paused',1, datetime('now'),1)"))
    db.commit()
    # Applications for applied_count sorting
    db.execute(sa_text("INSERT INTO advisory_applications (target_project_id, email, status, created_at) VALUES (1,'s@x.com','new', datetime('now'))"))
    db.execute(sa_text("INSERT INTO advisory_applications (target_project_id, email, status, created_at) VALUES (1,'t@x.com','new', datetime('now'))"))
    db.execute(sa_text("INSERT INTO advisory_applications (target_project_id, email, status, created_at) VALUES (2,'u@x.com','new', datetime('now'))"))
    db.commit()

def test_public_projects_list_and_detail():
    db = next(get_db())
    try:
        seed_projects(db)
    finally:
        db.close()

    # List visible (active + closed)
    r = client.get('/api/public/projects')
    assert r.status_code == 200
    data = r.json()
    ids = [d['id'] for d in data]
    assert 1 in ids and 2 in ids
    assert 3 not in ids and 4 not in ids

    # Sort by applied count
    r2 = client.get('/api/public/projects?sort=applied')
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2[0]['id'] == 1  # two apps vs one

    # Filter by tags
    r3 = client.get('/api/public/projects?tags=Finance')
    assert r3.status_code == 200 and len(r3.json()) == 1 and r3.json()[0]['id'] == 1

    # Filter by mode/location
    r4 = client.get('/api/public/projects?mode=in_person&location=San')
    assert r4.status_code == 200 and len(r4.json()) == 1 and r4.json()[0]['id'] == 2

    # Detail visible for active/closed
    rd = client.get('/api/public/projects/1')
    assert rd.status_code == 200 and rd.json()['id'] == 1

    # Detail for draft should be 404
    rd2 = client.get('/api/public/projects/3')
    assert rd2.status_code == 404

