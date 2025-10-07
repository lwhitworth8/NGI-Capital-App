"""
Employees/HR routes
-------------------

Multi-entity Employee module endpoints with teams/projects, KPIs and To-Dos.
Schema evolution is done non-destructively for SQLite to avoid breaking
existing data/tests.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text

from ..database import get_db
from ..auth_deps import require_clerk_user as _require_clerk_user


router = APIRouter(prefix="/api", tags=["employees"])


def _has_table(db: Session, name: str) -> bool:
    row = db.execute(sa_text("SELECT name FROM sqlite_master WHERE type='table' AND name = :n"), {"n": name}).fetchone()
    return bool(row)


def _has_column(db: Session, table: str, column: str) -> bool:
    try:
        rows = db.execute(sa_text(f"PRAGMA table_info({table})")).fetchall()
        return any((r[1] == column) for r in rows)
    except Exception:
        return False


def _add_column_if_missing(db: Session, table: str, column: str, coltype: str) -> None:
    if not _has_column(db, table, column):
        db.execute(sa_text(f"ALTER TABLE {table} ADD COLUMN {column} {coltype}"))


def _resolve_entity_id(entity: Optional[int] = None, entity_id: Optional[int] = None) -> int:
    """Accept either query param name and return a single int id (or 0)."""
    try:
        return int(entity or 0) or int(entity_id or 0)
    except Exception:
        return 0


def _ensure_hr_schema(db: Session) -> None:
    # Teams
    db.execute(
        sa_text(
            """
            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                type TEXT,
                lead_employee_id INTEGER,
                active INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            )
            """
        )
    )
    # Projects (for Advisory)
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
    # Employees (add evolvable columns below)
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
    # Legacy employee->project links
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
    # Team memberships
    db.execute(
        sa_text(
            """
            CREATE TABLE IF NOT EXISTS team_memberships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER NOT NULL,
                employee_id INTEGER NOT NULL,
                role_on_team TEXT,
                start_date TEXT,
                end_date TEXT,
                allocation_pct REAL DEFAULT 100,
                UNIQUE(team_id, employee_id, start_date)
            )
            """
        )
    )
    # Employee tasks
    db.execute(
        sa_text(
            """
            CREATE TABLE IF NOT EXISTS employee_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER,
                entity_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                notes TEXT,
                due_at TEXT,
                status TEXT DEFAULT 'Open',
                created_by TEXT,
                created_at TEXT,
                updated_at TEXT
            )
            """
        )
    )

    # Employee entity memberships (normalization)
    db.execute(
        sa_text(
            """
            CREATE TABLE IF NOT EXISTS employee_entity_memberships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL,
                entity_id INTEGER NOT NULL,
                primary_entity INTEGER DEFAULT 0,
                cost_center TEXT,
                allocation_pct REAL DEFAULT 100,
                UNIQUE(employee_id, entity_id)
            )
            """
        )
    )

    # Timesheets table
    db.execute(
        sa_text(
            """
            CREATE TABLE IF NOT EXISTS timesheets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id INTEGER NOT NULL,
                employee_id INTEGER NOT NULL,
                pay_period_start TEXT NOT NULL,
                pay_period_end TEXT NOT NULL,
                total_hours REAL DEFAULT 0,
                status TEXT DEFAULT 'draft',
                submitted_date TEXT,
                submitted_by_id INTEGER,
                approved_by_id INTEGER,
                approved_date TEXT,
                rejected_by_id INTEGER,
                rejected_date TEXT,
                rejection_reason TEXT,
                paid_date TEXT,
                payroll_run_id INTEGER,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
            """
        )
    )
    
    # Timesheet entries (daily hours)
    db.execute(
        sa_text(
            """
            CREATE TABLE IF NOT EXISTS timesheet_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timesheet_id INTEGER NOT NULL,
                entry_date TEXT NOT NULL,
                hours REAL NOT NULL,
                project_id INTEGER,
                team_id INTEGER,
                notes TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
            """
        )
    )
    
    # Project leads (for Advisory)
    db.execute(
        sa_text(
            """
            CREATE TABLE IF NOT EXISTS project_leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                employee_id INTEGER NOT NULL,
                role TEXT DEFAULT 'lead',
                assigned_date TEXT,
                UNIQUE(project_id, employee_id)
            )
            """
        )
    )
    
    # Student-Employee links (for Advisory auto-creation)
    db.execute(
        sa_text(
            """
            CREATE TABLE IF NOT EXISTS student_employee_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                onboarding_date TEXT,
                UNIQUE(employee_id, student_id)
            )
            """
        )
    )

    # Evolve employees table with richer fields when missing
    for col, typ in [
        ("legal_name", "TEXT"),
        ("preferred_name", "TEXT"),
        ("work_location", "TEXT"),
        ("level", "TEXT"),
        ("base_comp", "REAL"),
        ("currency", "TEXT"),
        ("benefits_json", "TEXT"),
        ("pii_json_encrypted", "TEXT"),
        ("is_deleted", "INTEGER DEFAULT 0"),
        ("deleted_at", "TEXT"),
        ("created_at", "TEXT"),
        ("updated_at", "TEXT"),
        ("compensation_type", "TEXT"),
        ("hourly_rate", "REAL"),
        ("annual_salary", "REAL"),
    ]:
        try:
            _add_column_if_missing(db, "employees", col, typ)
        except Exception:
            pass

    # Ensure teams has newer columns on older DBs
    for col, typ in [
        ("type", "TEXT"),
        ("lead_employee_id", "INTEGER"),
        ("active", "INTEGER DEFAULT 1"),
        ("created_at", "TEXT"),
        ("updated_at", "TEXT"),
    ]:
        try:
            _add_column_if_missing(db, "teams", col, typ)
        except Exception:
            pass

    # Helpful indexes
    try:
        db.execute(sa_text("CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status)"))
        db.execute(sa_text("CREATE INDEX IF NOT EXISTS idx_employees_type ON employees(employment_type)"))
        db.execute(sa_text("CREATE INDEX IF NOT EXISTS idx_emp_memberships_entity ON employee_entity_memberships(entity_id)"))
    except Exception:
        pass


def _ensure_default_teams(db: Session, entity_id: int) -> None:
    for name in ("Executive", "Board"):
        row = db.execute(
            sa_text("SELECT id FROM teams WHERE entity_id = :e AND lower(name) = :n"),
            {"e": entity_id, "n": name.lower()},
        ).fetchone()
        if not row:
            db.execute(
                sa_text(
                    "INSERT INTO teams (entity_id, name, description, active, created_at, updated_at) VALUES (:e,:n,'',1,datetime('now'),datetime('now'))"
                ),
                {"e": entity_id, "n": name},
            )
    db.commit()


@router.get("/teams")
async def list_teams(
    entity: int | None = Query(None),
    entity_id: int | None = Query(None),
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    eid = _resolve_entity_id(entity, entity_id)
    if not eid:
        raise HTTPException(status_code=422, detail="entity is required")
    _ensure_default_teams(db, eid)
    rows = db.execute(
        sa_text(
            "SELECT id, name, description, COALESCE(active,1), type, lead_employee_id FROM teams WHERE entity_id = :e ORDER BY name"
        ),
        {"e": eid},
    ).fetchall()
    return [
        {
            "id": r[0],
            "name": r[1],
            "description": r[2],
            "is_active": bool(r[3]),
            "type": r[4],
            "lead_employee_id": r[5],
        }
        for r in rows
    ]


@router.post("/teams")
async def create_team(
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    entity_id = _resolve_entity_id(payload.get("entity"), payload.get("entity_id"))
    name = (payload.get("name") or "").strip()
    if not entity_id or not name:
        raise HTTPException(status_code=422, detail="Missing entity_id or name")
    db.execute(
        sa_text("INSERT INTO teams (entity_id, name, description, type, lead_employee_id, active, created_at, updated_at) VALUES (:e,:n,:d,:t,:lead,1,datetime('now'),datetime('now'))"),
        {
            "e": entity_id,
            "n": name,
            "d": payload.get("description") or "",
            "t": payload.get("type") or None,
            "lead": payload.get("lead_employee_id") or None,
        },
    )
    new_id = db.execute(sa_text("SELECT last_insert_rowid()")).scalar()
    db.commit()
    return {"id": int(new_id or 0)}


@router.post("/teams/{team_id}/members")
async def add_team_member(
    team_id: int,
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    emp_id = int(payload.get("employee_id") or 0)
    if not emp_id:
        raise HTTPException(status_code=422, detail="employee_id required")
    db.execute(
        sa_text(
            "INSERT OR IGNORE INTO team_memberships (team_id, employee_id, role_on_team, start_date, allocation_pct) VALUES (:tid,:eid,:role,:sd,:ap)"
        ),
        {
            "tid": team_id,
            "eid": emp_id,
            "role": payload.get("role_on_team") or None,
            "sd": payload.get("start_date") or None,
            "ap": float(payload.get("allocation_pct") or 100),
        },
    )
    try:
        db.execute(sa_text("UPDATE employees SET team_id = :tid WHERE id = :id"), {"tid": team_id, "id": emp_id})
    except Exception:
        pass
    db.commit()
    return {"message": "added"}


@router.delete("/teams/{team_id}/members/{employee_id}")
async def remove_team_member(
    team_id: int,
    employee_id: int,
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    db.execute(
        sa_text("DELETE FROM team_memberships WHERE team_id = :tid AND employee_id = :eid"),
        {"tid": team_id, "eid": employee_id},
    )
    db.commit()
    return {"message": "removed"}


@router.get("/projects")
async def list_projects(
    entity: int | None = Query(None),
    entity_id: int | None = Query(None),
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    eid = _resolve_entity_id(entity, entity_id)
    if not eid:
        raise HTTPException(status_code=422, detail="entity is required")
    rows = db.execute(
        sa_text(
            "SELECT id, name, description, status FROM projects WHERE entity_id = :e ORDER BY id DESC"
        ),
        {"e": eid},
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
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    entity_id = _resolve_entity_id(payload.get("entity"), payload.get("entity_id"))
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
    entity: int | None = Query(None),
    entity_id: int | None = Query(None),
    q: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    team: Optional[int] = Query(None),
    type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(100, ge=1, le=500),
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    eid = _resolve_entity_id(entity, entity_id)
    if not eid:
        raise HTTPException(status_code=422, detail="entity is required")
    # Build dynamic filtering
    where = [" (e.is_deleted = 0 OR e.is_deleted IS NULL) "]
    params: Dict[str, Any] = {"eid": eid, "lim": int(pageSize), "off": int((page - 1) * pageSize)}
    # Prefer membership scoping if table exists
    use_memberships = _has_table(db, "employee_entity_memberships")
    if use_memberships:
        from_clause = " employees e LEFT JOIN employee_entity_memberships m ON m.employee_id = e.id AND m.entity_id = :eid "
        where.append(" (e.entity_id = :eid OR m.entity_id IS NOT NULL) ")
    else:
        from_clause = " employees e "
        where.append(" e.entity_id = :eid ")
    if q:
        where.append(" (lower(e.name) LIKE :q OR lower(coalesce(e.email,'')) LIKE :q OR lower(coalesce(e.title,'')) LIKE :q) ")
        params["q"] = f"%{q.lower()}%"
    if status:
        where.append(" lower(coalesce(e.status,'active')) = :st ")
        params["st"] = status.lower()
    if type:
        where.append(" lower(coalesce(e.employment_type,'')) = :tp ")
        params["tp"] = type.lower()
    if team:
        where.append(" e.team_id = :tid ")
        params["tid"] = int(team)
    where_sql = " AND ".join(where)
    sql = f"""
        SELECT e.id, coalesce(e.legal_name, e.name) as name, e.email, e.title, e.role, e.classification, e.status, e.employment_type,
               e.start_date, e.end_date, e.team_id,
               (SELECT name FROM teams t WHERE t.id = e.team_id) as team_name
        FROM {from_clause}
        WHERE {where_sql}
        ORDER BY e.id DESC
        LIMIT :lim OFFSET :off
    """
    rows = db.execute(sa_text(sql), params).fetchall()
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
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    entity_id = _resolve_entity_id(payload.get("entity"), payload.get("entity_id"))
    name = (payload.get("legal_name") or payload.get("name") or "").strip()
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
    # Prepare insert with compensation fields
    insert_cols = ["entity_id", "name", "legal_name", "preferred_name", "email", "title", "role", 
                   "classification", "status", "employment_type", "start_date", "end_date", "team_id", 
                   "manager_id", "created_at", "updated_at"]
    insert_vals = [":e", ":n", ":ln", ":pn", ":em", ":ti", ":ro", ":cl", ":st", ":et", ":sd", ":ed", 
                   ":tid", ":mid", "datetime('now')", "datetime('now')"]
    insert_params = {
        "e": entity_id,
        "n": name,
        "ln": name,
        "pn": payload.get("preferred_name") or None,
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
    }
    
    # Add compensation if provided
    if payload.get("hourly_rate"):
        insert_cols.append("hourly_rate")
        insert_vals.append(":hr")
        insert_params["hr"] = float(payload.get("hourly_rate"))
    if payload.get("annual_salary"):
        insert_cols.append("annual_salary")
        insert_vals.append(":sal")
        insert_params["sal"] = float(payload.get("annual_salary"))
    
    db.execute(
        sa_text(f"""
            INSERT INTO employees ({", ".join(insert_cols)})
            VALUES ({", ".join(insert_vals)})
        """),
        insert_params
    )
    new_id = int(db.execute(sa_text("SELECT last_insert_rowid()" )).scalar() or 0)
    # Optional memberships
    try:
        memberships = payload.get("memberships") or []
        if isinstance(memberships, list):
            for m in memberships:
                try:
                    ent = _resolve_entity_id(m.get("entity"), m.get("entityId") or m.get("entity_id"))
                    if not ent:
                        continue
                    ap = float(m.get("allocationPct") or m.get("allocation_pct") or 100)
                    pr = 1 if (m.get("primary") or m.get("primary_entity")) else 0
                    db.execute(
                        sa_text("INSERT OR IGNORE INTO employee_entity_memberships (employee_id, entity_id, allocation_pct, primary_entity) VALUES (:eid,:ent,:ap,:pr)"),
                        {"eid": new_id, "ent": ent, "ap": ap, "pr": pr},
                    )
                except Exception:
                    pass
    except Exception:
        pass
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
    partner=Depends(_require_clerk_user),
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
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    db.execute(sa_text("UPDATE employees SET is_deleted = 1 WHERE id = :id"), {"id": emp_id})
    db.commit()
    return {"message": "deleted"}


@router.post("/employees/{emp_id}/memberships")
async def add_employee_membership(
    emp_id: int,
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    ent = _resolve_entity_id(payload.get("entity"), payload.get("entityId") or payload.get("entity_id"))
    if not ent:
        raise HTTPException(status_code=422, detail="entity is required")
    ap = float(payload.get("allocationPct") or payload.get("allocation_pct") or 100)
    pr = 1 if (payload.get("primary") or payload.get("primary_entity")) else 0
    db.execute(
        sa_text("INSERT OR REPLACE INTO employee_entity_memberships (employee_id, entity_id, allocation_pct, primary_entity) VALUES (:eid,:ent,:ap,:pr)"),
        {"eid": emp_id, "ent": ent, "ap": ap, "pr": pr},
    )
    db.commit()
    return {"message": "added"}


@router.get("/employees/kpis")
async def employees_kpis(
    entity_id: int,
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    from datetime import datetime as _dt, timezone as _tz, timedelta as _td
    now = _dt.now(_tz.utc)
    def parse(d):
        try:
            return _dt.fromisoformat(d)
        except Exception:
            try:
                return _dt.fromisoformat(d+"T00:00:00")
            except Exception:
                return None
    rows = db.execute(sa_text("SELECT status, employment_type, start_date, end_date FROM employees WHERE entity_id = :e AND (is_deleted IS NULL OR is_deleted = 0)"), {"e": entity_id}).fetchall()
    total = len(rows)
    active = sum(1 for r in rows if (r[0] or 'active').lower() == 'active')
    new_hires = sum(1 for r in rows if (parse(r[2]) and (now - parse(r[2]).replace(tzinfo=_tz.utc) <= _td(days=30))))
    attrition = sum(1 for r in rows if (parse(r[3]) and (now - parse(r[3]).replace(tzinfo=_tz.utc) <= _td(days=365))))
    contractors = sum(1 for r in rows if (r[1] or '').lower() in ('contractor','contract'))
    interns_students = sum(1 for r in rows if (r[1] or '').lower() in ('intern','student'))
    months = []
    for r in rows:
        sd = parse(r[2]); ed = parse(r[3]) or now
        if sd:
            months.append(max(0, (ed - sd.replace(tzinfo=_tz.utc)).days/30.0))
    avg_tenure = round(sum(months)/len(months), 1) if months else 0.0
    return {
        "headcount": total,
        "active": active,
        "newHires30d": new_hires,
        "openRoles": 0,
        "attrition12m": attrition,
        "avgTenureMonths": avg_tenure,
        "payrollThisMonth": 0,
        "contractors": contractors,
        "interns_or_students": interns_students,
    }


@router.get("/employee-todos")
async def list_employee_todos(
    entity_id: int,
    assignee: int | None = None,
    status: str | None = None,
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    q = "SELECT id, employee_id, entity_id, title, notes, due_at, status, created_by, created_at, updated_at FROM employee_tasks WHERE entity_id = :e"
    params: Dict[str, Any] = {"e": entity_id}
    if assignee:
        q += " AND employee_id = :a"; params["a"] = assignee
    if status:
        q += " AND status = :s"; params["s"] = status
    rows = db.execute(sa_text(q + " ORDER BY COALESCE(due_at, created_at) ASC"), params).fetchall()
    return [
        {"id": r[0], "employee_id": r[1], "entity_id": r[2], "title": r[3], "notes": r[4], "due_at": r[5], "status": r[6], "created_by": r[7], "created_at": r[8], "updated_at": r[9]}
        for r in rows
    ]


@router.post("/employee-todos")
async def create_employee_todo(
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    eid = int(payload.get('entity_id') or 0)
    title = (payload.get('title') or '').strip()
    if not eid or not title:
        raise HTTPException(status_code=422, detail="entity_id and title required")
    db.execute(sa_text("INSERT INTO employee_tasks (employee_id, entity_id, title, notes, due_at, status, created_by, created_at, updated_at) VALUES (:emp,:ent,:ti,:no,:due,:st,:cb,datetime('now'),datetime('now'))"),
               {"emp": payload.get('employee_id'), "ent": eid, "ti": title, "no": payload.get('notes'), "due": payload.get('due_at'), "st": payload.get('status') or 'Open', "cb": partner.get('email') if isinstance(partner, dict) else None})
    new_id = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0)
    db.commit()
    return {"id": new_id}


@router.patch("/employee-todos/{task_id}")
async def patch_employee_todo(
    task_id: int,
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    fields = []
    params: Dict[str, Any] = {"id": task_id}
    for k in ("title","notes","due_at","status","employee_id"):
        if k in payload:
            fields.append(f"{k} = :{k}")
            params[k] = payload[k]
    if not fields:
        return {"message": "no changes"}
    db.execute(sa_text("UPDATE employee_tasks SET " + ", ".join(fields) + ", updated_at = datetime('now') WHERE id = :id"), params)
    db.commit()
    return {"message": "updated"}


@router.post("/employees/import")
async def import_employees(
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    """
    Import employees from CSV text. Columns: name, email, type, start, entity, team
    Accepts payload.csv as string. Dedupe by email.
    """
    _ensure_hr_schema(db)
    csv_text = payload.get("csv")
    if not isinstance(csv_text, str) or not csv_text.strip():
        raise HTTPException(status_code=422, detail="csv required")
    import csv as _csv
    from io import StringIO as _SIO
    reader = _csv.DictReader(_SIO(csv_text))
    created = 0
    for row in reader:
        name = (row.get("name") or "").strip()
        email = (row.get("email") or "").strip().lower()
        if not name or not email:
            continue
        # Skip if exists
        exists = db.execute(sa_text("SELECT id FROM employees WHERE lower(email) = :em AND (is_deleted = 0 OR is_deleted IS NULL)"), {"em": email}).fetchone()
        if exists:
            continue
        ent = row.get("entity") or payload.get("entity") or payload.get("entity_id")
        ent_id = _resolve_entity_id(ent, None)
        team_id = None
        tname = (row.get("team") or "").strip()
        if ent_id and tname:
            tr = db.execute(sa_text("SELECT id FROM teams WHERE entity_id = :e AND lower(name) = :n"), {"e": ent_id, "n": tname.lower()}).fetchone()
            if tr:
                team_id = int(tr[0])
        db.execute(
            sa_text("INSERT INTO employees (entity_id, name, legal_name, email, employment_type, start_date, team_id, status, created_at, updated_at) VALUES (:e,:n,:n,:em,:tp,:sd,:tid,'active',datetime('now'),datetime('now'))"),
            {
                "e": ent_id or 0,
                "n": name,
                "em": email,
                "tp": row.get("type") or None,
                "sd": row.get("start") or None,
                "tid": team_id,
            },
        )
        created += 1
    db.commit()
    return {"created": created}


@router.get("/employees/export")
async def export_employees(
    entity: int | None = Query(None),
    entity_id: int | None = Query(None),
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    _ensure_hr_schema(db)
    eid = _resolve_entity_id(entity, entity_id)
    if not eid:
        raise HTTPException(status_code=422, detail="entity is required")
    if _has_table(db, "employee_entity_memberships"):
        rows = db.execute(sa_text("SELECT e.name, e.email, e.employment_type, e.start_date FROM employees e JOIN employee_entity_memberships m ON m.employee_id = e.id AND m.entity_id = :e WHERE (e.is_deleted = 0 OR e.is_deleted IS NULL)"), {"e": eid}).fetchall()
    else:
        rows = db.execute(sa_text("SELECT name, email, employment_type, start_date FROM employees WHERE entity_id = :e AND (is_deleted = 0 OR is_deleted IS NULL)"), {"e": eid}).fetchall()
    import csv as _csv
    from io import StringIO as _SIO
    out = _SIO()
    w = _csv.writer(out)
    w.writerow(["name","email","type","start","entity"])
    for r in rows:
        w.writerow([r[0], r[1], r[2] or "", r[3] or "", eid])
    return {"csv": out.getvalue()}


# ============================================================================
# TIMESHEET ENDPOINTS
# ============================================================================

@router.post("/timesheets")
async def create_timesheet(
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    """Create a new timesheet for an employee"""
    _ensure_hr_schema(db)
    
    entity_id = _resolve_entity_id(payload.get("entity"), payload.get("entity_id"))
    employee_id = payload.get("employee_id")
    pay_period_start = payload.get("pay_period_start")
    pay_period_end = payload.get("pay_period_end")
    
    if not all([entity_id, employee_id, pay_period_start, pay_period_end]):
        raise HTTPException(status_code=422, detail="Missing required fields")
    
    # Check for duplicate timesheet for same period
    existing = db.execute(
        sa_text("""
            SELECT id FROM timesheets 
            WHERE employee_id = :emp AND pay_period_start = :start AND pay_period_end = :end
        """),
        {"emp": employee_id, "start": pay_period_start, "end": pay_period_end}
    ).fetchone()
    
    if existing:
        raise HTTPException(status_code=400, detail="Timesheet already exists for this pay period")
    
    db.execute(
        sa_text("""
            INSERT INTO timesheets (entity_id, employee_id, pay_period_start, pay_period_end, status, created_at, updated_at)
            VALUES (:eid, :emp, :start, :end, 'draft', datetime('now'), datetime('now'))
        """),
        {"eid": entity_id, "emp": employee_id, "start": pay_period_start, "end": pay_period_end}
    )
    
    new_id = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar())
    db.commit()
    
    return {"id": new_id, "message": "Timesheet created"}


@router.get("/timesheets")
async def list_timesheets(
    entity: int | None = Query(None),
    entity_id: int | None = Query(None),
    employee_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    pay_period: Optional[str] = Query(None),
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    """List timesheets with filters"""
    _ensure_hr_schema(db)
    
    eid = _resolve_entity_id(entity, entity_id)
    where = ["entity_id = :eid"]
    params: Dict[str, Any] = {"eid": eid}
    
    if employee_id:
        where.append("employee_id = :emp")
        params["emp"] = employee_id
    
    if status:
        where.append("status = :status")
        params["status"] = status
    
    where_sql = " AND ".join(where)
    
    rows = db.execute(
        sa_text(f"""
            SELECT t.id, t.employee_id, t.pay_period_start, t.pay_period_end, t.total_hours, t.status,
                   t.submitted_date, t.approved_date, t.rejected_date, t.rejection_reason,
                   e.name as employee_name, e.email as employee_email
            FROM timesheets t
            LEFT JOIN employees e ON e.id = t.employee_id
            WHERE {where_sql}
            ORDER BY t.pay_period_start DESC, t.id DESC
        """),
        params
    ).fetchall()
    
    result = []
    for r in rows:
        # Get entries count
        entries_count = db.execute(
            sa_text("SELECT COUNT(*) FROM timesheet_entries WHERE timesheet_id = :tid"),
            {"tid": r[0]}
        ).scalar()
        
        result.append({
            "id": r[0],
            "employee_id": r[1],
            "employee_name": r[10],
            "employee_email": r[11],
            "pay_period_start": r[2],
            "pay_period_end": r[3],
            "total_hours": r[4],
            "status": r[5],
            "submitted_date": r[6],
            "approved_date": r[7],
            "rejected_date": r[8],
            "rejection_reason": r[9],
            "entries_count": entries_count
        })
    
    return {"timesheets": result, "count": len(result)}


@router.get("/timesheets/{timesheet_id}")
async def get_timesheet(
    timesheet_id: int,
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    """Get timesheet detail with all entries"""
    _ensure_hr_schema(db)
    
    timesheet_row = db.execute(
        sa_text("""
            SELECT t.id, t.entity_id, t.employee_id, t.pay_period_start, t.pay_period_end, 
                   t.total_hours, t.status, t.submitted_date, t.approved_date, t.rejected_date, t.rejection_reason,
                   e.name as employee_name, e.email as employee_email
            FROM timesheets t
            LEFT JOIN employees e ON e.id = t.employee_id
            WHERE t.id = :tid
        """),
        {"tid": timesheet_id}
    ).fetchone()
    
    if not timesheet_row:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    # Get entries
    entries_rows = db.execute(
        sa_text("""
            SELECT te.id, te.entry_date, te.hours, te.project_id, te.team_id, te.notes,
                   p.name as project_name, tm.name as team_name
            FROM timesheet_entries te
            LEFT JOIN projects p ON p.id = te.project_id
            LEFT JOIN teams tm ON tm.id = te.team_id
            WHERE te.timesheet_id = :tid
            ORDER BY te.entry_date
        """),
        {"tid": timesheet_id}
    ).fetchall()
    
    entries = []
    for e in entries_rows:
        entries.append({
            "id": e[0],
            "entry_date": e[1],
            "hours": e[2],
            "project_id": e[3],
            "project_name": e[6],
            "team_id": e[4],
            "team_name": e[7],
            "notes": e[5]
        })
    
    return {
        "id": timesheet_row[0],
        "entity_id": timesheet_row[1],
        "employee_id": timesheet_row[2],
        "employee_name": timesheet_row[11],
        "employee_email": timesheet_row[12],
        "pay_period_start": timesheet_row[3],
        "pay_period_end": timesheet_row[4],
        "total_hours": timesheet_row[5],
        "status": timesheet_row[6],
        "submitted_date": timesheet_row[7],
        "approved_date": timesheet_row[8],
        "rejected_date": timesheet_row[9],
        "rejection_reason": timesheet_row[10],
        "entries": entries
    }


@router.post("/timesheets/{timesheet_id}/entries")
async def add_timesheet_entries(
    timesheet_id: int,
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    """Add or update timesheet entries"""
    _ensure_hr_schema(db)
    
    # Verify timesheet exists and is in draft status
    timesheet = db.execute(
        sa_text("SELECT id, status FROM timesheets WHERE id = :tid"),
        {"tid": timesheet_id}
    ).fetchone()
    
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    if timesheet[1] not in ('draft', 'rejected'):
        raise HTTPException(status_code=400, detail="Cannot modify submitted or approved timesheet")
    
    entries = payload.get("entries", [])
    if not entries:
        raise HTTPException(status_code=422, detail="No entries provided")
    
    # Delete existing entries for this timesheet
    db.execute(
        sa_text("DELETE FROM timesheet_entries WHERE timesheet_id = :tid"),
        {"tid": timesheet_id}
    )
    
    total_hours = 0.0
    for entry in entries:
        hours = float(entry.get("hours", 0))
        if hours > 0:
            db.execute(
                sa_text("""
                    INSERT INTO timesheet_entries (timesheet_id, entry_date, hours, project_id, team_id, notes)
                    VALUES (:tid, :date, :hrs, :proj, :team, :notes)
                """),
                {
                    "tid": timesheet_id,
                    "date": entry.get("entry_date"),
                    "hrs": hours,
                    "proj": entry.get("project_id"),
                    "team": entry.get("team_id"),
                    "notes": entry.get("notes")
                }
            )
            total_hours += hours
    
    # Update total hours
    db.execute(
        sa_text("UPDATE timesheets SET total_hours = :hrs, updated_at = datetime('now') WHERE id = :tid"),
        {"hrs": total_hours, "tid": timesheet_id}
    )
    db.commit()
    
    return {"message": "Entries updated", "total_hours": total_hours}


@router.post("/timesheets/{timesheet_id}/submit")
async def submit_timesheet(
    timesheet_id: int,
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    """Submit timesheet for approval"""
    _ensure_hr_schema(db)
    
    timesheet = db.execute(
        sa_text("SELECT id, status, total_hours FROM timesheets WHERE id = :tid"),
        {"tid": timesheet_id}
    ).fetchone()
    
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    if timesheet[1] not in ('draft', 'rejected'):
        raise HTTPException(status_code=400, detail="Timesheet already submitted or approved")
    
    if timesheet[2] == 0:
        raise HTTPException(status_code=400, detail="Cannot submit timesheet with zero hours")
    
    db.execute(
        sa_text("""
            UPDATE timesheets 
            SET status = 'submitted', submitted_date = datetime('now'), updated_at = datetime('now')
            WHERE id = :tid
        """),
        {"tid": timesheet_id}
    )
    db.commit()
    
    return {"message": "Timesheet submitted for approval"}


@router.post("/timesheets/{timesheet_id}/approve")
async def approve_timesheet(
    timesheet_id: int,
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    """Approve timesheet (manager/project lead)"""
    _ensure_hr_schema(db)
    
    timesheet = db.execute(
        sa_text("SELECT id, status, employee_id FROM timesheets WHERE id = :tid"),
        {"tid": timesheet_id}
    ).fetchone()
    
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    if timesheet[1] != 'submitted':
        raise HTTPException(status_code=400, detail="Only submitted timesheets can be approved")
    
    # TODO: Get approver ID from partner context
    approver_id = 1  # Placeholder
    
    # TODO: Verify approver is manager or project lead
    
    db.execute(
        sa_text("""
            UPDATE timesheets 
            SET status = 'approved', approved_by_id = :approver, approved_date = datetime('now'), updated_at = datetime('now')
            WHERE id = :tid
        """),
        {"tid": timesheet_id, "approver": approver_id}
    )
    db.commit()
    
    return {"message": "Timesheet approved", "timesheet_id": timesheet_id}


@router.post("/timesheets/{timesheet_id}/reject")
async def reject_timesheet(
    timesheet_id: int,
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    """Reject timesheet with reason"""
    _ensure_hr_schema(db)
    
    reason = payload.get("reason", "").strip()
    if not reason:
        raise HTTPException(status_code=422, detail="Rejection reason required")
    
    timesheet = db.execute(
        sa_text("SELECT id, status FROM timesheets WHERE id = :tid"),
        {"tid": timesheet_id}
    ).fetchone()
    
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    if timesheet[1] != 'submitted':
        raise HTTPException(status_code=400, detail="Only submitted timesheets can be rejected")
    
    # TODO: Get rejector ID from partner context
    rejector_id = 1  # Placeholder
    
    db.execute(
        sa_text("""
            UPDATE timesheets 
            SET status = 'rejected', rejected_by_id = :rejector, rejected_date = datetime('now'), 
                rejection_reason = :reason, updated_at = datetime('now')
            WHERE id = :tid
        """),
        {"tid": timesheet_id, "rejector": rejector_id, "reason": reason}
    )
    db.commit()
    
    return {"message": "Timesheet rejected"}


@router.get("/timesheets/pending-approval")
async def get_pending_approvals(
    entity: int | None = Query(None),
    entity_id: int | None = Query(None),
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    """Get all timesheets pending approval for manager/lead"""
    _ensure_hr_schema(db)
    
    eid = _resolve_entity_id(entity, entity_id)
    
    rows = db.execute(
        sa_text("""
            SELECT t.id, t.employee_id, t.pay_period_start, t.pay_period_end, t.total_hours,
                   t.submitted_date, e.name as employee_name
            FROM timesheets t
            LEFT JOIN employees e ON e.id = t.employee_id
            WHERE t.entity_id = :eid AND t.status = 'submitted'
            ORDER BY t.submitted_date ASC
        """),
        {"eid": eid}
    ).fetchall()
    
    result = []
    for r in rows:
        result.append({
            "id": r[0],
            "employee_id": r[1],
            "employee_name": r[6],
            "pay_period_start": r[2],
            "pay_period_end": r[3],
            "total_hours": r[4],
            "submitted_date": r[5]
        })
    
    return {"timesheets": result, "count": len(result)}


# ============================================================================
# ADVISORY-SPECIFIC ENDPOINTS (Projects & Auto-Creation)
# ============================================================================

@router.post("/projects/{project_id}/leads")
async def add_project_lead(
    project_id: int,
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    """Add a project lead to a project"""
    _ensure_hr_schema(db)
    
    employee_id = payload.get("employee_id")
    role = payload.get("role", "lead")
    
    if not employee_id:
        raise HTTPException(status_code=422, detail="employee_id required")
    
    # Check if already exists
    existing = db.execute(
        sa_text("SELECT id FROM project_leads WHERE project_id = :pid AND employee_id = :eid"),
        {"pid": project_id, "eid": employee_id}
    ).fetchone()
    
    if existing:
        raise HTTPException(status_code=400, detail="Employee is already a project lead")
    
    db.execute(
        sa_text("""
            INSERT INTO project_leads (project_id, employee_id, role, assigned_date)
            VALUES (:pid, :eid, :role, datetime('now'))
        """),
        {"pid": project_id, "eid": employee_id, "role": role}
    )
    db.commit()
    
    return {"message": "Project lead added"}


@router.delete("/projects/{project_id}/leads/{employee_id}")
async def remove_project_lead(
    project_id: int,
    employee_id: int,
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    """Remove a project lead from a project"""
    _ensure_hr_schema(db)
    
    db.execute(
        sa_text("DELETE FROM project_leads WHERE project_id = :pid AND employee_id = :eid"),
        {"pid": project_id, "eid": employee_id}
    )
    db.commit()
    
    return {"message": "Project lead removed"}


@router.get("/projects/{project_id}/leads")
async def get_project_leads(
    project_id: int,
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    """Get all leads for a project"""
    _ensure_hr_schema(db)
    
    rows = db.execute(
        sa_text("""
            SELECT pl.id, pl.employee_id, pl.role, e.name, e.email
            FROM project_leads pl
            LEFT JOIN employees e ON e.id = pl.employee_id
            WHERE pl.project_id = :pid
        """),
        {"pid": project_id}
    ).fetchall()
    
    result = []
    for r in rows:
        result.append({
            "id": r[0],
            "employee_id": r[1],
            "role": r[2],
            "employee_name": r[3],
            "employee_email": r[4]
        })
    
    return {"leads": result, "count": len(result)}


@router.post("/employees/create-from-student")
async def create_employee_from_student(
    payload: Dict[str, Any],
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db),
):
    """Auto-create employee when student is onboarded to Advisory project"""
    _ensure_hr_schema(db)
    
    entity_id = payload.get("entity_id")  # Should be NGI Capital Advisory LLC
    student_id = payload.get("student_id")
    name = payload.get("name", "").strip()
    email = payload.get("email", "").strip()
    project_id = payload.get("project_id")
    
    if not all([entity_id, student_id, name, email]):
        raise HTTPException(status_code=422, detail="Missing required fields")
    
    # Check if employee already exists for this student
    existing_link = db.execute(
        sa_text("SELECT employee_id FROM student_employee_links WHERE student_id = :sid"),
        {"sid": student_id}
    ).fetchone()
    
    if existing_link:
        employee_id = existing_link[0]
        
        # Link to new project if provided
        if project_id:
            db.execute(
                sa_text("INSERT OR IGNORE INTO employee_projects (employee_id, project_id) VALUES (:eid, :pid)"),
                {"eid": employee_id, "pid": project_id}
            )
            db.commit()
        
        return {"employee_id": employee_id, "message": "Employee already exists, linked to project"}
    
    # Create new employee
    db.execute(
        sa_text("""
            INSERT INTO employees (entity_id, name, email, title, role, classification, status, employment_type, start_date, created_at, updated_at)
            VALUES (:e, :n, :em, 'Student Employee', 'Project Team Member', 'contractor', 'active', 'part_time', date('now'), datetime('now'), datetime('now'))
        """),
        {
            "e": entity_id,
            "n": name,
            "em": email
        }
    )
    
    employee_id = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar())
    
    # Create student-employee link
    db.execute(
        sa_text("""
            INSERT INTO student_employee_links (employee_id, student_id, onboarding_date)
            VALUES (:eid, :sid, date('now'))
        """),
        {"eid": employee_id, "sid": student_id}
    )
    
    # Link to project if provided
    if project_id:
        db.execute(
            sa_text("INSERT INTO employee_projects (employee_id, project_id) VALUES (:eid, :pid)"),
            {"eid": employee_id, "pid": project_id}
        )
    
    db.commit()
    
    return {"employee_id": employee_id, "message": "Employee created from student"}

