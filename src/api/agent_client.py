"""
Agent client scaffolding for launching OpenAI Workflow runs and recording them.

This module provides minimal helpers to create an agent run record and (optionally)
dispatch a request to an external workflow service if configured. For now, we
optimistically record the run and rely on webhooks to deliver results.
"""

from __future__ import annotations

from typing import Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text
from datetime import datetime
import os
import json
import urllib.request
import urllib.error


def ensure_agent_tables(db: Session) -> None:
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS agent_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow TEXT NOT NULL,
            target_type TEXT NOT NULL,
            target_id INTEGER NOT NULL,
            status TEXT DEFAULT 'created',
            input_json TEXT,
            output_json TEXT,
            error TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS agent_run_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER NOT NULL,
            type TEXT,
            payload_json TEXT,
            ts TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    db.commit()


def start_agent_run(db: Session, *, workflow: str, target_type: str, target_id: int, input_payload: Dict[str, Any]) -> int:
    """Create an agent run record and optionally dispatch to external workflow service."""
    ensure_agent_tables(db)
    db.execute(sa_text(
        "INSERT INTO agent_runs (workflow, target_type, target_id, status, input_json, created_at, updated_at) "
        "VALUES (:wf, :tt, :tid, 'queued', :inp, :now, :now)"
    ), {
        "wf": workflow,
        "tt": target_type,
        "tid": int(target_id),
        "inp": json.dumps(input_payload or {}),
        "now": datetime.utcnow().isoformat(),
    })
    run_id = int(db.execute(sa_text("SELECT last_insert_rowid()"), {}).scalar() or 0)
    db.commit()

    # Optional: dispatch to external workflow runner (placeholder)
    base_url = os.getenv('OPENAI_WORKFLOWS_BASE_URL')
    api_key = os.getenv('OPENAI_WORKFLOWS_API_KEY')
    # Resolve concrete workflow id
    wf_id_env = None
    if workflow == 'scheduler':
        wf_id_env = os.getenv('WORKFLOW_SCHEDULER_ID')
    elif workflow == 'triage':
        wf_id_env = os.getenv('WORKFLOW_TRIAGE_ID')
    wf_id = wf_id_env or workflow
    if base_url and api_key and wf_id:
        try:
            # Attach callback hints if not present
            cb = input_payload.get('callback') or {}
            if 'url' not in cb:
                # Default to scheduler; caller should pass explicitly
                cb = {"url": "/api/agents/webhooks/%s" % (workflow,)}
                input_payload['callback'] = cb
            # Build request
            url = base_url.rstrip('/') + f"/workflows/{wf_id}/runs"
            input_key = os.getenv('WORKFLOW_INPUT_KEY') or 'input'
            # Some builders expose a single string input only (e.g., input_as_text)
            if input_key == 'input_as_text':
                body = {"input": {"input_as_text": json.dumps(input_payload)}}
            else:
                body = {"input": input_payload}
            data = json.dumps(body).encode('utf-8')
            req = urllib.request.Request(url, data=data, method='POST')
            req.add_header('Authorization', f"Bearer {api_key}")
            req.add_header('Content-Type', 'application/json')
            # Optional: pass webhook secret header for convenience
            secret = os.getenv('AGENT_WEBHOOK_SECRET') or ''
            if secret:
                req.add_header('X-Callback-Secret', secret)
            with urllib.request.urlopen(req, timeout=10) as resp:
                _ = resp.read()
            # Mark as dispatched
            db.execute(sa_text(
                "UPDATE agent_runs SET status = 'dispatched', updated_at = :now WHERE id = :id"
            ), {"now": datetime.utcnow().isoformat(), "id": run_id})
            db.commit()
        except Exception as e:
            try:
                db.execute(sa_text(
                    "UPDATE agent_runs SET status = 'error', error = :err, updated_at = :now WHERE id = :id"
                ), {"err": str(e), "now": datetime.utcnow().isoformat(), "id": run_id})
                db.commit()
            except Exception:
                pass

    return run_id


def append_run_event(db: Session, *, run_id: int, type_: str, payload: Dict[str, Any]) -> None:
    db.execute(sa_text(
        "INSERT INTO agent_run_events (run_id, type, payload_json, ts) VALUES (:rid, :ty, :pl, :ts)"
    ), {"rid": int(run_id), "ty": type_, "pl": json.dumps(payload or {}), "ts": datetime.utcnow().isoformat()})
    db.commit()
