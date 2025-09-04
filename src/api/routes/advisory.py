"""
NGI Capital Advisory Management API
Scope: Projects, Students, Applications, Coffee Chats, Onboarding
All endpoints restricted to NGI Advisory admins (Andre, Landon).
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text
from datetime import datetime

from src.api.database import get_db
from src.api.auth import require_partner_access  # reuse existing auth dep without circular import

router = APIRouter()


def require_ngiadvisory_admin():
    import os as _os
    allowed = {
        "lwhitworth@ngicapitaladvisory.com",
        "anurmamade@ngicapitaladvisory.com",
    }
    # Allow override/extension via env
    try:
        extra = _os.getenv('ALLOWED_ADVISORY_ADMINS', '')
        for e in (extra or '').split(','):
            if e and e.strip():
                allowed.add(e.strip().lower())
    except Exception:
        pass

    async def _dep(partner=Depends(require_partner_access())):
        email = (partner or {}).get("email") or ""
        if isinstance(email, str) and email.strip().lower() in allowed:
            return partner
        raise HTTPException(status_code=403, detail="NGI Advisory admin required")

    return _dep


def _ensure_tables(db: Session):
    # Projects
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS advisory_projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            client_name TEXT,
            project_name TEXT,
            summary TEXT,
            description TEXT,
            status TEXT CHECK(status IN ('draft','active','paused','delivered','closed')) DEFAULT 'draft',
            mode TEXT CHECK(mode IN ('remote','in_person','hybrid')) DEFAULT 'remote',
            location_text TEXT,
            start_date TEXT,
            end_date TEXT,
            duration_weeks INTEGER,
            commitment_hours_per_week INTEGER,
            project_code TEXT,
            project_lead TEXT,
            contact_email TEXT,
            partner_badges TEXT,
            backer_badges TEXT,
            tags TEXT,
            hero_image_url TEXT,
            gallery_urls TEXT,
            apply_cta_text TEXT,
            apply_url TEXT,
            eligibility_notes TEXT,
            notes_internal TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    # Students
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS advisory_students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            first_name TEXT,
            last_name TEXT,
            email TEXT UNIQUE,
            school TEXT,
            program TEXT,
            grad_year INTEGER,
            skills TEXT,
            status TEXT CHECK(status IN ('prospect','active','paused','alumni')) DEFAULT 'prospect',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    # Applications
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS advisory_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            source TEXT CHECK(source IN ('form','referral','other')) DEFAULT 'form',
            target_project_id INTEGER,
            first_name TEXT,
            last_name TEXT,
            email TEXT,
            school TEXT,
            program TEXT,
            resume_url TEXT,
            notes TEXT,
            status TEXT CHECK(status IN ('new','reviewing','interview','offer','rejected','withdrawn')) DEFAULT 'new',
            created_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    # Coffee Chats
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS advisory_coffeechats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            provider TEXT CHECK(provider IN ('calendly','manual','other')) DEFAULT 'manual',
            external_id TEXT,
            scheduled_start TEXT,
            scheduled_end TEXT,
            invitee_email TEXT,
            invitee_name TEXT,
            topic TEXT,
            status TEXT CHECK(status IN ('scheduled','completed','canceled')) DEFAULT 'scheduled',
            raw_payload TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    # Project Assignments
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS advisory_project_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            student_id INTEGER,
            role TEXT,
            hours_planned INTEGER,
            active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    # Onboarding: templates and steps
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS advisory_onboarding_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            description TEXT
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS advisory_onboarding_template_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER,
            step_key TEXT,
            title TEXT,
            provider TEXT CHECK(provider IN ('internal','docusign','drive_upload','microsoft_teams','custom_url')) DEFAULT 'internal',
            config TEXT
        )
        """
    ))
    # Onboarding: instances and events
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS advisory_onboarding_instances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            project_id INTEGER,
            template_id INTEGER,
            status TEXT CHECK(status IN ('in_progress','completed','canceled')) DEFAULT 'in_progress',
            created_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS advisory_onboarding_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            instance_id INTEGER,
            step_key TEXT,
            status TEXT CHECK(status IN ('pending','sent','completed','failed')) DEFAULT 'pending',
            evidence_url TEXT,
            external_id TEXT,
            ts TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    db.commit()


# ---------------- Projects -----------------
@router.get("/projects")
async def list_projects(
    entity_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    mode: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    admin=Depends(require_ngiadvisory_admin()),
    db: Session = Depends(get_db),
):
    _ensure_tables(db)
    where = []
    params: Dict[str, Any] = {}
    if entity_id:
        where.append("entity_id = :e"); params["e"] = int(entity_id)
    if status:
        where.append("lower(status) = :s"); params["s"] = status.strip().lower()
    if mode:
        where.append("lower(mode) = :m"); params["m"] = mode.strip().lower()
    if q:
        where.append("(lower(project_name) LIKE :q OR lower(client_name) LIKE :q OR lower(summary) LIKE :q)"); params["q"] = f"%{q.strip().lower()}%"
    sql = "SELECT id, entity_id, client_name, project_name, summary, description, status, mode, location_text, start_date, end_date, duration_weeks, commitment_hours_per_week, project_code, project_lead, contact_email, partner_badges, backer_badges, tags, hero_image_url, gallery_urls, apply_cta_text, apply_url, eligibility_notes, notes_internal FROM advisory_projects"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY datetime(created_at) DESC, id DESC"
    rows = db.execute(sa_text(sql), params).fetchall()
    items = []
    for r in rows:
        (pid, eid, client_name, project_name, summary, description, status, mode, location_text, start_date, end_date, duration_weeks, chpw, pcode, plead, cemail, pbadges, bbadges, tags, hero, gallery, cta, aurl, elig, notes) = r
        def _json(s):
            import json
            try:
                return json.loads(s) if s else []
            except Exception:
                return []
        items.append({
            "id": pid, "entity_id": eid, "client_name": client_name, "project_name": project_name,
            "summary": summary, "description": description, "status": status, "mode": mode,
            "location_text": location_text, "start_date": start_date, "end_date": end_date,
            "duration_weeks": duration_weeks, "commitment_hours_per_week": chpw,
            "project_code": pcode, "project_lead": plead, "contact_email": cemail,
            "partner_badges": _json(pbadges), "backer_badges": _json(bbadges), "tags": _json(tags),
            "hero_image_url": hero, "gallery_urls": _json(gallery), "apply_cta_text": cta,
            "apply_url": aurl, "eligibility_notes": elig, "notes_internal": notes,
        })
    return items


@router.post("/projects")
async def create_project(payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    required = ["project_name", "client_name", "summary"]
    for k in required:
        if not (payload.get(k)):
            raise HTTPException(status_code=422, detail=f"{k} required")
    def _ser(a):
        import json
        if a is None: return None
        if isinstance(a, str): return a
        try: return json.dumps(a)
        except Exception: return None
    db.execute(sa_text(
        """
        INSERT INTO advisory_projects (
            entity_id, client_name, project_name, summary, description, status, mode,
            location_text, start_date, end_date, duration_weeks, commitment_hours_per_week,
            project_code, project_lead, contact_email, partner_badges, backer_badges, tags,
            hero_image_url, gallery_urls, apply_cta_text, apply_url, eligibility_notes, notes_internal, created_at, updated_at
        ) VALUES (
            :eid, :client, :pname, :sum, :desc, :status, :mode,
            :loc, :sd, :ed, :dw, :hpw, :pcode, :lead, :email, :pb, :bb, :tags,
            :hero, :gal, :cta, :aurl, :elig, :notes, :ca, :ua
        )
        """
    ), {
        "eid": int(payload.get("entity_id") or 0) or None,
        "client": payload.get("client_name"),
        "pname": payload.get("project_name"),
        "sum": payload.get("summary"),
        "desc": payload.get("description"),
        "status": (payload.get("status") or "draft").lower(),
        "mode": (payload.get("mode") or "remote").lower(),
        "loc": payload.get("location_text"),
        "sd": payload.get("start_date"),
        "ed": payload.get("end_date"),
        "dw": payload.get("duration_weeks"),
        "hpw": payload.get("commitment_hours_per_week"),
        "pcode": payload.get("project_code"),
        "lead": payload.get("project_lead"),
        "email": payload.get("contact_email"),
        "pb": _ser(payload.get("partner_badges")),
        "bb": _ser(payload.get("backer_badges")),
        "tags": _ser(payload.get("tags")),
        "hero": payload.get("hero_image_url"),
        "gal": _ser(payload.get("gallery_urls")),
        "cta": payload.get("apply_cta_text"),
        "aurl": payload.get("apply_url"),
        "elig": payload.get("eligibility_notes"),
        "notes": payload.get("notes_internal"),
        "ca": datetime.utcnow().isoformat(),
        "ua": datetime.utcnow().isoformat(),
    })
    db.commit()
    rid = db.execute(sa_text("SELECT last_insert_rowid()")).scalar()
    return {"id": int(rid or 0)}


@router.get("/projects/{pid}")
async def get_project(pid: int, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    r = db.execute(sa_text("""
        SELECT id, entity_id, client_name, project_name, summary, description, status, mode, location_text, start_date, end_date, duration_weeks, commitment_hours_per_week, project_code, project_lead, contact_email, partner_badges, backer_badges, tags, hero_image_url, gallery_urls, apply_cta_text, apply_url, eligibility_notes, notes_internal
        FROM advisory_projects WHERE id = :id
    """), {"id": pid}).fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    import json as _json
    def _json_load(s):
        try:
            return _json.loads(s) if s else []
        except Exception:
            return []
    proj = {
        "id": r[0], "entity_id": r[1], "client_name": r[2], "project_name": r[3],
        "summary": r[4], "description": r[5], "status": r[6], "mode": r[7],
        "location_text": r[8], "start_date": r[9], "end_date": r[10],
        "duration_weeks": r[11], "commitment_hours_per_week": r[12],
        "project_code": r[13], "project_lead": r[14], "contact_email": r[15],
        "partner_badges": _json_load(r[16]), "backer_badges": _json_load(r[17]),
        "tags": _json_load(r[18]), "hero_image_url": r[19], "gallery_urls": _json_load(r[20]),
        "apply_cta_text": r[21], "apply_url": r[22], "eligibility_notes": r[23], "notes_internal": r[24],
    }
    # Load assignments
    rows_a = db.execute(sa_text("""
        SELECT a.id, a.student_id, s.first_name, s.last_name, a.role, a.hours_planned, a.active
        FROM advisory_project_assignments a
        LEFT JOIN advisory_students s ON s.id = a.student_id
        WHERE a.project_id = :pid
        ORDER BY a.id DESC
    """), {"pid": pid}).fetchall()
    proj["assignments"] = [
        {"id": ra[0], "student_id": ra[1], "name": ((ra[2] or '') + ' ' + (ra[3] or '')).strip() or None, "role": ra[4], "hours_planned": ra[5], "active": bool(ra[6])}
        for ra in rows_a
    ]
    return proj


@router.put("/projects/{pid}")
async def update_project(pid: int, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    # build dynamic update
    sets = []
    params: Dict[str, Any] = {"id": pid}
    for k in ("client_name","project_name","summary","description","status","mode","location_text","start_date","end_date","duration_weeks","commitment_hours_per_week","project_code","project_lead","contact_email","hero_image_url","apply_cta_text","apply_url","eligibility_notes","notes_internal"):
        if k in payload:
            sets.append(f"{k} = :{k}"); params[k] = payload[k]
    import json as _json
    for jk, col in (("partner_badges","partner_badges"),("backer_badges","backer_badges"),("tags","tags"),("gallery_urls","gallery_urls")):
        if jk in payload:
            try:
                params[col] = _json.dumps(payload[jk]) if not isinstance(payload[jk], str) else payload[jk]
            except Exception:
                params[col] = None
            sets.append(f"{col} = :{col}")
    sets.append("updated_at = :ua"); params["ua"] = datetime.utcnow().isoformat()
    if not sets:
        return {"id": pid}
    db.execute(sa_text("UPDATE advisory_projects SET " + ", ".join(sets) + " WHERE id = :id"), params)
    db.commit(); return {"id": pid}


@router.delete("/projects/{pid}")
async def close_project(pid: int, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    db.execute(sa_text("UPDATE advisory_projects SET status = 'closed', updated_at = :ua WHERE id = :id"), {"id": pid, "ua": datetime.utcnow().isoformat()})
    db.commit(); return {"id": pid, "status": "closed"}


# ---------------- Students -----------------
@router.get("/students")
async def list_students(entity_id: Optional[int] = None, q: Optional[str] = None, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    where = []; params: Dict[str, Any] = {}
    if entity_id:
        where.append("entity_id = :e"); params["e"] = int(entity_id)
    if q:
        where.append("(lower(first_name) LIKE :q OR lower(last_name) LIKE :q OR lower(email) LIKE :q)"); params["q"] = f"%{q.lower()}%"
    sql = "SELECT id, entity_id, first_name, last_name, email, school, program, grad_year, skills, status FROM advisory_students"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY datetime(created_at) DESC"
    rows = db.execute(sa_text(sql), params).fetchall()
    out = []
    import json as _json
    for r in rows:
        out.append({
            "id": r[0], "entity_id": r[1], "first_name": r[2], "last_name": r[3], "email": r[4],
            "school": r[5], "program": r[6], "grad_year": r[7], "skills": (_json.loads(r[8]) if r[8] else {}),
            "status": r[9],
        })
    return out


@router.post("/students")
async def create_student(payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    if not payload.get("email"):
        raise HTTPException(status_code=422, detail="email required")
    import json as _json
    try:
        skills = payload.get("skills"); sval = _json.dumps(skills) if isinstance(skills, (list,dict)) else (skills if isinstance(skills,str) else None)
    except Exception:
        sval = None
    try:
        db.execute(sa_text("INSERT INTO advisory_students (entity_id, first_name, last_name, email, school, program, grad_year, skills, status, created_at, updated_at) VALUES (:e,:fn,:ln,:em,:sc,:pr,:gy,:sk,:st,:ca,:ua)"), {
            "e": int(payload.get("entity_id") or 0) or None,
            "fn": payload.get("first_name"), "ln": payload.get("last_name"), "em": payload.get("email"),
            "sc": payload.get("school"), "pr": payload.get("program"), "gy": payload.get("grad_year"),
            "sk": sval, "st": (payload.get("status") or 'prospect'),
            "ca": datetime.utcnow().isoformat(), "ua": datetime.utcnow().isoformat()
        })
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=400, detail="email must be unique")
    rid = db.execute(sa_text("SELECT last_insert_rowid()")).scalar(); return {"id": int(rid or 0)}


@router.get("/students/{sid}")
async def get_student(sid: int, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    row = db.execute(sa_text("SELECT id, entity_id, first_name, last_name, email, school, program, grad_year, skills, status, created_at, updated_at FROM advisory_students WHERE id = :id"), {"id": sid}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    import json as _json
    return {
        "id": row[0], "entity_id": row[1], "first_name": row[2], "last_name": row[3], "email": row[4],
        "school": row[5], "program": row[6], "grad_year": row[7], "skills": (_json.loads(row[8]) if row[8] else {}),
        "status": row[9], "created_at": row[10], "updated_at": row[11],
    }


@router.put("/students/{sid}")
async def update_student(sid: int, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    sets = []
    params: Dict[str, Any] = {"id": sid}
    for k in ("entity_id","first_name","last_name","email","school","program","grad_year","status"):
        if k in payload:
            sets.append(f"{k} = :{k}"); params[k] = payload[k]
    import json as _json
    if "skills" in payload:
        try:
            params["skills"] = _json.dumps(payload["skills"]) if not isinstance(payload["skills"], str) else payload["skills"]
        except Exception:
            params["skills"] = None
        sets.append("skills = :skills")
    sets.append("updated_at = :ua"); params["ua"] = datetime.utcnow().isoformat()
    if sets:
        db.execute(sa_text("UPDATE advisory_students SET " + ", ".join(sets) + " WHERE id = :id"), params); db.commit()
    return {"id": sid}


@router.delete("/students/{sid}")
async def delete_student(sid: int, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    db.execute(sa_text("DELETE FROM advisory_students WHERE id = :id"), {"id": sid}); db.commit()
    return {"id": sid, "deleted": True}


# ---------------- Applications -----------------
@router.get("/applications")
async def list_applications(entity_id: Optional[int] = None, status: Optional[str] = None, project_id: Optional[int] = None, q: Optional[str] = None, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    where = []; params: Dict[str, Any] = {}
    if entity_id: where.append("entity_id = :e"); params["e"] = int(entity_id)
    if status: where.append("lower(status) = :s"); params["s"] = status.strip().lower()
    if project_id: where.append("target_project_id = :p"); params["p"] = int(project_id)
    if q:
        where.append("(lower(first_name) LIKE :q OR lower(last_name) LIKE :q OR lower(email) LIKE :q OR lower(program) LIKE :q OR lower(school) LIKE :q)"); params["q"] = f"%{q.strip().lower()}%"
    sql = "SELECT id, entity_id, first_name, last_name, email, school, program, target_project_id, status, created_at FROM advisory_applications"
    if where: sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY datetime(created_at) DESC"
    rows = db.execute(sa_text(sql), params).fetchall()
    out = [{
        "id": r[0], "entity_id": r[1], "first_name": r[2], "last_name": r[3], "email": r[4],
        "school": r[5], "program": r[6], "target_project_id": r[7], "status": r[8], "created_at": r[9],
    } for r in rows]
    return out

@router.post("/applications")
async def create_application(payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    if not payload.get("email"):
        raise HTTPException(status_code=422, detail="email required")
    db.execute(sa_text("INSERT INTO advisory_applications (entity_id, source, target_project_id, first_name, last_name, email, school, program, resume_url, notes, status, created_at) VALUES (:e,:src,:tp,:fn,:ln,:em,:sc,:pr,:ru,:nt,:st,:ca)"), {
        "e": int(payload.get("entity_id") or 0) or None,
        "src": (payload.get("source") or 'form'), "tp": payload.get("target_project_id"),
        "fn": payload.get("first_name"), "ln": payload.get("last_name"), "em": payload.get("email"),
        "sc": payload.get("school"), "pr": payload.get("program"), "ru": payload.get("resume_url"),
        "nt": payload.get("notes"), "st": (payload.get("status") or 'new'), "ca": datetime.utcnow().isoformat()
    })
    db.commit(); rid = db.execute(sa_text("SELECT last_insert_rowid()")).scalar(); return {"id": int(rid or 0)}


@router.put("/applications/{aid}")
async def update_application(aid: int, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    sets = []
    params: Dict[str, Any] = {"id": aid}
    for k in ("status","target_project_id","notes","resume_url","source"):
        if k in payload:
            sets.append(f"{k} = :{k}"); params[k] = payload[k]
    if not sets:
        return {"id": aid}
    db.execute(sa_text("UPDATE advisory_applications SET " + ", ".join(sets) + " WHERE id = :id"), params)
    db.commit(); return {"id": aid}


# ---------------- Coffee Chats -----------------
@router.get("/coffeechats")
async def list_coffeechats(entity_id: Optional[int] = None, status: Optional[str] = None, provider: Optional[str] = None, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    where = []; params: Dict[str, Any] = {}
    if entity_id: where.append("entity_id = :e"); params["e"] = int(entity_id)
    if status: where.append("lower(status) = :st"); params["st"] = status.strip().lower()
    if provider: where.append("lower(provider) = :pr"); params["pr"] = provider.strip().lower()
    sql = "SELECT id, provider, external_id, invitee_name, invitee_email, scheduled_start, scheduled_end, status, topic FROM advisory_coffeechats"
    if where: sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY datetime(scheduled_start) DESC, id DESC"
    rows = db.execute(sa_text(sql), params).fetchall()
    return [{"id": r[0], "provider": r[1], "external_id": r[2], "invitee_name": r[3], "invitee_email": r[4], "scheduled_start": r[5], "scheduled_end": r[6], "status": r[7], "topic": r[8]} for r in rows]


@router.post("/coffeechats/sync")
async def sync_coffeechats(admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    # Placeholder: In real impl, use provider tokens from env and sync
    # Here, no-op and return count 0
    return {"synced": 0}


@router.post("/integrations/calendly/webhook")
async def calendly_webhook(payload: Dict[str, Any], db: Session = Depends(get_db)):
    # Webhook is typically unauthenticated but should validate secret; for MVP, accept and upsert
    _ensure_tables(db)
    import json as _json
    try:
        evt = payload.get("event") or {}
        invitee = payload.get("payload", {}).get("invitee", {}) or payload.get("invitee", {}) or {}
        scheduled_start = (payload.get("payload", {}).get("event", {}) or {}).get("start_time") or payload.get("scheduled_start")
        scheduled_end = (payload.get("payload", {}).get("event", {}) or {}).get("end_time") or payload.get("scheduled_end")
        external_id = payload.get("payload", {}).get("event", {}).get("uuid") or payload.get("external_id")
        topic = payload.get("payload", {}).get("event", {}).get("name") or payload.get("topic")
        invitee_email = invitee.get("email") or payload.get("invitee_email")
        invitee_name = invitee.get("name") or payload.get("invitee_name")
    except Exception:
        evt = {}; invitee = {}; scheduled_start = None; scheduled_end = None; external_id = None; topic = None; invitee_email = None; invitee_name = None
    db.execute(sa_text(
        "INSERT INTO advisory_coffeechats (entity_id, provider, external_id, scheduled_start, scheduled_end, invitee_email, invitee_name, topic, status, raw_payload) "
        "VALUES (NULL, 'calendly', :ext, :ss, :se, :em, :nm, :tp, :st, :raw)"
    ), {"ext": external_id, "ss": scheduled_start, "se": scheduled_end, "em": invitee_email, "nm": invitee_name, "tp": topic, "st": 'scheduled', "raw": _json.dumps(payload)})
    db.commit()
    return {"received": True}


# ---------------- Assignments -----------------
@router.post("/projects/{project_id}/assignments")
async def add_assignment(project_id: int, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    db.execute(sa_text(
        "INSERT INTO advisory_project_assignments (project_id, student_id, role, hours_planned, created_at) VALUES (:p,:s,:r,:h,:ts)"
    ), {"p": project_id, "s": payload.get("student_id"), "r": payload.get("role"), "h": payload.get("hours_planned"), "ts": datetime.utcnow().isoformat()})
    db.commit(); rid = db.execute(sa_text("SELECT last_insert_rowid()")).scalar(); return {"id": int(rid or 0)}


@router.put("/assignments/{aid}")
async def update_assignment(aid: int, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    sets = []
    params: Dict[str, Any] = {"id": aid}
    for k in ("role","hours_planned","active"):
        if k in payload:
            sets.append(f"{k} = :{k}"); params[k] = payload[k]
    if not sets:
        return {"id": aid}
    db.execute(sa_text("UPDATE advisory_project_assignments SET " + ", ".join(sets) + " WHERE id = :id"), params)
    db.commit(); return {"id": aid}


@router.delete("/assignments/{aid}")
async def delete_assignment(aid: int, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    db.execute(sa_text("UPDATE advisory_project_assignments SET active = 0 WHERE id = :id"), {"id": aid}); db.commit(); return {"id": aid, "active": 0}


# ---------------- Onboarding -----------------
@router.get("/onboarding/templates")
async def list_onboarding_templates(admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    rows = db.execute(sa_text("SELECT id, name, description FROM advisory_onboarding_templates ORDER BY id DESC")).fetchall()
    return [{"id": r[0], "name": r[1], "description": r[2]} for r in rows]


@router.post("/onboarding/templates")
async def create_onboarding_template(payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="name required")
    desc = payload.get("description")
    db.execute(sa_text("INSERT INTO advisory_onboarding_templates (name, description) VALUES (:n,:d)"), {"n": name, "d": desc})
    tid = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0)
    steps = payload.get("steps") or []
    for s in steps:
        db.execute(sa_text("INSERT INTO advisory_onboarding_template_steps (template_id, step_key, title, provider, config) VALUES (:t,:k,:ti,:p,:c)"), {
            "t": tid, "k": s.get("step_key"), "ti": s.get("title"), "p": (s.get("provider") or 'internal'), "c": (None if s.get("config") is None else __import__('json').dumps(s.get("config")))
        })
    db.commit(); return {"id": tid}


@router.put("/onboarding/templates/{tid}")
async def update_onboarding_template(tid: int, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    sets = []
    params: Dict[str, Any] = {"id": tid}
    for k in ("name","description"):
        if k in payload:
            sets.append(f"{k} = :{k}"); params[k] = payload[k]
    if sets:
        db.execute(sa_text("UPDATE advisory_onboarding_templates SET " + ", ".join(sets) + " WHERE id = :id"), params)
    # Optional steps full-replace
    if isinstance(payload.get("steps"), list):
        db.execute(sa_text("DELETE FROM advisory_onboarding_template_steps WHERE template_id = :id"), {"id": tid})
        for s in (payload.get("steps") or []):
            db.execute(sa_text("INSERT INTO advisory_onboarding_template_steps (template_id, step_key, title, provider, config) VALUES (:t,:k,:ti,:p,:c)"), {
                "t": tid, "k": s.get("step_key"), "ti": s.get("title"), "p": (s.get("provider") or 'internal'), "c": (None if s.get("config") is None else __import__('json').dumps(s.get("config")))
            })
    db.commit(); return {"id": tid}


@router.post("/onboarding/instances")
async def create_onboarding_instance(payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    sid = payload.get("student_id"); tid = payload.get("template_id")
    if not sid or not tid:
        raise HTTPException(status_code=422, detail="student_id and template_id required")
    db.execute(sa_text("INSERT INTO advisory_onboarding_instances (student_id, project_id, template_id, status, created_at) VALUES (:s,:p,:t,'in_progress',:ts)"), {"s": sid, "p": payload.get("project_id"), "t": tid, "ts": datetime.utcnow().isoformat()})
    iid = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0)
    # Seed events from template steps
    steps = db.execute(sa_text("SELECT step_key FROM advisory_onboarding_template_steps WHERE template_id = :t"), {"t": tid}).fetchall()
    for (sk,) in steps:
        db.execute(sa_text("INSERT INTO advisory_onboarding_events (instance_id, step_key, status, ts) VALUES (:i,:k,'pending',:ts)"), {"i": iid, "k": sk, "ts": datetime.utcnow().isoformat()})
    db.commit(); return {"id": iid}


@router.get("/onboarding/instances")
async def list_onboarding_instances(student_id: Optional[int] = None, project_id: Optional[int] = None, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    where = []; params: Dict[str, Any] = {}
    if student_id: where.append("student_id = :s"); params["s"] = int(student_id)
    if project_id: where.append("project_id = :p"); params["p"] = int(project_id)
    sql = "SELECT id, student_id, project_id, template_id, status, created_at FROM advisory_onboarding_instances"
    if where: sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY datetime(created_at) DESC, id DESC"
    rows = db.execute(sa_text(sql), params).fetchall()
    out = []
    for r in rows:
        iid = r[0]
        steps = db.execute(sa_text("SELECT step_key, status, evidence_url FROM advisory_onboarding_events WHERE instance_id = :i ORDER BY id"), {"i": iid}).fetchall()
        out.append({
            "id": iid, "student_id": r[1], "project_id": r[2], "template_id": r[3], "status": r[4], "created_at": r[5],
            "steps": [{"step_key": s[0], "status": s[1], "evidence_url": s[2]} for s in steps]
        })
    return out


@router.post("/onboarding/instances/{iid}/steps/{step_key}/mark")
async def mark_onboarding_step(iid: int, step_key: str, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    status = (payload.get("status") or '').strip().lower()
    if status not in {"pending","sent","completed","failed"}:
        raise HTTPException(status_code=422, detail="invalid status")
    db.execute(sa_text("UPDATE advisory_onboarding_events SET status = :st, evidence_url = :eu, external_id = :ex, ts = :ts WHERE instance_id = :i AND step_key = :k"), {
        "st": status, "eu": payload.get("evidence_url"), "ex": payload.get("external_id"), "ts": datetime.utcnow().isoformat(), "i": iid, "k": step_key
    })
    # If all steps completed, update instance status
    try:
        rows = db.execute(sa_text("SELECT COUNT(*) FROM advisory_onboarding_events WHERE instance_id = :i AND status != 'completed'"), {"i": iid}).fetchone()
        if rows and int(rows[0] or 0) == 0:
            db.execute(sa_text("UPDATE advisory_onboarding_instances SET status = 'completed' WHERE id = :i"), {"i": iid})
    except Exception:
        pass
    db.commit(); return {"id": iid, "step_key": step_key, "status": status}
