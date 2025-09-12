from fastapi.testclient import TestClient
from sqlalchemy import text as sa_text
from src.api.main import app
from src.api.database import get_db


client = TestClient(app)


def _clear_student(email: str) -> None:
    with next(get_db()) as db:  # type: ignore
        db.execute(sa_text("DELETE FROM advisory_students WHERE lower(email) = :em"), {"em": email.lower()})
        db.commit()


def _count_students(email: str) -> int:
    with next(get_db()) as db:  # type: ignore
        row = db.execute(sa_text("SELECT COUNT(1) FROM advisory_students WHERE lower(email) = :em"), {"em": email.lower()}).fetchone()
        return int(row[0] or 0) if row else 0


def test_public_profile_auto_creates_student_record():
    email = "playwright-auto-create@berkeley.edu"
    _clear_student(email)

    # First fetch creates the record if domain is allowed
    r1 = client.get("/api/public/profile", headers={"X-Student-Email": email})
    assert r1.status_code == 200
    data = r1.json()
    assert data.get("email", "").lower() == email
    assert _count_students(email) == 1

    # Second fetch is idempotent
    r2 = client.get("/api/public/profile", headers={"X-Student-Email": email})
    assert r2.status_code == 200
    assert _count_students(email) == 1

