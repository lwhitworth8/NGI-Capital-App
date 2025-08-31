"""
Accounting compliance tests for NGI Capital
 - Double-entry enforcement (debits == credits)
 - No self-approval on journal entries
 - Dual-approval workflow via separate partner
 - Basic GL reporting correctness
The tests use the shared FastAPI app and the pytest test DB path selected by config.
"""

import sqlite3
from pathlib import Path
from datetime import date

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from src.api.main import app
from src.api.config import SECRET_KEY, ALGORITHM


client = TestClient(app)


def make_token(email: str) -> str:
    return jwt.encode({"sub": email}, SECRET_KEY, algorithm=ALGORITHM)


@pytest.fixture(autouse=True)
def manage_test_db():
    """Backup/restore the pytest DB so tests do not leak state."""
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


def seed_minimal_base():
    """Ensure partners and entities tables exist and contain rows used by tests."""
    db = sqlite3.connect("test_ngi_capital.db")
    c = db.cursor()
    # Reset accounting tables to avoid duplicates and ensure correct columns
    c.execute("DROP TABLE IF EXISTS journal_entry_lines")
    c.execute("DROP TABLE IF EXISTS journal_entries")
    c.execute("DROP TABLE IF EXISTS chart_of_accounts")
    # partners
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
    # entities
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS entities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            legal_name TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            ein TEXT,
            formation_date DATE,
            state TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    # accounting tables needed by router (minimal columns)
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
            posted_date TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    # seed partners and one entity
    c.execute("DELETE FROM partners")
    c.execute(
        "INSERT INTO partners (email, name, ownership_percentage, capital_account_balance, is_active) VALUES (?,?,?,?,1)",
        ("anurmamade@ngicapitaladvisory.com", "Andre Nurmamade", 50.0, 0.0),
    )
    c.execute(
        "INSERT INTO partners (email, name, ownership_percentage, capital_account_balance, is_active) VALUES (?,?,?,?,1)",
        ("lwhitworth@ngicapitaladvisory.com", "Landon Whitworth", 50.0, 0.0),
    )
    c.execute("DELETE FROM entities")
    c.execute(
        "INSERT INTO entities (id, legal_name, entity_type, ein, formation_date, state, is_active) VALUES (1, 'NGI Capital LLC', 'LLC', '88-1234567', '2024-01-01', 'DE', 1)"
    )
    db.commit()
    db.close()


def auth_headers(email: str):
    return {"Authorization": f"Bearer {make_token(email)}"}


def create_account(entity_id: int, code: str, name: str, a_type: str, normal: str, email: str):
    r = client.post(
        "/api/accounting/chart-of-accounts",
        json={
            "entity_id": entity_id,
            "account_code": code,
            "account_name": name,
            "account_type": a_type,
            "normal_balance": normal,
        },
        headers=auth_headers(email),
    )
    return r


def test_chart_of_accounts_and_validation():
    seed_minimal_base()

    # Valid asset and expense accounts
    r1 = create_account(1, "11100", "Cash", "asset", "debit", "anurmamade@ngicapitaladvisory.com")
    assert r1.status_code == 200
    acc_cash = r1.json()

    r2 = create_account(1, "52900", "Office Supplies", "expense", "debit", "anurmamade@ngicapitaladvisory.com")
    assert r2.status_code == 200
    acc_exp = r2.json()

    assert acc_cash["account_code"] == "11100"
    assert acc_exp["account_code"] == "52900"

    # Invalid mapping: revenue code declared as asset
    r3 = create_account(1, "41100", "Consulting Revenue", "asset", "credit", "anurmamade@ngicapitaladvisory.com")
    assert r3.status_code == 400

    # List accounts
    r4 = client.get(
        "/api/accounting/chart-of-accounts/1",
        headers=auth_headers("anurmamade@ngicapitaladvisory.com"),
    )
    assert r4.status_code == 200
    items = r4.json()
    assert isinstance(items, list) and len(items) >= 2


def test_journal_entry_double_entry_and_approval_flow():
    seed_minimal_base()

    # Create accounts
    cash = create_account(1, "11100", "Cash", "asset", "debit", "anurmamade@ngicapitaladvisory.com").json()
    supplies = create_account(1, "52900", "Office Supplies", "expense", "debit", "anurmamamade@ngicapitaladvisory.com" if False else "anurmamade@ngicapitaladvisory.com").json()

    # Unbalanced entry should fail validation (422 via Pydantic)
    r_bad = client.post(
        "/api/accounting/journal-entries",
        json={
            "entity_id": 1,
            "entry_date": date.today().isoformat(),
            "description": "Test unbalanced",
            "lines": [
                {"account_id": cash["id"], "line_number": 1, "debit_amount": 100.0, "credit_amount": 0.0},
                {"account_id": supplies["id"], "line_number": 2, "debit_amount": 0.0, "credit_amount": 50.0},
            ],
        },
        headers=auth_headers("anurmamade@ngicapitaladvisory.com"),
    )
    assert r_bad.status_code == 422

    # Balanced entry
    r_ok = client.post(
        "/api/accounting/journal-entries",
        json={
            "entity_id": 1,
            "entry_date": date.today().isoformat(),
            "description": "Office supplies purchase",
            "lines": [
                {"account_id": supplies["id"], "line_number": 1, "debit_amount": 250.0, "credit_amount": 0.0},
                {"account_id": cash["id"], "line_number": 2, "debit_amount": 0.0, "credit_amount": 250.0},
            ],
        },
        headers=auth_headers("anurmamade@ngicapitaladvisory.com"),
    )
    assert r_ok.status_code == 200
    entry = r_ok.json()
    assert float(entry["total_debit"]) == float(entry["total_credit"]) == 250.0
    assert entry["approval_status"].lower() == "pending"

    entry_id = entry["id"]

    # Self-approval should be forbidden
    r_self = client.post(
        f"/api/accounting/journal-entries/{entry_id}/approve",
        json={"approve": True},
        headers=auth_headers("anurmamade@ngicapitaladvisory.com"),
    )
    assert r_self.status_code == 403

    # Partner approval should succeed
    r_approve = client.post(
        f"/api/accounting/journal-entries/{entry_id}/approve",
        json={"approve": True},
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert r_approve.status_code == 200

    # Second approval attempt should fail (not pending)
    r_again = client.post(
        f"/api/accounting/journal-entries/{entry_id}/approve",
        json={"approve": True},
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert r_again.status_code == 400

    # GL should include our lines
    r_gl = client.get(
        "/api/accounting/general-ledger/1",
        headers=auth_headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert r_gl.status_code == 200
    data = r_gl.json()
    assert "general_ledger" in data
    assert isinstance(data["general_ledger"], dict)
