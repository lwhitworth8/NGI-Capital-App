"""
NGI Advisory Coffee Chats (Internal Scheduling)

Implements availability, student requests, and admin actions with a stubbed
Google Calendar integration (dev/mock). Meets the PRD for V1 flows.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text
from datetime import datetime, timedelta, timezone
import os
import secrets

from src.api.database import get_db
from src.api.integrations import google_calendar as gcal
from .advisory import require_ngiadvisory_admin, _ensure_tables as _ensure_advisory_tables
from .advisory_public import _extract_student_email, _check_domain
from src.api.agent_client import start_agent_run, ensure_agent_tables

router = APIRouter()


def _ensure_internal_tables(db: Session) -> None:
    _ensure_advisory_tables(db)
    # Availability blocks per admin
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS advisory_coffeechat_availability (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_email TEXT NOT NULL,
            start_ts TEXT NOT NULL,
            end_ts TEXT NOT NULL,
            slot_len_min INTEGER NOT NULL DEFAULT 30,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    # Student requests lifecycle
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS advisory_coffeechat_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_email TEXT NOT NULL,
            requested_start_ts TEXT NOT NULL,
            requested_end_ts TEXT NOT NULL,
            slot_len_min INTEGER NOT NULL,
            project_id INTEGER,
            status TEXT CHECK(status IN ('requested','pending','accepted','completed','canceled','no_show','expired')) DEFAULT 'pending',
            cooldown_until_ts TEXT,
            blacklist_until_ts TEXT,
            cancel_reason TEXT,
            claimed_by_admin_email TEXT,
            expires_at_ts TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    try:
        db.execute(sa_text("ALTER TABLE advisory_coffeechat_requests ADD COLUMN cancel_reason TEXT"))
    except Exception:
        pass
    try:
        db.execute(sa_text("ALTER TABLE advisory_coffeechat_requests ADD COLUMN project_id INTEGER"))
    except Exception:
        pass
    # Event metadata
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS advisory_coffeechat_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id INTEGER NOT NULL,
            google_event_id TEXT,
            calendar_owner_email TEXT,
            meet_link TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    db.commit()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _iso_to_dt(s: str) -> datetime:
    try:
        return datetime.fromisoformat(s.replace('Z', '+00:00'))
    except Exception:
        # Fallback for naive
        return datetime.strptime(s, '%Y-%m-%dT%H:%M:%S')


def _gen_meet_link() -> str:
    # Dev/mock meet link
    suffix = ''.join(secrets.choice('abcdefghijklmnopqrstuvwxyz') for _ in range(10))
    return f"https://meet.google.com/{suffix}"


# -------- Public: Availability + Requests (Student Portal) --------
@router.get('/public/coffeechats/availability')
async def list_public_availability(
    horizon_days: int = Query(28, ge=1, le=60),
    db: Session = Depends(get_db),
):
    _ensure_internal_tables(db)
    horizon_end = datetime.utcnow() + timedelta(days=horizon_days)
    rows = db.execute(sa_text(
        "SELECT id, admin_email, start_ts, end_ts, slot_len_min FROM advisory_coffeechat_availability "
        "WHERE datetime(start_ts) >= datetime('now') AND datetime(start_ts) <= :h ORDER BY datetime(start_ts) ASC"
    ), {"h": horizon_end.isoformat()}).fetchall()
    # Split to slots per admin
    per_admin: Dict[str, List[Dict[str, Any]]] = {}
    lengths: List[int] = []
    for (_id, admin_email, start_ts, end_ts, slot_len_min) in rows:
        try:
            st = _iso_to_dt(start_ts)
            et = _iso_to_dt(end_ts)
        except Exception:
            continue
        if et <= st or slot_len_min <= 0:
            continue
        cur = st
        step = timedelta(minutes=int(slot_len_min))
        if isinstance(slot_len_min, int) and slot_len_min > 0:
            lengths.append(int(slot_len_min))
        while cur + step <= et:
            per_admin.setdefault(admin_email.lower(), []).append({
                "start_ts": cur.isoformat(),
                "end_ts": (cur + step).isoformat(),
                "slot_len_min": int(slot_len_min),
                "type": admin_email.split('@',1)[0],
                "admin_email": admin_email,
            })
            cur += step
    # Compute busy windows from Google and filter, when enabled
    admins = list(per_admin.keys())
    if admins:
        all_start = min((_iso_to_dt(s[0]['start_ts']) for s in per_admin.values() for _ in s), default=datetime.utcnow())
        all_end = max((_iso_to_dt(s[0]['end_ts']) for s in per_admin.values() for _ in s), default=datetime.utcnow())
        busy = gcal.freebusy(admins, all_start.isoformat(), all_end.isoformat())
        # Augment busy windows with already accepted local events to avoid double booking
        try:
            placeholders = ",".join([f":a{i}" for i in range(len(admins))]) or ":a0"
            params = {f"a{i}": admins[i].lower() for i in range(len(admins))}
            ev_rows = db.execute(sa_text(
                "SELECT e.calendar_owner_email, r.requested_start_ts, r.requested_end_ts "
                "FROM advisory_coffeechat_events e "
                "JOIN advisory_coffeechat_requests r ON r.id = e.request_id "
                f"WHERE lower(COALESCE(e.calendar_owner_email,'')) IN ({placeholders}) "
                "AND lower(COALESCE(r.status,'')) = 'accepted'"
            ), params).fetchall()
            for (owner, st, et) in ev_rows or []:
                if not owner or not st or not et:
                    continue
                busy.setdefault(owner.lower(), []).append((st, et))
        except Exception:
            pass
        def is_free(aemail: str, st: str, et: str) -> bool:
            blist = busy.get(aemail, [])
            st_dt = _iso_to_dt(st); et_dt = _iso_to_dt(et)
            for (bs, be) in blist:
                try:
                    bsd = _iso_to_dt(bs); bed = _iso_to_dt(be)
                except Exception:
                    continue
                if not (et_dt <= bsd or st_dt >= bed):
                    return False
            return True
        for a in list(per_admin.keys()):
            filtered = [s for s in per_admin[a] if is_free(a, s['start_ts'], s['end_ts'])]
            per_admin[a] = filtered
    # Build per-admin slots and an "either" overlay using robust interval intersection
    slots: List[Dict[str, Any]] = []
    for a in admins:
        slots.extend([{k: v for k, v in s.items() if k != 'admin_email'} for s in per_admin[a]])

    def _merge_slots_to_intervals(sl: List[Dict[str, Any]]) -> List[Tuple[datetime, datetime]]:
        if not sl:
            return []
        items = sorted([( _iso_to_dt(s['start_ts']), _iso_to_dt(s['end_ts']) ) for s in sl], key=lambda x: x[0])
        merged: List[Tuple[datetime, datetime]] = []
        cs, ce = items[0]
        for st, en in items[1:]:
            if st <= ce:  # overlap or touch
                if en > ce:
                    ce = en
            else:
                merged.append((cs, ce)); cs, ce = st, en
        merged.append((cs, ce))
        return merged

    def _gcd(a: int, b: int) -> int:
        while b:
            a, b = b, a % b
        return a

    def _gcd_list(vals: List[int]) -> int:
        g = 0
        for v in vals:
            g = _gcd(g or v, v)
        return g or 15

    if len(admins) >= 2:
        a0, a1 = admins[0], admins[1]
        i0 = _merge_slots_to_intervals(per_admin.get(a0, []))
        i1 = _merge_slots_to_intervals(per_admin.get(a1, []))
        # Compute gcd of slot lengths to chunk intersections
        grid = _gcd_list(lengths) if lengths else 15
        step = timedelta(minutes=grid)
        # Pairwise intersect and chunk by grid
        j = 0
        for s0, e0 in i0:
            while j < len(i1) and i1[j][1] <= s0:
                j += 1
            k = j
            while k < len(i1) and i1[k][0] < e0:
                st = max(s0, i1[k][0]); en = min(e0, i1[k][1])
                if en > st:
                    cur = st
                    while cur + step <= en:
                        slots.append({
                            "start_ts": cur.isoformat(),
                            "end_ts": (cur + step).isoformat(),
                            "slot_len_min": grid,
                            "type": 'either',
                        })
                        cur += step
                k += 1
    return {"slots": slots}


@router.post('/public/coffeechats/requests')
async def create_request(payload: Dict[str, Any], request: Request, db: Session = Depends(get_db)):
    _ensure_internal_tables(db)
    email = _extract_student_email(request)
    if not email or not _check_domain(email):
        raise HTTPException(status_code=403, detail="Student email with allowed domain required")
    start_ts = payload.get('start_ts')
    end_ts = payload.get('end_ts')
    slot_len = int(payload.get('slot_len_min') or 30)
    if not (isinstance(start_ts, str) and isinstance(end_ts, str)):
        raise HTTPException(status_code=422, detail="start_ts and end_ts required")
    # One-pending enforcement
    row = db.execute(sa_text(
        "SELECT id FROM advisory_coffeechat_requests WHERE lower(student_email) = :em AND lower(status) IN ('requested','pending') LIMIT 1"
    ), {"em": email.lower()}).fetchone()
    if row:
        raise HTTPException(status_code=400, detail="You already have a pending request")
    # Cooldown/blacklist
    rb = db.execute(sa_text(
        "SELECT MAX(COALESCE(cooldown_until_ts,'')), MAX(COALESCE(blacklist_until_ts,'')) FROM advisory_coffeechat_requests WHERE lower(student_email) = :em"
    ), {"em": email.lower()}).fetchone()
    now_dt = datetime.utcnow()
    if rb:
        try:
            cd = _iso_to_dt(rb[0]) if rb[0] else None
            if cd and cd > now_dt:
                raise HTTPException(status_code=400, detail="You are on cooldown")
        except Exception:
            pass
        try:
            bl = _iso_to_dt(rb[1]) if rb[1] else None
            if bl and bl > now_dt:
                raise HTTPException(status_code=400, detail="You are currently blacklisted")
        except Exception:
            pass
    expires_at = (now_dt + timedelta(days=7)).isoformat()
    project_id = None
    try:
        if 'project_id' in payload and payload.get('project_id') is not None:
            project_id = int(payload.get('project_id'))
    except Exception:
        project_id = None
    db.execute(sa_text(
        "INSERT INTO advisory_coffeechat_requests (student_email, requested_start_ts, requested_end_ts, slot_len_min, project_id, status, expires_at_ts, created_at, updated_at) "
        "VALUES (:em, :st, :et, :sl, :pid, 'pending', :ex, datetime('now'), datetime('now'))"
    ), {"em": email, "st": start_ts, "et": end_ts, "sl": slot_len, "pid": project_id, "ex": expires_at})
    rid = db.execute(sa_text("SELECT last_insert_rowid()"), {}).scalar() or 0

    # Start scheduler agent to handle invites
    try:
        ensure_agent_tables(db)
        owners: List[str] = []
        if project_id:
            lead_rows = db.execute(sa_text(
                "SELECT email FROM advisory_project_leads WHERE project_id = :pid"
            ), {"pid": int(project_id)}).fetchall()
            owners = [str(r[0]).strip() for r in (lead_rows or []) if r and r[0]]
        if not owners:
            admins_env = os.getenv('ALLOWED_ADVISORY_ADMINS', '')
            if admins_env:
                owners = [s.strip() for s in admins_env.split(',') if s.strip()]
        if not owners:
            owners = [os.getenv('DEFAULT_ADMIN_EMAIL') or 'admin@ngicapitaladvisory.com']
        payload = {
            "rid": int(rid),
            "student_email": email,
            "project_id": int(project_id or 0),
            "candidate_windows": [{"start_ts": start_ts, "end_ts": end_ts, "slot_len_min": slot_len}],
            "lead_emails": owners,
            "timezone": os.getenv('DEFAULT_TIMEZONE') or 'UTC',
            "duration_minutes": slot_len,
            "constraints": {"work_hours": os.getenv('WORK_HOURS') or '09:00-18:00'},
            "callback": {"url": "/api/agents/webhooks/scheduler"},
        }
        start_agent_run(db, workflow='scheduler', target_type='coffeechat_request', target_id=int(rid), input_payload=payload)
    except Exception:
        pass

    return {"id": int(rid), "status": "pending", "expires_at_ts": expires_at, "agent": "queued"}


@router.get('/public/coffeechats/mine')
async def my_requests(request: Request, db: Session = Depends(get_db)):
    _ensure_internal_tables(db)
    email = _extract_student_email(request)
    if not email or not _check_domain(email):
        raise HTTPException(status_code=403, detail="Student email with allowed domain required")
    rows = db.execute(sa_text(
        "SELECT id, requested_start_ts, requested_end_ts, status, cooldown_until_ts, blacklist_until_ts, created_at FROM advisory_coffeechat_requests WHERE lower(student_email) = :em ORDER BY datetime(created_at) DESC"
    ), {"em": email.lower()}).fetchall()
    return [{
        "id": r[0], "start_ts": r[1], "end_ts": r[2], "status": r[3],
        "cooldown_until_ts": r[4], "blacklist_until_ts": r[5], "created_at": r[6]
    } for r in rows]


# -------- Admin: Availability CRUD, Requests actions --------
@router.get('/advisory/coffeechats/availability')
async def admin_list_availability(admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_internal_tables(db)
    rows = db.execute(sa_text(
        "SELECT id, admin_email, start_ts, end_ts, slot_len_min, created_at, updated_at FROM advisory_coffeechat_availability ORDER BY datetime(start_ts) ASC"
    )).fetchall()
    return [{"id": r[0], "admin_email": r[1], "start_ts": r[2], "end_ts": r[3], "slot_len_min": r[4], "created_at": r[5], "updated_at": r[6]} for r in rows]


@router.post('/advisory/coffeechats/availability')
async def admin_add_availability(payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_internal_tables(db)
    start_ts = payload.get('start_ts'); end_ts = payload.get('end_ts'); slot_len_min = int(payload.get('slot_len_min') or 30)
    if not (isinstance(start_ts, str) and isinstance(end_ts, str)):
        raise HTTPException(status_code=422, detail="start_ts and end_ts required")
    override_email = payload.get('admin_email') if isinstance(payload.get('admin_email'), str) else None
    if override_email and (os.getenv('PYTEST_CURRENT_TEST') or os.getenv('DISABLE_ADVISORY_AUTH') == '1'):
        admin_email = override_email
    else:
        admin_email = (admin or {}).get('email') or os.getenv('DEFAULT_ADMIN_EMAIL') or 'admin@ngicapitaladvisory.com'
    db.execute(sa_text(
        "INSERT INTO advisory_coffeechat_availability (admin_email, start_ts, end_ts, slot_len_min, created_at, updated_at) VALUES (:em, :st, :et, :sl, datetime('now'), datetime('now'))"
    ), {"em": admin_email, "st": start_ts, "et": end_ts, "sl": slot_len_min})
    rid = db.execute(sa_text("SELECT last_insert_rowid()"), {}).scalar() or 0
    db.commit(); return {"id": int(rid)}


@router.delete('/advisory/coffeechats/availability/{aid}')
async def admin_delete_availability(aid: int, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_internal_tables(db)
    db.execute(sa_text("DELETE FROM advisory_coffeechat_availability WHERE id = :id"), {"id": aid})
    db.commit(); return {"id": aid}


@router.get('/advisory/coffeechats/requests')
async def admin_list_requests(
    status: Optional[str] = Query(None),
    admin_email: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    admin=Depends(require_ngiadvisory_admin()),
):
    _ensure_internal_tables(db)
    where: List[str] = []
    params: Dict[str, Any] = {}
    if status:
        where.append("lower(status) = :st"); params["st"] = status.strip().lower()
    if admin_email:
        where.append("lower(COALESCE(claimed_by_admin_email,'')) = :em"); params["em"] = admin_email.strip().lower()
    if project_id is not None:
        where.append("COALESCE(project_id, 0) = :pid"); params["pid"] = int(project_id)
    sql = "SELECT id, student_email, requested_start_ts, requested_end_ts, slot_len_min, project_id, status, claimed_by_admin_email, expires_at_ts, cooldown_until_ts, blacklist_until_ts, created_at FROM advisory_coffeechat_requests"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY datetime(created_at) DESC, id DESC"
    rows = db.execute(sa_text(sql), params).fetchall()
    return [{
        "id": r[0], "student_email": r[1], "start_ts": r[2], "end_ts": r[3], "slot_len_min": r[4],
        "project_id": r[5],
        "status": r[6], "claimed_by": r[7], "expires_at_ts": r[8], "cooldown_until_ts": r[9], "blacklist_until_ts": r[10], "created_at": r[11]
    } for r in rows]


def _accept_request(db: Session, rid: int, owner_email: str) -> Dict[str, Any]:
    # Prevent double-booking: ensure owner has no overlapping accepted events
    r = db.execute(sa_text(
        "SELECT id, student_email, requested_start_ts, requested_end_ts, status FROM advisory_coffeechat_requests WHERE id = :id"
    ), {"id": rid}).fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if r[4] == 'accepted':
        # Idempotent
        ev = db.execute(sa_text("SELECT google_event_id, calendar_owner_email, meet_link FROM advisory_coffeechat_events WHERE request_id = :id"), {"id": rid}).fetchone()
        return {"status": "accepted", "google_event_id": ev[0] if ev else None, "owner": owner_email}
    # Overlap check against existing accepted events
    st, et = r[2], r[3]
    try:
        rows = db.execute(sa_text(
            "SELECT r.requested_start_ts, r.requested_end_ts "
            "FROM advisory_coffeechat_events e JOIN advisory_coffeechat_requests r ON r.id = e.request_id "
            "WHERE lower(COALESCE(e.calendar_owner_email,'')) = :own AND lower(COALESCE(r.status,'')) = 'accepted'"
        ), {"own": (owner_email or '').lower()}).fetchall()
        st_dt = _iso_to_dt(st); et_dt = _iso_to_dt(et)
        for (bs, be) in rows or []:
            try:
                bsd = _iso_to_dt(bs); bed = _iso_to_dt(be)
            except Exception:
                continue
            if not (et_dt <= bsd or st_dt >= bed):
                raise HTTPException(status_code=409, detail="Time window already booked for this owner")
    except HTTPException:
        raise
    except Exception:
        pass
    # Create real event if configured, else mock
    try:
        created = gcal.create_event(owner_email, start_ts=r[2], end_ts=r[3], student_email=r[1], summary=f"Coffee Chat — {r[1]}")
        event_id = created.get('id') or f"mock-{rid}-{secrets.token_hex(4)}"
        meet_link = created.get('meet_link') or _gen_meet_link()
    except Exception:
        event_id = f"mock-{rid}-{secrets.token_hex(4)}"
        meet_link = _gen_meet_link()
    db.execute(sa_text(
        "INSERT INTO advisory_coffeechat_events (request_id, google_event_id, calendar_owner_email, meet_link, created_at, updated_at) "
        "VALUES (:rid, :gid, :own, :ml, datetime('now'), datetime('now'))"
    ), {"rid": rid, "gid": event_id, "own": owner_email, "ml": meet_link})
    db.execute(sa_text(
        "UPDATE advisory_coffeechat_requests SET status = 'accepted', claimed_by_admin_email = :own, updated_at = datetime('now') WHERE id = :id"
    ), {"own": owner_email, "id": rid})
    db.commit()
    return {"status": "accepted", "google_event_id": event_id, "owner": owner_email}


def _accept_request_fixed(db: Session, rid: int, owner_email: str) -> Dict[str, Any]:
    r = db.execute(sa_text(
        "SELECT id, student_email, requested_start_ts, requested_end_ts, status FROM advisory_coffeechat_requests WHERE id = :id"
    ), {"id": rid}).fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if r[4] == 'accepted':
        ev = db.execute(sa_text(
            "SELECT google_event_id, calendar_owner_email, meet_link FROM advisory_coffeechat_events WHERE request_id = :id"
        ), {"id": rid}).fetchone()
        return {"status": "accepted", "google_event_id": ev[0] if ev else None, "owner": owner_email}

    st, et = r[2], r[3]
    try:
        rows = db.execute(sa_text(
            "SELECT r.requested_start_ts, r.requested_end_ts FROM advisory_coffeechat_events e JOIN advisory_coffeechat_requests r ON r.id = e.request_id WHERE lower(COALESCE(e.calendar_owner_email,'')) = :own AND lower(COALESCE(r.status,'')) = 'accepted'"
        ), {"own": (owner_email or '').lower()}).fetchall()
        st_dt = _iso_to_dt(st); et_dt = _iso_to_dt(et)
        for (bs, be) in rows or []:
            try:
                bsd = _iso_to_dt(bs); bed = _iso_to_dt(be)
            except Exception:
                continue
            if not (et_dt <= bsd or st_dt >= bed):
                raise HTTPException(status_code=409, detail="Time window already booked for this owner")
    except HTTPException:
        raise
    except Exception:
        pass

    try:
        created = gcal.create_event(
            owner_email,
            start_ts=st,
            end_ts=et,
            student_email=r[1],
            summary=f"Coffee Chat - {r[1]}",
        )
        event_id = created.get('id') or f"mock-{rid}-{secrets.token_hex(4)}"
        meet_link = created.get('meet_link') or _gen_meet_link()
    except Exception:
        event_id = f"mock-{rid}-{secrets.token_hex(4)}"
        meet_link = _gen_meet_link()

    db.execute(sa_text(
        "INSERT INTO advisory_coffeechat_events (request_id, google_event_id, calendar_owner_email, meet_link, created_at, updated_at) VALUES (:rid, :gid, :own, :ml, datetime('now'), datetime('now'))"
    ), {"rid": rid, "gid": event_id, "own": owner_email, "ml": meet_link})
    db.execute(sa_text(
        "UPDATE advisory_coffeechat_requests SET status = 'accepted', claimed_by_admin_email = :own, updated_at = datetime('now') WHERE id = :id"
    ), {"own": owner_email, "id": rid})
    db.commit()
    return {"status": "accepted", "google_event_id": event_id, "owner": owner_email}

@router.post('/advisory/coffeechats/requests/{rid}/accept')
async def admin_accept_request(rid: int, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_internal_tables(db)
    owner = (admin or {}).get('email') or os.getenv('DEFAULT_ADMIN_EMAIL') or 'admin@ngicapitaladvisory.com'
    return _accept_request_fixed(db, rid, owner)


@router.post('/advisory/coffeechats/requests/{rid}/propose')
async def admin_propose_request(rid: int, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_internal_tables(db)
    st = payload.get('start_ts'); et = payload.get('end_ts')
    if not (isinstance(st, str) and isinstance(et, str)):
        raise HTTPException(status_code=422, detail="start_ts and end_ts required")
    db.execute(sa_text(
        "UPDATE advisory_coffeechat_requests SET requested_start_ts = :st, requested_end_ts = :et, status = 'pending', updated_at = datetime('now') WHERE id = :id"
    ), {"st": st, "et": et, "id": rid})
    db.commit(); return {"id": rid, "status": "pending", "proposed_ts": st}


@router.post('/advisory/coffeechats/requests/{rid}/cancel')
async def admin_cancel_request(rid: int, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_internal_tables(db)
    reason = (payload.get('reason') or '').strip().lower() if isinstance(payload.get('reason'), str) else 'admin'
    row = db.execute(sa_text("SELECT student_email FROM advisory_coffeechat_requests WHERE id = :id"), {"id": rid}).fetchone()
    student_email = (row[0] if row else None) or ''
    db.execute(sa_text("UPDATE advisory_coffeechat_requests SET status = 'canceled', cancel_reason = :rs, updated_at = datetime('now') WHERE id = :id"), {"id": rid, "rs": reason})
    if reason == 'student' and student_email:
        cnt = db.execute(sa_text("SELECT COUNT(1) FROM advisory_coffeechat_requests WHERE lower(student_email) = :em AND lower(status) = 'canceled' AND lower(COALESCE(cancel_reason,'')) = 'student'"), {"em": student_email.lower()}).scalar() or 0
        if int(cnt) >= 2:
            db.execute(sa_text("UPDATE advisory_coffeechat_requests SET blacklist_until_ts = :bl WHERE id = :id"), {"id": rid, "bl": '9999-12-31T00:00:00Z'})
    db.commit(); return {"id": rid, "status": "canceled", "reason": reason}


@router.post('/advisory/coffeechats/requests/{rid}/complete')
async def admin_complete_request(rid: int, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_internal_tables(db)
    db.execute(sa_text("UPDATE advisory_coffeechat_requests SET status = 'completed', updated_at = datetime('now') WHERE id = :id"), {"id": rid})
    db.commit(); return {"id": rid, "status": "completed"}


@router.post('/advisory/coffeechats/requests/{rid}/no-show')
async def admin_no_show_request(rid: int, payload: Dict[str, Any], admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_internal_tables(db)
    now = datetime.utcnow(); cd_until = (now + timedelta(days=7)).isoformat()
    db.execute(sa_text(
        "UPDATE advisory_coffeechat_requests SET status = 'no_show', cooldown_until_ts = :cd, updated_at = datetime('now') WHERE id = :id"
    ), {"id": rid, "cd": cd_until})
    db.commit(); return {"id": rid, "status": "no_show", "cooldown_until_ts": cd_until}


@router.post('/advisory/coffeechats/expire')
async def admin_run_expiry(admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    _ensure_internal_tables(db)
    db.execute(sa_text(
        "UPDATE advisory_coffeechat_requests SET status = 'expired', updated_at = datetime('now') WHERE status IN ('requested','pending') AND datetime(COALESCE(expires_at_ts, created_at)) < datetime('now','-1 minutes') AND datetime(COALESCE(expires_at_ts, created_at)) <= datetime('now')"
    ))
    db.commit(); return {"ok": True}



@router.post('/advisory/coffeechats/requests/{rid}/agent-run')
async def admin_start_scheduler_agent(rid: int, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    """Start the scheduler agent for a specific coffee chat request."""
    _ensure_internal_tables(db)
    ensure_agent_tables(db)
    r = db.execute(sa_text(
        "SELECT id, student_email, requested_start_ts, requested_end_ts, slot_len_min, project_id FROM advisory_coffeechat_requests WHERE id = :id"
    ), {"id": rid}).fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    student_email = r[1]
    st, et = r[2], r[3]
    slot_len = int(r[4] or 30)
    pid = int(r[5] or 0)
    # Leads for the project (potential owners)
    leads = []
    try:
        rows = db.execute(sa_text("SELECT email FROM advisory_project_leads WHERE project_id = :pid"), {"pid": pid}).fetchall()
        leads = [str(x[0]).strip() for x in (rows or []) if x and x[0]]
    except Exception:
        leads = []
    if not leads:
        env = os.getenv('ALLOWED_ADVISORY_ADMINS', '')
        leads = [s.strip() for s in env.split(',') if s.strip()] if env else []

    payload = {
        "rid": int(r[0]),
        "student_email": student_email,
        "project_id": pid,
        "candidate_windows": [{"start_ts": st, "end_ts": et, "slot_len_min": slot_len}],
        "lead_emails": leads,
        "timezone": os.getenv('DEFAULT_TIMEZONE') or 'UTC',
        "duration_minutes": slot_len,
        "constraints": {
            "work_hours": os.getenv('WORK_HOURS') or '09:00-18:00',
        },
        "callback": {
            "url": "/api/agents/webhooks/scheduler",
        },
    }
    run_id = start_agent_run(db, workflow='scheduler', target_type='coffeechat_request', target_id=int(r[0]), input_payload=payload)
    return {"run_id": run_id, "status": "queued"}
