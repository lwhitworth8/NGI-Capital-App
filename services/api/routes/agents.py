"""
Agents Router: Webhooks and utilities to integrate external workflow agents
for Coffee Chat scheduling and Applications triage.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text
from datetime import datetime
import hashlib
import hmac
import json
import os
import urllib.request
import urllib.error

from services.api.database import get_db
from services.api.agent_client import ensure_agent_tables

router = APIRouter()


def _require_agent_signature(request: Request, body: bytes) -> None:
    secret = (os.getenv('AGENT_WEBHOOK_SECRET') or '').encode('utf-8')
    if not secret:
        # In dev, allow empty secret; in prod, enforce
        return
    provided = request.headers.get('X-Agent-Signature') or ''
    if not provided:
        raise HTTPException(status_code=401, detail='Missing signature')
    mac = hmac.new(secret, body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(provided, mac):
        raise HTTPException(status_code=401, detail='Invalid signature')


@router.post('/agents/webhooks/scheduler')
async def agent_webhook_scheduler(request: Request, db: Session = Depends(get_db)):
    ensure_agent_tables(db)
    body = await request.body()
    _require_agent_signature(request, body)
    try:
        payload = json.loads(body.decode('utf-8'))
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid JSON')

    run_id = int(payload.get('run_id') or 0)
    decision = payload.get('decision') or {}
    target_type = str(payload.get('target_type') or '')
    target_id = int(payload.get('target_id') or 0)

    # Persist output on the run
    try:
        db.execute(sa_text(
            "UPDATE agent_runs SET status = :st, output_json = :out, updated_at = :now WHERE id = :id"
        ), {"st": str(payload.get('status') or 'completed'), "out": json.dumps(decision), "now": datetime.utcnow().isoformat(), "id": run_id})
    except Exception:
        pass

    # Apply scheduler result to coffeechat request
    if target_type == 'coffeechat_request' and target_id:
        dtype = str(decision.get('type') or '').lower()
        owner = decision.get('owner_email') or os.getenv('DEFAULT_ADMIN_EMAIL') or ''
        st = decision.get('start_ts'); et = decision.get('end_ts')
        gid = decision.get('google_event_id') or None
        meet = decision.get('meet_link') or None
        if dtype == 'accepted' and st and et and owner:
            try:
                # Insert event and mark accepted
                db.execute(sa_text(
                    "INSERT INTO advisory_coffeechat_events (request_id, google_event_id, calendar_owner_email, meet_link, created_at, updated_at) "
                    "VALUES (:rid, :gid, :own, :ml, datetime('now'), datetime('now'))"
                ), {"rid": target_id, "gid": gid, "own": owner, "ml": meet})
            except Exception:
                pass
            try:
                db.execute(sa_text(
                    "UPDATE advisory_coffeechat_requests SET status = 'accepted', claimed_by_admin_email = :own, updated_at = datetime('now') WHERE id = :id"
                ), {"own": owner, "id": target_id})
            except Exception:
                pass
            db.commit()
        else:
            # For 'proposed' or other types, we leave the record pending; UI can display agent proposals from agent_runs.output_json
            pass

    return {"ok": True}


@router.post('/agents/webhooks/triage')
async def agent_webhook_triage(request: Request, db: Session = Depends(get_db)):
    ensure_agent_tables(db)
    body = await request.body()
    _require_agent_signature(request, body)
    try:
        payload = json.loads(body.decode('utf-8'))
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid JSON')

    run_id = int(payload.get('run_id') or 0)
    result = payload.get('result') or {}
    target_type = str(payload.get('target_type') or '')
    target_id = int(payload.get('target_id') or 0)

    try:
        db.execute(sa_text(
            "UPDATE agent_runs SET status = :st, output_json = :out, updated_at = :now WHERE id = :id"
        ), {"st": str(payload.get('status') or 'completed'), "out": json.dumps(result), "now": datetime.utcnow().isoformat(), "id": run_id})
    except Exception:
        pass

    if target_type == 'application' and target_id:
        score = None
        try:
            score = float(result.get('score'))
        except Exception:
            score = None
        try:
            db.execute(sa_text(
                "UPDATE advisory_applications SET triage_score = :sc, triage_json = :js WHERE id = :id"
            ), {"sc": score, "js": json.dumps(result), "id": target_id})
            db.commit()
        except Exception:
            pass

    return {"ok": True}


@router.get('/agents/inputs/scheduler/latest')
async def get_latest_scheduler_input(db: Session = Depends(get_db)):
    """Return the most recent queued scheduler input payload for Agent Builder Evaluate."""
    ensure_agent_tables(db)
    row = db.execute(sa_text(
        "SELECT id, input_json FROM agent_runs WHERE workflow = 'scheduler' ORDER BY id DESC LIMIT 1"
    )).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='No scheduler runs found')
    try:
        import json as _json
        payload = _json.loads(row[1] or '{}')
    except Exception:
        payload = {}
    return {"run_id": int(row[0] or 0), "input": payload}


@router.post('/agents/chatkit/session')
async def chatkit_create_session(request: Request):
    """Create a ChatKit session via OpenAI REST and return { client_secret }.

    Body (optional):
      { "user": "<deviceId-or-userId>", "workflow_id": "wf_...", "version": "1" }

    Env:
      - OPENAI_API_KEY or OPENAI_WORKFLOWS_API_KEY
      - OPENAI_PROJECT (optional; sets OpenAI-Project header)
      - CHATKIT_WORKFLOW_ID (default if not provided in body)
      - CHATKIT_WORKFLOW_VERSION (default version, e.g., "1")
    """
    try:
        body = await request.body()
        payload = json.loads(body.decode('utf-8') or '{}') if body else {}
    except Exception:
        payload = {}

    api_key = os.getenv('OPENAI_API_KEY') or os.getenv('OPENAI_WORKFLOWS_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail='OPENAI_API_KEY not configured')

    wid = (payload.get('workflow_id') or payload.get('workflow') or os.getenv('CHATKIT_WORKFLOW_ID') or os.getenv('WORKFLOW_SCHEDULER_ID') or '').strip()
    if isinstance(wid, dict):
        wid = wid.get('id') or ''
    version = str(payload.get('version') or os.getenv('CHATKIT_WORKFLOW_VERSION') or '1').strip()
    user = str(payload.get('user') or payload.get('device_id') or '').strip() or request.client.host if request.client else 'anon'

    if not wid:
        raise HTTPException(status_code=400, detail='workflow_id is required')

    url = 'https://api.openai.com/v1/chatkit/sessions'
    body_out = {
        'workflow': {'id': wid, 'version': version},
        'user': user,
    }
    data = json.dumps(body_out).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Authorization', f'Bearer {api_key}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('OpenAI-Beta', 'chatkit_beta=v1')
    proj = os.getenv('OPENAI_PROJECT')
    if proj:
        req.add_header('OpenAI-Project', proj)
    org = os.getenv('OPENAI_ORG') or os.getenv('OPENAI_ORGANIZATION')
    if org:
        req.add_header('OpenAI-Organization', org)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read().decode('utf-8')
            js = json.loads(raw)
            cs = js.get('client_secret')
            if not cs:
                raise ValueError('No client_secret in response')
            return {'client_secret': cs}
    except urllib.error.HTTPError as he:  # type: ignore
        try:
            err = he.read().decode('utf-8')
        except Exception:
            err = str(he)
        raise HTTPException(status_code=he.code, detail=err)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/agents/tools/sign')
async def agent_tools_sign(request: Request):
    """DEV ONLY: returns HMAC hex signature for the posted raw body.
    Enabled only when DEBUG_AGENT_TOOLS=1.
    """
    if (os.getenv('DEBUG_AGENT_TOOLS') or '').strip() != '1':
        raise HTTPException(status_code=404, detail='Not found')
    body = await request.body()
    secret = (os.getenv('AGENT_WEBHOOK_SECRET') or '').encode('utf-8')
    mac = hmac.new(secret, body, hashlib.sha256).hexdigest()
    return {"signature": mac}


@router.get('/agents/runs')
async def list_agent_runs(limit: int = 50, db: Session = Depends(get_db)):
    """List recent agent runs for diagnostics."""
    ensure_agent_tables(db)
    try:
        limit = max(1, min(200, int(limit)))
    except Exception:
        limit = 50
    rows = db.execute(sa_text(
        "SELECT id, workflow, target_type, target_id, status, created_at, updated_at FROM agent_runs ORDER BY id DESC LIMIT :lim"
    ), {"lim": limit}).fetchall()
    return [
        {
            "id": r[0],
            "workflow": r[1],
            "target_type": r[2],
            "target_id": r[3],
            "status": r[4],
            "created_at": r[5],
            "updated_at": r[6],
        }
        for r in rows
    ]


@router.get('/agents/runs/{run_id}')
async def get_agent_run(run_id: int, db: Session = Depends(get_db)):
    """Fetch a single agent run with input/output for debugging."""
    ensure_agent_tables(db)
    row = db.execute(sa_text(
        "SELECT id, workflow, target_type, target_id, status, input_json, output_json, error, created_at, updated_at FROM agent_runs WHERE id = :id"
    ), {"id": run_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    return {
        "id": row[0],
        "workflow": row[1],
        "target_type": row[2],
        "target_id": row[3],
        "status": row[4],
        "input_json": row[5],
        "output_json": row[6],
        "error": row[7],
        "created_at": row[8],
        "updated_at": row[9],
    }
