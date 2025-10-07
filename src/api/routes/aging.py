"""
AR/AP Aging Reports
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text
from typing import Dict, Any
from datetime import date, datetime
from src.api.database_async import get_async_db

router = APIRouter(prefix="/api", tags=["aging"])


def _ensure_ap_ar(db: Session):
    db.execute(sa_text("""
        CREATE TABLE IF NOT EXISTS ap_bills (
            id TEXT PRIMARY KEY,
            entity_id INTEGER,
            vendor_id TEXT,
            invoice_number TEXT,
            issue_date TEXT,
            due_date TEXT,
            amount_total REAL,
            tax_amount REAL,
            status TEXT,
            journal_entry_id INTEGER,
            created_at TEXT
        )
    """))
    db.execute(sa_text("""
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
    """))
    db.commit()


@router.get("/ap/aging")
async def ap_aging(entity_id: int = Query(...), as_of: str = Query(date.today().isoformat()), db: Session = Depends(get_async_db)):
    _ensure_ap_ar(db)
    rows = db.execute(sa_text("SELECT due_date, amount_total FROM ap_bills WHERE entity_id = :e AND status = 'open'"), {"e": entity_id}).fetchall()
    buckets = {"0_30":0.0, "31_60":0.0, "61_90":0.0, ">90":0.0}
    as_of_dt = datetime.fromisoformat(as_of).date()
    for due, amt in rows:
        try:
            d = datetime.fromisoformat(str(due)).date()
            days = (as_of_dt - d).days
        except Exception:
            days = 0
        a = float(amt or 0)
        if days <= 30: buckets["0_30"] += a
        elif days <= 60: buckets["31_60"] += a
        elif days <= 90: buckets["61_90"] += a
        else: buckets[">90"] += a
    buckets = {k: round(v,2) for k,v in buckets.items()}
    return {"entity_id": entity_id, "as_of": as_of, "buckets": buckets, "total": round(sum(buckets.values()),2)}


@router.get("/ar/aging")
async def ar_aging(entity_id: int = Query(...), as_of: str = Query(date.today().isoformat()), db: Session = Depends(get_async_db)):
    _ensure_ap_ar(db)
    rows = db.execute(sa_text("SELECT due_date, amount_total FROM ar_invoices WHERE entity_id = :e AND status = 'open'"), {"e": entity_id}).fetchall()
    buckets = {"0_30":0.0, "31_60":0.0, "61_90":0.0, ">90":0.0}
    as_of_dt = datetime.fromisoformat(as_of).date()
    for due, amt in rows:
        try:
            d = datetime.fromisoformat(str(due)).date()
            days = (as_of_dt - d).days
        except Exception:
            days = 0
        a = float(amt or 0)
        if days <= 30: buckets["0_30"] += a
        elif days <= 60: buckets["31_60"] += a
        elif days <= 90: buckets["61_90"] += a
        else: buckets[">90"] += a
    buckets = {k: round(v,2) for k,v in buckets.items()}
    return {"entity_id": entity_id, "as_of": as_of, "buckets": buckets, "total": round(sum(buckets.values()),2)}

