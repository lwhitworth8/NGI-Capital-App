"""
Finance routes: KPIs, Cap Table summary, Forecast scenarios and assumptions.
All endpoints are entity-scoped and return display-ready strings/series.
If the database has no rows yet, endpoints return 200 with empty arrays/strings.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text
from datetime import datetime, timezone

from ..database import get_db
from ..auth_deps import require_clerk_user as _require_clerk_user

router = APIRouter(prefix="/api/finance", tags=["finance"])


def _iso_now():
    return datetime.now(timezone.utc).isoformat()


@router.get("/kpis")
async def get_finance_kpis(entity_id: int | None = None, partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    """
    Return finance KPIs for the given entity. If entity has no data yet, return
    empty values with timestamps. Values are display-ready strings and small series.
    """
    # Minimal implementation reading from DB when tables exist; otherwise empty.
    as_of = _iso_now()
    # Provide both a simple numeric summary for frontend consumption and a
    # display-ready items array for compatibility with dashboard cards.
    result = {
        "asOf": as_of,
        # Numeric summary fields (default zeros)
        "cash_position": 0.0,
        "monthly_revenue": 0.0,
        "monthly_expenses": 0.0,
        "total_assets": 0.0,
        # Display items used by some widgets
        "items": [
            {"label": "Cash", "value": "", "trend": None, "series": []},
            {"label": "Runway", "value": "", "trend": None, "series": []},
            {"label": "Burn", "value": "", "trend": None, "series": []},
            {"label": "MRR", "value": "", "trend": None, "series": []},
            {"label": "NRR", "value": "", "trend": None, "series": []},
            {"label": "Gross Margin", "value": "", "trend": None, "series": []},
            {"label": "Open Invoices", "value": "", "trend": None, "series": []},
        ],
    }
    try:
        # Example: compute cash from bank_accounts if table exists
        cols = [r[1] for r in db.execute(sa_text("PRAGMA table_info(bank_accounts)")).fetchall()]
        if cols:
            q = "SELECT SUM(COALESCE(balance,0)) FROM bank_accounts" + (" WHERE entity_id = :eid" if entity_id else "")
            total_cash = float(db.execute(sa_text(q), {"eid": entity_id}).scalar() or 0)
            result["items"][0]["value"] = f"${total_cash:,.2f}"
            result["cash_position"] = total_cash
    except Exception:
        pass
    return result


@router.get("/cap-table-summary")
async def cap_table_summary(entity_id: int | None = None, partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    """Summarized cap table for the Finance dashboard card."""
    # Return classes and basic FD shares if discoverable; else empty.
    data = {"summary": {"fdShares": "", "optionPool": ""}, "classes": []}
    try:
        # If entities table exists, include entity name in response for UI context.
        cols_e = [r[1] for r in db.execute(sa_text("PRAGMA table_info(entities)")).fetchall()]
        if cols_e and entity_id:
            row = db.execute(sa_text("SELECT legal_name FROM entities WHERE id = :id"), {"id": entity_id}).fetchone()
            if row:
                data["entityName"] = row[0]
    except Exception:
        pass
    return data


# Forecasting: scenarios and assumptions (simple tables created on demand)
def _ensure_forecast_schema(db: Session):
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS forecast_scenarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            name TEXT NOT NULL,
            state TEXT DEFAULT 'draft',
            created_at TEXT,
            updated_at TEXT
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS forecast_assumptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scenario_id INTEGER,
            key TEXT,
            value TEXT,
            effective_start TEXT,
            effective_end TEXT,
            created_at TEXT
        )
        """
    ))
    db.commit()


@router.get("/forecast/scenarios")
async def list_scenarios(entity_id: int | None = None, partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    _ensure_forecast_schema(db)
    rows = db.execute(sa_text(
        "SELECT id, entity_id, name, state, created_at, updated_at FROM forecast_scenarios" + (" WHERE entity_id = :eid" if entity_id else "")
    ), {"eid": entity_id}).fetchall()
    return [{"id": r[0], "entity_id": r[1], "name": r[2], "state": r[3], "created_at": r[4], "updated_at": r[5]} for r in rows]


@router.post("/forecast/scenarios")
async def create_scenario(payload: dict, partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    _ensure_forecast_schema(db)
    name = (payload.get("name") or "Scenario").strip()
    entity_id = int(payload.get("entity_id") or 0)
    now = _iso_now()
    db.execute(sa_text("INSERT INTO forecast_scenarios (entity_id, name, state, created_at, updated_at) VALUES (:eid,:nm,'draft',:ts,:ts)"), {"eid": entity_id, "nm": name, "ts": now})
    sid = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0)
    db.commit()
    return {"id": sid, "name": name, "entity_id": entity_id, "state": "draft", "created_at": now, "updated_at": now}


@router.get("/forecast/scenarios/{scenario_id}/assumptions")
async def list_assumptions(scenario_id: int, partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    _ensure_forecast_schema(db)
    rows = db.execute(sa_text("SELECT id, key, value, effective_start, effective_end, created_at FROM forecast_assumptions WHERE scenario_id = :sid"), {"sid": scenario_id}).fetchall()
    return [{"id": r[0], "key": r[1], "value": r[2], "effective_start": r[3], "effective_end": r[4], "created_at": r[5]} for r in rows]


@router.post("/forecast/scenarios/{scenario_id}/assumptions")
async def add_assumption(scenario_id: int, payload: dict, partner=Depends(_require_clerk_user), db: Session = Depends(get_db)):
    _ensure_forecast_schema(db)
    key = (payload.get("key") or "").strip()
    value = (payload.get("value") or "").strip()
    est = (payload.get("effective_start") or "").strip() or None
    een = (payload.get("effective_end") or "").strip() or None
    now = _iso_now()
    db.execute(sa_text("INSERT INTO forecast_assumptions (scenario_id, key, value, effective_start, effective_end, created_at) VALUES (:sid,:k,:v,:es,:ee,:ts)"), {"sid": scenario_id, "k": key, "v": value, "es": est, "ee": een, "ts": now})
    aid = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0)
    db.commit()
    return {"id": aid, "key": key, "value": value, "effective_start": est, "effective_end": een, "created_at": now}
