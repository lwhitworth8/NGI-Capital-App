"""
Public-facing Advisory API for the Student Portal
Endpoints are read-only for projects and per-student for applications/memberships.
Backed by the same SQLite advisory tables for MVP.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Query, UploadFile, File
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text
from pathlib import Path
from datetime import datetime
from jose import jwt as _jwt
import os

from src.api.database import get_db
from .advisory import _ensure_tables

router = APIRouter()


def _extract_student_email(request: Request) -> Optional[str]:
    # Try Authorization: Bearer <token>, parse unverified for dev
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    email: Optional[str] = None
    if auth and auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1].strip()
        try:
            claims = _jwt.get_unverified_claims(token)  # dev-friendly; in prod verify
            email = (
                claims.get("email")
                or claims.get("email_address")
                or claims.get("primary_email_address")
                or claims.get("sub")
            )
        except Exception:
            email = None
    # Header override (for tests/dev)
    if not email:
        email = request.headers.get("X-Student-Email")
    # Query param fallback
    if not email:
        try:
            email = request.query_params.get("email")
        except Exception:
            pass
    return email.lower() if isinstance(email, str) else None


def _check_domain(email: str) -> bool:
    allowed = [e.strip().lower() for e in os.getenv(
        "ALLOWED_STUDENT_DOMAINS",
        "berkeley.edu,ucla.edu,ucsd.edu,uci.edu,ucdavis.edu,ucsb.edu,ucsc.edu,ucr.edu,ucmerced.edu",
    ).split(",") if e.strip()]
    domain = (email.split("@",1)[1] if "@" in email else "").lower()
    return domain in allowed if allowed else True


# -------- Public Projects (no auth required) --------
@router.get("/projects")
async def public_projects(q: Optional[str] = None, tags: Optional[str] = None, sort: Optional[str] = None, db: Session = Depends(get_db)):
    _ensure_tables(db)
    where = ["COALESCE(is_public,1) = 1", "lower(status) = 'active'"]
    params: Dict[str, Any] = {}
    if q:
        where.append("(lower(project_name) LIKE :q OR lower(client_name) LIKE :q OR lower(summary) LIKE :q)")
        params["q"] = f"%{q.strip().lower()}%"
    # Basic tags filter (string contains any of the provided tokens)
    if tags:
        tag_list = [t.strip().lower() for t in tags.split(',') if t.strip()]
        if tag_list:
            ors = []
            for i, t in enumerate(tag_list):
                key = f"tag{i}"
                ors.append(f"lower(COALESCE(tags,'')) LIKE :{key}")
                params[key] = f"%{t}%"
            where.append("(" + " OR ".join(ors) + ")")
    sql = (
        "SELECT id, project_name, client_name, summary, hero_image_url, tags, partner_badges, backer_badges, start_date, allow_applications, coffeechat_calendly "
        "FROM advisory_projects WHERE " + " AND ".join(where)
    )
    # Sorting: name | newest (default)
    if (sort or '').strip().lower() == 'name':
        sql += " ORDER BY lower(project_name) ASC, id ASC"
    else:
        sql += " ORDER BY datetime(start_date) DESC, id DESC"
    rows = db.execute(sa_text(sql), params).fetchall()
    import json as _json
    out = []
    for r in rows:
        out.append({
            "id": r[0], "project_name": r[1], "client_name": r[2], "summary": r[3],
            "hero_image_url": r[4], "tags": (_json.loads(r[5]) if r[5] else []),
            "partner_badges": (_json.loads(r[6]) if r[6] else []), "backer_badges": (_json.loads(r[7]) if r[7] else []),
            "start_date": r[8], "allow_applications": int(r[9] or 0), "coffeechat_calendly": r[10],
        })
    return out


@router.get("/projects/{pid}")
async def public_project_detail(pid: int, db: Session = Depends(get_db)):
    _ensure_tables(db)
    row = db.execute(sa_text(
        "SELECT id, project_name, client_name, summary, description, hero_image_url, gallery_urls, tags, partner_badges, backer_badges, allow_applications, coffeechat_calendly "
        "FROM advisory_projects WHERE id = :id AND COALESCE(is_public,1) = 1"
    ), {"id": pid}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    import json as _json
    return {
        "id": row[0], "project_name": row[1], "client_name": row[2], "summary": row[3], "description": row[4],
        "hero_image_url": row[5], "gallery_urls": (_json.loads(row[6]) if row[6] else []),
        "tags": (_json.loads(row[7]) if row[7] else []), "partner_badges": (_json.loads(row[8]) if row[8] else []),
        "backer_badges": (_json.loads(row[9]) if row[9] else []), "allow_applications": int(row[10] or 0),
        "coffeechat_calendly": row[11],
    }


# -------- Student-scoped endpoints (requires UC domain email) --------
@router.post("/applications")
async def create_public_application(payload: Dict[str, Any], request: Request, db: Session = Depends(get_db)):
    _ensure_tables(db)
    email = _extract_student_email(request) or (payload.get("email") if isinstance(payload.get("email"), str) else None)
    if not email or not _check_domain(email):
        raise HTTPException(status_code=403, detail="Student email with allowed domain required")
    # Ensure student record
    try:
        db.execute(sa_text(
            "INSERT OR IGNORE INTO advisory_students (entity_id, first_name, last_name, email, status, created_at, updated_at) "
            "VALUES (NULL, :fn, :ln, :em, 'prospect', datetime('now'), datetime('now'))"
        ), {"fn": payload.get("first_name"), "ln": payload.get("last_name"), "em": email})
    except Exception:
        pass
    # Insert application
    db.execute(sa_text(
        "INSERT INTO advisory_applications (entity_id, source, target_project_id, first_name, last_name, email, school, program, resume_url, notes, status, created_at) "
        "VALUES (NULL, 'form', :tp, :fn, :ln, :em, :sc, :pr, :ru, :nt, 'new', datetime('now'))"
    ), {"tp": payload.get("target_project_id"), "fn": payload.get("first_name"), "ln": payload.get("last_name"), "em": email,
        "sc": payload.get("school"), "pr": payload.get("program"), "ru": payload.get("resume_url"), "nt": payload.get("notes")})
    rid = db.execute(sa_text("SELECT last_insert_rowid()")).scalar()  # type: ignore
    db.commit()
    return {"id": int(rid or 0)}


@router.get("/applications/mine")
async def my_applications(request: Request, db: Session = Depends(get_db)):
    _ensure_tables(db)
    email = _extract_student_email(request)
    if not email or not _check_domain(email):
        raise HTTPException(status_code=403, detail="Student email with allowed domain required")
    rows = db.execute(sa_text(
        "SELECT id, target_project_id, status, created_at FROM advisory_applications WHERE lower(email) = :em ORDER BY datetime(created_at) DESC"
    ), {"em": email.lower()}).fetchall()
    return [{"id": r[0], "target_project_id": r[1], "status": r[2], "created_at": r[3]} for r in rows]


@router.get("/memberships/mine")
async def my_memberships(request: Request, db: Session = Depends(get_db)):
    _ensure_tables(db)
    email = _extract_student_email(request)
    if not email or not _check_domain(email):
        raise HTTPException(status_code=403, detail="Student email with allowed domain required")
    row = db.execute(sa_text("SELECT id FROM advisory_students WHERE lower(email) = :em"), {"em": email.lower()}).fetchone()
    sid = row[0] if row else None
    if not sid:
        return []
    rows = db.execute(sa_text(
        "SELECT a.id, a.project_id, a.role, a.hours_planned, a.active FROM advisory_project_assignments a WHERE a.student_id = :sid"
    ), {"sid": sid}).fetchall()
    return [{"id": r[0], "project_id": r[1], "role": r[2], "hours_planned": r[3], "active": bool(r[4])} for r in rows]


# -------- Student Profile (theme/resume) --------
def _ensure_student_profile_cols(db: Session) -> None:
    # Add resume_url and theme columns if missing
    try:
        db.execute(sa_text("ALTER TABLE advisory_students ADD COLUMN resume_url TEXT"))
    except Exception:
        pass
    try:
        db.execute(sa_text("ALTER TABLE advisory_students ADD COLUMN theme TEXT"))
    except Exception:
        pass
    try:
        db.execute(sa_text("ALTER TABLE advisory_students ADD COLUMN learning_notify INTEGER DEFAULT 0"))
    except Exception:
        pass
    db.commit()


@router.get("/profile")
async def get_profile(request: Request, db: Session = Depends(get_db)):
    _ensure_tables(db)
    _ensure_student_profile_cols(db)
    email = _extract_student_email(request)
    if not email or not _check_domain(email):
        raise HTTPException(status_code=403, detail="Student email with allowed domain required")
    row = db.execute(sa_text(
        "SELECT id, first_name, last_name, email, school, program, resume_url, theme, learning_notify, created_at, updated_at "
        "FROM advisory_students WHERE lower(email) = :em"
    ), {"em": email.lower()}).fetchone()
    if not row:
        # Create minimal record
        db.execute(sa_text(
            "INSERT INTO advisory_students (entity_id, first_name, last_name, email, status, created_at, updated_at) "
            "VALUES (NULL, NULL, NULL, :em, 'prospect', datetime('now'), datetime('now'))"
        ), {"em": email})
        db.commit()
        row = db.execute(sa_text(
            "SELECT id, first_name, last_name, email, school, program, resume_url, theme, learning_notify, created_at, updated_at "
            "FROM advisory_students WHERE lower(email) = :em"
        ), {"em": email.lower()}).fetchone()
    return {
        "id": row[0],
        "first_name": row[1],
        "last_name": row[2],
        "email": row[3],
        "school": row[4],
        "program": row[5],
        "resume_url": row[6],
        "theme": row[7],
        "learning_notify": bool(row[8] or 0),
        "created_at": row[9],
        "updated_at": row[10],
    }


@router.patch("/profile")
async def update_profile(payload: Dict[str, Any], request: Request, db: Session = Depends(get_db)):
    _ensure_tables(db)
    _ensure_student_profile_cols(db)
    email = _extract_student_email(request) or (payload.get("email") if isinstance(payload.get("email"), str) else None)
    if not email or not _check_domain(email):
        raise HTTPException(status_code=403, detail="Student email with allowed domain required")
    fields = []
    params: Dict[str, Any] = {"em": email.lower()}
    for key in ("first_name", "last_name", "school", "program", "theme"):
        if key in payload:
            fields.append(f"{key} = :{key}")
            params[key] = payload[key]
    if "learning_notify" in payload:
        fields.append("learning_notify = :ln")
        params["ln"] = 1 if (payload.get("learning_notify") in (True, 1, "1", "true")) else 0
    if not fields:
        return {"message": "no changes"}
    fields.append("updated_at = datetime('now')")
    db.execute(sa_text("UPDATE advisory_students SET " + ", ".join(fields) + " WHERE lower(email) = :em"), params)
    db.commit()
    return {"message": "updated"}


@router.post("/profile/resume")
async def upload_resume(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    _ensure_tables(db)
    _ensure_student_profile_cols(db)
    email = _extract_student_email(request)
    if not email or not _check_domain(email):
        raise HTTPException(status_code=403, detail="Student email with allowed domain required")
    # Validate file
    filename = (file.filename or "resume.pdf").lower()
    if not filename.endswith(".pdf"):
        raise HTTPException(status_code=415, detail="PDF only")
    # Store under uploads/advisory-docs/users/{safe_email}/resume-YYYYMMDDHHMMSS.pdf
    safe_email = email.replace("/", "_").replace("\\", "_").replace("@", "_at_")
    base = Path("uploads") / "advisory-docs" / "users" / safe_email
    base.mkdir(parents=True, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    out_path = base / f"resume-{ts}.pdf"
    with out_path.open("wb") as out:
        contents = await file.read()
        out.write(contents)
    rel_url = str(out_path.as_posix())
    db.execute(sa_text("UPDATE advisory_students SET resume_url = :u, updated_at = datetime('now') WHERE lower(email) = :em"), {"u": rel_url, "em": email.lower()})
    db.commit()
    return {"resume_url": rel_url}
