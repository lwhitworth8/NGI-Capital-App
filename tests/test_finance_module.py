"""
Backend tests for the Finance module (KPIs, Cap Table summary, Forecasting)
"""

import sqlite3
from pathlib import Path

import bcrypt
import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from tests.helpers_auth import auth_headers


client = TestClient(app)


@pytest.fixture
def setup_finance_db():
    """Create a minimal database with partners, entities, and bank accounts."""
    db_path = Path("test_ngi_capital.db")
    if db_path.exists():
        db_path.unlink()

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    # partners
    cur.execute(
        """
        CREATE TABLE partners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            ownership_percentage REAL NOT NULL,
            capital_account_balance REAL DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT
        )
        """
    )

    # entities
    cur.execute(
        """
        CREATE TABLE entities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            legal_name TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            ein TEXT,
            formation_date TEXT,
            state TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT
        )
        """
    )

    # bank accounts (for cash KPI)
    cur.execute(
        """
        CREATE TABLE bank_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            name TEXT,
            balance REAL DEFAULT 0
        )
        """
    )

    # Seed minimal data
    pw = bcrypt.hashpw(b"TestPassword123!", bcrypt.gensalt()).decode("utf-8")
    cur.execute(
        "INSERT INTO partners (email, name, password_hash, ownership_percentage, capital_account_balance) VALUES (?,?,?,?,?)",
        (
            "anurmamade@ngicapitaladvisory.com",
            "Andre Nurmamade",
            pw,
            50.0,
            1000000.0,
        ),
    )
    cur.execute(
        "INSERT INTO partners (email, name, password_hash, ownership_percentage, capital_account_balance) VALUES (?,?,?,?,?)",
        (
            "lwhitworth@ngicapitaladvisory.com",
            "Landon Whitworth",
            pw,
            50.0,
            1000000.0,
        ),
    )
    cur.execute(
        "INSERT INTO entities (legal_name, entity_type, ein, formation_date, state) VALUES (?,?,?,?,?)",
        (
            "NGI Capital Advisory LLC",
            "LLC",
            "88-1234567",
            "2023-01-01",
            "Delaware",
        ),
    )

    # Two bank accounts across two entities
    cur.execute(
        "INSERT INTO bank_accounts (entity_id, name, balance) VALUES (?,?,?)",
        (1, "Operating", 1200.50),
    )
    cur.execute(
        "INSERT INTO bank_accounts (entity_id, name, balance) VALUES (?,?,?)",
        (2, "Savings", 300.00),
    )

    conn.commit()
    conn.close()

    try:
        yield db_path
    finally:
        if db_path.exists():
            db_path.unlink()


def _headers():
    return auth_headers('lwhitworth@ngicapitaladvisory.com')


class TestFinanceKPIs:
    def test_kpis_include_numeric_cash_position(self, setup_finance_db):
        # All entities
        r = client.get("/api/finance/kpis", headers=_headers())
        assert r.status_code == 200
        data = r.json()
        # New numeric fields supported by frontend
        assert "asOf" in data
        assert "cash_position" in data
        assert abs(float(data["cash_position"]) - 1500.50) < 1e-6
        # Backward-compatible items
        assert isinstance(data.get("items"), list)

        # Filter by entity
        r2 = client.get("/api/finance/kpis", params={"entity_id": 1}, headers=_headers())
        assert r2.status_code == 200
        d2 = r2.json()
        assert abs(float(d2.get("cash_position", 0.0)) - 1200.50) < 1e-6


class TestForecasting:
    def test_scenarios_and_assumptions_flow(self, setup_finance_db):
        headers = _headers()

        # Initially empty
        r0 = client.get("/api/finance/forecast/scenarios", headers=headers)
        assert r0.status_code == 200
        assert r0.json() == []

        # Create a scenario
        r1 = client.post(
            "/api/finance/forecast/scenarios",
            json={"name": "Base", "entity_id": 1},
            headers=headers,
        )
        assert r1.status_code == 200
        scenario = r1.json()
        assert scenario["name"] == "Base"
        sid = int(scenario["id"])

        # List scenarios shows the new one
        r2 = client.get("/api/finance/forecast/scenarios", headers=headers)
        assert r2.status_code == 200
        lst = r2.json()
        assert any(s.get("id") == sid for s in lst)

        # No assumptions yet
        r3 = client.get(f"/api/finance/forecast/scenarios/{sid}/assumptions", headers=headers)
        assert r3.status_code == 200
        assert r3.json() == []

        # Add an assumption
        r4 = client.post(
            f"/api/finance/forecast/scenarios/{sid}/assumptions",
            json={"key": "growth.rate", "value": "5%"},
            headers=headers,
        )
        assert r4.status_code == 200
        a = r4.json()
        assert a["key"] == "growth.rate"
        assert a["value"] == "5%"

        # List again
        r5 = client.get(f"/api/finance/forecast/scenarios/{sid}/assumptions", headers=headers)
        assert r5.status_code == 200
        alst = r5.json()
        assert any(x.get("key") == "growth.rate" for x in alst)


class TestCapTableSummary:
    def test_cap_table_summary_shape(self, setup_finance_db):
        r = client.get(
            "/api/finance/cap-table-summary",
            params={"entity_id": 1},
            headers=_headers(),
        )
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data.get("summary"), dict)
        # Ensure keys exist even when empty
        assert "fdShares" in data["summary"]
        assert "classes" in data
