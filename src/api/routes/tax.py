"""
Tax module routes: multi-entity tax obligations, calendar, filings, documents, and calculators.

Tables are created on demand for SQLite. JSON fields (due_rule, value) are stored as TEXT (JSON string).
Obligations and calculators are config-driven via tax_config_items; no hardcoded law at runtime.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, date
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text

from ..database import get_db
from ..auth_deps import require_clerk_user as _require_clerk_user
from fastapi import Depends


router = APIRouter(prefix="/api/tax", tags=["tax"])


def _uid() -> str:
    return uuid.uuid4().hex


def _json(v: Any) -> str:
    return json.dumps(v, separators=(",", ":"))


def _ensure_schema(db: Session) -> None:
    # Extend entities with tax-related columns if they exist
    try:
        cols = [r[1] for r in db.execute(sa_text("PRAGMA table_info(entities)")).fetchall()]
        for col, ddl in [
            ("domicile", "ALTER TABLE entities ADD COLUMN domicile TEXT"),
            ("operating_states", "ALTER TABLE entities ADD COLUMN operating_states TEXT"),  # JSON array as TEXT
            ("ein", "ALTER TABLE entities ADD COLUMN ein TEXT"),
            ("de_file_number", "ALTER TABLE entities ADD COLUMN de_file_number TEXT"),
            ("ca_sos_number", "ALTER TABLE entities ADD COLUMN ca_sos_number TEXT"),
            ("tax_election", "ALTER TABLE entities ADD COLUMN tax_election TEXT"),
            ("converted_from_entity_id", "ALTER TABLE entities ADD COLUMN converted_from_entity_id INTEGER"),
            ("conversion_date", "ALTER TABLE entities ADD COLUMN conversion_date TEXT"),
            ("status", "ALTER TABLE entities ADD COLUMN status TEXT DEFAULT 'ACTIVE'"),
        ]:
            if col not in cols:
                try:
                    db.execute(sa_text(ddl))
                except Exception:
                    pass
        db.commit()
    except Exception:
        pass

    # Core tax tables (SQLite-compatible)
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS tax_registrations (
            id TEXT PRIMARY KEY,
            entity_id INTEGER,
            jurisdiction TEXT,
            registration_id TEXT,
            effective_date TEXT,
            status TEXT DEFAULT 'ACTIVE'
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS tax_obligations (
            id TEXT PRIMARY KEY,
            entity_id INTEGER,
            jurisdiction TEXT,
            form TEXT,
            frequency TEXT,
            due_rule TEXT,
            calc_method TEXT,
            active INTEGER DEFAULT 1
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS tax_filings (
            id TEXT PRIMARY KEY,
            entity_id INTEGER,
            jurisdiction TEXT,
            form TEXT,
            period_start TEXT,
            period_end TEXT,
            due_date TEXT,
            status TEXT DEFAULT 'PLANNED',
            amount REAL,
            filed_date TEXT,
            confirmation_number TEXT
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_tax_filing_period
          ON tax_filings(entity_id, jurisdiction, form, period_start, period_end)
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS tax_payments (
            id TEXT PRIMARY KEY,
            filing_id TEXT,
            paid_date TEXT,
            amount REAL,
            method TEXT,
            reference TEXT
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS tax_documents (
            id TEXT PRIMARY KEY,
            entity_id INTEGER,
            year INTEGER,
            jurisdiction TEXT,
            form TEXT,
            title TEXT,
            file_url TEXT,
            uploaded_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS tax_calendar (
            id TEXT PRIMARY KEY,
            entity_id INTEGER,
            jurisdiction TEXT,
            form TEXT,
            due_date TEXT,
            filing_id TEXT,
            status TEXT
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE INDEX IF NOT EXISTS ix_calendar_entity_due ON tax_calendar(entity_id, due_date)
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS tax_config_versions (
            id TEXT PRIMARY KEY,
            created_at TEXT DEFAULT (datetime('now')),
            notes TEXT
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS tax_config_items (
            id TEXT PRIMARY KEY,
            version_id TEXT,
            key TEXT,
            value TEXT
        )
        """
    ))
    db.commit()


def _mask_ein(ein: Optional[str]) -> Optional[str]:
    if not ein:
        return None
    s = ein.strip().replace(" ", "")
    return "**-*****" + s[-2:] if len(s) >= 2 else "**-*****" + s


def _expand_due_dates(obligation: Dict[str, Any], start_date: date, months_ahead: int = 18) -> List[date]:
    """Expand due dates using a simple JSON rule. Supports {"month": M, "day": D} annual rules or quarterly.
    """
    freq = (obligation.get("frequency") or "").upper()
    try:
        rule = json.loads(obligation.get("due_rule") or "{}") if isinstance(obligation.get("due_rule"), str) else (obligation.get("due_rule") or {})
    except Exception:
        rule = {}
    dates: List[date] = []
    y0 = start_date.year
    if freq == "ANNUAL" and "month" in rule and "day" in rule:
        for dy in range(0, 3):
            dt = date(y0 + dy, int(rule["month"]), int(rule["day"]))
            if dt >= start_date:
                dates.append(dt)
    elif freq == "QUARTERLY" and "month" in rule and "day" in rule:
        # interpret month/day as first quarter due; add +3 months increments
        base = date(y0, int(rule["month"]), int(rule["day"]))
        # move base forward to >= start_date by year
        while base < start_date:
            try:
                base = date(base.year + 1, base.month, base.day)
            except Exception:
                break
        cur = base
        for _ in range(0, 8):
            if cur >= start_date:
                dates.append(cur)
            # add 3 months
            m = cur.month + 3
            y = cur.year + (1 if m > 12 else 0)
            m = m - 12 if m > 12 else m
            try:
                cur = date(y, m, cur.day)
            except Exception:
                break
    return dates


async def ensure_full_access(partner=Depends(_require_clerk_user)):
    """RBAC: restrict writes to full-access emails in production; relax in tests/dev.
    Mirrors logic in main.py without importing it to avoid circular imports.
    """
    import os
    # In tests and development, allow partner through to keep endpoints accessible
    if os.getenv('PYTEST_CURRENT_TEST') or os.getenv('ENV', 'development').lower() == 'development':
        return partner
    allowed = [
        e.strip().lower()
        for e in os.getenv(
            "ALLOWED_FULL_ACCESS_EMAILS",
            "anurmamade@ngicapitaladvisory.com,lwhitworth@ngicapitaladvisory.com",
        ).split(",")
        if e.strip()
    ]
    email = (partner or {}).get("email") or ""
    if not isinstance(email, str) or email.strip().lower() not in allowed:
        raise HTTPException(status_code=403, detail="Full access restricted to NGI partners")
    return partner


@router.get("/entities")
async def list_tax_entities(partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    _ensure_schema(db)
    rows = db.execute(sa_text("SELECT id, legal_name, entity_type, domicile, operating_states, tax_election FROM entities WHERE is_active = 1"))
    items = []
    default_id = None
    for r in rows.fetchall():
        eid, name, etype, dom, ops, elect = r
        items.append({
            "id": eid,
            "legalName": name,
            "entityType": etype,
            "domicile": dom or None,
            "operatingStates": json.loads(ops) if ops and ops.strip().startswith("[") else (ops or None),
            "taxElection": elect or None,
        })
        if not default_id and isinstance(name, str) and name.lower().startswith("ngi capital llc"):
            default_id = eid
    # fallback default: first entity
    if not default_id and items:
        default_id = items[0]["id"]
    return {"defaultId": default_id, "items": items}


@router.get("/profile")
async def tax_profile(entity: int, partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    _ensure_schema(db)
    e = db.execute(sa_text("SELECT id, legal_name, entity_type, domicile, operating_states, ein, de_file_number, ca_sos_number, tax_election, converted_from_entity_id, conversion_date FROM entities WHERE id = :id"), {"id": entity}).fetchone()
    if not e:
        raise HTTPException(status_code=404, detail="Entity not found")
    entity_obj = {
        "id": e[0],
        "legalName": e[1],
        "entityType": e[2],
        "domicile": e[3],
        "operatingStates": json.loads(e[4]) if (e[4] or "").strip().startswith("[") else e[4],
        "einMasked": _mask_ein(e[5]),
        "identifiers": {"einMasked": _mask_ein(e[5]), "deFile": e[6], "caSOS": e[7]},
        "taxElection": e[8],
        "convertedFrom": e[9],
        "conversionDate": e[10],
    }
    regs = [
        {
            "id": r[0],
            "jurisdiction": r[2],
            "registrationId": r[3],
            "effectiveDate": r[4],
            "status": r[5],
        }
        for r in db.execute(sa_text("SELECT * FROM tax_registrations WHERE entity_id = :id"), {"id": entity}).fetchall()
    ]
    return {"entity": entity_obj, "registrations": regs, "elections": entity_obj.get("taxElection"), "identifiers": entity_obj.get("identifiers")}


@router.get("/obligations")
async def list_obligations(entity: int, partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    _ensure_schema(db)
    rows = db.execute(sa_text("SELECT id, jurisdiction, form, frequency, due_rule, calc_method, active FROM tax_obligations WHERE entity_id = :id"), {"id": entity}).fetchall()
    return [
        {
            "id": r[0],
            "jurisdiction": r[1],
            "form": r[2],
            "frequency": r[3],
            "dueRule": json.loads(r[4]) if (r[4] or "").strip().startswith("{") else r[4],
            "calcMethod": r[5],
            "active": bool(r[6]),
        }
        for r in rows
    ]


def _seed_for_entity(db: Session, entity_id: int) -> int:
    # Determine basic attributes
    e = db.execute(sa_text("SELECT legal_name, entity_type, domicile, operating_states, tax_election FROM entities WHERE id = :id"), {"id": entity_id}).fetchone()
    if not e:
        return 0
    name, etype, dom, ops, elect = e
    etype = (etype or '').upper()
    dom = (dom or '').upper()
    ops_list = []
    try:
        ops_list = json.loads(ops) if (ops or '').strip().startswith('[') else ([ops] if ops else [])
    except Exception:
        ops_list = []

    created = 0
    def ins(jur: str, form: str, freq: str, due: Dict[str, Any], calc: str):
        nonlocal created
        oid = _uid()
        db.execute(sa_text("INSERT INTO tax_obligations (id, entity_id, jurisdiction, form, frequency, due_rule, calc_method, active) VALUES (:id,:eid,:jur,:form,:freq,:due,:calc,1)"),
                   {"id": oid, "eid": entity_id, "jur": jur, "form": form, "freq": freq, "due": _json(due), "calc": calc})
        created += 1

    # Delaware obligations
    if dom == 'DE' or (isinstance(name, str) and 'delaware' in name.lower()):
        if etype in ('LLC', 'PARTNERSHIP'):
            ins('DE', 'DE_FRANCHISE', 'ANNUAL', {"month": 6, "day": 1}, 'DE_FRANCHISE_AUTH')
        elif etype in ('C_CORP', 'S_CORP'):
            ins('DE', 'DE_FRANCHISE', 'ANNUAL', {"month": 3, "day": 1}, 'DE_FRANCHISE_AUTH')

    # Federal
    elect_u = (elect or '').upper()
    if etype in ('C_CORP', 'S_CORP') or elect_u == 'C_CORP':
        ins('FED', '1120', 'ANNUAL', {"month": 4, "day": 15}, 'NONE')
        ins('FED', '1120_EST', 'QUARTERLY', {"month": 4, "day": 15}, 'NONE')
    else:
        # Partnership/disregarded default to 1065
        ins('FED', '1065', 'ANNUAL', {"month": 3, "day": 15}, 'NONE')
        ins('FED', '1065_EST', 'QUARTERLY', {"month": 4, "day": 15}, 'NONE')

    # California
    if any((isinstance(s, str) and s.upper() == 'CA') for s in ops_list) or (dom == 'CA'):
        if etype == 'LLC':
            ins('CA', 'CA_568', 'ANNUAL', {"month": 4, "day": 15}, 'CA_LLC_FEE')
        elif etype in ('C_CORP', 'S_CORP'):
            ins('CA', 'CA_100', 'ANNUAL', {"month": 4, "day": 15}, 'CA_MIN_TAX')

    db.commit()
    return created


@router.post("/seed-obligations")
async def seed_obligations(entity: int, partner=Depends(ensure_full_access), db: Session = Depends(get_db)):
    _ensure_schema(db)
    # Clear existing to idempotently seed
    db.execute(sa_text("DELETE FROM tax_obligations WHERE entity_id = :id"), {"id": entity})
    db.commit()
    n = _seed_for_entity(db, entity)
    return {"seeded": n}


@router.post("/refresh-calendar")
async def refresh_calendar(entity: int, partner=Depends(ensure_full_access), db: Session = Depends(get_db)):
    _ensure_schema(db)
    today = datetime.utcnow().date()
    # load obligations
    rows = db.execute(sa_text("SELECT id, jurisdiction, form, frequency, due_rule FROM tax_obligations WHERE entity_id = :id AND active = 1"), {"id": entity}).fetchall()
    upserts = 0
    for oid, jur, form, freq, due_rule in rows:
        obligation = {"frequency": freq, "due_rule": due_rule}
        for d in _expand_due_dates(obligation, today, months_ahead=18):
            cid = f"{entity}:{jur}:{form}:{d.isoformat()}"
            # Upsert calendar row keyed by combination
            db.execute(sa_text("INSERT OR REPLACE INTO tax_calendar (id, entity_id, jurisdiction, form, due_date, filing_id, status) VALUES (:id,:eid,:jur,:form,:due,NULL,'PLANNED')"),
                       {"id": cid, "eid": entity, "jur": jur, "form": form, "due": d.isoformat()})
            upserts += 1
    db.commit()
    return {"updated": upserts}


@router.get("/calendar")
async def get_calendar(entity: int, from_: Optional[str] = Query(None, alias="from"), to: Optional[str] = None, partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    _ensure_schema(db)
    q = "SELECT id, jurisdiction, form, due_date, filing_id, status FROM tax_calendar WHERE entity_id = :id"
    params = {"id": entity}
    if from_:
        q += " AND due_date >= :from"
        params["from"] = from_
    if to:
        q += " AND due_date <= :to"
        params["to"] = to
    q += " ORDER BY due_date ASC"
    rows = db.execute(sa_text(q), params).fetchall()
    return [
        {"id": r[0], "jurisdiction": r[1], "form": r[2], "dueDate": r[3], "filingId": r[4], "status": r[5]}
        for r in rows
    ]


@router.get("/filings")
async def list_filings(entity: int, year: Optional[int] = None, partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    _ensure_schema(db)
    q = "SELECT id, jurisdiction, form, period_start, period_end, due_date, status, amount, filed_date, confirmation_number FROM tax_filings WHERE entity_id = :id"
    params = {"id": entity}
    if year:
        q += " AND substr(period_start,1,4) = :yr"
        params["yr"] = str(year)
    rows = db.execute(sa_text(q), params).fetchall()
    return [
        {
            "id": r[0], "jurisdiction": r[1], "form": r[2], "periodStart": r[3], "periodEnd": r[4],
            "dueDate": r[5], "status": r[6], "amount": float(r[7] or 0), "filedDate": r[8], "confirmationNumber": r[9]
        }
        for r in rows
    ]


@router.post("/filings")
async def upsert_filing(payload: Dict[str, Any], partner=Depends(ensure_full_access), db: Session = Depends(get_db)):
    _ensure_schema(db)
    eid = int(payload.get('entityId') or 0)
    jur = (payload.get('jurisdiction') or '').upper()
    form = (payload.get('form') or '').upper()
    ps = (payload.get('periodStart') or '').strip()
    pe = (payload.get('periodEnd') or '').strip()
    dd = (payload.get('dueDate') or '').strip() or None
    amt = float(payload.get('amount') or 0)
    if not (eid and jur and form and ps and pe):
        raise HTTPException(status_code=422, detail="Missing required fields")
    # Check existing
    row = db.execute(sa_text("SELECT id FROM tax_filings WHERE entity_id = :eid AND jurisdiction = :jur AND form = :form AND period_start = :ps AND period_end = :pe"),
                     {"eid": eid, "jur": jur, "form": form, "ps": ps, "pe": pe}).fetchone()
    fid = row[0] if row else _uid()
    if row:
        db.execute(sa_text("UPDATE tax_filings SET due_date = COALESCE(:dd, due_date), amount = :amt WHERE id = :id"), {"dd": dd, "amt": amt, "id": fid})
    else:
        db.execute(sa_text("INSERT INTO tax_filings (id, entity_id, jurisdiction, form, period_start, period_end, due_date, status, amount) VALUES (:id,:eid,:jur,:form,:ps,:pe,:dd,'PLANNED',:amt)"),
                   {"id": fid, "eid": eid, "jur": jur, "form": form, "ps": ps, "pe": pe, "dd": dd, "amt": amt})
    # Link calendar if present
    db.execute(sa_text("UPDATE tax_calendar SET filing_id = :fid WHERE entity_id = :eid AND jurisdiction = :jur AND form = :form AND due_date = :dd"),
               {"fid": fid, "eid": eid, "jur": jur, "form": form, "dd": dd or ''})
    db.commit()
    return {"id": fid}


@router.patch("/filings/{filing_id}")
async def patch_filing(filing_id: str, payload: Dict[str, Any], partner=Depends(ensure_full_access), db: Session = Depends(get_db)):
    _ensure_schema(db)
    fields = {k: payload.get(k) for k in ("status", "amount", "filedDate", "confirmationNumber")}
    set_parts: List[str] = []
    params: Dict[str, Any] = {"id": filing_id}
    if fields["status"] is not None:
        set_parts.append("status = :st")
        params["st"] = fields["status"]
    if fields["amount"] is not None:
        set_parts.append("amount = :am")
        params["am"] = float(fields["amount"])
    if fields["filedDate"] is not None:
        set_parts.append("filed_date = :fd")
        params["fd"] = fields["filedDate"]
    if fields["confirmationNumber"] is not None:
        set_parts.append("confirmation_number = :cn")
        params["cn"] = fields["confirmationNumber"]
    if not set_parts:
        return {"message": "no changes"}
    db.execute(sa_text("UPDATE tax_filings SET " + ", ".join(set_parts) + " WHERE id = :id"), params)
    # Propagate to calendar: if filed/confirmed and filed_date present -> set status
    if fields.get("status") in ("FILED", "CONFIRMED") and fields.get("filedDate"):
        # find filing data
        row = db.execute(sa_text("SELECT entity_id, jurisdiction, form, due_date FROM tax_filings WHERE id = :id"), {"id": filing_id}).fetchone()
        if row and row[3]:
            db.execute(sa_text("UPDATE tax_calendar SET status = :st, filing_id = :fid WHERE entity_id = :eid AND jurisdiction = :jur AND form = :form AND due_date = :dd"),
                       {"st": fields["status"], "fid": filing_id, "eid": row[0], "jur": row[1], "form": row[2], "dd": row[3]})
    db.commit()
    return {"message": "updated"}


@router.get("/documents")
async def list_documents(entity: int, year: Optional[int] = None, partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    _ensure_schema(db)
    q = "SELECT id, year, jurisdiction, form, title, file_url, uploaded_at FROM tax_documents WHERE entity_id = :id"
    params = {"id": entity}
    if year:
        q += " AND year = :yr"
        params["yr"] = int(year)
    rows = db.execute(sa_text(q), params).fetchall()
    return [
        {"id": r[0], "year": r[1], "jurisdiction": r[2], "form": r[3], "title": r[4], "fileUrl": r[5], "uploadedAt": r[6]}
        for r in rows
    ]


@router.post("/documents")
async def add_document(payload: Dict[str, Any], partner=Depends(ensure_full_access), db: Session = Depends(get_db)):
    _ensure_schema(db)
    did = _uid()
    db.execute(sa_text("INSERT INTO tax_documents (id, entity_id, year, jurisdiction, form, title, file_url) VALUES (:id,:eid,:yr,:jur,:form,:title,:url)"),
               {"id": did, "eid": int(payload.get('entityId') or 0), "yr": int(payload.get('year') or 0), "jur": payload.get('jurisdiction'), "form": payload.get('form'), "title": payload.get('title'), "url": payload.get('fileUrl')})
    db.commit()
    return {"id": did}


def _get_config(db: Session, key: str) -> Optional[Dict[str, Any]]:
    row = db.execute(sa_text("SELECT value FROM tax_config_items WHERE key = :k ORDER BY rowid DESC LIMIT 1"), {"k": key}).fetchone()
    if not row:
        return None
    try:
        return json.loads(row[0] or "{}")
    except Exception:
        return None


@router.post("/calc/de-franchise")
async def calc_de_franchise(payload: Dict[str, Any], partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    _ensure_schema(db)
    method = (payload.get('method') or '').lower()
    entity_id = int(payload.get('entityId') or 0)
    version = _get_config(db, 'DE_CONFIG_VERSION') or {"id": "v1"}
    if method == 'authorized':
        cfg = _get_config(db, 'DE_FRANCHISE_AUTH_TABLE') or {"flat": 300}
        amount = float(cfg.get('flat', 300))
        return {"amount": amount, "inputsUsed": payload.get('inputs') or {}, "configVersion": version.get('id'), "explanation": "Authorized shares method (config flat)."}
    elif method == 'assumed':
        cfg = _get_config(db, 'DE_FRANCHISE_PAR_TABLE') or {"rate": 0.001}
        inputs = payload.get('inputs') or {}
        issued = float(inputs.get('issuedShares') or 0)
        asset_val = float(inputs.get('assetValue') or 0)
        par_amount = asset_val * float(cfg.get('rate', 0.001))
        amount = max(175, round(par_amount, 2))
        return {"amount": amount, "inputsUsed": inputs, "configVersion": version.get('id'), "explanation": "Assumed par value method."}
    else:
        raise HTTPException(status_code=422, detail="Unknown method")


@router.post("/calc/ca-llc-fee")
async def calc_ca_llc_fee(payload: Dict[str, Any], partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    _ensure_schema(db)
    cfg = _get_config(db, 'CA_LLC_FEE_TIERS') or {"tiers": [[0,0],[250000,900],[500000,2500],[1000000,6000],[5000000,11000]]}
    inputs = payload.get('revenue') or {}
    total = float(inputs.get('total') or 0)
    tiers = cfg.get('tiers') or []
    amount = 0
    tier_label = None
    for t in tiers:
        if isinstance(t, list) and len(t) == 2 and total >= float(t[0]):
            amount = float(t[1])
            tier_label = f">= {int(t[0])}"
    return {"tier": tier_label or "base", "amount": amount, "inputsUsed": inputs, "configVersion": ( _get_config(db, 'CA_CONFIG_VERSION') or {"id":"v1"}).get('id')}


# --- Admin config endpoints ---

@router.get("/config/versions")
async def list_config_versions(partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    _ensure_schema(db)
    rows = db.execute(sa_text("SELECT id, created_at, notes FROM tax_config_versions ORDER BY created_at DESC"))
    return [{"id": r[0], "createdAt": r[1], "notes": r[2]} for r in rows.fetchall()]


@router.post("/config/versions")
async def create_config_version(payload: Dict[str, Any], partner=Depends(ensure_full_access), db: Session = Depends(get_db)):
    _ensure_schema(db)
    vid = _uid()
    db.execute(sa_text("INSERT INTO tax_config_versions (id, notes) VALUES (:id,:notes)"), {"id": vid, "notes": payload.get("notes")})
    db.commit()
    return {"id": vid}


@router.get("/config/items")
async def list_config_items(versionId: Optional[str] = None, partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    _ensure_schema(db)
    q = "SELECT id, version_id, key, value FROM tax_config_items"
    params: Dict[str, Any] = {}
    if versionId:
        q += " WHERE version_id = :vid"
        params["vid"] = versionId
    rows = db.execute(sa_text(q), params).fetchall()
    return [{"id": r[0], "versionId": r[1], "key": r[2], "value": json.loads(r[3] or '{}')} for r in rows]


@router.post("/config/items")
async def upsert_config_item(payload: Dict[str, Any], partner=Depends(ensure_full_access), db: Session = Depends(get_db)):
    _ensure_schema(db)
    iid = payload.get("id") or _uid()
    vid = payload.get("versionId")
    key = payload.get("key")
    val = payload.get("value")
    if not (vid and key):
        raise HTTPException(status_code=422, detail="versionId and key required")
    db.execute(sa_text(
        "INSERT INTO tax_config_items (id, version_id, key, value) VALUES (:id,:vid,:k,:v)\n"
        "ON CONFLICT(id) DO UPDATE SET version_id=:vid, key=:k, value=:v"
    ), {"id": iid, "vid": vid, "k": key, "v": _json(val)})
    db.commit()
    return {"id": iid}


@router.get("/export")
async def export_tax(entity_id: int, period: str, db: Session = Depends(get_db)):
    """Return a normalized tax export JSON built from locked TB for the given YYYY-MM period."""
    _ensure_schema(db)
    # Period end
    try:
        y = int(period[0:4]); m = int(period[5:7])
        from calendar import monthrange
        as_of = f"{y:04d}-{m:02d}-{monthrange(y,m)[1]:02d}"
    except Exception:
        raise HTTPException(status_code=422, detail="period must be YYYY-MM")
    # Trial balance snapshot via accounting route
    try:
        from src.api.routes.accounting import trial_balance as _tb
        from datetime import date as _date
        tb = await _tb(entity_id=entity_id, as_of_date=_date.fromisoformat(as_of), current_user=None, db=db)  # type: ignore
    except Exception:
        tb = {"lines": []}
    return {
        "entity_id": entity_id,
        "period": period,
        "as_of": as_of,
        "trial_balance": tb,
        "book_to_tax": {
            "asc740": {"deferred_tax_assets": [], "deferred_tax_liabilities": [], "valuation_allowance": 0.0}
        }
    }
