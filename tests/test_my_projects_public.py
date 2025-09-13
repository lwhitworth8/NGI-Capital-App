import os
from fastapi.testclient import TestClient

os.environ.setdefault("DISABLE_ADVISORY_AUTH", "1")

from src.api.main import app  # noqa: E402
from tests.helpers_auth import auth_headers  # noqa: E402
from src.api.database import get_db  # noqa: E402
from sqlalchemy import text as sa_text  # noqa: E402


client = TestClient(app)


def _seed_project_and_student():
    db = next(get_db())
    try:
        # Ensure base tables
        db.execute(sa_text(
            """
            CREATE TABLE IF NOT EXISTS advisory_projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id INTEGER,
                client_name TEXT,
                project_name TEXT,
                summary TEXT,
                status TEXT,
                mode TEXT,
                project_code TEXT,
                created_at TEXT,
                updated_at TEXT
            )
            """
        ))
        db.execute(sa_text(
            "INSERT INTO advisory_projects (entity_id, client_name, project_name, summary, status, mode, project_code, created_at, updated_at) VALUES (1,'Client','MyProj','Summary','active','remote','PROJ-TES-123',datetime('now'),datetime('now'))"
        ))
        pid = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0)
        # Student
        email = "student_public@example.com"
        db.execute(sa_text("CREATE TABLE IF NOT EXISTS advisory_students (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER, first_name TEXT, last_name TEXT, email TEXT UNIQUE, status TEXT, created_at TEXT, updated_at TEXT)"))
        db.execute(sa_text("INSERT OR IGNORE INTO advisory_students (entity_id, first_name, last_name, email, status, created_at, updated_at) VALUES (1,'Stu','Dent',:em,'active',datetime('now'),datetime('now'))"), {"em": email})
        sid = int(db.execute(sa_text("SELECT id FROM advisory_students WHERE lower(email) = :em"), {"em": email}).fetchone()[0])
        # Assignment
        db.execute(sa_text("CREATE TABLE IF NOT EXISTS advisory_project_assignments (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, student_id INTEGER, role TEXT, hours_planned INTEGER, active INTEGER DEFAULT 1, created_at TEXT)"))
        db.execute(sa_text("INSERT INTO advisory_project_assignments (project_id, student_id, role, hours_planned, active, created_at) VALUES (:p,:s,'analyst',10,1,datetime('now'))"), {"p": pid, "s": sid})
        db.commit()
        return pid, sid, email
    finally:
        db.close()


def _create_task(pid: int, sid: int) -> int:
    # Admin create task then assign
    res = client.post(
        f"/api/advisory/projects/{pid}/tasks",
        json={"title": "Do Work", "priority": "med", "assignees": [sid]},
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert res.status_code == 200, res.text
    return int(res.json().get("id") or 0)


def test_public_my_projects_flow_with_header_email():
    pid, sid, email = _seed_project_and_student()
    tid = _create_task(pid, sid)

    # My projects
    mp = client.get("/api/public/my-projects", headers={"X-Student-Email": email})
    assert mp.status_code == 200, mp.text
    items = mp.json()
    assert any(i.get('id') == pid for i in items)

    # Tasks list (only assigned or group)
    tl = client.get(f"/api/public/projects/{pid}/tasks", headers={"X-Student-Email": email})
    assert tl.status_code == 200
    assert any(t.get('id') == tid for t in tl.json())

    # Submit by URL without email in payload, using header fallback
    sres = client.post(f"/api/public/tasks/{tid}/submit", json={"kind": "url", "url": "https://example.com"}, headers={"X-Student-Email": email})
    assert sres.status_code == 200, sres.text

    # Comments: post and list via public endpoints
    cres = client.post(f"/api/public/tasks/{tid}/comments", json={"body": "Looks good"}, headers={"X-Student-Email": email})
    assert cres.status_code == 200, cres.text
    cid = int(cres.json().get('id') or 0)
    assert cid > 0
    cl = client.get(f"/api/public/tasks/{tid}/comments")
    assert cl.status_code == 200
    assert any(c.get('id') == cid for c in cl.json())

    # Timesheets entry via header (no student_id)
    tres = client.post(f"/api/public/projects/{pid}/timesheets/2025-01-05/entries", json={"task_id": tid, "day": "Sun", "hours": 1}, headers={"X-Student-Email": email})
    assert tres.status_code == 200, tres.text
    # Verify present in admin list
    al = client.get(
        f"/api/advisory/projects/{pid}/timesheets",
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert al.status_code == 200
    found = False
    for r in al.json():
        for e in r.get('entries') or []:
            if e.get('task_id') == tid:
                found = True
                break
        if found:
            break
    assert found
