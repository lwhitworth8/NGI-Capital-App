"""
Accounts Receivable (AR) subledger endpoints
- customers: minimal CRUD
- ar_invoices: create/list; on create, post Draft JE (Dr A/R, Cr Revenue or Deferred Rev)
- ar_payments: record cash receipt; post JE (Dr Cash, Cr A/R); update invoice status
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text
import uuid

from src.api.database import get_db

router = APIRouter(prefix="/api/ar", tags=["ar"])


def _ensure_ar_tables(db: Session):
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            entity_id INTEGER,
            name TEXT,
            email TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS ar_invoices (
            id TEXT PRIMARY KEY,
            entity_id INTEGER,
            customer_id TEXT,
            invoice_number TEXT,
            issue_date TEXT,
            due_date TEXT,
            amount_total REAL,
            tax_amount REAL,
            status TEXT,
            journal_entry_id INTEGER,
            created_at TEXT
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS ar_payments (
            id TEXT PRIMARY KEY,
            invoice_id TEXT,
            payment_date TEXT,
            amount REAL,
            journal_entry_id INTEGER,
            created_at TEXT
        )
        """
    ))
    db.commit()


def _ensure_accounts(db: Session, entity_id: int) -> Dict[str, int]:
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS chart_of_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            account_code TEXT,
            account_name TEXT,
            account_type TEXT,
            normal_balance TEXT,
            is_active INTEGER DEFAULT 1
        )
        """
    ))
    db.commit()
    def ensure(code: str, name: str, atype: str, normal: str) -> int:
        row = db.execute(sa_text("SELECT id FROM chart_of_accounts WHERE entity_id = :e AND account_code = :c"), {"e": entity_id, "c": code}).fetchone()
        if row:
            return int(row[0])
        db.execute(sa_text("INSERT INTO chart_of_accounts (entity_id, account_code, account_name, account_type, normal_balance, is_active) VALUES (:e,:c,:n,:t,:nb,1)"), {
            "e": entity_id, "c": code, "n": name, "t": atype, "nb": normal
        })
        db.commit()
        rid = db.execute(sa_text("SELECT last_insert_rowid()"))
        rid = rid.scalar() if hasattr(rid, 'scalar') else (rid.fetchone()[0] if rid else 0)
        return int(rid or 0)
    return {
        'AR': ensure('11300', 'Accounts Receivable', 'asset', 'debit'),
        'REV': ensure('41000', 'Revenue', 'revenue', 'credit'),
        'DEFREV': ensure('21500', 'Deferred Revenue', 'liability', 'credit'),
        'CASH': ensure('11100', 'Cash - Operating', 'asset', 'debit'),
    }


def _create_draft_je(db: Session, entity_id: int, lines: List[Dict[str, Any]], description: str, ref: Optional[str]) -> int:
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            entry_number TEXT,
            entry_date TEXT,
            description TEXT,
            reference_number TEXT,
            total_debit REAL,
            total_credit REAL,
            approval_status TEXT,
            is_posted INTEGER DEFAULT 0,
            posted_date TEXT
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS journal_entry_lines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            journal_entry_id INTEGER,
            account_id INTEGER,
            line_number INTEGER,
            description TEXT,
            debit_amount REAL,
            credit_amount REAL
        )
        """
    ))
    db.commit()
    td = sum(float(l.get('debit_amount') or 0) for l in lines)
    tc = sum(float(l.get('credit_amount') or 0) for l in lines)
    if round(td - tc, 2) != 0:
        raise HTTPException(status_code=400, detail="Unbalanced journal entry")
    eno = f"JE-{entity_id:03d}-{int(datetime.utcnow().timestamp())}"
    db.execute(sa_text("INSERT INTO journal_entries (entity_id, entry_number, entry_date, description, reference_number, total_debit, total_credit, approval_status, is_posted) VALUES (:e,:no,:dt,:ds,:rf,:td,:tc,'pending',0)"), {
        "e": entity_id, "no": eno, "dt": datetime.utcnow().date().isoformat(), "ds": description, "rf": ref or '', "td": td, "tc": tc
    })
    jeid = int(db.execute(sa_text("SELECT last_insert_rowid()"))).scalar()  # type: ignore[attr-defined]
    ln = 1
    for l in lines:
        db.execute(sa_text("INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, description, debit_amount, credit_amount) VALUES (:je,:acc,:ln,:ds,:d,:c)"), {
            "je": jeid, "acc": int(l['account_id']), "ln": ln, "ds": l.get('description') or description, "d": float(l.get('debit_amount') or 0), "c": float(l.get('credit_amount') or 0)
        }); ln += 1
    db.commit(); return jeid


@router.post("/customers")
async def create_customer(payload: Dict[str, Any], db: Session = Depends(get_db)):
    _ensure_ar_tables(db)
    if not (payload.get('entity_id') and payload.get('name')):
        raise HTTPException(status_code=422, detail="entity_id and name required")
    cid = uuid.uuid4().hex
    db.execute(sa_text("INSERT INTO customers (id, entity_id, name, email, is_active, created_at) VALUES (:id,:e,:n,:em,1,datetime('now'))"), {
        "id": cid, "e": int(payload['entity_id']), "n": str(payload['name']).strip(), "em": (payload.get('email') or None)
    })
    db.commit(); return {"id": cid}


@router.get("/customers")
async def list_customers(entity_id: int, db: Session = Depends(get_db)):
    _ensure_ar_tables(db)
    rows = db.execute(sa_text("SELECT id, name, email, is_active FROM customers WHERE entity_id = :e ORDER BY name"), {"e": entity_id}).fetchall()
    return [{"id": r[0], "name": r[1], "email": r[2], "is_active": bool(r[3])} for r in rows]


@router.post("/invoices")
async def create_invoice(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Create AR invoice and Draft JE.
    Payload: { entity_id, customer_id or customer_name, invoice_number, issue_date, due_date, amount_total, tax_amount?, defer_revenue? }
    """
    _ensure_ar_tables(db)
    entity_id = int(payload.get('entity_id') or 0)
    if not entity_id:
        raise HTTPException(status_code=422, detail="entity_id required")
    accts = _ensure_accounts(db, entity_id)
    # customer
    cust_id = payload.get('customer_id')
    if not cust_id and payload.get('customer_name'):
        # create customer on the fly
        cust_id = uuid.uuid4().hex
        db.execute(sa_text("INSERT INTO customers (id, entity_id, name, is_active, created_at) VALUES (:id,:e,:n,1,datetime('now'))"), {
            "id": cust_id, "e": entity_id, "n": str(payload.get('customer_name')).strip()
        }); db.commit()
    # amounts/dates
    amt = float(payload.get('amount_total') or 0)
    if amt <= 0:
        raise HTTPException(status_code=422, detail="amount_total must be positive")
    tax = float(payload.get('tax_amount') or 0)
    inv_no = (payload.get('invoice_number') or f"INV-{int(datetime.utcnow().timestamp())}")
    issue_date = (payload.get('issue_date') or datetime.utcnow().date().isoformat())
    due_date = payload.get('due_date')
    if not due_date:
        try:
            due_date = (date.fromisoformat(issue_date) + timedelta(days=30)).isoformat()
        except Exception:
            due_date = issue_date
    # JE: Dr AR, Cr Revenue or Deferred Revenue
    credit_acc = accts['DEFREV'] if bool(payload.get('defer_revenue')) else accts['REV']
    lines = [
        {"account_id": accts['AR'], "debit_amount": amt, "credit_amount": 0, "description": f"Invoice {inv_no}"},
        {"account_id": credit_acc, "debit_amount": 0, "credit_amount": amt, "description": f"Invoice {inv_no}"},
    ]
    je_id = _create_draft_je(db, entity_id, lines, f"AR Invoice {inv_no}", inv_no)
    # Insert invoice
    iid = uuid.uuid4().hex
    db.execute(sa_text("INSERT INTO ar_invoices (id, entity_id, customer_id, invoice_number, issue_date, due_date, amount_total, tax_amount, status, journal_entry_id, created_at) VALUES (:id,:e,:c,:no,:isdt,:ddt,:amt,:tax,'open',:je,datetime('now'))"), {
        "id": iid, "e": entity_id, "c": cust_id, "no": inv_no, "isdt": issue_date, "ddt": due_date, "amt": amt, "tax": tax, "je": je_id
    })
    db.commit(); return {"id": iid, "journal_entry_id": je_id}


@router.get("/invoices")
async def list_invoices(entity_id: int, status: Optional[str] = Query(None), db: Session = Depends(get_db)):
    _ensure_ar_tables(db)
    where = ["entity_id = :e"]; params: Dict[str, Any] = {"e": entity_id}
    if status:
        where.append("status = :s"); params["s"] = status
    sql = "SELECT id, customer_id, invoice_number, issue_date, due_date, amount_total, tax_amount, status, journal_entry_id FROM ar_invoices WHERE " + " AND ".join(where) + " ORDER BY datetime(issue_date) DESC"
    rows = db.execute(sa_text(sql), params).fetchall()
    return [
        {"id": r[0], "customer_id": r[1], "invoice_number": r[2], "issue_date": r[3], "due_date": r[4], "amount_total": float(r[5] or 0), "tax_amount": float(r[6] or 0), "status": r[7], "journal_entry_id": r[8]}
        for r in rows
    ]


@router.post("/payments")
async def record_payment(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Record a payment against an AR invoice and create a JE: Dr Cash, Cr A/R."""
    _ensure_ar_tables(db)
    inv_id = payload.get('invoice_id')
    entity_id = int(payload.get('entity_id') or 0)
    if not (inv_id and entity_id):
        raise HTTPException(status_code=422, detail="invoice_id and entity_id required")
    row = db.execute(sa_text("SELECT amount_total, status FROM ar_invoices WHERE id = :id"), {"id": inv_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")
    total = float(row[0] or 0); status = row[1]
    if status == 'closed':
        raise HTTPException(status_code=400, detail="Invoice already closed")
    amt = float(payload.get('amount') or 0)
    if amt <= 0:
        raise HTTPException(status_code=422, detail="amount must be positive")
    accts = _ensure_accounts(db, entity_id)
    # Create JE
    je = _create_draft_je(db, entity_id, [
        {"account_id": accts['CASH'], "debit_amount": amt, "credit_amount": 0, "description": "AR Payment"},
        {"account_id": accts['AR'], "debit_amount": 0, "credit_amount": amt, "description": "AR Payment"},
    ], "AR Payment", payload.get('reference'))
    pid = uuid.uuid4().hex
    db.execute(sa_text("INSERT INTO ar_payments (id, invoice_id, payment_date, amount, journal_entry_id, created_at) VALUES (:id,:inv,:dt,:amt,:je,datetime('now'))"), {
        "id": pid, "inv": inv_id, "dt": (payload.get('payment_date') or datetime.utcnow().date().isoformat()), "amt": amt, "je": je
    })
    # Determine open amount by summing payments
    sum_pay = db.execute(sa_text("SELECT COALESCE(SUM(amount),0) FROM ar_payments WHERE invoice_id = :id"), {"id": inv_id}).fetchone()[0]
    new_status = 'closed' if round(float(sum_pay or 0) - total, 2) >= 0 else 'open'
    db.execute(sa_text("UPDATE ar_invoices SET status = :st WHERE id = :id"), {"st": new_status, "id": inv_id})
    db.commit(); return {"id": pid, "journal_entry_id": je, "status": new_status}

