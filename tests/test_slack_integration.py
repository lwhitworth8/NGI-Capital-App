import os
from fastapi.testclient import TestClient

os.environ.setdefault("DISABLE_ADVISORY_AUTH", "1")

from src.api.main import app  # noqa: E402
from tests.helpers_auth import auth_headers  # noqa: E402
from src.api.database import get_db  # noqa: E402
from sqlalchemy import text as sa_text  # noqa: E402


client = TestClient(app)


def _seed_project(code: str = "PROJ-TES-001") -> int:
    db = next(get_db())
    try:
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
                slack_channel_id TEXT,
                slack_channel_name TEXT,
                created_at TEXT,
                updated_at TEXT
            )
            """
        ))
        db.execute(sa_text(
            "INSERT INTO advisory_projects (entity_id, client_name, project_name, summary, status, mode, project_code, created_at, updated_at) VALUES (1,'Client','Proj','Summary','active','remote',:code,datetime('now'),datetime('now'))"
        ), {"code": code})
        db.commit()
        # Resolve id by project_code to avoid cross-connection issues with last_insert_rowid()
        row = db.execute(sa_text("SELECT id FROM advisory_projects WHERE project_code = :code ORDER BY id DESC LIMIT 1"), {"code": code}).fetchone()
        return int((row or [0])[0] or 0)
    finally:
        db.close()


def test_slack_ensure_disabled_returns_false(monkeypatch):
    # Ensure slack is disabled
    monkeypatch.delenv("ENABLE_SLACK", raising=False)
    monkeypatch.delenv("SLACK_BOT_TOKEN", raising=False)
    pid = _seed_project()
    res = client.post(
        f"/api/advisory/projects/{pid}/slack/ensure",
        json={"emails": ["test@example.com"]},
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert res.status_code == 200
    body = res.json()
    assert body.get("enabled") is False


def test_slack_ensure_creates_and_invites(monkeypatch):
    pid = _seed_project("PROJ-TST-777")
    # Enable slack but patch to avoid real API calls
    monkeypatch.setenv("ENABLE_SLACK", "1")
    monkeypatch.setenv("SLACK_BOT_TOKEN", "xoxb-test-token")

    invited = {}

    from src.api.integrations import slack as slack_mod

    def fake_ensure(code: str):
        return {"id": "C123TEST", "name": f"proj-{code.lower()}-team"}

    def fake_invite(channel_id: str, emails):
        invited["channel"] = channel_id
        invited["emails"] = list(emails)

    monkeypatch.setattr(slack_mod, "ensure_project_channel", fake_ensure)
    monkeypatch.setattr(slack_mod, "invite_members", fake_invite)
    monkeypatch.setattr(slack_mod, "is_enabled", lambda: True)

    emails = ["anurmamade@ngicapitaladvisory.com", "lwhitworth@ngicapitaladvisory.com"]
    res = client.post(
        f"/api/advisory/projects/{pid}/slack/ensure",
        json={"emails": emails},
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body.get("enabled") is True
    ch = body.get("channel") or {}
    assert ch.get("id") == "C123TEST"

    # verify DB updated
    db = next(get_db())
    try:
        row = db.execute(sa_text("SELECT slack_channel_id, slack_channel_name FROM advisory_projects WHERE id = :p"), {"p": pid}).fetchone()
        assert row is not None
        assert (row[0] or "") == "C123TEST"
    finally:
        db.close()

    # verify invite called
    assert invited.get("channel") == "C123TEST"
    assert invited.get("emails") == emails


def test_slack_post_hooks_on_task_creation(monkeypatch):
    # Patch slack posting to capture messages
    messages = []
    from src.api.integrations import slack as slack_mod
    monkeypatch.setattr(slack_mod, "is_enabled", lambda: True)
    monkeypatch.setattr(slack_mod, "ensure_project_channel", lambda code: {"id": "CXYZ", "name": f"proj-{code.lower()}-team"})
    monkeypatch.setattr(slack_mod, "post_message", lambda channel_id, text, blocks=None: messages.append((channel_id, text)))
    monkeypatch.setenv("ENABLE_SLACK", "1")
    monkeypatch.setenv("SLACK_BOT_TOKEN", "xoxb-test")

    pid = _seed_project("PROJ-POST-001")

    # Create a task via admin endpoint
    res = client.post(
        f"/api/advisory/projects/{pid}/tasks",
        json={"title": "Slack Test Task", "assignees": []},
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert res.status_code == 200, res.text
    # A message should be recorded
    assert any("Slack Test Task" in m[1] for m in messages)
