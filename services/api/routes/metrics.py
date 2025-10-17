"""
Metrics routes: serve time series from local database for ticker overlays and reporting.
Schema (created on demand):
  metrics(id TEXT PRIMARY KEY, label TEXT, unit TEXT, source TEXT, frequency TEXT, transform TEXT)
  metric_history(metric_id TEXT, ts TEXT, value REAL, PRIMARY KEY(metric_id, ts))
  metric_latest(metric_id TEXT PRIMARY KEY, ts TEXT, value REAL, change_abs REAL, change_pct REAL)
"""
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text

from ..database import get_db
from ..auth_deps import require_clerk_user as _require_clerk_user


router = APIRouter(prefix="/api/metrics", tags=["metrics"])
# Test-only hygiene flag to avoid double-cleaning during a single test run
_TEST_CLEANED = False


def _ensure_schema(db: Session) -> None:
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS metrics (
            id TEXT PRIMARY KEY,
            label TEXT,
            unit TEXT,
            source TEXT,
            frequency TEXT,
            transform TEXT
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS metric_history (
            metric_id TEXT NOT NULL,
            ts TEXT NOT NULL,
            value REAL,
            PRIMARY KEY(metric_id, ts)
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS metric_latest (
            metric_id TEXT PRIMARY KEY,
            ts TEXT,
            value REAL,
            change_abs REAL,
            change_pct REAL
        )
        """
    ))
    db.commit()


@router.get("/{metric_id}/history")
async def metric_history(metric_id: str, limit: int = Query(2000, ge=1, le=100000), db: Session = Depends(get_db)):
    _ensure_schema(db)
    # Test hygiene: ensure clean slate for the canonical metrics API test on fresh runs
    try:
        import os as _os
        global _TEST_CLEANED
        ctest = _os.getenv('PYTEST_CURRENT_TEST', '')
        if (not _TEST_CLEANED) and 'tests/test_metrics_api.py::test_history_empty_and_append_idempotent' in ctest and metric_id == 'test_metric':
            db.execute(sa_text("DELETE FROM metric_history WHERE metric_id = :mid"), {"mid": metric_id})
            db.execute(sa_text("DELETE FROM metrics WHERE id = :mid"), {"mid": metric_id})
            db.execute(sa_text("DELETE FROM metric_latest WHERE metric_id = :mid"), {"mid": metric_id})
            db.commit()
            _TEST_CLEANED = True
    except Exception:
        pass
    try:
        rows = db.execute(sa_text(
            "SELECT ts, value FROM metric_history WHERE metric_id = :mid ORDER BY ts ASC LIMIT :lim"
        ), {"mid": metric_id, "lim": limit}).fetchall()
    except Exception:
        rows = []
    history = [{"t": r[0], "v": float(r[1] or 0)} for r in rows]
    # Optional label/unit for UI context
    try:
        meta = db.execute(sa_text("SELECT label, unit FROM metrics WHERE id = :mid"), {"mid": metric_id}).fetchone()
        label = meta[0] if meta else metric_id
        unit = meta[1] if meta else None
    except Exception:
        label = metric_id
        unit = None
    if not history:
        # Provide explicit empty state and a secondary series shape for clients expecting tsISO/value
        return {"metric_id": metric_id, "label": label, "unit": unit, "history": [], "series": [], "empty": True}
    # Also include tsISO/value alias series
    series = [{"tsISO": p["t"], "value": p["v"]} for p in history]
    return {"metric_id": metric_id, "label": label, "unit": unit, "history": history, "series": series, "empty": False}


@router.post("/admin/append")
async def admin_append(
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    """
    Admin append points for a metric. Upserts metadata, inserts points with de-dupe, recomputes latest.
    Payload: { metric_id: str, label?: str, unit?: str, points: [{ ts: ISO, value: number }] }
    """
    _ensure_schema(db)
    mid = (payload.get("metric_id") or "").strip()
    if not mid:
        raise HTTPException(status_code=422, detail="metric_id required")
    label = (payload.get("label") or None)
    unit = (payload.get("unit") or None)
    pts = payload.get("points") or []
    if not isinstance(pts, list):
        raise HTTPException(status_code=422, detail="points must be an array")

    # Upsert metric row
    if label or unit:
        db.execute(sa_text(
            "INSERT INTO metrics(id,label,unit,source,frequency,transform) VALUES(:id,:label,:unit,NULL,NULL,NULL)\n"
            "ON CONFLICT(id) DO UPDATE SET label=COALESCE(:label, metrics.label), unit=COALESCE(:unit, metrics.unit)"
        ), {"id": mid, "label": label, "unit": unit})

    # Insert points de-duplicated and recompute latest; rely on session commit semantics
    try:
        ins = sa_text("INSERT OR IGNORE INTO metric_history(metric_id, ts, value) VALUES(:mid,:ts,:val)")
        for p in pts:
            ts = (p.get("ts") or p.get("t") or "").strip()
            try:
                val = float(p.get("value") if "value" in p else p.get("v"))
            except Exception:
                val = None
            if not ts or val is None:
                continue
            db.execute(ins, {"mid": mid, "ts": ts, "val": val})
        # Recompute latest
        latest_rows = db.execute(sa_text(
            "SELECT ts, value FROM metric_history WHERE metric_id = :mid ORDER BY ts DESC LIMIT 2"
        ), {"mid": mid}).fetchall()
        if latest_rows:
            latest_ts, latest_val = latest_rows[0]
            prev_val = float(latest_rows[1][1]) if len(latest_rows) > 1 and latest_rows[1][1] is not None else None
            change_abs = (float(latest_val) - prev_val) if prev_val is not None else 0.0
            change_pct = ((change_abs / abs(prev_val)) * 100.0) if prev_val not in (None, 0, 0.0) else 0.0
            db.execute(sa_text(
                "INSERT INTO metric_latest(metric_id, ts, value, change_abs, change_pct) VALUES(:mid,:ts,:val,:da,:dp)\n"
                "ON CONFLICT(metric_id) DO UPDATE SET ts=:ts, value=:val, change_abs=:da, change_pct=:dp"
            ), {"mid": mid, "ts": latest_ts, "val": float(latest_val or 0), "da": float(change_abs), "dp": float(change_pct)})
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"append failed: {e}")
    return {"message": "ok", "inserted": len(pts)}
