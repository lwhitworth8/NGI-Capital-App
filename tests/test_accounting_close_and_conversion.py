import sqlite3
from datetime import date

from fastapi.testclient import TestClient

from src.api.main import app
from src.api.config import get_database_path
from src.api.config import SECRET_KEY, ALGORITHM
from jose import jwt
from datetime import datetime, timedelta


def _conn():
    return sqlite3.connect(get_database_path())


def ensure_entities_and_coa():
    con = _conn(); cur = con.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS entities (id INTEGER PRIMARY KEY AUTOINCREMENT, legal_name TEXT, is_active INTEGER DEFAULT 1)")
    con.commit()
    # Insert tolerant to missing formation_date
    cur.execute("INSERT OR IGNORE INTO entities (id, legal_name, is_active) VALUES (1,'NGI Capital LLC',1)")
    cur.execute("INSERT OR IGNORE INTO entities (id, legal_name, is_active) VALUES (2,'NGI Capital Inc',1)")
    con.commit()
    # Minimal COA for LLC
    cur.execute("CREATE TABLE IF NOT EXISTS chart_of_accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER, account_code TEXT, account_name TEXT, account_type TEXT, normal_balance TEXT, is_active INTEGER DEFAULT 1)")
    con.commit()
    def ensure(eid, code, name, atype, nb):
        cur.execute("SELECT id FROM chart_of_accounts WHERE entity_id = ? AND account_code = ?", (eid, code))
        if not cur.fetchone():
            cur.execute("INSERT INTO chart_of_accounts (entity_id, account_code, account_name, account_type, normal_balance, is_active) VALUES (?,?,?,?,?,1)", (eid, code, name, atype, nb))
            con.commit()
    ensure(1,'11100','Cash','asset','debit')
    ensure(1,'52900','Office Supplies','expense','debit')
    ensure(1,'41000','Revenue','revenue','credit')
    # Minimal partner for auth
    cur.execute("CREATE TABLE IF NOT EXISTS partners (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, name TEXT, is_active INTEGER DEFAULT 1)")
    con.commit()
    # Tolerant insert
    cols = [r[1] for r in cur.execute("PRAGMA table_info(partners)").fetchall()]
    if 'password_hash' in cols and 'ownership_percentage' in cols:
        try:
            cur.execute("INSERT OR IGNORE INTO partners (email, name, password_hash, ownership_percentage, is_active) VALUES ('pytest@ngicapitaladvisory.com','PyTest','x',0,1)")
        except Exception:
            try:
                cur.execute("INSERT OR IGNORE INTO partners (email, name, is_active) VALUES ('pytest@ngicapitaladvisory.com','PyTest',1)")
            except Exception:
                pass
    else:
        try:
            cur.execute("INSERT OR IGNORE INTO partners (email, name, is_active) VALUES ('pytest@ngicapitaladvisory.com','PyTest',1)")
        except Exception:
            pass
    # Also insert an NGI partner email used in defaults
    try:
        cur.execute("INSERT OR IGNORE INTO partners (email, name, is_active) VALUES ('anurmamade@ngicapitaladvisory.com','Andre',1)")
    except Exception:
        pass
    con.close()


def seed_llc_activity():
    con = _conn(); cur = con.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS journal_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER, entry_number TEXT, entry_date TEXT, description TEXT, total_debit REAL, total_credit REAL, approval_status TEXT, is_posted INTEGER DEFAULT 0)")
    cur.execute("CREATE TABLE IF NOT EXISTS journal_entry_lines (id INTEGER PRIMARY KEY AUTOINCREMENT, journal_entry_id INTEGER, account_id INTEGER, line_number INTEGER, description TEXT, debit_amount REAL, credit_amount REAL)")
    con.commit()
    # Get account ids
    cash = cur.execute("SELECT id FROM chart_of_accounts WHERE entity_id = 1 AND account_code = '11100'").fetchone()[0]
    exp = cur.execute("SELECT id FROM chart_of_accounts WHERE entity_id = 1 AND account_code = '52900'").fetchone()[0]
    rev = cur.execute("SELECT id FROM chart_of_accounts WHERE entity_id = 1 AND account_code = '41000'").fetchone()[0]
    # Seed a small P&L (Revenue 2,000; Expense 500)
    cur.execute("INSERT INTO journal_entries (entity_id, entry_number, entry_date, description, total_debit, total_credit, approval_status, is_posted) VALUES (1,'JE-001','2024-09-30','Ops',2000.0,2000.0,'approved',1)")
    je = cur.execute("SELECT last_insert_rowid()").fetchone()[0]
    cur.execute("INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, description, debit_amount, credit_amount) VALUES (?,?,1,'Cash',2000,0)", (je, cash))
    cur.execute("INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, description, debit_amount, credit_amount) VALUES (?,?,2,'Revenue',0,2000)", (je, rev))
    con.commit()
    cur.execute("INSERT INTO journal_entries (entity_id, entry_number, entry_date, description, total_debit, total_credit, approval_status, is_posted) VALUES (1,'JE-002','2024-09-30','Expense',500.0,500.0,'approved',1)")
    je2 = cur.execute("SELECT last_insert_rowid()").fetchone()[0]
    cur.execute("INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, description, debit_amount, credit_amount) VALUES (?,?,1,'Supplies',500,0)", (je2, exp))
    cur.execute("INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, description, debit_amount, credit_amount) VALUES (?,?,2,'Cash',0,500)", (je2, cash))
    con.commit(); con.close()


def test_conversion_execute_locks_llc_and_posts_opening():
    ensure_entities_and_coa()
    seed_llc_activity()
    # Preview
    with TestClient(app) as client:
        pv = client.post('/api/accounting/conversion/preview', json={
        'effective_date': '2024-09-30', 'source_entity_id': 1, 'target_entity_id': 2, 'par_value': 0.0001, 'total_shares': 10000000
    })
        assert pv.status_code == 200
        data = pv.json()
        assert 'equity_total' in data
        # Execute
        ex = client.post('/api/accounting/conversion/execute', json={
        'effective_date': '2024-09-30', 'source_entity_id': 1, 'target_entity_id': 2, 'par_value': 0.0001, 'total_shares': 10000000
    })
        assert ex.status_code == 200
    # Lock exists
    con = _conn(); cur = con.cursor()
    cur.execute("SELECT locked_through FROM period_locks WHERE entity_id = 1")
    row = cur.fetchone(); assert row and row[0] == '2024-09-30'
    # Opening JE in target with stock/APIC
    cur.execute("SELECT id, entry_date FROM journal_entries WHERE entity_id = 2 ORDER BY id DESC LIMIT 1")
    row = cur.fetchone(); assert row and row[1] == '2024-10-01'
    con.close()
    # Creating a JE in locked period should fail
    with TestClient(app) as client:
        # craft a dev JWT to satisfy accounting endpoint auth
        token = jwt.encode({
            'sub': 'pytest@ngicapitaladvisory.com', 'partner_id': 0,
            'exp': datetime.utcnow() + timedelta(hours=1), 'iat': datetime.utcnow()
        }, SECRET_KEY, algorithm=ALGORITHM)
        bad = client.post('/api/accounting/journal-entries', json={
        'entity_id': 1, 'entry_date': '2024-09-30', 'description': 'Should block', 'lines': [
            {'account_id': 1, 'line_number': 1, 'debit_amount': 10, 'credit_amount': 0},
            {'account_id': 1, 'line_number': 2, 'debit_amount': 0, 'credit_amount': 10}
        ]
    }, headers={'Authorization': f'Bearer {token}'})
        assert bad.status_code == 400


def test_close_fails_until_unmatched_cleared_and_then_locks():
    ensure_entities_and_coa()
    seed_llc_activity()
    # Insert one unmatched bank txn for entity 1
    con = _conn(); cur = con.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS bank_accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER)")
    cur.execute("INSERT INTO bank_accounts (entity_id) VALUES (1)")
    acc_id = cur.execute("SELECT last_insert_rowid()").fetchone()[0]
    cur.execute("CREATE TABLE IF NOT EXISTS bank_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, bank_account_id INTEGER, is_reconciled INTEGER DEFAULT 0)")
    cur.execute("INSERT INTO bank_transactions (bank_account_id, is_reconciled) VALUES (?,0)", (acc_id,))
    con.commit(); con.close()
    # Close preview should block
    with TestClient(app) as client:
        pv = client.get('/api/accounting/close/preview', params={'entity_id': 1, 'year': 2024, 'month': 9})
        assert pv.status_code == 200 and pv.json()['bank_unreconciled'] is True
    # Now clear and close
    con = _conn(); cur = con.cursor(); cur.execute("UPDATE bank_transactions SET is_reconciled = 1"); con.commit(); con.close()
    with TestClient(app) as client:
        run = client.post('/api/accounting/close/run', json={'entity_id': 1, 'year': 2024, 'month': 9})
        assert run.status_code == 200
    # Check period lock
    con = _conn(); cur = con.cursor(); cur.execute("SELECT locked_through FROM period_locks WHERE entity_id = 1"); row = cur.fetchone(); assert row and row[0] == '2024-09-30'; con.close()
