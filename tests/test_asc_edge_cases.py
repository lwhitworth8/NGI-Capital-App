"""
ASC-specific edge cases: depreciation (ASC 360/350) and accrued liabilities.
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


def seed():
    db = sqlite3.connect("test_ngi_capital.db")
    c = db.cursor()
    # Fresh schema per test
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


def approve_post(entry_id: int):
    client.post(f"/api/accounting/journal-entries/{entry_id}/approve", json={"approve": True}, headers=headers("lwhitworth@ngicapitaladvisory.com"))
    client.post(f"/api/accounting/journal-entries/{entry_id}/post", headers=headers("lwhitworth@ngicapitaladvisory.com"))


def test_depreciation_and_accruals():
    seed()
    # Accounts: Equipment (asset, non-current), Accum Depr (asset, credit normal), Depreciation Expense (expense)
    cash = create_account(1, "11100", "Cash", "asset", "debit", "anurmamade@ngicapitaladvisory.com").json()
    equip = create_account(1, "15300", "Equipment", "asset", "debit", "anurmamade@ngicapitaladvisory.com").json()
    acc_dep = create_account(1, "15310", "Accumulated Depreciation - Equipment", "asset", "credit", "anurmamamade@ngicapitaladvisory.com" if False else "anurmamade@ngicapitaladvisory.com").json()
    dep_exp = create_account(1, "53000", "Depreciation and Amortization", "expense", "debit", "anurmamade@ngicapitaladvisory.com").json()
    accr_liab = create_account(1, "21300", "Accrued Expenses", "liability", "credit", "anurmamade@ngicapitaladvisory.com").json()
    op_exp = create_account(1, "52100", "Salaries and Wages", "expense", "debit", "anurmamade@ngicapitaladvisory.com").json()

    # Seed purchase of equipment: Dr Equip 1000, Cr Cash 1000
    r1 = client.post(
        "/api/accounting/journal-entries",
        json={
            "entity_id": 1,
            "entry_date": date.today().isoformat(),
            "description": "Purchase equipment",
            "lines": [
                {"account_id": equip["id"], "line_number": 1, "debit_amount": 1000.0, "credit_amount": 0.0},
                {"account_id": cash["id"], "line_number": 2, "debit_amount": 0.0, "credit_amount": 1000.0},
            ],
        },
        headers=headers("anurmamade@ngicapitaladvisory.com"),
    )
    assert r1.status_code == 200
    approve_post(r1.json()["id"])

    # Depreciation entry: Dr Dep Exp 100, Cr Accum Dep 100
    r2 = client.post(
        "/api/accounting/journal-entries",
        json={
            "entity_id": 1,
            "entry_date": date.today().isoformat(),
            "description": "Monthly depreciation",
            "lines": [
                {"account_id": dep_exp["id"], "line_number": 1, "debit_amount": 100.0, "credit_amount": 0.0},
                {"account_id": acc_dep["id"], "line_number": 2, "debit_amount": 0.0, "credit_amount": 100.0},
            ],
        },
        headers=headers("anurmamade@ngicapitaladvisory.com"),
    )
    assert r2.status_code == 200
    approve_post(r2.json()["id"])

    # Accrued expense: Dr Salaries 300, Cr Accrued Liabilities 300
    r3 = client.post(
        "/api/accounting/journal-entries",
        json={
            "entity_id": 1,
            "entry_date": date.today().isoformat(),
            "description": "Accrued salaries",
            "lines": [
                {"account_id": op_exp["id"], "line_number": 1, "debit_amount": 300.0, "credit_amount": 0.0},
                {"account_id": accr_liab["id"], "line_number": 2, "debit_amount": 0.0, "credit_amount": 300.0},
            ],
        },
        headers=headers("anurmamade@ngicapitaladvisory.com"),
    )
    assert r3.status_code == 200
    approve_post(r3.json()["id"])

    # Balance sheet: non-current assets reduced by accumulated depreciation; current liabilities include accrued
    r_bs = client.get(
        "/api/accounting/financials/balance-sheet",
        params={"entity_id": 1, "as_of_date": date.today().isoformat()},
        headers=headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert r_bs.status_code == 200
    bs = r_bs.json()
    # total_non_current_assets should be <= equipment cost (1000) due to accum dep (100)
    assert bs["total_non_current_assets"] <= 1000.0
    # current liabilities should include accrued 300
    assert bs["total_current_liabilities"] >= 300.0

    # Income statement: include depreciation and salaries in expenses
    r_is = client.get(
        "/api/accounting/financials/income-statement",
        params={"entity_id": 1, "start_date": date.today().isoformat(), "end_date": date.today().isoformat()},
        headers=headers("lwhitworth@ngicapitaladvisory.com"),
    )
    assert r_is.status_code == 200
    isd = r_is.json()
    assert isd["total_expenses"] >= 400.0
