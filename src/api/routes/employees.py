"""
Employees/HR routes
Implements minimal teams, projects, and employees endpoints to satisfy tests.
"""

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text

from ..database import get_db
from ..auth import require_partner_access


router = APIRouter(prefix="/api", tags=["employees"])


def _ensure_hr_schema(db: Session) -> None:
    db.execute(
        sa_text(
            """
            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                is_active INTEGER DEFAULT 1
            )
            """
        )
    )
    db.execute(
        sa_text(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                status TEXT,
                is_active INTEGER DEFAULT 1
            )
            """
        )
    )
    db.execute(
        sa_text(
            """
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                title TEXT,
                role TEXT,
                classification TEXT,
                status TEXT,
                employment_type TEXT,
                start_date TEXT,
                end_date TEXT,
                team_id INTEGER,
                manager_id INTEGER,
                is_deleted INTEGER DEFAULT 0
            )
            """
        )
    )
    db.execute(
        sa_text(
            """
            CREATE TABLE IF NOT EXISTS employee_projects (
                employee_id INTEGER,
                project_id INTEGER
            )
            """
        )
    )


def _ensure_default_teams(db: Session, entity_id: int) -> None:
    for name in ("Executive", "Board"):
        row = db.execute(
            sa_text("SELECT id FROM teams WHERE entity_id = :e AND lower(name) = :n"),
            {"e": entity_id, "n": name.lower()},
        ).fetchone()
        if not row:
            db.execute(
                sa_text(
                    "INSERT INTO teams (entity_id, name, description, is_active) VALUES (:e,:n,'',1)"
                ),
                {"e": entity_id, "n": name},
            )
    db.commit()


@router.get("/teams")
async def list_teams(
    entity_id: int = Query(...),
    partner=Depends(require_partner_access()),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    _ensure_default_teams(db, entity_id)
    rows = db.execute(
        sa_text(
            "SELECT id, name, description, is_active FROM teams WHERE entity_id = :e ORDER BY name"
        ),
        {"e": entity_id},
    ).fetchall()
    return [
        {
            "id": r[0],
            "name": r[1],
            "description": r[2],
            "is_active": bool(r[3]),
        }
        for r in rows
    ]


@router.post("/teams")
async def create_team(
    payload: Dict[str, Any],
    partner=Depends(require_partner_access()),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    entity_id = int(payload.get("entity_id") or 0)
    name = (payload.get("name") or "").strip()
    if not entity_id or not name:
        raise HTTPException(status_code=422, detail="Missing entity_id or name")
    db.execute(
        sa_text("INSERT INTO teams (entity_id, name, description, is_active) VALUES (:e,:n,:d,1)"),
        {"e": entity_id, "n": name, "d": payload.get("description") or ""},
    )
    new_id = db.execute(sa_text("SELECT last_insert_rowid()")).scalar()
    db.commit()
    return {"id": int(new_id or 0)}


@router.get("/projects")
async def list_projects(
    entity_id: int = Query(...),
    partner=Depends(require_partner_access()),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    rows = db.execute(
        sa_text(
            "SELECT id, name, description, status FROM projects WHERE entity_id = :e ORDER BY id DESC"
        ),
        {"e": entity_id},
    ).fetchall()
    return [
        {
            "id": r[0],
            "name": r[1],
            "description": r[2],
            "status": r[3],
        }
        for r in rows
    ]


@router.post("/projects")
async def create_project(
    payload: Dict[str, Any],
    partner=Depends(require_partner_access()),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    entity_id = int(payload.get("entity_id") or 0)
    name = (payload.get("name") or "").strip()
    if not entity_id or not name:
        raise HTTPException(status_code=422, detail="Missing entity_id or name")
    db.execute(
        sa_text(
            "INSERT INTO projects (entity_id, name, description, status, is_active) VALUES (:e,:n,:d,:s,1)"
        ),
        {
            "e": entity_id,
            "n": name,
            "d": payload.get("description") or "",
            "s": payload.get("status") or "active",
        },
    )
    new_id = db.execute(sa_text("SELECT last_insert_rowid()")).scalar()
    db.commit()
    return {"id": int(new_id or 0)}


@router.get("/employees")
async def list_employees(
    entity_id: int = Query(...),
    partner=Depends(require_partner_access()),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    rows = db.execute(
        sa_text(
            """
            SELECT e.id, e.name, e.email, e.title, e.role, e.classification, e.status, e.employment_type,
                   e.start_date, e.end_date, e.team_id,
                   (SELECT name FROM teams t WHERE t.id = e.team_id) as team_name
            FROM employees e
            WHERE e.entity_id = :e AND e.is_deleted = 0
            ORDER BY e.id DESC
            """
        ),
        {"e": entity_id},
    ).fetchall()
    result: List[Dict[str, Any]] = []
    for r in rows:
        projects = db.execute(
            sa_text(
                "SELECT p.id, p.name FROM projects p JOIN employee_projects ep ON ep.project_id = p.id WHERE ep.employee_id = :eid"
            ),
            {"eid": r[0]},
        ).fetchall()
        result.append(
            {
                "id": r[0],
                "name": r[1],
                "email": r[2],
                "title": r[3],
                "role": r[4],
                "classification": r[5],
                "status": r[6],
                "employment_type": r[7],
                "start_date": r[8],
                "end_date": r[9],
                "team_id": r[10],
                "team_name": r[11],
                "projects": [{"id": pr[0], "name": pr[1]} for pr in projects],
            }
        )
    return result


@router.post("/employees")
async def create_employee(
    payload: Dict[str, Any],
    partner=Depends(require_partner_access()),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    entity_id = int(payload.get("entity_id") or 0)
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip()
    if not entity_id or not name or not email:
        raise HTTPException(status_code=422, detail="Missing required fields")
    classification = (payload.get("classification") or "").strip().lower()
    team_id = None
    if classification == "executive":
        _ensure_default_teams(db, entity_id)
        row = db.execute(
            sa_text("SELECT id FROM teams WHERE entity_id = :e AND lower(name) = 'executive'"),
            {"e": entity_id},
        ).fetchone()
        team_id = int(row[0]) if row else None
    db.execute(
        sa_text(
            """
            INSERT INTO employees (entity_id, name, email, title, role, classification, status, employment_type, start_date, end_date, team_id, manager_id)
            VALUES (:e,:n,:em,:ti,:ro,:cl,:st,:et,:sd,:ed,:tid,:mid)
            """
        ),
        {
            "e": entity_id,
            "n": name,
            "em": email,
            "ti": payload.get("title"),
            "ro": payload.get("role"),
            "cl": payload.get("classification"),
            "st": payload.get("status") or "active",
            "et": payload.get("employment_type") or None,
            "sd": payload.get("start_date") or None,
            "ed": payload.get("end_date") or None,
            "tid": team_id,
            "mid": payload.get("manager_id") or None,
        },
    )
    new_id = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0)
    pids = payload.get("project_ids") or []
    if isinstance(pids, list) and pids:
        for pid in pids:
            try:
                db.execute(
                    sa_text("INSERT INTO employee_projects (employee_id, project_id) VALUES (:eid,:pid)"),
                    {"eid": new_id, "pid": int(pid)},
                )
            except Exception:
                pass
    db.commit()
    return {"id": new_id}


@router.put("/employees/{emp_id}")
async def update_employee(
    emp_id: int,
    payload: Dict[str, Any],
    partner=Depends(require_partner_access()),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    fields = [
        ("name", "name"),
        ("email", "email"),
        ("title", "title"),
        ("role", "role"),
        ("classification", "classification"),
        ("status", "status"),
        ("employment_type", "employment_type"),
        ("start_date", "start_date"),
        ("end_date", "end_date"),
        ("team_id", "team_id"),
    ]
    sets = []
    params: Dict[str, Any] = {"id": emp_id}
    for key, col in fields:
        if key in payload:
            sets.append(f"{col} = :{key}")
            params[key] = payload[key]
    if sets:
        sql = "UPDATE employees SET " + ", ".join(sets) + " WHERE id = :id"
        db.execute(sa_text(sql), params)
        db.commit()
    return {"message": "updated"}


@router.delete("/employees/{emp_id}")
async def delete_employee(
    emp_id: int,
    partner=Depends(require_partner_access()),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    db.execute(sa_text("UPDATE employees SET is_deleted = 1 WHERE id = :id"), {"id": emp_id})
    db.commit()
    return {"message": "deleted"}

