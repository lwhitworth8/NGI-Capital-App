from fastapi import APIRouter, Depends, HTTPException, UploadFile, Body, File, Request
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text
from datetime import datetime
from pathlib import Path

from src.api.database import get_db
from .advisory import require_ngiadvisory_admin, _ensure_tables
from src.api.integrations import google_calendar as gcal

router = APIRouter()
public_router = APIRouter()


def _ensure_plm_tables(db: Session):
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS project_milestones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            title TEXT,
            start_date TEXT,
            end_date TEXT,
            ord INTEGER
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS project_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            milestone_id INTEGER,
            title TEXT,
            description TEXT,
            priority TEXT CHECK(priority IN ('low','med','high')) DEFAULT 'med',
            status TEXT CHECK(status IN ('todo','in_progress','review','done','blocked')) DEFAULT 'todo',
            submission_type TEXT CHECK(submission_type IN ('individual','group')) DEFAULT 'individual',
            due_date TEXT,
            planned_hours REAL,
            created_by TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS project_task_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            completed INTEGER DEFAULT 0,
            completed_at TEXT
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS project_task_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            version INTEGER DEFAULT 1,
            kind TEXT CHECK(kind IN ('file','url')) DEFAULT 'file',
            url_or_path TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            is_late INTEGER DEFAULT 0,
            accepted INTEGER DEFAULT 0,
            accepted_at TEXT,
            late_waived INTEGER DEFAULT 0,
            late_waived_by TEXT,
            late_waived_note TEXT,
            late_waived_at TEXT
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS plm_timesheets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            week_start_date TEXT NOT NULL,
            total_hours REAL DEFAULT 0
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS plm_timesheet_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timesheet_id INTEGER NOT NULL,
            task_id INTEGER,
            day TEXT,
            segments TEXT,
            hours REAL
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS project_task_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            author_email TEXT,
            submission_version INTEGER,
            body TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS project_resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            kind TEXT CHECK(kind IN ('package','link')) DEFAULT 'package',
            title TEXT,
            url_or_path TEXT,
            version INTEGER DEFAULT 1,
            created_by TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS project_meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            google_event_id TEXT,
            title TEXT,
            start_ts TEXT,
            end_ts TEXT,
            attendees_emails TEXT,
            created_by TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    db.commit()
    # Non-destructive evolutions for older DBs
    for ddl in [
        "ALTER TABLE project_task_assignments ADD COLUMN completed INTEGER DEFAULT 0",
        "ALTER TABLE project_task_assignments ADD COLUMN completed_at TEXT",
        "ALTER TABLE project_task_submissions ADD COLUMN accepted INTEGER DEFAULT 0",
        "ALTER TABLE project_task_submissions ADD COLUMN accepted_at TEXT",
        "ALTER TABLE project_task_submissions ADD COLUMN late_waived INTEGER DEFAULT 0",
        "ALTER TABLE project_task_submissions ADD COLUMN late_waived_by TEXT",
        "ALTER TABLE project_task_submissions ADD COLUMN late_waived_note TEXT",
        "ALTER TABLE project_task_submissions ADD COLUMN late_waived_at TEXT",
    ]:
        try:
            db.execute(sa_text(ddl))
            db.commit()
        except Exception:
            db.rollback()


@router.post("/projects/{pid}/milestones")
async def create_milestone(pid: int, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    db.execute(sa_text("INSERT INTO project_milestones (project_id, title, start_date, end_date, ord) VALUES (:p,:t,:s,:e,:o)"), {"p": pid, "t": payload.get('title'), "s": payload.get('start_date'), "e": payload.get('end_date'), "o": int(payload.get('ord') or 0)})
    rid = db.execute(sa_text("SELECT last_insert_rowid()"), {}).scalar() or 0
    db.commit(); return {"id": int(rid)}

@router.get("/projects/{pid}/milestones")
async def list_milestones(pid: int, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    rows = db.execute(sa_text("SELECT id, title, start_date, end_date, ord FROM project_milestones WHERE project_id = :p ORDER BY ord, id"), {"p": pid}).fetchall()
    return [
        {"id": r[0], "title": r[1], "start_date": r[2], "end_date": r[3], "ord": r[4]}
        for r in rows
    ]

@router.patch("/milestones/{mid}")
async def update_milestone(mid: int, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    sets=[]; params={"id": mid}
    for k in ("title","start_date","end_date","ord"):
        if k in payload:
            sets.append(f"{k} = :{k}"); params[k] = payload.get(k)
    if sets:
        db.execute(sa_text("UPDATE project_milestones SET "+", ".join(sets)+" WHERE id = :id"), params)
        db.commit()
    return {"id": mid}

@router.delete("/milestones/{mid}")
async def delete_milestone(mid: int, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    # Clear milestone on tasks referencing it, then delete
    db.execute(sa_text("UPDATE project_tasks SET milestone_id = NULL WHERE milestone_id = :m"), {"m": mid})
    db.execute(sa_text("DELETE FROM project_milestones WHERE id = :id"), {"id": mid})
    db.commit(); return {"deleted": True}


@router.get("/projects/{pid}/tasks")
async def list_tasks(pid: int, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    rows = db.execute(sa_text("SELECT id, milestone_id, title, description, priority, status, submission_type, due_date, planned_hours, created_by, created_at FROM project_tasks WHERE project_id = :p ORDER BY id DESC"), {"p": pid}).fetchall()
    out = []
    for r in rows:
        assignees = db.execute(sa_text("SELECT student_id FROM project_task_assignments WHERE task_id = :t"), {"t": r[0]}).fetchall()
        out.append({
            "id": r[0], "milestone_id": r[1], "title": r[2], "description": r[3], "priority": r[4], "status": r[5], "submission_type": r[6], "due_date": r[7], "planned_hours": r[8], "created_by": r[9], "created_at": r[10],
            "assignees": [a[0] for a in assignees]
        })
    return out


@router.post("/projects/{pid}/tasks")
async def create_task(pid: int, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    db.execute(sa_text("INSERT INTO project_tasks (project_id, milestone_id, title, description, priority, status, submission_type, due_date, planned_hours, created_by, created_at) VALUES (:p,:m,:t,:d,:pr,:st,:sb,:dd,:ph,:cb,:ca)"), {
        "p": pid, "m": payload.get('milestone_id'), "t": payload.get('title'), "d": payload.get('description'), "pr": (payload.get('priority') or 'med'), "st": (payload.get('status') or 'todo'), "sb": (payload.get('submission_type') or 'individual'), "dd": payload.get('due_date'), "ph": payload.get('planned_hours'), "cb": (admin or {}).get('email'), "ca": datetime.utcnow().isoformat()
    })
    tid = db.execute(sa_text("SELECT last_insert_rowid()"), {}).scalar() or 0
    # Assign
    try:
        for sid in (payload.get('assignees') or []):
            db.execute(sa_text("INSERT INTO project_task_assignments (task_id, student_id) VALUES (:t,:s)"), {"t": tid, "s": int(sid)})
    except Exception:
        pass
    db.commit(); return {"id": int(tid)}


@router.patch("/tasks/{tid}")
async def update_task(tid: int, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    sets=[]; params={"id": tid}
    for k in ("title","description","priority","status","submission_type","due_date","planned_hours","milestone_id"):
        if k in payload:
            sets.append(f"{k} = :{k}"); params[k] = payload.get(k)
    if sets:
        db.execute(sa_text("UPDATE project_tasks SET "+", ".join(sets)+", updated_at = datetime('now') WHERE id = :id"), params)
    if 'assignees' in payload:
        db.execute(sa_text("DELETE FROM project_task_assignments WHERE task_id = :t"), {"t": tid})
        for sid in (payload.get('assignees') or []):
            db.execute(sa_text("INSERT INTO project_task_assignments (task_id, student_id) VALUES (:t,:s)"), {"t": tid, "s": int(sid)})
    db.commit(); return {"id": tid}


@router.post("/tasks/{tid}/submit")
async def submit_task(
    tid: int,
    payload: Dict[str, Any] | None = Body(default=None),
    file: UploadFile | None = File(default=None),
    request: Request = None,
    db: Session = Depends(get_db),
):
    _ensure_tables(db); _ensure_plm_tables(db)
    # Accept JSON body or multipart form with a 'payload' field
    if not payload:
        try:
            payload = await request.json()  # type: ignore
        except Exception:
            try:
                form = await request.form()  # type: ignore
                raw = form.get('payload')
                if isinstance(raw, str):
                    import json as _json
                    try:
                        payload = _json.loads(raw)
                    except Exception:
                        payload = {}
                elif raw:
                    payload = dict(raw)
                else:
                    payload = {}
            except Exception:
                payload = {}
    payload = payload or {}
    student_email = payload.get('email')
    kind = (payload.get('kind') or ('url' if (payload.get('url') and not file) else 'file')).lower()
    url_or_path = None
    if kind == 'file' and file is not None:
        base = Path('uploads')/ 'project-tasks' / str(tid)
        base.mkdir(parents=True, exist_ok=True)
        name = Path(file.filename or 'file.bin').name
        content = await file.read()  # type: ignore
        if content and len(content) > 500 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File exceeds 500 MB limit")
        dest = base / name
        with dest.open('wb') as f:
            f.write(content)
        url_or_path = f"/uploads/project-tasks/{tid}/{name}"
    elif kind == 'url':
        url_or_path = payload.get('url')
    else:
        raise HTTPException(status_code=422, detail="Invalid submission")
    sid = None
    if student_email:
        row = db.execute(sa_text("SELECT id FROM advisory_students WHERE lower(email) = :em"), {"em": str(student_email or '').lower()}).fetchone()
        sid = int(row[0]) if row else None
    if sid is None:
        raise HTTPException(status_code=400, detail="student email required")
    vrow = db.execute(sa_text("SELECT COALESCE(MAX(version),0)+1 FROM project_task_submissions WHERE task_id = :t AND student_id = :s"), {"t": tid, "s": sid}).fetchone()
    ver = int(vrow[0] or 1)
    is_late = 0
    try:
        due = db.execute(sa_text("SELECT due_date FROM project_tasks WHERE id = :id"), {"id": tid}).fetchone()
        if due and due[0]:
            is_late = 1 if datetime.utcnow().isoformat() > str(due[0]) else 0
    except Exception:
        is_late = 0
    db.execute(sa_text("INSERT INTO project_task_submissions (task_id, student_id, version, kind, url_or_path, created_at, is_late) VALUES (:t,:s,:v,:k,:u,datetime('now'),:l)"), {"t": tid, "s": sid, "v": ver, "k": kind, "u": url_or_path, "l": is_late})
    db.commit(); return {"task_id": tid, "version": ver, "kind": kind}


@public_router.post("/tasks/{tid}/submit")
async def submit_task_public(tid: int, payload: Dict[str, Any] | None = Body(default=None), file: UploadFile | None = File(default=None), request: Request = None, db: Session = Depends(get_db)):
    # Reuse admin path logic by calling the same implementation body
    return await submit_task(tid, payload, file, request, db)


@router.post("/tasks/{tid}/comments")
async def add_comment(tid: int, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    body = (payload.get('body') or '').strip()
    if not body:
        raise HTTPException(status_code=422, detail="body required")
    db.execute(sa_text(
        "INSERT INTO project_task_comments (task_id, author_email, submission_version, body) VALUES (:t,:e,:v,:b)"
    ), {"t": tid, "e": (admin or {}).get('email'), "v": payload.get('submission_version'), "b": body})
    cid = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0)
    db.commit(); return {"id": cid}


@router.get("/tasks/{tid}/comments")
async def list_comments(tid: int, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    rows = db.execute(sa_text("SELECT id, author_email, submission_version, body, created_at FROM project_task_comments WHERE task_id = :t ORDER BY id DESC"), {"t": tid}).fetchall()
    return [
        {"id": r[0], "author_email": r[1], "submission_version": r[2], "body": r[3], "created_at": r[4]}
        for r in rows
    ]


@router.post("/projects/{pid}/resources")
async def upload_resource(pid: int, request: Request, title: Optional[str] = None, kind: Optional[str] = None, url: Optional[str] = None, file: UploadFile | None = File(default=None), admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    k = (kind or ('link' if (url and not file) else 'package')).lower()
    if k not in ('package','link'):
        raise HTTPException(status_code=422, detail="invalid kind")
    path_or_url: Optional[str] = None
    if k == 'link':
        if not url:
            raise HTTPException(status_code=422, detail="url required for link resource")
        path_or_url = url
    else:
        if file is None:
            raise HTTPException(status_code=422, detail="file required for package resource")
        base = Path('uploads')/ 'project-resources' / str(pid)
        base.mkdir(parents=True, exist_ok=True)
        name = Path(file.filename or 'resource.bin').name
        content = await file.read()  # type: ignore
        if content and len(content) > 500 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File exceeds 500 MB limit")
        dest = base / name
        with dest.open('wb') as f:
            f.write(content)
        path_or_url = f"/uploads/project-resources/{pid}/{name}"
    db.execute(sa_text(
        "INSERT INTO project_resources (project_id, kind, title, url_or_path, version, created_by) VALUES (:p,:k,:t,:u,1,:e)"
    ), {"p": pid, "k": k, "t": title or '', "u": path_or_url, "e": (admin or {}).get('email')})
    rid = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0)
    db.commit(); return {"id": rid, "kind": k}


@router.get("/projects/{pid}/resources")
async def list_resources(pid: int, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    rows = db.execute(sa_text("SELECT id, kind, title, url_or_path, version, created_by, created_at FROM project_resources WHERE project_id = :p ORDER BY id DESC"), {"p": pid}).fetchall()
    return [
        {"id": r[0], "kind": r[1], "title": r[2], "url_or_path": r[3], "version": r[4], "created_by": r[5], "created_at": r[6]}
        for r in rows
    ]


@router.post("/projects/{pid}/meetings")
async def create_meeting(pid: int, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    title = (payload.get('title') or 'Project Meeting').strip()
    start_ts = payload.get('start_ts') or ''
    end_ts = payload.get('end_ts') or ''
    attendees = payload.get('attendees_emails') or []
    if not (start_ts and end_ts):
        raise HTTPException(status_code=422, detail="start_ts and end_ts required")
    owner = (admin or {}).get('email') or ''
    try:
        evt = gcal.create_event(owner_email=owner, start_ts=start_ts, end_ts=end_ts, student_email=(attendees[0] if attendees else owner), summary=title, description='')
    except Exception:
        evt = {"id": None}
    import json as _json
    db.execute(sa_text(
        "INSERT INTO project_meetings (project_id, google_event_id, title, start_ts, end_ts, attendees_emails, created_by) VALUES (:p,:g,:t,:s,:e,:a,:by)"
    ), {"p": pid, "g": evt.get('id'), "t": title, "s": start_ts, "e": end_ts, "a": _json.dumps(attendees or []), "by": owner})
    mid = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0)
    db.commit(); return {"id": mid, "google_event_id": evt.get('id')}


@router.get("/projects/{pid}/meetings")
async def list_meetings(pid: int, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    rows = db.execute(sa_text("SELECT id, google_event_id, title, start_ts, end_ts, attendees_emails, created_by, created_at FROM project_meetings WHERE project_id = :p ORDER BY id DESC"), {"p": pid}).fetchall()
    out = []
    import json as _json
    for r in rows:
        emails = []
        try:
            emails = _json.loads(r[5] or '[]')
        except Exception:
            emails = []
        out.append({
            "id": r[0], "google_event_id": r[1], "title": r[2], "start_ts": r[3], "end_ts": r[4],
            "attendees_emails": emails, "created_by": r[6], "created_at": r[7]
        })
    return out


@router.post("/tasks/{tid}/accept")
async def accept_submission(tid: int, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    """Accept latest submission for a student (or infer if single assignee). Marks completion per submission_type."""
    _ensure_tables(db); _ensure_plm_tables(db)
    student_id = payload.get('student_id')
    version = payload.get('version')
    # Resolve student
    if not student_id:
        row = db.execute(sa_text("SELECT student_id FROM project_task_assignments WHERE task_id = :t ORDER BY id LIMIT 1"), {"t": tid}).fetchone()
        if not row:
            raise HTTPException(status_code=422, detail="student_id required")
        student_id = int(row[0])
    # Pick submission
    if version:
        sub = db.execute(sa_text("SELECT id FROM project_task_submissions WHERE task_id = :t AND student_id = :s AND version = :v"), {"t": tid, "s": int(student_id), "v": int(version)}).fetchone()
    else:
        sub = db.execute(sa_text("SELECT id FROM project_task_submissions WHERE task_id = :t AND student_id = :s ORDER BY version DESC LIMIT 1"), {"t": tid, "s": int(student_id)}).fetchone()
    if not sub:
        raise HTTPException(status_code=404, detail="submission not found")
    sid = int(sub[0])
    db.execute(sa_text("UPDATE project_task_submissions SET accepted = 1, accepted_at = datetime('now') WHERE id = :id"), {"id": sid})
    # Determine task type
    task = db.execute(sa_text("SELECT submission_type FROM project_tasks WHERE id = :id"), {"id": tid}).fetchone()
    submission_type = str((task or ['individual'])[0] or 'individual').lower()
    if submission_type == 'group':
        db.execute(sa_text("UPDATE project_task_assignments SET completed = 1, completed_at = datetime('now') WHERE task_id = :t"), {"t": tid})
    else:
        db.execute(sa_text("UPDATE project_task_assignments SET completed = 1, completed_at = datetime('now') WHERE task_id = :t AND student_id = :s"), {"t": tid, "s": int(student_id)})
    db.commit(); return {"accepted": True}


@router.post("/tasks/{tid}/reopen")
async def reopen_task(tid: int, payload: Dict[str, Any] = {}, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    # Clear accepted flags and completion
    db.execute(sa_text("UPDATE project_task_submissions SET accepted = 0, accepted_at = NULL WHERE task_id = :t"), {"t": tid})
    db.execute(sa_text("UPDATE project_task_assignments SET completed = 0, completed_at = NULL WHERE task_id = :t"), {"t": tid})
    db.commit(); return {"reopened": True}


@router.post("/tasks/{tid}/waive-late")
async def waive_late(tid: int, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    student_id = int(payload.get('student_id') or 0)
    note = (payload.get('note') or '').strip()
    if not student_id:
        raise HTTPException(status_code=422, detail="student_id required")
    # Target latest submission for student
    sub = db.execute(sa_text("SELECT id FROM project_task_submissions WHERE task_id = :t AND student_id = :s ORDER BY version DESC LIMIT 1"), {"t": tid, "s": student_id}).fetchone()
    if not sub:
        raise HTTPException(status_code=404, detail="submission not found")
    db.execute(sa_text("UPDATE project_task_submissions SET late_waived = 1, late_waived_by = :by, late_waived_note = :nt, late_waived_at = datetime('now') WHERE id = :id"), {"by": (admin or {}).get('email'), "nt": note, "id": int(sub[0])})
    db.commit(); return {"waived": True}


# ---- Public endpoints (students) ----

@public_router.post("/projects/{pid}/timesheets/{week}/entries")
async def add_timesheet_entry(pid: int, week: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    student_id = int(payload.get('student_id') or 0)
    task_id = int(payload.get('task_id') or 0) if payload.get('task_id') else None
    day = (payload.get('day') or '').strip()
    segments = payload.get('segments') or []
    hours = float(payload.get('hours') or 0)
    if not (student_id and day and week):
        raise HTTPException(status_code=422, detail="student_id, day, week required")
    # Ensure or create timesheet row
    row = db.execute(sa_text("SELECT id FROM plm_timesheets WHERE project_id = :p AND student_id = :s AND week_start_date = :w"), {"p": pid, "s": student_id, "w": week}).fetchone()
    if row:
        ts_id = int(row[0])
    else:
        db.execute(sa_text("INSERT INTO plm_timesheets (project_id, student_id, week_start_date, total_hours) VALUES (:p,:s,:w,0)"), {"p": pid, "s": student_id, "w": week})
        ts_id = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0)
    import json as _json
    db.execute(sa_text("INSERT INTO plm_timesheet_entries (timesheet_id, task_id, day, segments, hours) VALUES (:t,:task,:d,:seg,:h)"), {"t": ts_id, "task": task_id, "d": day, "seg": _json.dumps(segments or []), "h": hours})
    # Recompute total
    row2 = db.execute(sa_text("SELECT COALESCE(SUM(hours),0) FROM plm_timesheet_entries WHERE timesheet_id = :t"), {"t": ts_id}).fetchone()
    total = float((row2 or [0])[0] or 0)
    db.execute(sa_text("UPDATE plm_timesheets SET total_hours = :th WHERE id = :id"), {"th": total, "id": ts_id})
    db.commit(); return {"timesheet_id": ts_id, "total_hours": total}


@public_router.post("/tasks/{tid}/comments")
async def add_comment_public(tid: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    body = (payload.get('body') or '').strip()
    email = (payload.get('email') or '').strip()
    if not (body and email):
        raise HTTPException(status_code=422, detail="email and body required")
    db.execute(sa_text("INSERT INTO project_task_comments (task_id, author_email, submission_version, body) VALUES (:t,:e,:v,:b)"), {"t": tid, "e": email, "v": payload.get('submission_version'), "b": body})
    cid = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0)
    db.commit(); return {"id": cid}


@public_router.get("/my-projects")
async def my_projects(email: Optional[str] = None, db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    em = (email or '').strip().lower()
    if not em:
        # In dev, allow missing email to return empty list
        return []
    rows = db.execute(sa_text(
        """
        SELECT p.id, p.project_code, p.project_name, p.summary
        FROM advisory_projects p
        JOIN advisory_project_assignments a ON a.project_id = p.id
        JOIN advisory_students s ON s.id = a.student_id
        WHERE lower(s.email) = :em AND COALESCE(a.active,1) = 1
        ORDER BY p.id DESC
        """
    ), {"em": em}).fetchall()
    return [{"id": r[0], "project_code": r[1], "project_name": r[2], "summary": r[3]} for r in rows]


@router.get("/projects/{pid}/timesheets")
async def list_timesheets(pid: int, week: Optional[str] = None, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    rows = db.execute(sa_text("SELECT id, student_id, week_start_date, total_hours FROM plm_timesheets WHERE project_id = :p"), {"p": pid}).fetchall()
    out = []
    for r in rows:
        ents = db.execute(sa_text("SELECT task_id, day, segments, hours FROM plm_timesheet_entries WHERE timesheet_id = :i"), {"i": r[0]}).fetchall()
        import json as _json
        entries = []
        for e in ents:
            try:
                seg = _json.loads(e[2] or '[]')
            except Exception:
                seg = []
            entries.append({"task_id": e[0], "day": e[1], "segments": seg, "hours": e[3]})
        out.append({"student_id": r[1], "week_start_date": r[2], "total_hours": r[3], "entries": entries})
    return out


@router.get("/projects/{pid}/deliverables")
async def list_deliverables(pid: int, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    rows = db.execute(sa_text(
        """
        SELECT s.id, s.task_id, s.student_id, s.version, s.kind, s.url_or_path, s.created_at, s.is_late,
               t.title
        FROM project_task_submissions s
        JOIN project_tasks t ON t.id = s.task_id
        WHERE t.project_id = :p
        ORDER BY s.id DESC
        """
    ), {"p": pid}).fetchall()
    return [
        {
            "id": r[0], "task_id": r[1], "student_id": r[2], "version": r[3], "kind": r[4],
            "url_or_path": r[5], "created_at": r[6], "is_late": bool(r[7]), "task_title": r[8]
        }
        for r in rows
    ]


@public_router.get("/projects/{pid}/tasks")
async def list_tasks_public(pid: int, db: Session = Depends(get_db)):
    _ensure_tables(db); _ensure_plm_tables(db)
    rows = db.execute(sa_text("SELECT id, milestone_id, title, description, priority, status, submission_type, due_date, planned_hours FROM project_tasks WHERE project_id = :p ORDER BY id DESC"), {"p": pid}).fetchall()
    return [
        {"id": r[0], "milestone_id": r[1], "title": r[2], "description": r[3], "priority": r[4], "status": r[5], "submission_type": r[6], "due_date": r[7], "planned_hours": r[8]}
        for r in rows
    ]
