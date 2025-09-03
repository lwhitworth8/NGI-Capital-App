"""Small time utilities for frontend helpers"""
from fastapi import APIRouter, Query
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo

router = APIRouter(prefix="/api/time", tags=["time"])


@router.get("/quarter-end")
async def quarter_end(tz: str = Query("UTC")):
    try:
        tzinfo = ZoneInfo(tz)
    except Exception:
        tzinfo = ZoneInfo("UTC")
    now = datetime.now(tzinfo).date()
    q = (now.month - 1) // 3 + 1
    q_end_month = q * 3
    if q_end_month == 12:
        q_end = date(now.year, 12, 31)
    else:
        first_next = date(now.year, q_end_month + 1, 1)
        q_end = first_next - timedelta(days=1)
    days = (q_end - now).days
    if days < 0:
        days = 0
    return {"today": now.isoformat(), "quarter_end": q_end.isoformat(), "days": days, "tz": tz}

