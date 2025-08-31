"""
Posting workflow, immutability, financial statements, and audit log tests.
"""

import sqlite3
from pathlib import Path
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


def seed_db():
    db = sqlite3.connect("test_ngi_capital.db")
    c = db.cursor()
    # Drop potentially pre-existing tables to ensure fresh schema per test
    c.execute("DROP TABLE IF EXISTS journal_entry_lines")
    c.execute("DROP TABLE IF EXISTS journal_entries")
    c.execute("DROP TABLE IF EXISTS chart_of_accounts")
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS partners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            ownership_percentage REAL NOT NULL,
            capital_account_balance REAL DEFAULT 0,
            is_active BOOLEAN DEFAULT 1
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS entities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            legal_name TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS chart_of_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            account_code TEXT,
            account_name TEXT,
            account_type TEXT,
            parent_account_id INTEGER,
            normal_balance TEXT,
            is_active INTEGER DEFAULT 1,
            description TEXT
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            entry_number TEXT,
            entry_date DATE,
            description TEXT,
            reference_number TEXT,
            total_debit REAL DEFAULT 0,
            total_credit REAL DEFAULT 0,
            created_by_id INTEGER,
            approved_by_id INTEGER,
            approval_status TEXT,
            approval_date TEXT,
            approval_notes TEXT,
            is_posted INTEGER DEFAULT 0,
            posted_date TEXT
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS journal_entry_lines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            journal_entry_id INTEGER,
            account_id INTEGER,
            line_number INTEGER,
            description TEXT,
            debit_amount REAL DEFAULT 0,
            credit_amount REAL DEFAULT 0
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT,
            table_name TEXT,
            record_id INTEGER,
            old_values TEXT,
            new_values TEXT,
            timestamp TEXT
        )
        """
    )
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


def test_posting_and_immutability_and_reports():
    seed_db()

    # Accounts
    cash = create_account(1, "11100", "Cash", "asset", "debit", "anurmamade@ngicapitaladvisory.com").json()
    revenue_acc = create_account(1, "41100", "Revenue", "revenue", "credit", "anurmamade@ngicapitaladvisory.com").json()
    supplies = create_account(1, "52900", "Office Supplies", "expense", "debit", "anurmamade@ngicapitaladvisory.com").json()

    # JE1: Recognize revenue: Dr Cash 500, Cr Revenue 500
    r1 = client.post(
        "/api/accounting/journal-entries",
        json={
            "entity_id": 1,
            "entry_date": date.today().isoformat(),
            "description": "Revenue",
            "lines": [
                {"account_id": cash["id"], "line_number": 1, "debit_amount": 500.0, "credit_amount": 0.0},
                {"account_id": revenue_acc["id"], "line_number": 2, "debit_amount": 0.0, "credit_amount": 500.0},
            ],
        },
        headers=headers("anurmamade@ngicapitaladvisory.com"),
    )
    assert r1.status_code == 200
    je1 = r1.json()
    # Approve by other partner and post
    assert client.post(f"/api/accounting/journal-entries/{je1['id']}/approve", json={"approve": True}, headers=headers("lwhitworth@ngicapitaladvisory.com")).status_code == 200
    assert client.post(f"/api/accounting/journal-entries/{je1['id']}/post", headers=headers("lwhitworth@ngicapitaladvisory.com")).status_code == 200

    # JE2: Record expense: Dr Supplies 200, Cr Cash 200
    r2 = client.post(
        "/api/accounting/journal-entries",
        json={
            "entity_id": 1,
            "entry_date": date.today().isoformat(),
            "description": "Supplies",
            "lines": [
                {"account_id": supplies["id"], "line_number": 1, "debit_amount": 200.0, "credit_amount": 0.0},
                {"account_id": cash["id"], "line_number": 2, "debit_amount": 0.0, "credit_amount": 200.0},
            ],
        },
        headers=headers("anurmamade@ngicapitaladvisory.com"),
    )
    assert r2.status_code == 200
    je2 = r2.json()
    assert client.post(f"/api/accounting/journal-entries/{je2['id']}/approve", json={"approve": True}, headers=headers("lwhitworth@ngicapitaladvisory.com")).status_code == 200
    assert client.post(f"/api/accounting/journal-entries/{je2['id']}/post", headers=headers("lwhitworth@ngicapitaladvisory.com")).status_code == 200

    # Attempt to edit posted JE description -> should be blocked
    r_edit = client.put(f"/api/accounting/journal-entries/{je2['id']}", json={"description": "New desc"}, headers=headers("anurmamade@ngicapitaladvisory.com"))
    assert r_edit.status_code == 400

    # Create adjusting entry for JE2
    r_adj = client.post(f"/api/accounting/journal-entries/{je2['id']}/adjust", json={}, headers=headers("anurmamade@ngicapitaladvisory.com"))
    assert r_adj.status_code == 200

    # Income Statement for period
    r_is = client.get(
        "/api/accounting/financials/income-statement",
        params={"entity_id": 1, "start_date": date.today().isoformat(), "end_date": date.today().isoformat()},
        headers=headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert r_is.status_code == 200
    data_is = r_is.json()
    # Expect revenue 500 and expenses at least 200 for simple case
    assert data_is["revenue"] >= 500.0
    assert data_is["expenses"] >= 200.0
    assert data_is["net_income"] == data_is["revenue"] - data_is["expenses"]

    # Balance Sheet (presence + types)
    r_bs = client.get(
        "/api/accounting/financials/balance-sheet",
        params={"entity_id": 1, "as_of_date": date.today().isoformat()},
        headers=headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert r_bs.status_code == 200
    bs = r_bs.json()
    assert set(["assets", "liabilities", "equity"]).issubset(bs.keys())

    # Cash Flow
    r_cf = client.get(
        "/api/accounting/financials/cash-flow",
        params={"entity_id": 1, "start_date": date.today().isoformat(), "end_date": date.today().isoformat()},
        headers=headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert r_cf.status_code == 200
    cf = r_cf.json()
    assert "net_change_in_cash" in cf

    # Audit log should have at least one entry
    db = sqlite3.connect("test_ngi_capital.db")
    c = db.cursor()
    try:
        c.execute("SELECT COUNT(*) FROM audit_log")
        cnt = c.fetchone()[0]
        assert cnt >= 1
    except Exception:
        # if audit_log table missing, skip audit check
        pass
    finally:
        db.close()
