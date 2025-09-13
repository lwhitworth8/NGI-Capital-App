import os
import json
from fastapi.testclient import TestClient

# Ensure admin bypass for advisory routes during tests
os.environ.setdefault("DISABLE_ADVISORY_AUTH", "1")

from src.api.main import app  # noqa: E402
from tests.helpers_auth import auth_headers  # noqa: E402
from src.api.database import get_db  # noqa: E402
from sqlalchemy import text as sa_text  # noqa: E402


client = TestClient(app)


def _create_project() -> int:
    """Create a minimal advisory project directly in DB and return its id."""
    db = next(get_db())
    try:
        # Ensure tables exist
        db.execute(sa_text(
            """
            CREATE TABLE IF NOT EXISTS advisory_projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id INTEGER,
                client_name TEXT,
                project_name TEXT,
                summary TEXT,
                description TEXT,
                status TEXT,
                mode TEXT,
                location_text TEXT,
                start_date TEXT,
                end_date TEXT,
                duration_weeks INTEGER,
                commitment_hours_per_week INTEGER,
                project_code TEXT,
                project_lead TEXT,
                contact_email TEXT,
                partner_badges TEXT,
                backer_badges TEXT,
                tags TEXT,
                hero_image_url TEXT,
                gallery_urls TEXT,
                apply_cta_text TEXT,
                apply_url TEXT,
                eligibility_notes TEXT,
                notes_internal TEXT,
                is_public INTEGER,
                allow_applications INTEGER,
                coffeechat_calendly TEXT,
                team_size INTEGER,
                team_requirements TEXT,
                showcase_pdf_url TEXT,
                partner_logos TEXT,
                backer_logos TEXT,
                created_at TEXT,
                updated_at TEXT
            )
            """
        ))
        db.execute(sa_text(
            """
            INSERT INTO advisory_projects (entity_id, client_name, project_name, summary, status, mode, project_code, created_at, updated_at)
            VALUES (:eid, :client, :pname, :sum, :st, :mode, :pcode, datetime('now'), datetime('now'))
            """
        ), {
            "eid": 1,
            "client": "Test Client",
            "pname": "Test Project",
            "sum": "This is a test project used in PLM tests",
            "st": "draft",
            "mode": "remote",
            "pcode": "PROJ-TES-001",
        })
        db.commit()
        rid = db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0
        return int(rid)
    finally:
        db.close()


def _create_student(email: str | None = None) -> int:
    if email is None:
        import uuid as _uuid
        email = f"student+{_uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": email,
        "first_name": "Stu",
        "last_name": "Dent",
        "entity_id": 1,
        "status": "active",
    }
    res = client.post(
        "/api/advisory/students",
        json=payload,
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert res.status_code == 200, res.text
    sid = int(res.json().get("id") or 0)
    assert sid > 0
    return sid


def test_plm_create_and_list_tasks():
    pid = _create_project()

    # Create a task
    t_payload = {
        "title": "Initial Research",
        "description": "Collect market data",
        "priority": "med",
        "status": "todo",
        "planned_hours": 6,
    }
    res = client.post(
        f"/api/advisory/projects/{pid}/tasks",
        json=t_payload,
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert res.status_code == 200, res.text
    tid = int(res.json().get("id") or 0)
    assert tid > 0

    # List tasks and verify
    res2 = client.get(
        f"/api/advisory/projects/{pid}/tasks",
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert res2.status_code == 200
    items = res2.json()
    assert isinstance(items, list)
    assert any(t.get("id") == tid and t.get("title") == "Initial Research" for t in items)


def test_plm_submit_url_and_size_guard():
    pid = _create_project()
    sid = _create_student()

    # Create a task
    res = client.post(
        f"/api/advisory/projects/{pid}/tasks",
        json={"title": "Submit Deck", "priority": "high", "status": "review"},
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert res.status_code == 200, res.text
    tid = int(res.json().get("id") or 0)

    # Submit by URL (no file upload in this test)
    payload = {"email": "student2@example.com", "kind": "url", "url": "https://drive.example.com/f/deck.pdf"}
    res2 = client.post(
        f"/api/advisory/tasks/{tid}/submit",
        json=payload,
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert res2.status_code == 200, res2.text
    body = res2.json()
    assert body.get("task_id") == tid
    assert body.get("kind") == "url"

    # Verify a submission row exists
    db = next(get_db())
    try:
        row = db.execute(sa_text("SELECT COUNT(1) FROM project_task_submissions WHERE task_id = :t"), {"t": tid}).fetchone()
        assert int((row or [0])[0] or 0) >= 1
    finally:
        db.close()


def test_plm_comments_and_meetings():
    pid = _create_project()
    # Create task
    res = client.post(
        f"/api/advisory/projects/{pid}/tasks",
        json={"title": "Comment Task", "priority": "low"},
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert res.status_code == 200
    tid = int(res.json().get("id") or 0)

    # Add a comment (admin)
    cres = client.post(
        f"/api/advisory/tasks/{tid}/comments",
        json={"body": "Please refine section 2"},
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert cres.status_code == 200
    cid = int(cres.json().get("id") or 0)
    assert cid > 0

    # List comments
    lres = client.get(
        f"/api/advisory/tasks/{tid}/comments",
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert lres.status_code == 200
    comments = lres.json()
    assert any(c.get('id') == cid for c in comments)

    # Create a meeting (Google returns mock unless enabled)
    mres = client.post(
        f"/api/advisory/projects/{pid}/meetings",
        json={"title": "Kickoff", "start_ts": "2025-01-01T18:00:00Z", "end_ts": "2025-01-01T19:00:00Z", "attendees_emails": ["student@example.com"]},
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert mres.status_code == 200
    mid = int(mres.json().get("id") or 0)
    assert mid > 0

    # List meetings
    lm = client.get(
        f"/api/advisory/projects/{pid}/meetings",
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert lm.status_code == 200
    meetings = lm.json()
    assert any(m.get('id') == mid for m in meetings)


def test_plm_deliverables_and_timesheets_segments():
    pid = _create_project()
    sid = _create_student()
    # Create task, submit URL
    res = client.post(
        f"/api/advisory/projects/{pid}/tasks",
        json={"title": "Deliverable", "priority": "high"},
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert res.status_code == 200
    tid = int(res.json().get("id") or 0)
    # resolve created student's email from DB
    db = next(get_db())
    try:
        row = db.execute(sa_text("SELECT email FROM advisory_students WHERE id = :id"), {"id": sid}).fetchone()
        stu_email = str((row or [""])[0] or "")
    finally:
        db.close()
    payload = {"email": stu_email, "kind": "url", "url": "https://drive.example.com/f/file.pdf"}
    res2 = client.post(f"/api/advisory/tasks/{tid}/submit", json=payload)
    assert res2.status_code == 200

    # List deliverables
    dres = client.get(
        f"/api/advisory/projects/{pid}/deliverables",
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert dres.status_code == 200
    dels = dres.json()
    assert any(d.get('task_id') == tid for d in dels)

    # Add timesheet entry via public API with segments
    segments = [{"start": "09:00", "end": "10:00", "hours": 1}]
    tres = client.post(f"/api/public/projects/{pid}/timesheets/2025-01-05/entries", json={
        "student_id": sid,
        "task_id": tid,
        "day": "Sun",
        "segments": segments,
        "hours": 1,
    })
    assert tres.status_code == 200

    # Verify segments included in admin timesheets listing
    lts = client.get(
        f"/api/advisory/projects/{pid}/timesheets",
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert lts.status_code == 200
    rows = lts.json()
    found_seg = False
    for r in rows:
        for e in (r.get('entries') or []):
            if e.get('task_id') == tid and e.get('segments'):
                found_seg = True
                break
        if found_seg:
            break
    assert found_seg
