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
    # Header override (for tests/dev) - handle case-insensitive retrieval
    if not email:
        email = request.headers.get("X-Student-Email") or request.headers.get("x-student-email")
    # Query param fallback
    if not email:
        try:
            email = request.query_params.get("email")
        except Exception:
            pass
    return email.lower() if isinstance(email, str) else None


def _check_domain(email: str, allow_all_for_applications: bool = False) -> bool:
    # Prefer explicit student domains; fall back to ALLOWED_EMAIL_DOMAINS; reasonable default if empty
    domain = (email.split("@",1)[1] if "@" in email else "").lower()
    # If ALLOWED_STUDENT_DOMAINS is explicitly set (even empty), use it.
    # Otherwise, fall back to ALLOWED_EMAIL_DOMAINS. Empty string => allow all.
    if "ALLOWED_STUDENT_DOMAINS" in os.environ:
        raw = os.environ.get("ALLOWED_STUDENT_DOMAINS", "")
        # Explicitly empty: allow-all on applications, else fall back to ALLOWED_EMAIL_DOMAINS/UC list
        if raw == "":
            if allow_all_for_applications:
                return True
            else:
                raw = None  # fall through to next branch
    else:
        raw = os.environ.get("ALLOWED_EMAIL_DOMAINS", "")
    default_if_empty = True
    if not raw:
        # Reasonable default domains (UC + advisory) for tests/dev
        allowed = [
            'berkeley.edu','ucla.edu','ucsd.edu','uci.edu','ucdavis.edu','ucsb.edu','ucsc.edu','ucr.edu','ucmerced.edu','ngicapitaladvisory.com'
        ]
        return (domain in allowed) if domain else default_if_empty
    allowed = [e.strip().lower() for e in raw.split(",") if e.strip()]
    domain = (email.split("@",1)[1] if "@" in email else "").lower()
    return domain in allowed if allowed else default_if_empty

def _ensure_student_telemetry(db: Session) -> None:
    try:
        db.execute(sa_text(
            """
            CREATE TABLE IF NOT EXISTS student_telemetry_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT,
                event TEXT NOT NULL,
                payload_json TEXT,
                ts TEXT DEFAULT (datetime('now'))
            )
            """
        ))
        db.commit()
    except Exception:
        pass


# -------- Public Projects (no auth required) --------
@router.get("/projects")
async def public_projects(
    q: Optional[str] = None,
    tags: Optional[str] = None,
    sort: Optional[str] = None,
    mode: Optional[str] = None,
    location: Optional[str] = None,
    limit: Optional[int] = 20,
    offset: Optional[int] = 0,
    db: Session = Depends(get_db),
):
    _ensure_tables(db)
    where = ["COALESCE(is_public,1) = 1", "lower(status) IN ('active','closed')"]
    params: Dict[str, Any] = {}
    if q:
        where.append("(lower(project_name) LIKE :q OR lower(client_name) LIKE :q OR lower(summary) LIKE :q)")
        params["q"] = f"%{q.strip().lower()}%"
    if mode:
        where.append("lower(COALESCE(mode,'')) = :mode")
        params["mode"] = mode.strip().lower()
    if location:
        where.append("(lower(COALESCE(location_text,'')) LIKE :loc)")
        params["loc"] = f"%{location.strip().lower()}%"
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
        "SELECT p.id, p.project_name, p.client_name, p.summary, p.hero_image_url, p.tags, p.partner_badges, p.backer_badges, p.start_date, p.allow_applications, p.coffeechat_calendly, "
        "p.status, p.mode, p.location_text, "
        "(SELECT COUNT(1) FROM advisory_applications a WHERE a.target_project_id = p.id) AS applied_count "
        "FROM advisory_projects p WHERE " + " AND ".join(where)
    )
    # Sorting: name | newest (default)
    s = (sort or '').strip().lower()
    if s == 'name':
        sql += " ORDER BY lower(project_name) ASC, id ASC"
    elif s == 'applied':
        sql += " ORDER BY applied_count DESC, datetime(COALESCE(start_date, created_at)) DESC, id DESC"
    else:
        sql += " ORDER BY datetime(COALESCE(start_date, created_at)) DESC, id DESC"
    # Pagination
    try:
        limit = max(1, min(100, int(limit or 20)))
    except Exception:
        limit = 20
    try:
        offset = max(0, int(offset or 0))
    except Exception:
        offset = 0
    sql += " LIMIT :limit OFFSET :offset"
    params["limit"], params["offset"] = limit, offset
    rows = db.execute(sa_text(sql), params).fetchall()
    import json as _json
    out = []
    for r in rows:
        out.append({
            "id": r[0], "project_name": r[1], "client_name": r[2], "summary": r[3],
            "hero_image_url": r[4], "tags": (_json.loads(r[5]) if r[5] else []),
            "partner_badges": (_json.loads(r[6]) if r[6] else []), "backer_badges": (_json.loads(r[7]) if r[7] else []),
            "start_date": r[8], "allow_applications": int(r[9] or 0), "coffeechat_calendly": r[10],
            "status": r[11], "mode": r[12], "location_text": r[13], "applied_count": int(r[14] or 0),
        })
    return out


@router.get("/projects/{pid}")
async def public_project_detail(pid: int, db: Session = Depends(get_db)):
    _ensure_tables(db)
    row = db.execute(sa_text(
        "SELECT id, project_name, client_name, summary, description, hero_image_url, gallery_urls, tags, partner_badges, backer_badges, allow_applications, coffeechat_calendly, "
        "status, mode, location_text, start_date, end_date, duration_weeks, commitment_hours_per_week, team_size, team_requirements, showcase_pdf_url "
        "FROM advisory_projects WHERE id = :id AND COALESCE(is_public,1) = 1 AND lower(status) IN ('active','closed')"
    ), {"id": pid}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    import json as _json
    detail = {
        "id": row[0], "project_name": row[1], "client_name": row[2], "summary": row[3], "description": row[4],
        "hero_image_url": row[5], "gallery_urls": (_json.loads(row[6]) if row[6] else []),
        "tags": (_json.loads(row[7]) if row[7] else []), "partner_badges": (_json.loads(row[8]) if row[8] else []),
        "backer_badges": (_json.loads(row[9]) if row[9] else []), "allow_applications": int(row[10] or 0),
        "coffeechat_calendly": row[11], "status": row[12], "mode": row[13], "location_text": row[14],
        "start_date": row[15], "end_date": row[16], "duration_weeks": row[17], "commitment_hours_per_week": row[18],
        "team_size": row[19], "team_requirements": row[20], "showcase_pdf_url": row[21],
    }
    # Questions
    try:
        qrows = db.execute(sa_text("SELECT idx, prompt FROM advisory_project_questions WHERE project_id = :id ORDER BY idx ASC"), {"id": pid}).fetchall()
        detail["questions"] = [{"idx": r[0], "prompt": r[1]} for r in qrows]
    except Exception:
        detail["questions"] = []
    return detail


# -------- Student-scoped endpoints (requires UC domain email) --------
@router.post("/applications")
async def create_public_application(payload: Dict[str, Any], request: Request, db: Session = Depends(get_db)):
    _ensure_tables(db)
    email = _extract_student_email(request) or (payload.get("email") if isinstance(payload.get("email"), str) else None)
    if not email or not _check_domain(email, allow_all_for_applications=True):
        raise HTTPException(status_code=403, detail="Student email with allowed domain required")
    # Ensure student record
    try:
        db.execute(sa_text(
            "INSERT OR IGNORE INTO advisory_students (entity_id, first_name, last_name, email, status, created_at, updated_at) "
            "VALUES (NULL, :fn, :ln, :em, 'prospect', datetime('now'), datetime('now'))"
        ), {"fn": payload.get("first_name"), "ln": payload.get("last_name"), "em": email})
    except Exception:
        pass
    # Insert application (answers optional)
    import json as _json
    answers_json = None
    try:
        if isinstance(payload.get("answers"), list):
            answers_json = _json.dumps(payload.get("answers"))
    except Exception:
        answers_json = None
    db.execute(sa_text(
        "INSERT INTO advisory_applications (entity_id, source, target_project_id, first_name, last_name, email, school, program, resume_url, notes, answers_json, status, created_at) "
        "VALUES (NULL, 'form', :tp, :fn, :ln, :em, :sc, :pr, :ru, :nt, :aj, 'new', datetime('now'))"
    ), {"tp": payload.get("target_project_id"), "fn": payload.get("first_name"), "ln": payload.get("last_name"), "em": email,
        "sc": payload.get("school"), "pr": payload.get("program"), "ru": payload.get("resume_url"), "nt": payload.get("notes"), "aj": answers_json})
    rid = db.execute(sa_text("SELECT last_insert_rowid()")).scalar()  # type: ignore
    db.commit()
    return {"id": int(rid or 0)}


@router.get("/applications/mine")
async def my_applications(request: Request, db: Session = Depends(get_db)):
    _ensure_tables(db)
    email = _extract_student_email(request)
    if not email:
        return {"id": aid, "seen": True}
    # Ensure seen table exists for update badges
    try:
        db.execute(sa_text("CREATE TABLE IF NOT EXISTS advisory_applications_seen (application_id INTEGER, email TEXT, last_seen_at TEXT, UNIQUE(application_id, email))"))
        db.commit()
    except Exception:
        pass
    rows = db.execute(sa_text(
        "SELECT a.id, a.target_project_id, a.status, a.created_at, COALESCE(p.project_name,'') as project_name "
        "FROM advisory_applications a LEFT JOIN advisory_projects p ON p.id = a.target_project_id "
        "WHERE lower(a.email) = :em ORDER BY datetime(a.created_at) DESC"
    ), {"em": email.lower()}).fetchall()
    out = []
    for r in rows:
        aid = int(r[0]); updated_at = r[3]
        seen = db.execute(sa_text("SELECT last_seen_at FROM advisory_applications_seen WHERE application_id = :a AND lower(email) = :em"), {"a": aid, "em": email.lower()}).fetchone()
        last_seen = (seen[0] if seen else None)
        has_updates = False
        try:
            if updated_at and last_seen:
                has_updates = (datetime.fromisoformat(str(updated_at)) > datetime.fromisoformat(str(last_seen)))
            elif updated_at and not last_seen:
                has_updates = True
        except Exception:
            has_updates = False
        out.append({
            "id": aid, "target_project_id": r[1], "status": r[2], "created_at": r[3], "updated_at": updated_at, "has_updates": has_updates,
            "project_name": r[4],
        })
    return out

@router.get("/applications/archived")
async def archived_applications_mine(request: Request, db: Session = Depends(get_db)):
    _ensure_tables(db)
    email = _extract_student_email(request)
    if not email or not _check_domain(email, allow_all_for_applications=True):
        raise HTTPException(status_code=403, detail="Student email with allowed domain required")
    try:
        rows = db.execute(sa_text(
            "SELECT id, original_id, email, snapshot_json, archived_at, reason FROM advisory_applications_archived WHERE lower(email) = :em ORDER BY datetime(archived_at) DESC"
        ), {"em": email.lower()}).fetchall()
    except Exception:
        rows = []
    out = []
    import json as _json
    for r in rows:
        snap = {}
        try:
            snap = _json.loads(r[3] or "{}")
        except Exception:
            snap = {}
        out.append({
            "id": r[1],
            "archived_id": r[0],
            "project_id": snap.get("target_project_id"),
            "status": (snap.get("status") or r[5] or "archived"),
            "archived_at": r[4],
            "reason": r[5] or "archived",
        })
    return out

@router.get("/applications/{aid}")
async def application_detail(aid: int, request: Request, db: Session = Depends(get_db)):
    _ensure_tables(db)
    email = _extract_student_email(request)
    if not email or not _check_domain(email, allow_all_for_applications=True):
        raise HTTPException(status_code=403, detail="Student email with allowed domain required")
    row = db.execute(sa_text(
        "SELECT id, email, target_project_id, status, created_at, resume_url, answers_json FROM advisory_applications WHERE id = :id"
    ), {"id": aid}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    if str(row[1] or '').lower() != email.lower():
        raise HTTPException(status_code=403, detail="Forbidden")
    import json as _json
    answers = []
    try:
        raw = row[6]
        if raw:
            val = _json.loads(raw)
            if isinstance(val, dict):
                answers = [{"prompt": k, "response": v} for k, v in val.items()]
            elif isinstance(val, list):
                answers = val
    except Exception:
        answers = []
    return {
        "id": row[0], "project_id": row[2], "status": row[3], "submitted_at": row[4],
        "resume_url_snapshot": row[5], "answers": answers,
    }

@router.post("/applications/{aid}/withdraw")
async def application_withdraw(aid: int, request: Request, db: Session = Depends(get_db)):
    _ensure_tables(db)
    email = _extract_student_email(request)
    if not email or not _check_domain(email, allow_all_for_applications=True):
        raise HTTPException(status_code=403, detail="Student email with allowed domain required")
    app_row = db.execute(sa_text("SELECT id, email, status FROM advisory_applications WHERE id = :id"), {"id": aid}).fetchone()
    if not app_row:
        raise HTTPException(status_code=404, detail="Not found")
    if str(app_row[1] or '').lower() != email.lower():
        raise HTTPException(status_code=403, detail="Forbidden")
    db.execute(sa_text("UPDATE advisory_applications SET status = 'withdrawn' WHERE id = :id"), {"id": aid})
    try:
        db.execute(sa_text("INSERT INTO advisory_applications_archived (original_id, email, snapshot_json, archived_at, reason) VALUES (:oid, :em, '{}', datetime('now'), 'withdrawn')"), {"oid": aid, "em": email})
    except Exception:
        pass
    db.commit(); return {"id": aid, "status": "withdrawn"}

@router.post("/applications/{aid}/seen")
async def application_seen(aid: int, request: Request, db: Session = Depends(get_db)):
    _ensure_tables(db)
    email = _extract_student_email(request)
    if not email or not _check_domain(email, allow_all_for_applications=True):
        raise HTTPException(status_code=403, detail="Student email with allowed domain required")
    try:
        db.execute(sa_text("CREATE TABLE IF NOT EXISTS advisory_applications_seen (application_id INTEGER, email TEXT, last_seen_at TEXT, UNIQUE(application_id, email))"))
        db.commit()
    except Exception:
        pass
    exists = db.execute(sa_text("SELECT 1 FROM advisory_applications_seen WHERE application_id = :a AND lower(email) = :em"), {"a": aid, "em": email.lower()}).fetchone()
    if exists:
        db.execute(sa_text("UPDATE advisory_applications_seen SET last_seen_at = datetime('now') WHERE application_id = :a AND lower(email) = :em"), {"a": aid, "em": email.lower()})
    else:
        db.execute(sa_text("INSERT INTO advisory_applications_seen (application_id, email, last_seen_at) VALUES (:a, :em, datetime('now'))"), {"a": aid, "em": email.lower()})
    db.commit(); return {"id": aid, "seen": True}


 


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
    # Add student profile columns if missing (idempotent)
    add_cols = (
        "ALTER TABLE advisory_students ADD COLUMN resume_url TEXT",
        "ALTER TABLE advisory_students ADD COLUMN theme TEXT",
        "ALTER TABLE advisory_students ADD COLUMN learning_notify INTEGER DEFAULT 0",
        "ALTER TABLE advisory_students ADD COLUMN phone TEXT",
        "ALTER TABLE advisory_students ADD COLUMN linkedin_url TEXT",
        "ALTER TABLE advisory_students ADD COLUMN gpa REAL",
        "ALTER TABLE advisory_students ADD COLUMN location TEXT",
        # grad_year exists in base schema but keep safe add
        "ALTER TABLE advisory_students ADD COLUMN grad_year INTEGER",
        # Some test schemas may lack these base columns
        "ALTER TABLE advisory_students ADD COLUMN school TEXT",
        "ALTER TABLE advisory_students ADD COLUMN program TEXT",
    )
    for sql in add_cols:
        try:
            db.execute(sa_text(sql))
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
        "SELECT id, first_name, last_name, email, school, program, grad_year, phone, linkedin_url, gpa, location, resume_url, theme, learning_notify, created_at, updated_at "
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
            "SELECT id, first_name, last_name, email, school, program, grad_year, phone, linkedin_url, gpa, location, resume_url, theme, learning_notify, created_at, updated_at "
            "FROM advisory_students WHERE lower(email) = :em"
        ), {"em": email.lower()}).fetchone()
    return {
        "id": row[0],
        "first_name": row[1],
        "last_name": row[2],
        "email": row[3],
        "school": row[4],
        "program": row[5],
        "grad_year": row[6],
        "phone": row[7],
        "linkedin_url": row[8],
        "gpa": row[9],
        "location": row[10],
        "resume_url": row[11],
        "theme": row[12],
        "learning_notify": bool(row[13] or 0),
        "created_at": row[14],
        "updated_at": row[15],
    }


@router.patch("/profile")
async def update_profile(payload: Dict[str, Any], request: Request, db: Session = Depends(get_db)):
    _ensure_tables(db)
    _ensure_student_profile_cols(db)
    email = _extract_student_email(request) or (payload.get("email") if isinstance(payload.get("email"), str) else None)
    if not email or not _check_domain(email, allow_all_for_applications=True):
        raise HTTPException(status_code=403, detail="Student email with allowed domain required")
    fields = []
    params: Dict[str, Any] = {"em": email.lower()}
    # Basic text fields
    for key in ("first_name", "last_name", "school", "program", "theme", "location"):
        if key in payload:
            fields.append(f"{key} = :{key}")
            params[key] = payload[key]
    # Boolean-ish
    if "learning_notify" in payload:
        fields.append("learning_notify = :ln")
        params["ln"] = 1 if (payload.get("learning_notify") in (True, 1, "1", "true")) else 0
    # Allow clearing resume via PATCH (upload handled separately)
    if "resume_url" in payload:
        if payload.get("resume_url") not in (None, ""):
            raise HTTPException(status_code=422, detail="Resume URL is managed by upload endpoint")
        fields.append("resume_url = NULL")
    # Phone (E.164 light validation)
    if "phone" in payload:
        phone = str(payload.get("phone") or "").strip()
        if phone and not __import__("re").match(r"^\+?[1-9]\d{7,14}$", phone):
            raise HTTPException(status_code=422, detail="Invalid phone format (E.164)")
        fields.append("phone = :phone"); params["phone"] = (phone or None)
    # LinkedIn URL (basic URL validation)
    if "linkedin_url" in payload:
        ln = str(payload.get("linkedin_url") or "").strip()
        if ln:
            try:
                from urllib.parse import urlparse
                pu = urlparse(ln)
                if not pu.scheme or not pu.netloc:
                    raise ValueError()
            except Exception:
                raise HTTPException(status_code=422, detail="Invalid LinkedIn URL")
        fields.append("linkedin_url = :linkedin_url"); params["linkedin_url"] = (ln or None)
    # GPA 0.0 - 4.0
    if "gpa" in payload:
        try:
            g = float(payload.get("gpa")) if payload.get("gpa") is not None else None
        except Exception:
            raise HTTPException(status_code=422, detail="Invalid GPA")
        if g is not None and (g < 0.0 or g > 4.0):
            raise HTTPException(status_code=422, detail="GPA must be between 0.0 and 4.0")
        fields.append("gpa = :gpa"); params["gpa"] = g
    # Grad year reasonable bounds
    if "grad_year" in payload:
        gy = payload.get("grad_year")
        if gy is not None:
            try:
                gy = int(gy)
            except Exception:
                raise HTTPException(status_code=422, detail="Invalid grad_year")
            if gy < 1900 or gy > 2100:
                raise HTTPException(status_code=422, detail="Invalid grad_year range")
        fields.append("grad_year = :grad_year"); params["grad_year"] = gy
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
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    out_path = base / f"resume-{ts}.pdf"
    with out_path.open("wb") as out:
        contents = await file.read()
        out.write(contents)
    rel_url = str(out_path.as_posix())
    db.execute(sa_text("UPDATE advisory_students SET resume_url = :u, updated_at = datetime('now') WHERE lower(email) = :em"), {"u": rel_url, "em": email.lower()})
    db.commit()
    return {"resume_url": rel_url}


@router.post("/telemetry/event")
async def post_student_event(payload: Dict[str, Any], request: Request, db: Session = Depends(get_db)):
    _ensure_student_telemetry(db)
    evt = (payload.get("event") or "").strip().lower()
    if not evt:
        raise HTTPException(status_code=422, detail="event required")
    email = _extract_student_email(request)
    try:
        import json as _json
        pj = _json.dumps(payload.get("payload") or {})
        db.execute(sa_text("INSERT INTO student_telemetry_events (email,event,payload_json) VALUES (:em,:ev,:pl)"), {"em": (email or None), "ev": evt, "pl": pj})
        db.commit()
    except Exception:
        pass
    return {"ok": True}
