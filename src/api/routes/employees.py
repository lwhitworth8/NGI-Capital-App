"""
Employees/Teams/Projects API for NGI Capital
Entity-aware HR module supporting:
- Employees CRUD (classification varies by entity)
- Teams CRUD (per entity)
- Projects CRUD (primarily for NGI Advisory; generic for future use)
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
import sqlite3

from src.api.config import DATABASE_PATH, SECRET_KEY, ALGORITHM

# Lightweight auth dependency mirroring main.py behavior
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

security = HTTPBearer(auto_error=False)

def get_current_partner(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return {"email": email}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


router = APIRouter(prefix="/api", tags=["hr"])


def get_db():
    return sqlite3.connect(DATABASE_PATH)


def init_hr_tables(conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            title TEXT,
            role TEXT,
            classification TEXT,
            status TEXT DEFAULT 'active',
            employment_type TEXT,
            start_date DATE,
            end_date DATE,
            team_id INTEGER,
            manager_id INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS employee_projects (
            employee_id INTEGER NOT NULL,
            project_id INTEGER NOT NULL,
            PRIMARY KEY (employee_id, project_id)
        )
        """
    )
    conn.commit()

def get_or_create_team(conn: sqlite3.Connection, entity_id: int, name: str, description: str = "") -> int:
    cur = conn.cursor()
    cur.execute("SELECT id FROM teams WHERE entity_id = ? AND lower(name) = lower(?)", (entity_id, name))
    row = cur.fetchone()
    if row:
        return int(row[0])
    cur.execute("INSERT INTO teams (entity_id, name, description) VALUES (?, ?, ?)", (entity_id, name, description))
    conn.commit()
    return int(cur.lastrowid)

def ensure_default_teams(conn: sqlite3.Connection, entity_id: int):
    """Ensure baseline teams exist for an entity (Executive, Board)."""
    get_or_create_team(conn, entity_id, "Executive", "Executive leadership team")
    get_or_create_team(conn, entity_id, "Board", "Board of Directors")


# Schemas
class TeamCreate(BaseModel):
    entity_id: int
    name: str
    description: Optional[str] = None


class ProjectCreate(BaseModel):
    entity_id: int
    name: str
    description: Optional[str] = None
    status: Optional[str] = 'active'


class EmployeeCreate(BaseModel):
    entity_id: int
    name: str
    email: EmailStr
    title: Optional[str] = None
    role: Optional[str] = None
    classification: Optional[str] = None  # e.g., student, board, executive, employee
    status: Optional[str] = 'active'
    employment_type: Optional[str] = None # full_time, part_time, contractor, intern
    start_date: Optional[str] = None      # ISO date
    end_date: Optional[str] = None        # ISO date
    team_id: Optional[int] = None
    manager_id: Optional[int] = None
    project_ids: Optional[List[int]] = None  # advisory projects


@router.get("/teams")
def list_teams(entity_id: int, partner=Depends(get_current_partner)):
    conn = get_db()
    init_hr_tables(conn)
    ensure_default_teams(conn, entity_id)
    cur = conn.cursor()
    cur.execute("SELECT id, name, description, is_active FROM teams WHERE entity_id = ? ORDER BY name", (entity_id,))
    rows = cur.fetchall()
    conn.close()
    return [{"id": r[0], "name": r[1], "description": r[2], "is_active": bool(r[3])} for r in rows]


@router.post("/teams")
def create_team(team: TeamCreate, partner=Depends(get_current_partner)):
    conn = get_db()
    init_hr_tables(conn)
    cur = conn.cursor()
    cur.execute("INSERT INTO teams (entity_id, name, description) VALUES (?, ?, ?)", (team.entity_id, team.name, team.description))
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return {"id": new_id, **team.model_dump()}


@router.get("/projects")
def list_projects(entity_id: int, partner=Depends(get_current_partner)):
    conn = get_db()
    init_hr_tables(conn)
    cur = conn.cursor()
    cur.execute("SELECT id, name, description, status FROM projects WHERE entity_id = ? ORDER BY name", (entity_id,))
    rows = cur.fetchall()
    conn.close()
    return [{"id": r[0], "name": r[1], "description": r[2], "status": r[3]} for r in rows]


@router.post("/projects")
def create_project(project: ProjectCreate, partner=Depends(get_current_partner)):
    conn = get_db()
    init_hr_tables(conn)
    cur = conn.cursor()
    cur.execute("INSERT INTO projects (entity_id, name, description, status) VALUES (?, ?, ?, ?)",
                (project.entity_id, project.name, project.description, project.status))
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return {"id": new_id, **project.model_dump()}


@router.get("/employees")
def list_employees(entity_id: int, partner=Depends(get_current_partner)):
    conn = get_db()
    init_hr_tables(conn)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT e.id, e.name, e.email, e.title, e.role, e.classification, e.status,
               e.employment_type, e.start_date, e.end_date, e.team_id, t.name as team_name
        FROM employees e
        LEFT JOIN teams t ON e.team_id = t.id
        WHERE e.entity_id = ? AND e.is_active = 1
        ORDER BY e.name
        """,
        (entity_id,)
    )
    emp_rows = cur.fetchall()

    employees: List[Dict[str, Any]] = []
    for r in emp_rows:
        emp = {
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
            "projects": []
        }
        employees.append(emp)

    # Load projects for these employees
    if employees:
        ids = tuple([e["id"] for e in employees])
        placeholders = ",".join(["?"] * len(ids))
        cur.execute(
            f"""
            SELECT ep.employee_id, p.id, p.name
            FROM employee_projects ep
            JOIN projects p ON ep.project_id = p.id
            WHERE ep.employee_id IN ({placeholders})
            """,
            ids
        )
        proj_rows = cur.fetchall()
        by_emp: Dict[int, List[Dict[str, Any]]] = {}
        for er, pid, pname in proj_rows:
            by_emp.setdefault(er, []).append({"id": pid, "name": pname})
        for emp in employees:
            emp["projects"] = by_emp.get(emp["id"], [])

    conn.close()
    return employees


@router.post("/employees")
def create_employee(req: EmployeeCreate, partner=Depends(get_current_partner)):
    conn = get_db()
    init_hr_tables(conn)
    ensure_default_teams(conn, req.entity_id)
    cur = conn.cursor()
    # If classification mandates default team and team_id not provided, set it
    team_id = req.team_id
    if (not team_id) and req.classification:
        cls = (req.classification or '').lower()
        if cls == 'executive':
            team_id = get_or_create_team(conn, req.entity_id, 'Executive')
        elif cls == 'board':
            team_id = get_or_create_team(conn, req.entity_id, 'Board')

    cur.execute(
        """
        INSERT INTO employees (entity_id, name, email, title, role, classification, status,
                               employment_type, start_date, end_date, team_id, manager_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            req.entity_id, req.name, req.email, req.title, req.role or req.title, req.classification,
            req.status, req.employment_type, req.start_date, req.end_date, team_id, req.manager_id
        )
    )
    emp_id = cur.lastrowid

    if req.project_ids:
        for pid in req.project_ids:
            cur.execute("INSERT OR IGNORE INTO employee_projects (employee_id, project_id) VALUES (?, ?)", (emp_id, pid))

    conn.commit()
    conn.close()
    return {"id": emp_id}


@router.put("/employees/{employee_id}")
def update_employee(employee_id: int, req: EmployeeCreate, partner=Depends(get_current_partner)):
    conn = get_db()
    init_hr_tables(conn)
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE employees
        SET entity_id=?, name=?, email=?, title=?, role=?, classification=?, status=?,
            employment_type=?, start_date=?, end_date=?, team_id=?, manager_id=?
        WHERE id=?
        """,
        (
            req.entity_id, req.name, req.email, req.title, req.role, req.classification,
            req.status, req.employment_type, req.start_date, req.end_date, req.team_id, req.manager_id, employee_id
        )
    )

    # reset projects
    cur.execute("DELETE FROM employee_projects WHERE employee_id = ?", (employee_id,))
    if req.project_ids:
        for pid in req.project_ids:
            cur.execute("INSERT OR IGNORE INTO employee_projects (employee_id, project_id) VALUES (?, ?)", (employee_id, pid))

    conn.commit()
    conn.close()
    return {"message": "updated"}


@router.delete("/employees/{employee_id}")
def delete_employee(employee_id: int, partner=Depends(get_current_partner)):
    conn = get_db()
    init_hr_tables(conn)
    cur = conn.cursor()
    cur.execute("UPDATE employees SET is_active = 0, status='inactive' WHERE id = ?", (employee_id,))
    conn.commit()
    conn.close()
    return {"message": "deleted"}
