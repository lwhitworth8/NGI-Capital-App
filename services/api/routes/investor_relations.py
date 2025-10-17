"""
Investor Relations routes (internal only)
Provides cap table view from accounting, outreach tracking, and communications.
"""

from typing import Any, Dict, List, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text

from ..database import get_db
from ..auth_deps import require_clerk_user as _require_clerk_user


router = APIRouter(prefix="/api/investor-relations", tags=["investor-relations"])


def _ensure_ir_schema(db: Session) -> None:
    db.execute(
        sa_text(
            """
            CREATE TABLE IF NOT EXISTS investors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT UNIQUE,
                firm TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
    )
    db.execute(
        sa_text(
            """
            CREATE TABLE IF NOT EXISTS ir_outreach (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                investor_id INTEGER NOT NULL,
                notes TEXT,
                stage TEXT,
                is_deleted INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
    )
    db.execute(
        sa_text(
            """
            CREATE TABLE IF NOT EXISTS ir_communications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                investor_id INTEGER NOT NULL,
                subject TEXT,
                message TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
    )


@router.get("/cap-table")
async def cap_table(
    entity_id: int = Query(...),
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    """Compute equity balances per member from approved journal entries."""
    # Tolerate minimal schemas by using SQL text and optional joins/columns
    # Sum credits to equity accounts under approved journal entries for the entity
    try:
        rows = db.execute(
            sa_text(
                """
                SELECT coa.account_name, SUM(jel.credit_amount) AS credited
                FROM journal_entry_lines jel
                JOIN chart_of_accounts coa ON coa.id = jel.account_id
                JOIN journal_entries je ON je.id = jel.journal_entry_id
                WHERE LOWER(COALESCE(coa.account_type,'')) = 'equity'
                  AND LOWER(COALESCE(je.approval_status,'')) = 'approved'
                  AND (je.entity_id = :eid)
                GROUP BY coa.account_name
                ORDER BY coa.account_name
                """
            ),
            {"eid": entity_id},
        ).fetchall()
    except Exception:
        rows = []
    members: List[Dict[str, Any]] = []
    total = Decimal("0")
    for name, credited in rows:
        amt = Decimal(str(credited or 0))
        members.append({"name": name, "balance": float(amt)})
        total += amt
    return {"entity_id": entity_id, "total_equity": float(total), "members": members}


@router.post("/outreach")
async def create_outreach(
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_ir_schema(db)
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    firm = (payload.get("firm") or "").strip()
    notes = (payload.get("notes") or "").strip()
    if not email:
        raise HTTPException(status_code=422, detail="email required")
    inv = db.execute(sa_text("SELECT id FROM investors WHERE email = :e"), {"e": email}).fetchone()
    if not inv:
        db.execute(
            sa_text("INSERT INTO investors (name,email,firm) VALUES (:n,:e,:f)"),
            {"n": name, "e": email, "f": firm},
        )
        investor_id = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0)
    else:
        investor_id = int(inv[0])
    db.execute(
        sa_text(
            "INSERT INTO ir_outreach (investor_id, notes, stage, is_deleted) VALUES (:iid,:no,:st,0)"
        ),
        {"iid": investor_id, "no": notes, "st": payload.get("stage") or "new"},
    )
    oid = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0)
    db.commit()
    return {"id": oid}


@router.get("/outreach")
async def list_outreach(
    partner=Depends(_require_clerk_user), db: Session = Depends(get_db)
):
    _ensure_ir_schema(db)
    rows = db.execute(
        sa_text(
            """
            SELECT o.id, i.name, i.email, i.firm, o.stage, o.created_at
            FROM ir_outreach o
            JOIN investors i ON i.id = o.investor_id
            WHERE o.is_deleted = 0
            ORDER BY o.id DESC
            """
        )
    ).fetchall()
    return [
        {
            "id": r[0],
            "investor_name": r[1],
            "email": r[2],
            "firm": r[3],
            "stage": r[4],
            "created_at": r[5],
        }
        for r in rows
    ]


@router.put("/outreach/{oid}")
async def update_outreach(
    oid: int, payload: Dict[str, Any], partner=Depends(_require_clerk_user), db: Session = Depends(get_db)
):
    _ensure_ir_schema(db)
    stage = (payload.get("stage") or "").strip()
    if not stage:
        raise HTTPException(status_code=422, detail="stage required")
    db.execute(sa_text("UPDATE ir_outreach SET stage = :s WHERE id = :id"), {"s": stage, "id": oid})
    db.commit()
    return {"message": "updated"}


@router.delete("/outreach/{oid}")
async def delete_outreach(oid: int, partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    _ensure_ir_schema(db)
    db.execute(sa_text("UPDATE ir_outreach SET is_deleted = 1 WHERE id = :id"), {"id": oid})
    db.commit()
    return {"message": "deleted"}


@router.post("/communications")
async def create_comm(
    payload: Dict[str, Any], partner=Depends(_require_clerk_user), db: Session = Depends(get_db)
):
    _ensure_ir_schema(db)
    investor_id = int(payload.get("investor_id") or 0)
    if not investor_id:
        raise HTTPException(status_code=422, detail="investor_id required")
    db.execute(
        sa_text(
            "INSERT INTO ir_communications (investor_id, subject, message) VALUES (:iid,:sub,:msg)"
        ),
        {"iid": investor_id, "sub": payload.get("subject") or "", "msg": payload.get("message") or ""},
    )
    cid = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0)
    db.commit()
    return {"id": cid}


@router.get("/communications")
async def list_comm(partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    _ensure_ir_schema(db)
    rows = db.execute(
        sa_text(
            """
            SELECT c.id, c.investor_id, i.name, i.email, c.subject, c.message, c.created_at
            FROM ir_communications c
            JOIN investors i ON i.id = c.investor_id
            ORDER BY c.id DESC
            """
        )
    ).fetchall()
    return [
        {
            "id": r[0],
            "investor_id": r[1],
            "investor_name": r[2],
            "email": r[3],
            "subject": r[4],
            "message": r[5],
            "created_at": r[6],
        }
        for r in rows
    ]


@router.get("/reports/summary")
async def ir_summary(partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    _ensure_ir_schema(db)
    inv_count = int(db.execute(sa_text("SELECT COUNT(*) FROM investors")).scalar() or 0)
    stage_rows = db.execute(
        sa_text("SELECT COALESCE(stage,''), COUNT(*) FROM ir_outreach WHERE is_deleted = 0 GROUP BY COALESCE(stage,'')")
    ).fetchall()
    pipeline = {str(r[0] or ""): int(r[1] or 0) for r in stage_rows}
    return {"investors": inv_count, "pipeline": pipeline}
