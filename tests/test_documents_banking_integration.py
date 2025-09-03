import os
from pathlib import Path
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.config import get_database_path
import sqlite3


client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_clean_uploads(tmp_path, monkeypatch):
    # Ensure uploads folders exist and are clean
    up = Path('uploads/documents'); pr = Path('uploads/processed')
    up.mkdir(parents=True, exist_ok=True); pr.mkdir(parents=True, exist_ok=True)
    # Clean any leftover files for isolation
    for p in list(up.glob('*')) + list(pr.glob('*')):
        try:
            p.unlink()
        except Exception:
            pass
    yield
    for p in list(up.glob('*')) + list(pr.glob('*')):
        try:
            p.unlink()
        except Exception:
            pass


def _conn():
    return sqlite3.connect(get_database_path())


def _ensure_entity():
    con = _conn(); cur = con.cursor()
    try:
        cur.execute("CREATE TABLE IF NOT EXISTS entities (id INTEGER PRIMARY KEY AUTOINCREMENT, legal_name TEXT, is_active INTEGER DEFAULT 1)")
        con.commit()
    except Exception:
        pass
    cur.execute("SELECT id FROM entities WHERE legal_name LIKE ? LIMIT 1", ("%NGI Capital Advisory%",))
    row = cur.fetchone()
    if row:
        eid = int(row[0])
    else:
        cur.execute("INSERT INTO entities (legal_name, is_active) VALUES (?,1)", ("NGI Capital Advisory LLC",))
        con.commit(); eid = int(cur.execute("SELECT last_insert_rowid()").fetchone()[0])
    con.close()
    return eid


def test_documents_processing_creates_balanced_je():
    eid = _ensure_entity()
    # Create a dummy uploaded PDF
    doc_id = "test-invoice-001"
    up = Path(f"uploads/documents/{doc_id}.pdf"); up.write_bytes(b"dummy")
    # Patch extraction via direct call (simulate invoice text)
    text = """
    INVOICE
    From: AWS
    Invoice # INV-001
    Date: 2024-03-01
    Total Due: $1,250.00
    """
    # Monkeypatch extraction methods
    from src.api.routes import documents as docs_mod
    docs_mod.DocumentProcessor.extract_text_from_pdf = staticmethod(lambda p: text)
    docs_mod.DocumentProcessor.categorize_document = staticmethod(lambda t, f: "receipts")
    docs_mod.DocumentProcessor.detect_entity = staticmethod(lambda t: "ngi-advisory")
    # Process
    resp = client.post(f"/api/documents/{doc_id}/process", params={"entity_id": eid})
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("journal_entry_id") is not None
    # Check metadata row
    con = _conn(); cur = con.cursor()
    cur.execute("SELECT vendor,total,journal_entry_id FROM doc_metadata WHERE id = ?", (doc_id,))
    row = cur.fetchone(); assert row is not None
    assert (row[0] or '').lower() == 'aws'
    assert abs(float(row[1]) - 1250.0) < 0.01
    je_id = int(row[2])
    # Verify JE balanced
    try:
        cur.execute("SELECT total_debit,total_credit FROM journal_entries WHERE id = ?", (je_id,))
        t = cur.fetchone(); assert t and abs(float(t[0]) - float(t[1])) < 1e-6
    finally:
        con.close()


def test_mercury_sync_inserts_and_matches(monkeypatch):
    eid = _ensure_entity()
    # Ensure a prior doc-created JE exists to match amount 1250
    doc_id = "test-invoice-002"
    up = Path(f"uploads/documents/{doc_id}.pdf"); up.write_bytes(b"dummy")
    from src.api.routes import documents as docs_mod
    docs_mod.DocumentProcessor.extract_text_from_pdf = staticmethod(lambda p: "INVOICE\nFrom: AWS\nTotal: $1,250.00")
    docs_mod.DocumentProcessor.categorize_document = staticmethod(lambda t, f: "receipts")
    docs_mod.DocumentProcessor.detect_entity = staticmethod(lambda t: "ngi-advisory")
    resp = client.post(f"/api/documents/{doc_id}/process", params={"entity_id": eid})
    assert resp.status_code == 200
    je_id = resp.json().get("journal_entry_id"); assert je_id

    # Mock Mercury client
    from src.api.routes import banking as bank_mod
    class _MC:
        def list_accounts(self):
            return [{"id": "acct_1", "name": "Operating", "last4": "1234", "type": "checking", "current_balance": 10000, "available_balance": 10000, "currency": "USD"}]
        def list_transactions(self, account_id, cursor=None):
            return {"transactions": [{"id": "txn_1", "date": datetime.utcnow().date().isoformat(), "amount": -1250.0, "description": "AWS cloud services"}], "next_cursor": None}
    monkeypatch.setattr(bank_mod, 'MercuryClient', lambda: _MC())

    # Run sync
    s = client.post("/api/banking/mercury/sync")
    assert s.status_code == 200
    # Verify at least one txn exists and matched
    con = _conn(); cur = con.cursor()
    cur.execute("SELECT COUNT(1) FROM bank_transactions")
    assert int(cur.fetchone()[0]) >= 1
    cur.execute("SELECT COUNT(1) FROM bank_transactions WHERE is_reconciled = 1")
    assert int(cur.fetchone()[0]) >= 1
    con.close()


def test_reconciliation_unmatched_queue(monkeypatch):
    # Insert an unmatched txn
    con = _conn(); cur = con.cursor()
    # ensure tables
    cur.execute("CREATE TABLE IF NOT EXISTS bank_accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, mercury_account_id TEXT UNIQUE)")
    con.commit()
    cur.execute("INSERT OR IGNORE INTO bank_accounts (id, mercury_account_id) VALUES (1,'acct_test')"); con.commit()
    cur.execute("CREATE TABLE IF NOT EXISTS bank_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, bank_account_id INTEGER, external_transaction_id TEXT UNIQUE, transaction_date TEXT, amount REAL, description TEXT, is_reconciled INTEGER DEFAULT 0)")
    con.commit()
    cur.execute("INSERT OR IGNORE INTO bank_transactions (bank_account_id, external_transaction_id, transaction_date, amount, description, is_reconciled) VALUES (1,'txn_unmatched',?,?,?,0)", (datetime.utcnow().date().isoformat(), -42.5, 'Coffee shop'))
    con.commit(); con.close()
    r = client.get('/api/banking/reconciliation/unmatched')
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    assert any(i.get('description') == 'Coffee shop' for i in items)
