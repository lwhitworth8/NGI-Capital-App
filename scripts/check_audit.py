from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from jose import jwt
from sqlalchemy import text as sa_text

from services.api.main import app
from services.api.config import SECRET_KEY, ALGORITHM
from services.api.database import get_db


def make_token(email: str) -> str:
    now = datetime.utcnow()
    payload = {
        "sub": email,
        "partner_id": 0,
        "iat": now,
        "exp": (now + timedelta(hours=1)).replace(microsecond=0),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def main():
    client = TestClient(app)
    headers = {"Authorization": f"Bearer {make_token('anurmamade@ngicapitaladvisory.com')}"}

    with next(get_db()) as db:
        db.execute(sa_text("DELETE FROM advisory_students"))
        db.execute(sa_text("DELETE FROM advisory_students_deleted"))
        db.execute(sa_text("CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_email TEXT, action TEXT, resource_type TEXT, resource_id INTEGER, table_name TEXT, record_id INTEGER, old_values TEXT, new_values TEXT, ip_address TEXT, user_agent TEXT, session_id TEXT, request_id TEXT, success INTEGER, error_message TEXT, created_at TEXT)"))
        db.execute(sa_text("DELETE FROM audit_log"))
        db.commit()

    r = client.post("/api/advisory/students", json={"first_name":"Linus","last_name":"T","email":"linus@ucla.edu","grad_year":2100}, headers=headers)
    print('create student status', r.status_code, r.text)
    sid = r.json()["id"]
    r = client.put(f"/api/advisory/students/{sid}/status-override", json={"status":"alumni","reason":"Manual"}, headers=headers)
    print('override status', r.status_code, r.text)
    r = client.put(f"/api/advisory/students/{sid}/status-override", json={"clear": True}, headers=headers)
    print('clear status', r.status_code, r.text)

    with next(get_db()) as db:
        rows = db.execute(sa_text("SELECT id, action, table_name, record_id, user_email, created_at FROM audit_log ORDER BY id"), {}).fetchall()
        print('audit rows:', rows)


if __name__ == '__main__':
    main()

