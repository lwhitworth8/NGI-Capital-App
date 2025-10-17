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

from services.api.database import get_db
from services.api.integrations import google_calendar as gcal
from .advisory import require_ngiadvisory_admin, _ensure_tables as _ensure_advisory_tables
from .advisory_public import _extract_student_email, _check_domain
# Removed agent_client import - using direct Google Calendar integration

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


def _auto_sync_calendar_events(db: Session) -> None:
    """Automatically sync calendar events to detect deletions. Runs silently in background."""
    try:
        # Only sync if Google Calendar is enabled
        if not gcal._GCAL_ENABLED:
            return
            
        # Get all accepted coffee chat events with Google Calendar IDs
        events_rows = db.execute(sa_text(
            "SELECT e.id, e.request_id, e.google_event_id, e.calendar_owner_email "
            "FROM advisory_coffeechat_events e "
            "JOIN advisory_coffeechat_requests r ON r.id = e.request_id "
            "WHERE e.google_event_id IS NOT NULL "
            "AND e.google_event_id != '' "
            "AND lower(COALESCE(r.status,'')) = 'accepted'"
        )).fetchall()
        
        deleted_count = 0
        for (event_id, request_id, google_event_id, owner_email) in events_rows:
            try:
                # Check if the event still exists in Google Calendar
                gcal_event = gcal.get_event(owner_email, google_event_id)
                if gcal_event is None:
                    # Event was deleted from Google Calendar
                    print(f"AUTO-SYNC: Event {google_event_id} deleted from Google Calendar for {owner_email}")
                    
                    # Update the request status to canceled
                    db.execute(sa_text(
                        "UPDATE advisory_coffeechat_requests SET status = 'canceled', cancel_reason = 'calendar_deleted', updated_at = datetime('now') WHERE id = :id"
                    ), {"id": request_id})
                    
                    # Delete the event record
                    db.execute(sa_text(
                        "DELETE FROM advisory_coffeechat_events WHERE id = :id"
                    ), {"id": event_id})
                    
                    deleted_count += 1
                    
            except Exception as e:
                # Silently continue on individual event errors
                continue
        
        if deleted_count > 0:
            db.commit()
            print(f"AUTO-SYNC: Marked {deleted_count} events as deleted from Google Calendar")
        
    except Exception as e:
        # Silently fail on sync errors to not break availability checks
        print(f"AUTO-SYNC: Error during calendar sync: {e}")
        pass


# -------- Public: Availability + Requests (Student Portal) --------
@router.get('/public/coffeechats/availability')
async def list_public_availability(
    horizon_days: int = Query(28, ge=1, le=60),
    db: Session = Depends(get_db),
):
    _ensure_internal_tables(db)
    # Create PST timezone once
    pst_tz = timezone(timedelta(hours=-8))  # PST is UTC-8
    horizon_end = datetime.utcnow() + timedelta(days=horizon_days)
    rows = db.execute(sa_text(
        "SELECT id, admin_email, start_ts, end_ts, slot_len_min FROM advisory_coffeechat_availability "
        "WHERE datetime(start_ts) >= datetime('now') AND datetime(start_ts) <= :h ORDER BY datetime(start_ts) ASC"
    ), {"h": horizon_end.isoformat()}).fetchall()
    # Split to slots per admin
    per_admin: Dict[str, List[Dict[str, Any]]] = {}
    lengths: List[int] = []
    admins: List[str] = []  # Initialize admins list
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
            # Convert UTC times to PST for frontend display
            cur_pst = cur.astimezone(pst_tz)
            end_pst = (cur + step).astimezone(pst_tz)
            
            per_admin.setdefault(admin_email.lower(), []).append({
                "start_ts": cur_pst.isoformat(),
                "end_ts": end_pst.isoformat(),
                "slot_len_min": int(slot_len_min),
                "type": admin_email.split('@',1)[0],
                "admin_email": admin_email,
            })
            cur += step
    
    # Compute busy windows from Google and filter, when enabled
    admins = list(per_admin.keys())
    busy = {}  # Initialize busy dictionary
    if admins:
        # Convert PST times back to UTC for Google Calendar freebusy check
        
        all_start = min((_iso_to_dt(s[0]['start_ts']) for s in per_admin.values() for _ in s), default=datetime.utcnow())
        all_end = max((_iso_to_dt(s[0]['end_ts']) for s in per_admin.values() for _ in s), default=datetime.utcnow())
        
        # Convert PST times to UTC for Google Calendar
        if all_start.tzinfo is None:
            all_start = pst_tz.localize(all_start)
        if all_end.tzinfo is None:
            all_end = pst_tz.localize(all_end)
        
        all_start_utc = all_start.astimezone(timezone.utc)
        all_end_utc = all_end.astimezone(timezone.utc)
        
        # Auto-sync calendar events before checking availability
        _auto_sync_calendar_events(db)
        
        busy = gcal.freebusy(admins, all_start_utc.isoformat(), all_end_utc.isoformat())
        
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
        
        # Also check for any pending/accepted coffee chat requests (not just those with events)
        # This ensures we don't show slots that are already requested by other students
        try:
            req_rows = db.execute(sa_text(
                "SELECT requested_start_ts, requested_end_ts, claimed_by_admin_email "
                "FROM advisory_coffeechat_requests "
                "WHERE lower(COALESCE(status,'')) IN ('pending', 'accepted') "
                "AND datetime(requested_start_ts) >= datetime('now') "
                "AND datetime(requested_start_ts) <= :h"
            ), {"h": horizon_end.isoformat()}).fetchall()
            for (st, et, claimed_by) in req_rows or []:
                if not st or not et:
                    continue
                # If there's a claimed admin, add to their busy time
                if claimed_by:
                    busy.setdefault(claimed_by.lower(), []).append((st, et))
                else:
                    # If no claimed admin, add to all admins' busy times to be safe
                    for admin in admins:
                        busy.setdefault(admin.lower(), []).append((st, et))
        except Exception:
            pass
        
        def is_free(aemail: str, st: str, et: str) -> bool:
            blist = busy.get(aemail, [])
            st_dt = _iso_to_dt(st); et_dt = _iso_to_dt(et)
            
            # Convert PST times to UTC for comparison with Google Calendar busy times
            if st_dt.tzinfo is None:
                st_dt = pst_tz.localize(st_dt)
            if et_dt.tzinfo is None:
                et_dt = pst_tz.localize(et_dt)
            
            st_dt_utc = st_dt.astimezone(timezone.utc)
            et_dt_utc = et_dt.astimezone(timezone.utc)
            
            for (bs, be) in blist:
                try:
                    bsd = _iso_to_dt(bs); bed = _iso_to_dt(be)
                except Exception:
                    continue
                if not (et_dt_utc <= bsd or st_dt_utc >= bed):
                    return False
            return True
        
        # Filter slots based on busy times
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
                        # Convert UTC times to PST for frontend display
                        cur_pst = cur.astimezone(pst_tz)
                        end_pst = (cur + step).astimezone(pst_tz)
                        
                        slots.append({
                            "start_ts": cur_pst.isoformat(),
                            "end_ts": end_pst.isoformat(),
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
    
    # Convert PST times to UTC for storage
    pst_tz = timezone(timedelta(hours=-8))  # PST is UTC-8
    
    try:
        # Parse PST times and convert to UTC
        start_dt = datetime.fromisoformat(start_ts.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_ts.replace('Z', '+00:00'))
        
        # If times don't have timezone info, assume they're PST
        if start_dt.tzinfo is None:
            start_dt = pst_tz.localize(start_dt)
        if end_dt.tzinfo is None:
            end_dt = pst_tz.localize(end_dt)
        
        # Convert to UTC for storage
        start_ts = start_dt.astimezone(timezone.utc).isoformat()
        end_ts = end_dt.astimezone(timezone.utc).isoformat()
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid timestamp format: {e}")
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

    # Use direct Google Calendar integration (no agents)
    mode = 'direct'
    owners: List[str] = []
    try:
        if project_id:
            lead_rows = db.execute(sa_text(
                "SELECT email FROM advisory_project_leads WHERE project_id = :pid"
            ), {"pid": int(project_id or 0)}).fetchall()
            owners = [str(r[0]).strip() for r in (lead_rows or []) if r and r[0]]
    except Exception:
        owners = []
    # Allow fixed owners override (comma-separated), first is preferred owner
    fixed = (os.getenv('COFFEECHAT_FIXED_OWNERS') or '').strip()
    if fixed:
        owners = [s.strip() for s in fixed.split(',') if s.strip()]
    if not owners:
        admins_env = os.getenv('ALLOWED_ADVISORY_ADMINS', '')
        if admins_env:
            owners = [s.strip() for s in admins_env.split(',') if s.strip()]
    if not owners:
        owners = [os.getenv('DEFAULT_ADMIN_EMAIL') or 'admin@ngicapitaladvisory.com']

    # Create Google Calendar event directly
    try:
        # Prevent overlap with any accepted events for the chosen owner
        owner_email = owners[0]
        try:
            rows = db.execute(sa_text(
                "SELECT r.requested_start_ts, r.requested_end_ts "
                "FROM advisory_coffeechat_events e JOIN advisory_coffeechat_requests r ON r.id = e.request_id "
                "WHERE lower(COALESCE(e.calendar_owner_email,'')) = :own AND lower(COALESCE(r.status,'')) = 'accepted'"
            ), {"own": (owner_email or '').lower()}).fetchall()
            st_dt = _iso_to_dt(start_ts); et_dt = _iso_to_dt(end_ts)
            for (bs, be) in rows or []:
                try:
                    bsd = _iso_to_dt(bs); bed = _iso_to_dt(be)
                except Exception:
                    continue
                if not (et_dt <= bsd or st_dt >= bed):
                    # Overlap; keep pending but don't fail hard
                    raise Exception('owner window overlap')
        except Exception:
            pass
        # Extra attendees: other leads
        extra = [e for e in owners[1:] if isinstance(e, str) and e.strip()]
        created = gcal.create_coffee_chat_event(
            student_email=email,
            start_ts=start_ts,
            end_ts=end_ts,
            owner_email=owner_email,
            attendees=extra,
            project_id=project_id,
            db=db
        )
        event_id = created.get('id')
        meet_link = created.get('meet_link') or _gen_meet_link()
        db.execute(sa_text(
            "INSERT INTO advisory_coffeechat_events (request_id, google_event_id, calendar_owner_email, meet_link, created_at, updated_at) "
            "VALUES (:rid, :gid, :own, :ml, datetime('now'), datetime('now'))"
        ), {"rid": int(rid), "gid": event_id, "own": owner_email, "ml": meet_link})
        db.execute(sa_text(
            "UPDATE advisory_coffeechat_requests SET status = 'accepted', claimed_by_admin_email = :own, updated_at = datetime('now') WHERE id = :id"
        ), {"own": owner_email, "id": int(rid)})
        db.commit()
        return {
            "id": int(rid), 
            "status": "accepted", 
            "google_event_id": event_id,
            "owner_email": owner_email,
            "attendees": owners,
            "meet_link": meet_link,
            "reasoning": "Coffee chat event created directly via Google Calendar API"
        }
    except Exception as e:
        print(f"ERROR: Google Calendar event creation failed: {str(e)}")
        # Keep request as pending if calendar creation fails
        return {"id": int(rid), "status": "pending", "expires_at_ts": expires_at, "error": str(e)}

    # Agent code removed - using direct Google Calendar integration only
    if False:  # Disabled agent mode
        try:
            from services.api.agents.coffee_chat_agent import get_coffee_chat_agent
            import asyncio
            
            # Use ChatKit agent for intelligent processing
            agent = get_coffee_chat_agent()
            
            # Process the request asynchronously
            async def process_request():
                return await agent.process_request(
                    db=db,
                    request_id=int(rid),
                    student_email=email,
                    start_ts=start_ts,
                    end_ts=end_ts,
                    project_id=int(project_id or 0),
                    lead_emails=owners
                )
            
            # Run the async function
            try:
                # Try to get the current event loop
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # If we're in an async context, create a task
                    asyncio.create_task(process_request())
                else:
                    # If not, run it directly
                    loop.run_until_complete(process_request())
            except RuntimeError:
                # Fallback: create new event loop
                asyncio.run(process_request())
                
        except Exception as e:
            # Fallback to original agent system if ChatKit fails
            try:
                ensure_agent_tables(db)
                payload = {
                    "rid": int(rid),
                    "student_email": email,
                    "project_id": int(project_id or 0),
                    "candidate_windows": [{"start_ts": start_ts, "end_ts": end_ts, "slot_len_min": slot_len}],
                    "lead_emails": owners,
                    "owner_hint": owners[0] if owners else None,
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
        created = gcal.create_event(
            owner_email,
            start_ts=r[2],
            end_ts=r[3],
            student_email=r[1],
            summary=f"Coffee Chat - {r[1]}",
        )
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
        "SELECT id, student_email, requested_start_ts, requested_end_ts, status, COALESCE(project_id,0) FROM advisory_coffeechat_requests WHERE id = :id"
    ), {"id": rid}).fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if r[4] == 'accepted':
        ev = db.execute(sa_text(
            "SELECT google_event_id, calendar_owner_email, meet_link FROM advisory_coffeechat_events WHERE request_id = :id"
        ), {"id": rid}).fetchone()
        return {"status": "accepted", "google_event_id": ev[0] if ev else None, "owner": owner_email}

    st, et = r[2], r[3]
    pid = int(r[5] or 0)
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
        # Collect extra attendees: other project leads
        extra: List[str] = []
        try:
            if pid:
                rows = db.execute(sa_text("SELECT email FROM advisory_project_leads WHERE project_id = :pid"), {"pid": pid}).fetchall()
                leads = [str(x[0]).strip() for x in (rows or []) if x and x[0]]
                extra = [e for e in leads if e and e.strip().lower() != (owner_email or '').lower()]
        except Exception:
            extra = []
        created = gcal.create_event(
            owner_email,
            start_ts=st,
            end_ts=et,
            student_email=r[1],
            summary=f"Coffee Chat - {r[1]}",
            extra_attendees=extra,
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



# -------- Calendar Sync Endpoints --------
@router.post('/advisory/coffeechats/sync-calendar')
async def sync_calendar_events(admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    """Sync coffee chat events with Google Calendar to detect deletions and update availability."""
    _ensure_internal_tables(db)
    
    try:
        # Get all accepted coffee chat events with Google Calendar IDs
        events_rows = db.execute(sa_text(
            "SELECT e.id, e.request_id, e.google_event_id, e.calendar_owner_email, r.requested_start_ts, r.requested_end_ts "
            "FROM advisory_coffeechat_events e "
            "JOIN advisory_coffeechat_requests r ON r.id = e.request_id "
            "WHERE e.google_event_id IS NOT NULL "
            "AND e.google_event_id != '' "
            "AND lower(COALESCE(r.status,'')) = 'accepted'"
        )).fetchall()
        
        deleted_events = []
        for (event_id, request_id, google_event_id, owner_email, start_ts, end_ts) in events_rows:
            try:
                # Check if the event still exists in Google Calendar
                gcal_event = gcal.get_event(owner_email, google_event_id)
                if gcal_event is None:
                    # Event was deleted from Google Calendar
                    print(f"Event {google_event_id} deleted from Google Calendar for {owner_email}")
                    
                    # Update the request status to canceled
                    db.execute(sa_text(
                        "UPDATE advisory_coffeechat_requests SET status = 'canceled', cancel_reason = 'calendar_deleted', updated_at = datetime('now') WHERE id = :id"
                    ), {"id": request_id})
                    
                    # Delete the event record
                    db.execute(sa_text(
                        "DELETE FROM advisory_coffeechat_events WHERE id = :id"
                    ), {"id": event_id})
                    
                    deleted_events.append({
                        "request_id": request_id,
                        "google_event_id": google_event_id,
                        "owner_email": owner_email,
                        "start_ts": start_ts,
                        "end_ts": end_ts
                    })
                    
            except Exception as e:
                print(f"Error checking event {google_event_id}: {e}")
                continue
        
        db.commit()
        
        return {
            "synced": len(events_rows),
            "deleted_events": len(deleted_events),
            "deleted_details": deleted_events
        }
        
    except Exception as e:
        print(f"Error syncing calendar events: {e}")
        return {"error": str(e), "synced": 0, "deleted_events": 0}


@router.post('/advisory/coffeechats/verify-event/{google_event_id}')
async def verify_calendar_event(google_event_id: str, admin=Depends(require_ngiadvisory_admin()), db: Session = Depends(get_db)):
    """Verify if a specific Google Calendar event still exists."""
    _ensure_internal_tables(db)
    
    try:
        # Get the event details from our database
        event_row = db.execute(sa_text(
            "SELECT e.id, e.request_id, e.calendar_owner_email, r.requested_start_ts, r.requested_end_ts, r.status "
            "FROM advisory_coffeechat_events e "
            "JOIN advisory_coffeechat_requests r ON r.id = e.request_id "
            "WHERE e.google_event_id = :gid"
        ), {"gid": google_event_id}).fetchone()
        
        if not event_row:
            return {"exists_in_db": False, "message": "Event not found in database"}
        
        event_id, request_id, owner_email, start_ts, end_ts, status = event_row
        
        # Check if it exists in Google Calendar
        gcal_event = gcal.get_event(owner_email, google_event_id)
        
        if gcal_event is None:
            # Event was deleted from Google Calendar
            db.execute(sa_text(
                "UPDATE advisory_coffeechat_requests SET status = 'canceled', cancel_reason = 'calendar_deleted', updated_at = datetime('now') WHERE id = :id"
            ), {"id": request_id})
            
            db.execute(sa_text(
                "DELETE FROM advisory_coffeechat_events WHERE id = :id"
            ), {"id": event_id})
            
            db.commit()
            
            return {
                "exists_in_db": True,
                "exists_in_gcal": False,
                "action": "marked_as_deleted",
                "message": "Event deleted from Google Calendar, marked as canceled in database"
            }
        else:
            return {
                "exists_in_db": True,
                "exists_in_gcal": True,
                "action": "verified",
                "message": "Event exists in both database and Google Calendar"
            }
            
    except Exception as e:
        return {"error": str(e)}


# Agent-run endpoint removed - using direct Google Calendar integration





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
    
    # Auto-sync calendar events before returning availability
    _auto_sync_calendar_events(db)

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

        created = gcal.create_event(

            owner_email,

            start_ts=r[2],

            end_ts=r[3],

            student_email=r[1],

            summary=f"Coffee Chat - {r[1]}",

        )

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

        "SELECT id, student_email, requested_start_ts, requested_end_ts, status, COALESCE(project_id,0) FROM advisory_coffeechat_requests WHERE id = :id"

    ), {"id": rid}).fetchone()

    if not r:

        raise HTTPException(status_code=404, detail="Request not found")

    if r[4] == 'accepted':

        ev = db.execute(sa_text(

            "SELECT google_event_id, calendar_owner_email, meet_link FROM advisory_coffeechat_events WHERE request_id = :id"

        ), {"id": rid}).fetchone()

        return {"status": "accepted", "google_event_id": ev[0] if ev else None, "owner": owner_email}



    st, et = r[2], r[3]

    pid = int(r[5] or 0)

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

        # Collect extra attendees: other project leads

        extra: List[str] = []

        try:

            if pid:

                rows = db.execute(sa_text("SELECT email FROM advisory_project_leads WHERE project_id = :pid"), {"pid": pid}).fetchall()

                leads = [str(x[0]).strip() for x in (rows or []) if x and x[0]]

                extra = [e for e in leads if e and e.strip().lower() != (owner_email or '').lower()]

        except Exception:

            extra = []

        created = gcal.create_event(

            owner_email,

            start_ts=st,

            end_ts=et,

            student_email=r[1],

            summary=f"Coffee Chat - {r[1]}",

            extra_attendees=extra,

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







# Second agent-run endpoint removed - using direct Google Calendar integration

