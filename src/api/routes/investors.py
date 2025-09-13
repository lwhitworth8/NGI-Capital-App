"""
Investor Management (Multi-Entity)
Endpoints for investors, pipelines, interactions, reports, and capital raise.
Non-destructive SQLite schema evolution consistent with the app style.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta, date
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text

from ..database import get_db
from ..auth_deps import require_clerk_user as _require_clerk_user

# Router
router = APIRouter(prefix="/api/investors", tags=["investors"])


def _has_column(db: Session, table: str, column: str) -> bool:
    try:
        rows = db.execute(sa_text(f"PRAGMA table_info({table})")).fetchall()
        return any((r[1] == column) for r in rows)
    except Exception:
        return False


def _add_column_if_missing(db: Session, table: str, column: str, coltype: str) -> None:
    if not _has_column(db, table, column):
        db.execute(sa_text(f"ALTER TABLE {table} ADD COLUMN {column} {coltype}"))

def _uuid() -> str:
    return uuid.uuid4().hex


def _ensure_schema(db: Session) -> None:
    # Investors
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS investors (
            id TEXT PRIMARY KEY,
            legal_name TEXT NOT NULL,
            firm TEXT,
            email TEXT,
            phone TEXT,
            type TEXT CHECK (type IN ('Angel','VC','Family Office','Strategic','Other')) DEFAULT 'Other',
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    # Ensure columns exist on older DBs and backfill legal_name from name if needed
    try:
        for col, typ in (
            ('legal_name','TEXT'),('firm','TEXT'),('email','TEXT'),('phone','TEXT'),
            ('type','TEXT'),('notes','TEXT'),('created_at','TEXT'),('updated_at','TEXT')
        ):
            _add_column_if_missing(db, 'investors', col, typ)
        # Backfill legal_name from legacy 'name' if present
        if _has_column(db, 'investors', 'name') and _has_column(db, 'investors', 'legal_name'):
            db.execute(sa_text("UPDATE investors SET legal_name = COALESCE(legal_name, name) WHERE legal_name IS NULL OR legal_name = ''"))
        # Ensure DDL/backfill are applied before any SELECTs
        db.commit()
    except Exception:
        pass
    # Pipelines
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS investor_pipelines (
            id TEXT PRIMARY KEY,
            entity_id INTEGER,
            investor_id TEXT,
            stage TEXT CHECK (stage IN ('Not Started','Diligence','Pitched','Won','Lost')) DEFAULT 'Not Started',
            owner_user_id TEXT,
            last_activity_at TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE(entity_id, investor_id)
        )
        """
    ))
    # Helpful indexes for performance
    try:
        db.execute(sa_text("CREATE INDEX IF NOT EXISTS idx_inv_pipelines_stage_entity ON investor_pipelines(stage, entity_id)"))
    except Exception:
        pass
    # Interactions
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS investor_interactions (
            id TEXT PRIMARY KEY,
            pipeline_id TEXT,
            happened_at TEXT,
            channel TEXT CHECK (channel IN ('Email','Call','Meeting','Note','Other')) DEFAULT 'Note',
            subject TEXT,
            body TEXT,
            author_user_id TEXT
        )
        """
    ))
    try:
        db.execute(sa_text("CREATE INDEX IF NOT EXISTS idx_inv_interactions_happened_at ON investor_interactions(happened_at)"))
    except Exception:
        pass
    # Reports
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS investor_reports (
            id TEXT PRIMARY KEY,
            entity_id INTEGER,
            period TEXT,
            type TEXT CHECK (type IN ('Quarterly','Monthly','Ad Hoc')) DEFAULT 'Quarterly',
            status TEXT CHECK (status IN ('Draft','In Review','Ready','Submitted')) DEFAULT 'Draft',
            due_date TEXT,
            submitted_at TEXT,
            owner_user_id TEXT,
            current_doc_url TEXT
        )
        """
    ))
    # Evolve investor_reports for older DBs
    try:
        for col, typ in (
            ('period','TEXT'),
            ('type','TEXT'),
            ('status','TEXT'),
            ('due_date','TEXT'),
            ('submitted_at','TEXT'),
            ('owner_user_id','TEXT'),
            ('current_doc_url','TEXT'),
        ):
            _add_column_if_missing(db, 'investor_reports', col, typ)
        db.commit()
    except Exception:
        pass
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS investor_report_files (
            id TEXT PRIMARY KEY,
            report_id TEXT,
            title TEXT,
            file_url TEXT,
            uploaded_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    # Capital raise
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS capital_raise_rounds (
            id TEXT PRIMARY KEY,
            entity_id INTEGER,
            round_type TEXT CHECK (round_type IN ('Pre-Seed','Seed','Series A','Series B','SAFE','Other')) DEFAULT 'Pre-Seed',
            target_amount REAL NOT NULL,
            soft_commits REAL DEFAULT 0,
            hard_commits REAL DEFAULT 0,
            close_date TEXT,
            description TEXT,
            consolidated INTEGER DEFAULT 0
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS capital_raise_contributions (
            id TEXT PRIMARY KEY,
            round_id TEXT,
            investor_id TEXT,
            amount REAL NOT NULL,
            status TEXT CHECK (status IN ('Soft','Hard','Closed','Withdrawn')) DEFAULT 'Soft',
            recorded_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))


def _resolve_entity(entity: Optional[int] = None, entity_id: Optional[int] = None) -> int:
    try:
        return int(entity or 0) or int(entity_id or 0)
    except Exception:
        return 0


@router.get("/kpis")
async def kpis(
    entity: int | None = Query(None),
    entity_id: int | None = Query(None),
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_schema(db)
    eid = _resolve_entity(entity, entity_id)
    if not eid:
        raise HTTPException(status_code=422, detail="entity is required")

    # Total investors with presence in pipeline for this entity
    total = int(db.execute(sa_text("SELECT COUNT(1) FROM investor_pipelines WHERE entity_id = :e"), {"e": eid}).scalar() or 0)
    # In pipeline (active stages)
    in_pipeline = int(db.execute(sa_text("SELECT COUNT(1) FROM investor_pipelines WHERE entity_id = :e AND stage IN ('Not Started','Diligence','Pitched')"), {"e": eid}).scalar() or 0)
    won = int(db.execute(sa_text("SELECT COUNT(1) FROM investor_pipelines WHERE entity_id = :e AND stage = 'Won'"), {"e": eid}).scalar() or 0)
    # Active contacts in last 30 days
    active30 = int(db.execute(sa_text("""
        SELECT COUNT(1) FROM investor_interactions ii
        WHERE ii.happened_at >= datetime('now','-30 day') AND ii.pipeline_id IN (
            SELECT id FROM investor_pipelines WHERE entity_id = :e
        )
    """), {"e": eid}).scalar() or 0)
    # Average days since last contact across pipelines with any interactions
    row = db.execute(sa_text("""
        WITH last_contact AS (
            SELECT ip.id as pid, MAX(COALESCE(ii.happened_at, ip.last_activity_at)) as last_ts
            FROM investor_pipelines ip
            LEFT JOIN investor_interactions ii ON ii.pipeline_id = ip.id
            WHERE ip.entity_id = :e
            GROUP BY ip.id
        )
        SELECT AVG(CASE WHEN last_ts IS NULL THEN NULL ELSE (julianday('now') - julianday(last_ts)) END) FROM last_contact
    """), {"e": eid}).fetchone()
    last_avg_days = round(float(row[0]), 1) if row and row[0] is not None else 0.0

    # Days to quarter end (calendar fiscal)
    today = date.today()
    q = (today.month - 1) // 3 + 1
    q_end_month = q * 3
    if q_end_month in (3, 6, 9, 12):
        # last day of month
        if q_end_month == 12:
            q_end = date(today.year, 12, 31)
        else:
            first_next = date(today.year, q_end_month + 1, 1)
            q_end = first_next - timedelta(days=1)
    else:
        q_end = today
    days_to_q_end = (q_end - today).days
    if days_to_q_end < 0:
        days_to_q_end = 0

    # Days to next report: min future due_date
    row = db.execute(sa_text("SELECT MIN(julianday(due_date) - julianday('now')) FROM investor_reports WHERE entity_id = :e AND (due_date IS NOT NULL) AND (submitted_at IS NULL)"), {"e": eid}).fetchone()
    dtnr = int(row[0]) if row and row[0] is not None else 0
    if dtnr < 0:
        dtnr = 0

    return {
        "total": total,
        "inPipeline": in_pipeline,
        "won": won,
        "lost": int(db.execute(sa_text("SELECT COUNT(1) FROM investor_pipelines WHERE entity_id = :e AND stage = 'Lost'"), {"e": eid}).scalar() or 0),
        "activeThis30d": active30,
        "lastContactAvgDays": last_avg_days,
        "daysToQuarterEnd": days_to_q_end,
        "daysToNextReport": dtnr,
    }


# Alias endpoint as per spec
@router.get("/../investor-kpis", include_in_schema=False)
async def kpis_alias(
    entity: int | None = Query(None),
    entity_id: int | None = Query(None),
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    return await kpis(entity=entity, entity_id=entity_id, partner=partner, db=db)  # type: ignore


@router.get("")
async def list_investors(
    entity: int | None = Query(None),
    entity_id: int | None = Query(None),
    q: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=200),
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_schema(db)
    eid = _resolve_entity(entity, entity_id)
    if not eid:
        raise HTTPException(status_code=422, detail="entity is required")
    where = [" ip.entity_id = :e "]
    params: Dict[str, Any] = {"e": eid, "lim": int(pageSize), "off": int((page - 1) * pageSize)}
    if q:
        where.append(" (lower(i.legal_name) LIKE :q OR lower(coalesce(i.firm,'')) LIKE :q OR lower(coalesce(i.email,'')) LIKE :q) ")
        params["q"] = f"%{q.lower()}%"
    if type:
        where.append(" lower(coalesce(i.type,'')) = :t ")
        params["t"] = type.lower()
    where_sql = " AND ".join(where)
    sql = f"""
        SELECT i.id, i.legal_name, i.firm, i.email, i.phone, i.type
        FROM investor_pipelines ip JOIN investors i ON i.id = ip.investor_id
        WHERE {where_sql}
        ORDER BY i.legal_name COLLATE NOCASE ASC
        LIMIT :lim OFFSET :off
    """
    count_sql = f"SELECT COUNT(1) FROM investor_pipelines ip JOIN investors i ON i.id = ip.investor_id WHERE {where_sql}"
    rows = db.execute(sa_text(sql), params).fetchall()
    total = int(db.execute(sa_text(count_sql), params).scalar() or 0)
    items = [
        {"id": "" if r[0] is None else str(r[0]), "legal_name": r[1], "firm": r[2], "email": r[3], "phone": r[4], "type": r[5]}
        for r in rows
    ]
    return {"items": items, "total": total, "page": page, "pageSize": pageSize}


@router.post("")
async def create_investor(
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_schema(db)
    name = (payload.get("legal_name") or payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="legal_name required")
    # Normalize and dedupe by email if provided
    email = payload.get("email")
    if email:
        email = str(email).strip().lower()
        row = db.execute(sa_text("SELECT id FROM investors WHERE lower(coalesce(email,'')) = :e"), {"e": email}).fetchone()
        if row:
            return {"id": "" if row[0] is None else str(row[0])}
    # Dedupe by exact name+firm if email not provided
    firm = payload.get("firm")
    if firm and not email:
        row = db.execute(sa_text("SELECT id FROM investors WHERE legal_name = :n AND coalesce(firm,'') = :f"), {"n": name, "f": firm}).fetchone()
        if row:
            return {"id": "" if row[0] is None else str(row[0])}
    iid = payload.get("id") or _uuid()
    db.execute(sa_text("""
        INSERT INTO investors (id, legal_name, firm, email, phone, type, notes, created_at, updated_at)
        VALUES (:id,:n,:f,:e,:p,:t,:no,datetime('now'),datetime('now'))
    """), {
        "id": iid,
        "n": name,
        "f": firm,
        "e": email,
        "p": payload.get("phone"),
        "t": payload.get("type") or "Other",
        "no": payload.get("notes"),
    })
    db.commit()
    return {"id": iid}


@router.patch("/{iid}")
async def update_investor(
    iid: str,
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_schema(db)
    fields = ["legal_name","firm","email","phone","type","notes"]
    sets = []
    params: Dict[str, Any] = {"id": iid}
    for f in fields:
        if f in payload:
            sets.append(f"{f} = :{f}")
            params[f] = payload[f]
    if not sets:
        return {"message": "no changes"}
    sql = "UPDATE investors SET " + ", ".join(sets) + ", updated_at = datetime('now') WHERE id = :id"
    db.execute(sa_text(sql), params)
    db.commit()
    return {"message": "updated"}


@router.get("/pipeline")
async def get_pipeline(
    entity: int | None = Query(None),
    entity_id: int | None = Query(None),
    q: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),  # single stage or special 'in_progress'
    sort: Optional[str] = Query(None),   # 'name' | 'lastActivity'
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_schema(db)
    eid = _resolve_entity(entity, entity_id)
    if not eid:
        raise HTTPException(status_code=422, detail="entity is required")
    where = [" ip.entity_id = :e "]
    params: Dict[str, Any] = {"e": eid}
    if q:
        where.append(" (lower(i.legal_name) LIKE :q OR lower(coalesce(i.firm,'')) LIKE :q OR lower(coalesce(i.email,'')) LIKE :q) ")
        params["q"] = f"%{q.lower()}%"
    if stage:
        if stage.lower() == 'in_progress':
            where.append(" ip.stage IN ('Not Started','Diligence','Pitched') ")
        else:
            where.append(" ip.stage = :st ")
            params["st"] = stage
    order = "i.legal_name COLLATE NOCASE ASC"
    if sort and sort.lower() == 'lastactivity':
        order = "COALESCE(ip.last_activity_at, '0001-01-01') DESC, i.legal_name COLLATE NOCASE ASC"
    sql = f"""
        SELECT ip.id, ip.stage, ip.owner_user_id, ip.last_activity_at,
               i.id, i.legal_name, i.firm, i.email
        FROM investor_pipelines ip JOIN investors i ON i.id = ip.investor_id
        WHERE {' AND '.join(where)}
        ORDER BY {order}
    """
    rows = db.execute(sa_text(sql), params).fetchall()
    stages = ["Not Started","Diligence","Pitched","Won","Lost"]
    grouped: Dict[str, List[Dict[str, Any]]] = {s: [] for s in stages}
    for r in rows:
        grouped.get(r[1], grouped["Not Started"]).append({
            "pipelineId": r[0],
            "investor": {"id": "" if r[4] is None else str(r[4]), "name": r[5], "firm": r[6], "email": r[7]},
            "ownerUserId": r[2],
            "lastActivityAt": r[3],
        })
    return [{"stage": s, "items": grouped[s]} for s in stages]


@router.post("/pipeline")
async def upsert_pipeline(
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_schema(db)
    eid = _resolve_entity(payload.get("entity"), payload.get("entityId") or payload.get("entity_id"))
    inv = (payload.get("investorId") or payload.get("investor_id") or "").strip()
    if not eid or not inv:
        raise HTTPException(status_code=422, detail="entityId and investorId required")
    pid = _uuid()
    # INSERT OR IGNORE for unique(entity_id, investor_id)
    db.execute(sa_text("""
        INSERT OR IGNORE INTO investor_pipelines (id, entity_id, investor_id, stage, owner_user_id, created_at, updated_at)
        VALUES (:id,:e,:i,:s,:o,datetime('now'),datetime('now'))
    """), {"id": pid, "e": eid, "i": inv, "s": payload.get("stage") or "Not Started", "o": payload.get("ownerUserId")})
    # If exists, update stage/owner
    db.execute(sa_text("""
        UPDATE investor_pipelines SET stage = COALESCE(:s, stage), owner_user_id = COALESCE(:o, owner_user_id), updated_at = datetime('now')
        WHERE entity_id = :e AND investor_id = :i
    """), {"e": eid, "i": inv, "s": payload.get("stage"), "o": payload.get("ownerUserId")})
    db.commit()
    row = db.execute(sa_text("SELECT id FROM investor_pipelines WHERE entity_id = :e AND investor_id = :i"), {"e": eid, "i": inv}).fetchone()
    return {"id": row[0] if row else pid}


@router.post("/link")
async def link_investor(
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    """
    Link an existing investor to an entity pipeline at a given stage.
    Equivalent to upsert_pipeline; kept for compatibility with existing clients.
    """
    _ensure_schema(db)
    eid = _resolve_entity(payload.get("entity"), payload.get("entityId") or payload.get("entity_id"))
    inv = (payload.get("investorId") or payload.get("investor_id") or "").strip()
    if not eid or not inv:
        raise HTTPException(status_code=422, detail="entityId and investorId required")
    pid = _uuid()
    db.execute(sa_text("""
        INSERT OR IGNORE INTO investor_pipelines (id, entity_id, investor_id, stage, owner_user_id, created_at, updated_at)
        VALUES (:id,:e,:i,:s,:o,datetime('now'),datetime('now'))
    """), {"id": pid, "e": eid, "i": inv, "s": payload.get("stage") or "Not Started", "o": payload.get("ownerUserId")})
    db.execute(sa_text("""
        UPDATE investor_pipelines SET stage = COALESCE(:s, stage), owner_user_id = COALESCE(:o, owner_user_id), updated_at = datetime('now')
        WHERE entity_id = :e AND investor_id = :i
    """), {"e": eid, "i": inv, "s": payload.get("stage"), "o": payload.get("ownerUserId")})
    db.commit()
    row = db.execute(sa_text("SELECT id FROM investor_pipelines WHERE entity_id = :e AND investor_id = :i"), {"e": eid, "i": inv}).fetchone()
    return {"id": row[0] if row else pid}


@router.get("/search")
async def search_investors(
    q: str = Query(""),
    entity: int | None = Query(None),
    entity_id: int | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    """Search global investors by name/firm/email. If entity provided, exclude already linked."""
    _ensure_schema(db)
    ql = f"%{(q or '').lower()}%"
    eid = _resolve_entity(entity, entity_id)
    if eid:
        rows = db.execute(sa_text(
            """
            SELECT i.id, i.legal_name, i.firm, i.email
            FROM investors i
            WHERE (
                lower(i.legal_name) LIKE :q OR lower(coalesce(i.firm,'')) LIKE :q OR lower(coalesce(i.email,'')) LIKE :q
            ) AND i.id NOT IN (
                SELECT investor_id FROM investor_pipelines WHERE entity_id = :e
            )
            ORDER BY i.legal_name COLLATE NOCASE ASC
            LIMIT :lim
            """
        ), {"q": ql, "e": eid, "lim": limit}).fetchall()
    else:
        rows = db.execute(sa_text(
            """
            SELECT i.id, i.legal_name, i.firm, i.email
            FROM investors i
            WHERE lower(i.legal_name) LIKE :q OR lower(coalesce(i.firm,'')) LIKE :q OR lower(coalesce(i.email,'')) LIKE :q
            ORDER BY i.legal_name COLLATE NOCASE ASC
            LIMIT :lim
            """
        ), {"q": ql, "lim": limit}).fetchall()
    return [{"id": "" if r[0] is None else str(r[0]), "legal_name": r[1], "firm": r[2], "email": r[3]} for r in rows]


@router.get("/raise-costs")
async def raise_costs(
    entity: int | None = Query(None), entity_id: int | None = Query(None), consolidated: bool | None = Query(None),
    partner=Depends(_require_clerk_user), db: Session = Depends(get_db)
):
    """
    Returns a cost breakdown suitable for a pie chart.
    - consolidated: list of {label, value} per entity (expense totals)
    - per-entity: list of {label, value} per top expense account/category
    """
    _ensure_schema(db)
    eid = _resolve_entity(entity, entity_id)
    try:
        if consolidated:
            rows = db.execute(sa_text(
                """
                SELECT e.legal_name, SUM(COALESCE(jel.debit_amount,0) - COALESCE(jel.credit_amount,0)) as amt
                FROM journal_entry_lines jel
                JOIN journal_entries je ON je.id = jel.journal_entry_id
                JOIN entities e ON e.id = je.entity_id
                JOIN chart_of_accounts coa ON coa.id = jel.account_id
                WHERE lower(coalesce(coa.account_type,'')) = 'expense'
                GROUP BY e.legal_name
                ORDER BY amt DESC
                """
            )).fetchall()
            return {"segments": [{"label": r[0], "value": float(r[1] or 0)} for r in rows]}
        else:
            if not eid:
                raise HTTPException(status_code=422, detail="entity is required")
            rows = db.execute(sa_text(
                """
                SELECT coa.account_name, SUM(COALESCE(jel.debit_amount,0) - COALESCE(jel.credit_amount,0)) as amt
                FROM journal_entry_lines jel
                JOIN journal_entries je ON je.id = jel.journal_entry_id
                JOIN chart_of_accounts coa ON coa.id = jel.account_id
                WHERE je.entity_id = :e AND lower(coalesce(coa.account_type,'')) = 'expense'
                GROUP BY coa.account_name
                ORDER BY amt DESC
                LIMIT 12
                """
            ), {"e": eid}).fetchall()
            return {"segments": [{"label": r[0], "value": float(r[1] or 0)} for r in rows]}
    except Exception:
        return {"segments": []}


@router.patch("/pipeline/{pid}")
async def patch_pipeline(
    pid: str,
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_schema(db)
    fields = []
    params: Dict[str, Any] = {"id": pid}
    for k in ("stage","ownerUserId","lastActivityAt"):
        if k in payload:
            col = {"ownerUserId":"owner_user_id","lastActivityAt":"last_activity_at"}.get(k, k)
            fields.append(f"{col} = :{k}")
            params[k] = payload[k]
    if not fields:
        return {"message": "no changes"}
    db.execute(sa_text("UPDATE investor_pipelines SET " + ", ".join(fields) + ", updated_at = datetime('now') WHERE id = :id"), params)
    # If moving to Won and committed info provided, persist contribution under a specified round
    if payload.get("stage") == 'Won' and (payload.get("committedAmount") is not None):
        round_id = payload.get("roundId")
        amt = float(payload.get("committedAmount") or 0)
        if round_id and amt > 0:
            db.execute(sa_text("INSERT INTO capital_raise_contributions (id, round_id, investor_id, amount, status) SELECT :id,:r, ip.investor_id, :a, 'Closed' FROM investor_pipelines ip WHERE ip.id = :pid"),
                       {"id": _uuid(), "r": round_id, "a": amt, "pid": pid})
            # Update rollup
            row = db.execute(sa_text("SELECT soft_commits, hard_commits FROM capital_raise_rounds WHERE id = :r"), {"r": round_id}).fetchone()
            hard = float(row[1] or 0) if row else 0
            db.execute(sa_text("UPDATE capital_raise_rounds SET hard_commits = :h WHERE id = :r"), {"h": hard + amt, "r": round_id})
    db.commit()
    return {"message": "updated"}


# Contacts (Interactions) endpoints per spec
@router.post("/contacts")
async def create_contact(
    payload: Dict[str, Any], partner=Depends(_require_clerk_user), db: Session = Depends(get_db)
):
    _ensure_schema(db)
    investor_id = (payload.get("investorId") or payload.get("investor_id") or "").strip()
    eid = _resolve_entity(payload.get("entity"), payload.get("entityId") or payload.get("entity_id"))
    if not investor_id or not eid:
        raise HTTPException(status_code=422, detail="investorId and entityId required")
    # Ensure relationship exists
    row = db.execute(sa_text("SELECT id FROM investor_pipelines WHERE entity_id = :e AND investor_id = :i"), {"e": eid, "i": investor_id}).fetchone()
    if not row:
        pid = _uuid()
        db.execute(sa_text("INSERT INTO investor_pipelines (id, entity_id, investor_id, stage) VALUES (:id,:e,:i,'Not Started')"), {"id": pid, "e": eid, "i": investor_id})
        pipeline_id = pid
    else:
        pipeline_id = row[0]
    # Insert interaction
    iid = _uuid()
    db.execute(sa_text("INSERT INTO investor_interactions (id, pipeline_id, happened_at, channel, subject, body, author_user_id) VALUES (:id,:p,:h,:c,:s,:b,:a)"),
               {"id": iid, "p": pipeline_id, "h": payload.get("occurred_at") or payload.get("happenedAt"), "c": payload.get("channel") or 'Note', "s": payload.get("subject"), "b": payload.get("notes") or payload.get("body"), "a": partner.get('email') if isinstance(partner, dict) else None})
    db.execute(sa_text("UPDATE investor_pipelines SET last_activity_at = COALESCE(:h, last_activity_at), updated_at = datetime('now') WHERE id = :p"), {"h": payload.get("occurred_at") or payload.get("happenedAt"), "p": pipeline_id})
    db.commit()
    return {"id": iid}


@router.get("/contacts")
async def list_contacts(
    entity: int | None = Query(None), entity_id: int | None = Query(None), investor: str | None = Query(None), partner=Depends(_require_clerk_user), db: Session = Depends(get_db)
):
    _ensure_schema(db)
    eid = _resolve_entity(entity, entity_id)
    if not eid:
        raise HTTPException(status_code=422, detail="entity is required")
    where = [" ip.entity_id = :e "]
    params: Dict[str, Any] = {"e": eid}
    if investor:
        where.append(" ip.investor_id = :i ")
        params["i"] = investor
    rows = db.execute(sa_text(f"""
        SELECT ii.id, ii.pipeline_id, ii.happened_at, ii.channel, ii.subject, ii.body, ii.author_user_id
        FROM investor_interactions ii JOIN investor_pipelines ip ON ip.id = ii.pipeline_id
        WHERE {' AND '.join(where)}
        ORDER BY COALESCE(ii.happened_at, '0001-01-01') DESC
    """), params).fetchall()
    return [
        {"id": r[0], "pipelineId": r[1], "occurred_at": r[2], "channel": r[3], "subject": r[4], "notes": r[5], "author": r[6]}
        for r in rows
    ]


# Reporting endpoint aliases under /api
@router.get("/../reports", include_in_schema=False)
async def reports_alias(entity: int | None = Query(None), entity_id: int | None = Query(None), partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    from fastapi import APIRouter
    return await list_reports(entity=entity, entity_id=entity_id, partner=partner, db=db)  # type: ignore


@router.post("/../reports", include_in_schema=False)
async def create_report_alias(payload: Dict[str, Any], partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    return await create_report(payload=payload, partner=partner, db=db)  # type: ignore


@router.patch("/../reports/{rid}", include_in_schema=False)
async def patch_report_alias(rid: str, payload: Dict[str, Any], partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    return await patch_report(rid=rid, payload=payload, partner=partner, db=db)  # type: ignore


@router.post("/../reports/{rid}/files", include_in_schema=False)
async def attach_file_alias(rid: str, payload: Dict[str, Any], partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    return await attach_file(rid=rid, payload=payload, partner=partner, db=db)  # type: ignore


# Goals aliases under /api/raise
@router.get("/../raise/goals", include_in_schema=False)
async def raise_goals(entity: int | None = Query(None), entity_id: int | None = Query(None), partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    return await list_rounds(entity=entity, entity_id=entity_id, consolidated=False, partner=partner, db=db)  # type: ignore


@router.get("/../raise/goals/consolidated", include_in_schema=False)
async def raise_goals_consolidated(partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    return await list_rounds(entity=None, entity_id=None, consolidated=True, partner=partner, db=db)  # type: ignore


@router.post("/../raise/goals", include_in_schema=False)
async def raise_create_goal(payload: Dict[str, Any], partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    return await create_round(payload=payload, partner=partner, db=db)  # type: ignore


@router.patch("/../raise/goals/{rid}", include_in_schema=False)
async def raise_patch_goal(rid: str, payload: Dict[str, Any], partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    return await patch_round(rid=rid, payload=payload, partner=partner, db=db)  # type: ignore


@router.get("/../raise/progress", include_in_schema=False)
async def raise_progress(roundId: str, partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    return await list_contribs(rid=roundId, partner=partner, db=db)  # type: ignore


@router.patch("/../raise/progress", include_in_schema=False)
async def raise_progress_patch(payload: Dict[str, Any], partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    # Accept roundId, amount, status
    rid = payload.get('roundId')
    if not rid:
        raise HTTPException(status_code=422, detail="roundId required")
    amt = float(payload.get('amount') or 0)
    status = payload.get('status') or 'Soft'
    return await add_contrib(rid=rid, payload={"amount": amt, "status": status}, partner=partner, db=db)  # type: ignore


@router.get("/{pipeline_id}/interactions")
async def list_interactions(
    pipeline_id: str,
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_schema(db)
    rows = db.execute(sa_text("""
        SELECT id, pipeline_id, happened_at, channel, subject, body, author_user_id FROM investor_interactions
        WHERE pipeline_id = :p ORDER BY COALESCE(happened_at, '0000-01-01') DESC
    """), {"p": pipeline_id}).fetchall()
    return [
        {"id": r[0], "pipelineId": r[1], "happenedAt": r[2], "channel": r[3], "subject": r[4], "body": r[5], "authorUserId": r[6]}
        for r in rows
    ]


@router.post("/{pipeline_id}/interactions")
async def create_interaction(
    pipeline_id: str,
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_schema(db)
    iid = _uuid()
    db.execute(sa_text("""
        INSERT INTO investor_interactions (id, pipeline_id, happened_at, channel, subject, body, author_user_id)
        VALUES (:id,:p,:h,:c,:s,:b,:a)
    """), {
        "id": iid,
        "p": pipeline_id,
        "h": payload.get("happenedAt"),
        "c": payload.get("channel") or "Note",
        "s": payload.get("subject"),
        "b": payload.get("body"),
        "a": payload.get("authorUserId"),
    })
    # Update pipeline last_activity_at
    db.execute(sa_text("UPDATE investor_pipelines SET last_activity_at = COALESCE(:h, last_activity_at), updated_at = datetime('now') WHERE id = :p"), {"h": payload.get("happenedAt"), "p": pipeline_id})
    db.commit()
    return {"id": iid}


@router.get("/reports")
async def list_reports(
    entity: int | None = Query(None),
    entity_id: int | None = Query(None),
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_schema(db)
    eid = _resolve_entity(entity, entity_id)
    if not eid:
        raise HTTPException(status_code=422, detail="entity is required")
    current = db.execute(sa_text("""
        SELECT id, entity_id, period, type, status, due_date, submitted_at, owner_user_id, current_doc_url
        FROM investor_reports WHERE entity_id = :e AND (submitted_at IS NULL OR status != 'Submitted')
        ORDER BY due_date ASC LIMIT 1
    """), {"e": eid}).fetchone()
    past_rows = db.execute(sa_text("""
        SELECT id, entity_id, period, type, status, due_date, submitted_at, owner_user_id, current_doc_url
        FROM investor_reports WHERE entity_id = :e AND (submitted_at IS NOT NULL OR status = 'Submitted')
        ORDER BY COALESCE(submitted_at, due_date) DESC
    """), {"e": eid}).fetchall()

    def _norm_row(row):
        # Normalize legacy rows: coerce id to string and default missing enums/strings
        return {
            "id": "" if row[0] is None else str(row[0]),
            "entityId": int(row[1] or 0),
            "period": (row[2] or ""),
            "type": (row[3] or "Quarterly"),
            "status": (row[4] or "Draft"),
            "dueDate": row[5],
            "submittedAt": row[6],
            "ownerUserId": row[7],
            "currentDocUrl": row[8],
        }

    return {
        "current": None if not current else _norm_row(current),
        "past": [_norm_row(r) for r in past_rows],
    }


@router.post("/reports")
async def create_report(
    payload: Dict[str, Any], partner=Depends(_require_clerk_user), db: Session = Depends(get_db)
):
    _ensure_schema(db)
    eid = _resolve_entity(payload.get("entity"), payload.get("entityId") or payload.get("entity_id"))
    period = (payload.get("period") or "").strip()
    if not eid or not period:
        raise HTTPException(status_code=422, detail="entityId and period required")
    # Determine legacy vs. new schema for primary key handling
    id_is_integer_pk = False
    try:
        rows = db.execute(sa_text("PRAGMA table_info(investor_reports)")).fetchall()
        for r in rows:
            col_name = str(r[1] or '').lower()
            col_type = str(r[2] or '').upper()
            is_pk = int(r[5] or 0) == 1
            if col_name == 'id' and is_pk and 'INT' in col_type:
                id_is_integer_pk = True
                break
    except Exception:
        id_is_integer_pk = False

    if id_is_integer_pk:
        # Legacy table: id is INTEGER PRIMARY KEY. Let SQLite assign it.
        db.execute(sa_text("""
            INSERT INTO investor_reports (entity_id, period, type, status, due_date, owner_user_id)
            VALUES (:e,:p,:t,'Draft',:d,:o)
        """), {"e": eid, "p": period, "t": payload.get("type") or 'Quarterly', "d": payload.get("dueDate"), "o": payload.get("ownerUserId")})
        rid_row = db.execute(sa_text("SELECT last_insert_rowid()")).fetchone()
        rid_val = str(int(rid_row[0])) if rid_row and rid_row[0] is not None else None
        db.commit()
        return {"id": rid_val}
    else:
        # New table: id is TEXT UUID.
        rid = _uuid()
        db.execute(sa_text("""
            INSERT INTO investor_reports (id, entity_id, period, type, status, due_date, owner_user_id)
            VALUES (:id,:e,:p,:t,'Draft',:d,:o)
        """), {"id": rid, "e": eid, "p": period, "t": payload.get("type") or 'Quarterly', "d": payload.get("dueDate"), "o": payload.get("ownerUserId")})
        db.commit()
        return {"id": rid}


@router.patch("/reports/{rid}")
async def patch_report(
    rid: str, payload: Dict[str, Any], partner=Depends(_require_clerk_user), db: Session = Depends(get_db)
):
    _ensure_schema(db)
    fields = []
    params: Dict[str, Any] = {"id": rid}
    for k in ("status","currentDocUrl","submittedAt"):
        if k in payload:
            col = {"currentDocUrl":"current_doc_url","submittedAt":"submitted_at"}.get(k, k)
            fields.append(f"{col} = :{k}")
            params[k] = payload[k]
    if not fields:
        return {"message": "no changes"}
    db.execute(sa_text("UPDATE investor_reports SET " + ", ".join(fields) + " WHERE id = :id"), params)
    db.commit()
    return {"message": "updated"}


@router.post("/reports/{rid}/files")
async def attach_file(
    rid: str, payload: Dict[str, Any], partner=Depends(_require_clerk_user), db: Session = Depends(get_db)
):
    _ensure_schema(db)
    fid = _uuid()
    db.execute(sa_text("""
        INSERT INTO investor_report_files (id, report_id, title, file_url) VALUES (:id,:r,:t,:u)
    """), {"id": fid, "r": rid, "t": payload.get("title") or '', "u": payload.get("fileUrl") or ''})
    db.commit()
    return {"id": fid}


@router.get("/rounds")
async def list_rounds(
    entity: int | None = Query(None),
    entity_id: int | None = Query(None),
    consolidated: bool | None = Query(None),
    partner=Depends(_require_clerk_user), db: Session = Depends(get_db)
):
    _ensure_schema(db)
    eid = _resolve_entity(entity, entity_id)
    if consolidated:
        rows = db.execute(sa_text("""
            SELECT id, entity_id, round_type, target_amount, soft_commits, hard_commits, close_date, description, consolidated
            FROM capital_raise_rounds WHERE consolidated = 1 ORDER BY close_date DESC
        """), {}).fetchall()
    else:
        if not eid:
            raise HTTPException(status_code=422, detail="entity is required")
        rows = db.execute(sa_text("""
            SELECT id, entity_id, round_type, target_amount, soft_commits, hard_commits, close_date, description, consolidated
            FROM capital_raise_rounds WHERE entity_id = :e ORDER BY close_date DESC
        """), {"e": eid}).fetchall()
    return [
        {"id": r[0], "entityId": r[1], "roundType": r[2], "targetAmount": r[3], "softCommits": r[4], "hardCommits": r[5], "closeDate": r[6], "description": r[7], "consolidated": bool(r[8])}
        for r in rows
    ]


@router.post("/rounds")
async def create_round(
    payload: Dict[str, Any], partner=Depends(_require_clerk_user), db: Session = Depends(get_db)
):
    _ensure_schema(db)
    rid = _uuid()
    eid = _resolve_entity(payload.get("entity"), payload.get("entityId") or payload.get("entity_id"))
    con = 1 if payload.get("consolidated") else 0
    if not (eid or con == 1):
        raise HTTPException(status_code=422, detail="entityId or consolidated required")
    db.execute(sa_text("""
        INSERT INTO capital_raise_rounds (id, entity_id, round_type, target_amount, soft_commits, hard_commits, close_date, description, consolidated)
        VALUES (:id,:e,:t,:ta,0,0,:cd,:d,:c)
    """), {"id": rid, "e": eid if con == 0 else None, "t": payload.get("roundType") or 'Pre-Seed', "ta": float(payload.get("targetAmount") or 0), "cd": payload.get("closeDate"), "d": payload.get("description"), "c": con})
    db.commit()
    return {"id": rid}


@router.patch("/rounds/{rid}")
async def patch_round(
    rid: str, payload: Dict[str, Any], partner=Depends(_require_clerk_user), db: Session = Depends(get_db)
):
    _ensure_schema(db)
    fields = []
    params: Dict[str, Any] = {"id": rid}
    mapping = {"roundType":"round_type","targetAmount":"target_amount","softCommits":"soft_commits","hardCommits":"hard_commits","closeDate":"close_date","description":"description","consolidated":"consolidated"}
    for k, col in mapping.items():
        if k in payload:
            fields.append(f"{col} = :{k}")
            params[k] = payload[k]
    if not fields:
        return {"message": "no changes"}
    db.execute(sa_text("UPDATE capital_raise_rounds SET " + ", ".join(fields) + " WHERE id = :id"), params)
    db.commit()
    return {"message": "updated"}


@router.get("/rounds/{rid}/contribs")
async def list_contribs(
    rid: str, partner=Depends(_require_clerk_user), db: Session = Depends(get_db)
):
    _ensure_schema(db)
    rows = db.execute(sa_text("""
        SELECT id, investor_id, amount, status, recorded_at FROM capital_raise_contributions WHERE round_id = :r ORDER BY recorded_at DESC
    """), {"r": rid}).fetchall()
    return [
        {"id": r[0], "investorId": r[1], "amount": r[2], "status": r[3], "recordedAt": r[4]}
        for r in rows
    ]


@router.post("/rounds/{rid}/contribs")
async def add_contrib(
    rid: str, payload: Dict[str, Any], partner=Depends(_require_clerk_user), db: Session = Depends(get_db)
):
    _ensure_schema(db)
    cid = _uuid()
    amount = float(payload.get("amount") or 0)
    status = (payload.get("status") or "Soft")
    db.execute(sa_text("""
        INSERT INTO capital_raise_contributions (id, round_id, investor_id, amount, status) VALUES (:id,:r,:i,:a,:s)
    """), {"id": cid, "r": rid, "i": payload.get("investorId"), "a": amount, "s": status})
    # Update cached totals on round
    row = db.execute(sa_text("SELECT soft_commits, hard_commits FROM capital_raise_rounds WHERE id = :r"), {"r": rid}).fetchone()
    soft = float(row[0] or 0) if row else 0
    hard = float(row[1] or 0) if row else 0
    if status == 'Soft':
        soft += amount
    elif status in ('Hard','Closed'):
        hard += amount
    db.execute(sa_text("UPDATE capital_raise_rounds SET soft_commits = :s, hard_commits = :h WHERE id = :r"), {"s": soft, "h": hard, "r": rid})
    db.commit()
    return {"id": cid}

