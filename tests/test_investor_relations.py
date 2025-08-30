"""
Investor Relations API tests
"""

import sqlite3
from pathlib import Path
from datetime import datetime
from fastapi.testclient import TestClient
from jose import jwt

from src.api.main import app
from src.api.config import SECRET_KEY, ALGORITHM
import os
import pytest


client = TestClient(app)


def token(email="lwhitworth@ngicapitaladvisory.com"):
    return jwt.encode({"sub": email}, SECRET_KEY, algorithm=ALGORITHM)


def headers():
    return {"Authorization": f"Bearer {token()}"}


def ensure_partners_db():
    db = Path("test_ngi_capital.db")
    conn = sqlite3.connect(str(db))
    c = conn.cursor()
    # partners table
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS partners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT,
            ownership_percentage REAL NOT NULL,
            capital_account_balance REAL DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    # Clear and seed partners used by cap table tests
    c.execute("DELETE FROM partners")
    c.execute(
        "INSERT INTO partners (email, name, ownership_percentage, capital_account_balance, is_active) VALUES (?,?,?,?,1)",
        ("anurmamade@ngicapitaladvisory.com", "Andre Nurmamade", 50.0, 1055000),
    )
    c.execute(
        "INSERT INTO partners (email, name, ownership_percentage, capital_account_balance, is_active) VALUES (?,?,?,?,1)",
        ("lwhitworth@ngicapitaladvisory.com", "Landon Whitworth", 50.0, 1055000),
    )
    conn.commit()
    conn.close()


@pytest.fixture(autouse=True)
def manage_test_db():
    """Backup/restore test DB so tests don't leave data."""
    db_path = Path("test_ngi_capital.db")
    backup = Path("test_ngi_capital.db.bak")
    existed = db_path.exists()
    if existed:
        if backup.exists():
            backup.unlink()
        db_path.replace(backup)
    try:
        yield
    finally:
        if existed and backup.exists():
            if db_path.exists():
                db_path.unlink()
            backup.replace(db_path)
        else:
            if db_path.exists():
                db_path.unlink()


def test_cap_table_from_accounting():
    # Build minimal accounting schema and equity entries
    db = Path("test_ngi_capital.db")
    conn = sqlite3.connect(str(db))
    c = conn.cursor()
    c.execute("CREATE TABLE IF NOT EXISTS entities (id INTEGER PRIMARY KEY, legal_name TEXT, entity_type TEXT, is_active INTEGER DEFAULT 1)")
    c.execute("DELETE FROM entities")
    c.execute("INSERT INTO entities (id, legal_name, entity_type, is_active) VALUES (1, 'NGI Capital LLC', 'LLC', 1)")
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS chart_of_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            account_code TEXT,
            account_name TEXT,
            account_type TEXT,
            is_active INTEGER DEFAULT 1
        )
        """
    )
    c.execute("CREATE TABLE IF NOT EXISTS journal_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER, approval_status TEXT)")
    c.execute(
        "CREATE TABLE IF NOT EXISTS journal_entry_lines (id INTEGER PRIMARY KEY AUTOINCREMENT, journal_entry_id INTEGER, account_id INTEGER, debit_amount REAL DEFAULT 0, credit_amount REAL DEFAULT 0)"
    )
    # Clear
    c.execute("DELETE FROM chart_of_accounts")
    c.execute("DELETE FROM journal_entries")
    c.execute("DELETE FROM journal_entry_lines")
    # Two member equity accounts
    c.execute("INSERT INTO chart_of_accounts (entity_id, account_code, account_name, account_type) VALUES (1, '30001', 'Member Equity - Andre', 'equity')")
    acc1 = c.lastrowid
    c.execute("INSERT INTO chart_of_accounts (entity_id, account_code, account_name, account_type) VALUES (1, '30002', 'Member Equity - Landon', 'equity')")
    acc2 = c.lastrowid
    # One approved journal entry with credits to equity (50/50)
    c.execute("INSERT INTO journal_entries (entity_id, approval_status) VALUES (1, 'approved')")
    je = c.lastrowid
    c.execute("INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount) VALUES (?,?,0,1055000)", (je, acc1))
    c.execute("INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount) VALUES (?,?,0,1055000)", (je, acc2))
    conn.commit()
    conn.close()

    r = client.get("/api/investor-relations/cap-table", params={"entity_id": 1}, headers=headers())
    assert r.status_code == 200
    data = r.json()
    assert data["total_equity"] == 2110000
    assert "members" in data and len(data["members"]) == 2


def test_outreach_crud_and_comm():
    # Create outreach
    r = client.post(
        "/api/investor-relations/outreach",
        json={"name": "Jane Investor", "email": "jane@example.com", "firm": "ABC Capital", "notes": "warm intro"},
        headers=headers(),
    )
    assert r.status_code == 200
    oid = r.json()["id"]

    # List
    r = client.get("/api/investor-relations/outreach", headers=headers())
    assert r.status_code == 200
    assert any(item["id"] == oid for item in r.json())

    # Update stage
    r = client.put(f"/api/investor-relations/outreach/{oid}", json={"stage": "in_talks"}, headers=headers())
    assert r.status_code == 200

    # Find investor_id to create a communication
    r = client.get("/api/investor-relations/outreach", headers=headers())
    items = r.json()
    # pull first matching outreach and lookup their investor id by name via internal DB access
    # Simpler: we can just find the investor via communications list after creating
    # but we need investor_id; query DB directly
    db = sqlite3.connect("test_ngi_capital.db")
    c = db.cursor()
    c.execute("SELECT id FROM investors WHERE email = ?", ("jane@example.com",))
    inv = c.fetchone()[0]
    db.close()

    # Communication
    r = client.post(
        "/api/investor-relations/communications",
        json={"investor_id": inv, "subject": "Intro", "message": "Hello"},
        headers=headers(),
    )
    assert r.status_code == 200
    cid = r.json()["id"]
    r = client.get("/api/investor-relations/communications", headers=headers())
    assert r.status_code == 200
    assert any(m["id"] == cid for m in r.json())

    # Summary
    r = client.get("/api/investor-relations/reports/summary", headers=headers())
    assert r.status_code == 200
    assert "investors" in r.json()
    assert "pipeline" in r.json()

    # Delete outreach row
    r = client.delete(f"/api/investor-relations/outreach/{oid}", headers=headers())
    assert r.status_code == 200
