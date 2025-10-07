"""
DEPRECATED: Revenue Recognition (ASC 606) endpoints
These endpoints are deprecated as of October 2025.
Revenue recognition is now automatic via AR invoices (see /api/ar/revenue-recognition/)

OLD BEHAVIOR:
- Create schedules from invoices
- List schedules
- Post current-period revenue (creates monthly JE: Dr Deferred Rev, Cr Revenue)

NEW BEHAVIOR (Automated like QuickBooks/NetSuite):
1. Create invoice with revenue_recognition metadata → auto creates schedule
2. Run period-end process → auto creates JEs for approval
3. Approve JEs in standard approval workflow

See: src/api/routes/ar.py for new implementation
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, List, Optional
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text
import uuid

from src.api.database_async import get_async_db

router = APIRouter(prefix="/api/revrec", tags=["revrec"])


def _ensure_tables(db: Session):
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS rev_rec_schedules (
            id TEXT PRIMARY KEY,
            entity_id INTEGER,
            invoice_id TEXT,
            method TEXT,
            start_date TEXT,
            months INTEGER,
            total REAL,
            created_at TEXT
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS rev_rec_entries (
            id TEXT PRIMARY KEY,
            schedule_id TEXT,
            period TEXT,
            amount REAL,
            journal_entry_id INTEGER,
            created_at TEXT
        )
        """
    ))
    db.commit()


def _ensure_accounts(db: Session, entity_id: int) -> Dict[str, int]:
    # Minimal COA ensures
    db.execute(sa_text("CREATE TABLE IF NOT EXISTS chart_of_accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER, account_code TEXT, account_name TEXT, account_type TEXT, normal_balance TEXT, is_active INTEGER DEFAULT 1)"))
    db.commit()
    def ensure(code: str, name: str, atype: str, normal: str) -> int:
        row = db.execute(sa_text("SELECT id FROM chart_of_accounts WHERE entity_id = :e AND account_code = :c"), {"e": entity_id, "c": code}).fetchone()
        if row: return int(row[0])
        db.execute(sa_text("INSERT INTO chart_of_accounts (entity_id, account_code, account_name, account_type, normal_balance, is_active) VALUES (:e,:c,:n,:t,:nb,1)"), {"e": entity_id, "c": code, "n": name, "t": atype, "nb": normal}); db.commit()
        rid = db.execute(sa_text("SELECT last_insert_rowid()")).scalar(); return int(rid or 0)
    return {'DEFREV': ensure('21500','Deferred Revenue','liability','credit'), 'REV': ensure('41000','Revenue','revenue','credit')}


def _create_je(db: Session, entity_id: int, date_str: str, amount: float, desc: str) -> int:
    db.execute(sa_text("CREATE TABLE IF NOT EXISTS journal_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER, entry_number TEXT, entry_date TEXT, description TEXT, reference_number TEXT, total_debit REAL, total_credit REAL, approval_status TEXT, is_posted INTEGER DEFAULT 0, posted_date TEXT)"))
    db.execute(sa_text("CREATE TABLE IF NOT EXISTS journal_entry_lines (id INTEGER PRIMARY KEY AUTOINCREMENT, journal_entry_id INTEGER, account_id INTEGER, line_number INTEGER, description TEXT, debit_amount REAL, credit_amount REAL)"))
    db.commit()
    eno = f"REVREC-{entity_id:03d}-{int(datetime.utcnow().timestamp())}"
    db.execute(sa_text("INSERT INTO journal_entries (entity_id, entry_number, entry_date, description, total_debit, total_credit, approval_status, is_posted) VALUES (:e,:no,:dt,:ds,:td,:tc,'pending',0)"), {
        "e": entity_id, "no": eno, "dt": date_str, "ds": desc, "td": float(amount), "tc": float(amount)
    })
    jeid = int(db.execute(sa_text("SELECT last_insert_rowid()" )).first()[0])  # type: ignore[attr-defined]
    accts = _ensure_accounts(db, entity_id)
    db.execute(sa_text("INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, description, debit_amount, credit_amount) VALUES (:je,:a,1,:ds,:d,0)"), {"je": jeid, "a": accts['DEFREV'], "ds": desc, "d": float(amount)})
    db.execute(sa_text("INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, description, debit_amount, credit_amount) VALUES (:je,:a,2,:ds,0,:c)"), {"je": jeid, "a": accts['REV'], "ds": desc, "c": float(amount)})
    db.commit(); return jeid


@router.post("/schedules")
async def create_schedule(payload: Dict[str, Any], db: Session = Depends(get_async_db)):
    """Create a rev rec schedule. Payload: { entity_id, invoice_id, method: point_in_time|over_time, start_date, months, total }"""
    _ensure_tables(db)
    entity_id = int(payload.get('entity_id') or 0)
    if not entity_id:
        raise HTTPException(status_code=422, detail="entity_id required")
    sch_id = uuid.uuid4().hex
    method = (payload.get('method') or 'over_time').lower()
    months = int(payload.get('months') or 1)
    if months <= 0:
        months = 1
    db.execute(sa_text("INSERT INTO rev_rec_schedules (id, entity_id, invoice_id, method, start_date, months, total, created_at) VALUES (:id,:e,:inv,:m,:sd,:mn,:tot,datetime('now'))"), {
        "id": sch_id, "e": entity_id, "inv": payload.get('invoice_id'), "m": method, "sd": (payload.get('start_date') or date.today().isoformat()), "mn": months, "tot": float(payload.get('total') or 0)
    })
    db.commit(); return {"id": sch_id}


@router.get("/schedules")
async def list_schedules(entity_id: int, period: Optional[str] = None, db: Session = Depends(get_async_db)):
    _ensure_tables(db)
    rows = db.execute(sa_text("SELECT id, invoice_id, method, start_date, months, total FROM rev_rec_schedules WHERE entity_id = :e ORDER BY datetime(start_date) DESC"), {"e": entity_id}).fetchall()
    items = [{"id": r[0], "invoice_id": r[1], "method": r[2], "start_date": r[3], "months": r[4], "total": float(r[5] or 0)} for r in rows]
    if period:
        posted = db.execute(sa_text("SELECT schedule_id FROM rev_rec_entries WHERE period = :p"), {"p": period}).fetchall()
        posted_ids = {r[0] for r in posted}
        for it in items:
            it["posted_in_period"] = it["id"] in posted_ids
    return items


@router.post("/post-period")
async def post_period(entity_id: int, year: int, month: int, db: Session = Depends(get_async_db)):
    """Post revenue for the given period for all applicable schedules (idempotent per schedule+period)."""
    _ensure_tables(db)
    period = f"{year:04d}-{month:02d}"
    # Find schedules in range
    rows = db.execute(sa_text("SELECT id, start_date, months, total FROM rev_rec_schedules WHERE entity_id = :e"), {"e": entity_id}).fetchall()
    posted_count = 0
    for sid, sd, months, total in rows:
        # Determine if current period is within schedule window
        try:
            sd_y, sd_m = int(str(sd)[0:4]), int(str(sd)[5:7])
        except Exception:
            continue
        # Compute offset in months from start to target period
        offset = (year - sd_y) * 12 + (month - sd_m)
        if offset < 0 or offset >= int(months or 1):
            continue
        # Check if already posted for this schedule+period
        exists = db.execute(sa_text("SELECT 1 FROM rev_rec_entries WHERE schedule_id = :sid AND period = :p"), {"sid": sid, "p": period}).fetchone()
        if exists:
            continue
        amt = round(float(total or 0) / float(months or 1), 2)
        # Create JE
        jeid = _create_je(db, entity_id, date_str=f"{year:04d}-{month:02d}-01", amount=amt, desc=f"Revenue recognition {period}")
        # Insert entry
        db.execute(sa_text("INSERT INTO rev_rec_entries (id, schedule_id, period, amount, journal_entry_id, created_at) VALUES (:id,:sid,:p,:a,:je,datetime('now'))"), {
            "id": uuid.uuid4().hex, "sid": sid, "p": period, "a": amt, "je": jeid
        })
        db.commit(); posted_count += 1
    return {"posted": posted_count, "period": period}
