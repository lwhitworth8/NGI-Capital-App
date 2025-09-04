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
from src.api.main import require_partner_access  # reuse existing auth dep

router = APIRouter()


def require_ngiadvisory_admin():
    allowed = {
        "lwhitworth@ngicapitaladvisory.com",
        "anurmamade@ngicapitaladvisory.com",
    }

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
    row = db.execute(sa_text("SELECT * FROM advisory_projects WHERE id = :id"), {"id": pid}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    cols = [c[1] for c in db.execute(sa_text("PRAGMA table_info('advisory_projects')")).fetchall()]
    return {k: row[i] for i, k in enumerate(cols)}


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


# ---------------- Applications -----------------
@router.get("/applications")
async def list_applications(entity_id: Optional[int] = None, status: Optional[str] = None, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    where = []; params: Dict[str, Any] = {}
    if entity_id: where.append("entity_id = :e"); params["e"] = int(entity_id)
    if status: where.append("lower(status) = :s"); params["s"] = status.strip().lower()
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


# ---------------- Coffee Chats -----------------
@router.get("/coffeechats")
async def list_coffeechats(entity_id: Optional[int] = None, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_tables(db)
    where = []; params: Dict[str, Any] = {}
    if entity_id: where.append("entity_id = :e"); params["e"] = int(entity_id)
    sql = "SELECT id, provider, external_id, invitee_name, invitee_email, scheduled_start, scheduled_end, status, topic FROM advisory_coffeechats"
    if where: sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY datetime(scheduled_start) DESC, id DESC"
    rows = db.execute(sa_text(sql), params).fetchall()
    return [{"id": r[0], "provider": r[1], "external_id": r[2], "invitee_name": r[3], "invitee_email": r[4], "scheduled_start": r[5], "scheduled_end": r[6], "status": r[7], "topic": r[8]} for r in rows]

