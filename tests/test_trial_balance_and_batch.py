"""
Trial Balance and batch posting endpoints tests; include edge classification checks.
"""

import sqlite3
from datetime import date
from jose import jwt
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.config import SECRET_KEY, ALGORITHM


client = TestClient(app)


def token(email: str) -> str:
    return jwt.encode({"sub": email}, SECRET_KEY, algorithm=ALGORITHM)


def headers(email: str):
    return {"Authorization": f"Bearer {token(email)}"}


def seed_min():
    db = sqlite3.connect("test_ngi_capital.db")
    c = db.cursor()
    # Ensure fresh schema per test to avoid column mismatches and duplicates
    c.execute("DROP TABLE IF EXISTS journal_entry_lines")
    c.execute("DROP TABLE IF EXISTS journal_entries")
    c.execute("DROP TABLE IF EXISTS chart_of_accounts")
    c.execute("CREATE TABLE IF NOT EXISTS partners (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, name TEXT, ownership_percentage REAL, is_active INTEGER DEFAULT 1)")
    c.execute("CREATE TABLE IF NOT EXISTS entities (id INTEGER PRIMARY KEY AUTOINCREMENT, legal_name TEXT, entity_type TEXT, is_active INTEGER DEFAULT 1)")
    c.execute("CREATE TABLE IF NOT EXISTS chart_of_accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER, account_code TEXT, account_name TEXT, account_type TEXT, normal_balance TEXT, is_active INTEGER DEFAULT 1)")
    c.execute("CREATE TABLE IF NOT EXISTS journal_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER, entry_number TEXT, entry_date DATE, description TEXT, total_debit REAL, total_credit REAL, created_by_id INTEGER, approved_by_id INTEGER, approval_status TEXT, is_posted INTEGER DEFAULT 0, posted_date TEXT)")
    c.execute("CREATE TABLE IF NOT EXISTS journal_entry_lines (id INTEGER PRIMARY KEY AUTOINCREMENT, journal_entry_id INTEGER, account_id INTEGER, line_number INTEGER, description TEXT, debit_amount REAL, credit_amount REAL)")
    c.execute("DELETE FROM partners")
    c.execute("DELETE FROM entities")
    c.execute("INSERT INTO partners (email, name, ownership_percentage, is_active) VALUES (?,?,?,1)", ("anurmamade@ngicapitaladvisory.com", "Andre", 50.0))
    c.execute("INSERT INTO partners (email, name, ownership_percentage, is_active) VALUES (?,?,?,1)", ("lwhitworth@ngicapitaladvisory.com", "Landon", 50.0))
    c.execute("INSERT INTO entities (id, legal_name, entity_type, is_active) VALUES (1, 'NGI Capital LLC', 'LLC', 1)")
    db.commit()
    db.close()


def create_account(entity_id: int, code: str, name: str, a_type: str, normal: str, who: str):
    return client.post(
        "/api/accounting/chart-of-accounts",
        json={
            "entity_id": entity_id,
            "account_code": code,
            "account_name": name,
            "account_type": a_type,
            "normal_balance": normal,
        },
        headers=headers(who),
    )


def test_trial_balance_and_batch_post():
    seed_min()
    cash = create_account(1, "11100", "Cash", "asset", "debit", "anurmamade@ngicapitaladvisory.com").json()
    rev = create_account(1, "41100", "Revenue", "revenue", "credit", "anurmamade@ngicapitaladvisory.com").json()

    # Create 2 entries: both approved but not posted
    for i in range(2):
        r = client.post(
            "/api/accounting/journal-entries",
            json={
                "entity_id": 1,
                "entry_date": date.today().isoformat(),
                "description": f"Rev {i}",
                "lines": [
                    {"account_id": cash["id"], "line_number": 1, "debit_amount": 100.0, "credit_amount": 0.0},
                    {"account_id": rev["id"], "line_number": 2, "debit_amount": 0.0, "credit_amount": 100.0},
                ],
            },
            headers=headers("anurmamamade@ngicapitaladvisory.com" if False else "anurmamade@ngicapitaladvisory.com"),
        )
        je = r.json()
        client.post(f"/api/accounting/journal-entries/{je['id']}/approve", json={"approve": True}, headers=headers("lwhitworth@ngicapitaladvisory.com"))

    # List unposted
    r_un = client.get("/api/accounting/journal-entries/unposted", params={"entity_id": 1}, headers=headers("lwhitworth@ngicapitaladvisory.com"))
    assert r_un.status_code == 200
    unposted = r_un.json()
    assert unposted["total"] >= 2

    # Batch post by entity
    r_batch = client.post("/api/accounting/journal-entries/post-batch", json={"entity_id": 1}, headers=headers("lwhitworth@ngicapitaladvisory.com"))
    assert r_batch.status_code == 200
    assert r_batch.json()["posted"] >= 2

    # Trial balance should be in balance (debits == credits)
    r_tb = client.get("/api/accounting/financials/trial-balance", params={"entity_id": 1, "as_of_date": date.today().isoformat()}, headers=headers("lwhitworth@ngicapitaladvisory.com"))
    assert r_tb.status_code == 200
    tb = r_tb.json()
    assert tb["in_balance"] is True


def test_income_statement_ignores_unknown_types():
    # Seed and insert a weird account type directly (bypassing API validation)
    seed_min()
    db = sqlite3.connect("test_ngi_capital.db")
    c = db.cursor()
    # normal accounts
    c.execute("INSERT INTO chart_of_accounts (id, entity_id, account_code, account_name, account_type, normal_balance) VALUES (1,1,'11100','Cash','asset','debit')")
    c.execute("INSERT INTO chart_of_accounts (id, entity_id, account_code, account_name, account_type, normal_balance) VALUES (2,1,'41100','Revenue','revenue','credit')")
    # unknown type account
    c.execute("INSERT INTO chart_of_accounts (id, entity_id, account_code, account_name, account_type, normal_balance) VALUES (3,1,'99999','Mystery','unknown','debit')")
    # entries
    c.execute("INSERT INTO journal_entries (id, entity_id, entry_number, entry_date, description, total_debit, total_credit, approval_status, is_posted) VALUES (1,1,'JE-001','2024-01-01','A',100,100,'approved',1)")
    c.execute("INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, description, debit_amount, credit_amount) VALUES (1,1,1,'',100,0)")
    c.execute("INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, description, debit_amount, credit_amount) VALUES (1,2,2,'',0,100)")
    # post something to the unknown type; it should be ignored in IS
    c.execute("INSERT INTO journal_entries (id, entity_id, entry_number, entry_date, description, total_debit, total_credit, approval_status, is_posted) VALUES (2,1,'JE-002','2024-01-01','B',50,50,'approved',1)")
    c.execute("INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, description, debit_amount, credit_amount) VALUES (2,3,1,'',50,0)")
    c.execute("INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, description, debit_amount, credit_amount) VALUES (2,1,2,'',0,50)")
    db.commit()
    db.close()

    r_is = client.get(
        "/api/accounting/financials/income-statement",
        params={"entity_id": 1, "start_date": "2024-01-01", "end_date": "2024-12-31"},
        headers=headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert r_is.status_code == 200
    data = r_is.json()
    assert data["total_revenue"] >= 100.0
    # unknown type should not inflate totals
    assert data["total_revenue"] == data["revenue_lines"][0]["amount"]
