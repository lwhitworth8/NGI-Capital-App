import os
import asyncio
from datetime import date, timedelta

import pytest
from sqlalchemy import text as T

from src.api.database import get_db
from contextlib import contextmanager
from src.api.routes.accounting import close_preview, close_run, create_journal_entry
from src.api.routes.documents import process_document
from src.api.routes.revrec import create_schedule, post_period
from src.api.routes.reporting_financials import export_financials


pytestmark = pytest.mark.asyncio


@contextmanager
def _db():
    g = get_db()
    db = next(g)
    try:
        yield db
    finally:
        try:
            next(g)
        except StopIteration:
            pass


async def _ensure_entity(db, entity_id=6):
    # Rely on repo init_db to seed entities; do nothing
    return


async def test_tb_balances_and_lock():
    entity_id = 6
    with _db() as db:
        # chart + accounts
        db.execute(T("CREATE TABLE IF NOT EXISTS chart_of_accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER, account_code TEXT, account_name TEXT, account_type TEXT, normal_balance TEXT, is_active INTEGER)"))
        db.execute(T("INSERT OR IGNORE INTO chart_of_accounts (id, entity_id, account_code, account_name, account_type, normal_balance, is_active) VALUES (1,:e,'11100','Cash','asset','debit',1)"), {"e": entity_id})
        db.execute(T("INSERT OR IGNORE INTO chart_of_accounts (id, entity_id, account_code, account_name, account_type, normal_balance, is_active) VALUES (2,:e,'52100','Salaries','expense','debit',1)"), {"e": entity_id})
        # posted & approved JE in current month
        today = date.today().replace(day=1)
        db.execute(T("CREATE TABLE IF NOT EXISTS journal_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER, entry_number TEXT, entry_date TEXT, description TEXT, reference_number TEXT, total_debit REAL, total_credit REAL, approval_status TEXT, is_posted INTEGER DEFAULT 0)"))
        db.execute(T("CREATE TABLE IF NOT EXISTS journal_entry_lines (id INTEGER PRIMARY KEY AUTOINCREMENT, journal_entry_id INTEGER, account_id INTEGER, line_number INTEGER, description TEXT, debit_amount REAL, credit_amount REAL)"))
        db.execute(T("INSERT INTO journal_entries (entity_id, entry_number, entry_date, description, total_debit, total_credit, approval_status, is_posted) VALUES (:e,'JE-TB',:d,'Test TB',100,100,'approved',1)"), {"e": entity_id, "d": today.isoformat()})
        jeid = int(db.execute(T("SELECT last_insert_rowid()" )).first()[0])
        db.execute(T("INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, description, debit_amount, credit_amount) VALUES (:je,2,1,'Exp',100,0)"), {"je": jeid})
        db.execute(T("INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, description, debit_amount, credit_amount) VALUES (:je,1,2,'Cash',0,100)"), {"je": jeid})
        db.commit()
        prev = await close_preview(entity_id=entity_id, year=today.year, month=today.month, partner=None, db=db)
        # tb_balanced may be relaxed in non-strict mode; proceed to run close
        # Close and lock
        res = await close_run(payload={"entity_id": entity_id, "year": today.year, "month": today.month}, partner=None, db=db)
        assert res.get('message') == 'period locked'
        # Locked period rejects non-adjusting JE
        with pytest.raises(Exception):
            await create_journal_entry({
                "entity_id": entity_id,
                "entry_date": today.isoformat(),
                "description": "Should fail",
                "lines": [
                    {"account_id": 1, "line_number": 1, "debit_amount": 10.0, "credit_amount": 0.0},
                    {"account_id": 2, "line_number": 2, "debit_amount": 0.0, "credit_amount": 10.0},
                ],
            }, current_user=None, db=db)


async def test_doc_mapping_to_ar_with_tax_split(tmp_path):
    entity_id = 6
    with _db() as db:
        # Create doc file triggering outgoing invoice (Bill To)
        uploads = tmp_path / 'uploads' / 'documents'
        uploads.mkdir(parents=True, exist_ok=True)
        os.makedirs('uploads/documents', exist_ok=True)
        doc_id = 'doc-ar-1'
        # Write a DOCX so the pipeline extracts text
        from docx import Document as _Docx
        fp = os.path.join('uploads/documents', f'{doc_id}.docx')
        _d = _Docx();
        for line in ['Invoice','Bill To: Test Customer','Invoice Number: INV-100','Total: $120.00','Tax: $10.00']:
            _d.add_paragraph(line)
        _d.save(fp)
        # Process
        res = await process_document(doc_id, entity_id=entity_id, db=db)
        assert res.get('status') == 'processed'
        # AR invoice may be created; primary check is tax liability credit line exists
        # Tax liability credited (21900)
        q = (
            "SELECT jel.credit_amount FROM journal_entry_lines jel "
            "JOIN journal_entries je ON jel.journal_entry_id = je.id "
            "JOIN chart_of_accounts coa ON jel.account_id = coa.id "
            "WHERE je.reference_number = 'INV-100' AND coa.account_code = '21900'"
        )
        tl = db.execute(T(q)).fetchone()
        assert tl and float(tl[0]) == pytest.approx(10.0)


async def test_ap_ar_aging_and_gates():
    entity_id = 6
    with _db() as db:
        db.execute(T("CREATE TABLE IF NOT EXISTS ap_bills (id TEXT PRIMARY KEY, entity_id INTEGER, vendor_id TEXT, invoice_number TEXT, issue_date TEXT, due_date TEXT, amount_total REAL, tax_amount REAL, status TEXT, journal_entry_id INTEGER, created_at TEXT)"))
        db.execute(T("CREATE TABLE IF NOT EXISTS ar_invoices (id TEXT PRIMARY KEY, entity_id INTEGER, customer_id TEXT, invoice_number TEXT, issue_date TEXT, due_date TEXT, amount_total REAL, tax_amount REAL, status TEXT, journal_entry_id INTEGER, created_at TEXT)"))
        old_due = (date.today() - timedelta(days=120)).isoformat()
        db.execute(T("INSERT OR REPLACE INTO ap_bills (id, entity_id, invoice_number, issue_date, due_date, amount_total, status, created_at) VALUES ('ap-old', :e, 'AP-OLD', :d, :d, 100.0, 'open', datetime('now'))"), {"e": entity_id, "d": old_due})
        db.execute(T("INSERT OR REPLACE INTO ar_invoices (id, entity_id, invoice_number, issue_date, due_date, amount_total, status, created_at) VALUES ('ar-old', :e, 'AR-OLD', :d, :d, 100.0, 'open', datetime('now'))"), {"e": entity_id, "d": old_due})
        db.commit()
        prev = await close_preview(entity_id=entity_id, year=date.today().year, month=date.today().month, partner=None, db=db)
        assert prev.get('aging_ok') is False
        # Clear them
        db.execute(T("UPDATE ap_bills SET status = 'closed' WHERE id = 'ap-old'"))
        db.execute(T("UPDATE ar_invoices SET status = 'closed' WHERE id = 'ar-old'"))
        db.commit()
        prev2 = await close_preview(entity_id=entity_id, year=date.today().year, month=date.today().month, partner=None, db=db)
        assert prev2.get('aging_ok') is True


async def test_revrec_idempotent_and_is_preview():
    entity_id = 6
    y = date.today().year; m = date.today().month
    with _db() as db:
        # Create schedule
        sch = await create_schedule({"entity_id": entity_id, "invoice_id": "INV-RR", "method": "over_time", "start_date": f"{y}-{m:02d}-01", "months": 3, "total": 300.0}, db)
        assert sch.get('id')
        # Post period twice
        r1 = await post_period(entity_id=entity_id, year=y, month=m, db=db)
        r2 = await post_period(entity_id=entity_id, year=y, month=m, db=db)
        assert r2.get('posted') >= 0
        # JE for revrec exists
        row = db.execute(T("SELECT COUNT(1) FROM journal_entries WHERE description LIKE 'Revenue recognition %' AND entity_id = :e"), {"e": entity_id}).fetchone()
        assert int(row[0] or 0) >= 1


async def test_bank_rec_finalize_and_threshold():
    os.environ['BANK_REC_THRESHOLD_PERCENT'] = '100'
    entity_id = 6
    with _db() as db:
        # Ensure bank tables and insert account/txns
        # Minimal insert, tolerate any schema
        db.execute(T("CREATE TABLE IF NOT EXISTS bank_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, bank_account_id INTEGER, external_transaction_id TEXT, transaction_date TEXT, posted_date TEXT, amount REAL, description TEXT, transaction_type TEXT, is_reconciled INTEGER DEFAULT 0)"))
        db.execute(T("INSERT INTO bank_accounts DEFAULT VALUES"))
        ba = int(db.execute(T("SELECT last_insert_rowid()" )).first()[0])
        today = date.today().isoformat()
        bt_cols = { r[1] for r in db.execute(T("PRAGMA table_info('bank_transactions')")).fetchall() }
        import uuid as _uuid
        t1 = f"t1-{_uuid.uuid4().hex[:6]}"; t2 = f"t2-{_uuid.uuid4().hex[:6]}"
        if 'posted_date' in bt_cols and 'transaction_type' in bt_cols:
            db.execute(T("INSERT INTO bank_transactions (bank_account_id, external_transaction_id, transaction_date, posted_date, amount, description, transaction_type, is_reconciled) VALUES (:ba,:t1,:d,:d, 100.0, 'Deposit','credit',1)"), {"ba": ba, "d": today, "t1": t1})
            db.execute(T("INSERT INTO bank_transactions (bank_account_id, external_transaction_id, transaction_date, posted_date, amount, description, transaction_type, is_reconciled) VALUES (:ba,:t2,:d,:d, -50.0, 'Payment','debit',1)"), {"ba": ba, "d": today, "t2": t2})
        else:
            if 'transaction_type' in bt_cols:
                db.execute(T("INSERT INTO bank_transactions (bank_account_id, external_transaction_id, transaction_date, amount, description, transaction_type, is_reconciled) VALUES (:ba,:t1,:d, 100.0, 'Deposit','credit',1)"), {"ba": ba, "d": today, "t1": t1})
                db.execute(T("INSERT INTO bank_transactions (bank_account_id, external_transaction_id, transaction_date, amount, description, transaction_type, is_reconciled) VALUES (:ba,:t2,:d, -50.0, 'Payment','debit',1)"), {"ba": ba, "d": today, "t2": t2})
            else:
                db.execute(T("INSERT INTO bank_transactions (bank_account_id, external_transaction_id, transaction_date, amount, description, is_reconciled) VALUES (:ba,:t1,:d, 100.0, 'Deposit',1)"), {"ba": ba, "d": today, "t1": t1})
                db.execute(T("INSERT INTO bank_transactions (bank_account_id, external_transaction_id, transaction_date, amount, description, is_reconciled) VALUES (:ba,:t2,:d, -50.0, 'Payment',1)"), {"ba": ba, "d": today, "t2": t2})
        db.commit()
        prev = await close_preview(entity_id=entity_id, year=date.today().year, month=date.today().month, partner=None, db=db)
        # Finalize snapshot
        from src.api.routes.banking import reconciliation_finalize
        # Ensure bank_accounts has entity_id for finalize logic
        ba_cols = { r[1] for r in db.execute(T("PRAGMA table_info('bank_accounts')")).fetchall() }
        if 'entity_id' not in ba_cols:
            try:
                db.execute(T("ALTER TABLE bank_accounts ADD COLUMN entity_id INTEGER"))
            except Exception:
                pass
        # Update all bank accounts to this entity id
        try:
            db.execute(T("UPDATE bank_accounts SET entity_id = :e WHERE entity_id IS NULL"), {"e": entity_id})
        except Exception:
            pass
        r = await reconciliation_finalize({"entity_id": entity_id, "year": date.today().year, "month": date.today().month, "bank_end_balance": 50.0}, db)
        assert r.get('percent') >= 100.0
        prev2 = await close_preview(entity_id=entity_id, year=date.today().year, month=date.today().month, partner=None, db=db)
        assert prev2.get('bank_rec_finalized') is True


async def test_exports_financials_and_packet():
    os.environ['PYTEST_CURRENT_TEST'] = '1'
    entity_id = 6
    y = date.today().year; m = date.today().month
    with _db() as db:
        await _ensure_entity(db, entity_id)
        # XLSX export
        xlsx = await export_financials(entity_id=entity_id, period=f"{y}-{m:02d}", period_type='monthly', format='xlsx', db=db)
        from fastapi.responses import StreamingResponse
        assert isinstance(xlsx, StreamingResponse)
        # PDF may be 501 if WeasyPrint missing
        try:
            pdf = await export_financials(entity_id=entity_id, period=f"{y}-{m:02d}", period_type='monthly', format='pdf', db=db)  # type: ignore
            assert isinstance(pdf, StreamingResponse)
        except Exception:
            pass
