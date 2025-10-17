"""
User-specific endpoints (My To-Dos)
-----------------------------------
Aggregates personal to-dos/tasks assigned to the logged-in user across
entities. Optionally enriches with upcoming Google Calendar events when
integration is enabled, but no calendar UI endpoint is exposed.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text

from services.api.database import get_db
from services.api.auth_deps import require_clerk_user

try:
    # Lazy import so the service can run without Google deps when disabled
    from services.api.integrations import google_calendar as gcal
except Exception:  # pragma: no cover - optional dependency
    gcal = None  # type: ignore


router = APIRouter(prefix="/api/my", tags=["me"])


def _iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


@router.get("/todos")
async def my_todos(
    limit: int = 20,
    user=Depends(require_clerk_user),
    db: Session = Depends(get_db),
):
    """Aggregate upcoming items for the logged-in user.

    Sources:
    - Employee tasks assigned to the user's employee_id (across entities)
    - Google Calendar events (next 14 days)
    """
    email = (user or {}).get("email") if isinstance(user, dict) else None
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    items: List[Dict[str, Any]] = []

    # 1) Employee tasks assigned to this user (by email -> employee.id)
    try:
        # Find employee record (any entity)
        row = db.execute(sa_text("SELECT id, entity_id FROM employees WHERE lower(email) = :em AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY id DESC LIMIT 1"), {"em": str(email).lower()}).fetchone()
        if row:
            emp_id = int(row[0])
            task_rows = db.execute(sa_text(
                "SELECT id, title, notes, due_at, status, entity_id FROM employee_tasks WHERE employee_id = :eid ORDER BY COALESCE(due_at, created_at) ASC LIMIT :lim"
            ), {"eid": emp_id, "lim": max(1, min(limit, 200))}).fetchall()
            for r in task_rows or []:
                items.append({
                    "type": "employee_task",
                    "id": r[0],
                    "title": r[1],
                    "notes": r[2],
                    "due_at": r[3],
                    "status": r[4],
                    "entity_id": r[5],
                })
    except Exception:
        pass

    # 2) Next Google Calendar events (next 14 days)
    try:
        if gcal is not None:
            now = datetime.now(timezone.utc)
            gc_events = gcal.list_events(owner_email=email, time_min=_iso(now), time_max=_iso(now + timedelta(days=14)), max_results=limit)  # type: ignore
            for ev in gc_events or []:
                items.append({
                    "type": "gcal_event",
                    "id": ev.get("id"),
                    "title": ev.get("summary") or "(No title)",
                    "start_ts": ev.get("start", {}).get("dateTime") or ev.get("start", {}).get("date"),
                    "end_ts": ev.get("end", {}).get("dateTime") or ev.get("end", {}).get("date"),
                    "link": ev.get("htmlLink"),
                })
    except Exception:
        pass

    # Sort by upcoming time: prefer start_ts/due_at when available
    def _when(x: Dict[str, Any]) -> datetime:
        raw = x.get("start_ts") or x.get("due_at")
        if not raw:
            return datetime.max.replace(tzinfo=timezone.utc)
        try:
            # Support date-only values
            if len(str(raw)) <= 10:
                return datetime.fromisoformat(str(raw) + "T00:00:00+00:00")
            return datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        except Exception:
            return datetime.max.replace(tzinfo=timezone.utc)

    items.sort(key=_when)
    if limit:
        items = items[:limit]
    return {"items": items}
