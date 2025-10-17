"""
Local smoketest of Coffee Chat agent callback flow using FastAPI TestClient.

This does not call OpenAI; it exercises:
  - Admin adds availability
  - Student creates a request
  - Simulated agent webhook marks it accepted

Usage:
  python scripts/coffeechat_smoketest.py

Environment used:
  OPEN_NON_ACCOUNTING=1           (bypass admin auth)
  AGENT_WEBHOOK_SECRET (optional; if set, this script computes signature)
"""

from __future__ import annotations

import os
import hmac
import hashlib
import json
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Ensure repo root on sys.path
_here = Path(__file__).resolve().parent
_root = _here.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

# Set dev flags before importing app
os.environ.setdefault("OPEN_NON_ACCOUNTING", "1")

from services.api.main import app  # type: ignore  # noqa: E402


def _iso_in(minutes: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).isoformat(timespec="seconds")


def _sign(body: bytes) -> str | None:
    secret = os.getenv("AGENT_WEBHOOK_SECRET", "").encode("utf-8")
    if not secret:
        return None
    return hmac.new(secret, body, hashlib.sha256).hexdigest()


def main() -> int:
    client = TestClient(app)

    # 1) Admin adds availability
    st = _iso_in(60)
    et = _iso_in(90)
    r1 = client.post("/api/advisory/coffeechats/availability", json={
        "start_ts": st,
        "end_ts": et,
        "slot_len_min": 30,
    })
    assert r1.status_code == 200, r1.text

    # 2) Student lists availability and creates request
    av = client.get("/api/public/coffeechats/availability").json()
    assert isinstance(av, dict) and "slots" in av and len(av["slots"]) > 0
    slot = av["slots"][0]
    student_email = f"student{int(datetime.now(timezone.utc).timestamp())}@berkeley.edu"
    sreq = client.post(
        "/api/public/coffeechats/requests",
        headers={"X-Student-Email": student_email},
        json={
            "start_ts": slot["start_ts"],
            "end_ts": slot["end_ts"],
            "slot_len_min": slot.get("slot_len_min", 30),
        },
    )
    assert sreq.status_code == 200, sreq.text
    rid = int(sreq.json()["id"])

    # 3) Simulated Agent webhook accept
    decision = {
        "run_id": 1,
        "status": "completed",
        "target_type": "coffeechat_request",
        "target_id": rid,
        "decision": {
            "type": "accepted",
            "owner_email": os.getenv("DEFAULT_ADMIN_EMAIL", "admin@ngicapitaladvisory.com"),
            "start_ts": slot["start_ts"],
            "end_ts": slot["end_ts"],
            "google_event_id": "mock-local",
            "meet_link": "https://meet.google.com/mock-local",
        },
    }
    raw = json.dumps(decision).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    sig = _sign(raw)
    if sig:
        headers["X-Agent-Signature"] = sig
    wh = client.post("/api/agents/webhooks/scheduler", data=raw, headers=headers)
    assert wh.status_code == 200, wh.text

    # 4) Verify accepted status
    reqs = client.get("/api/advisory/coffeechats/requests", params={"status": "accepted"}).json()
    assert any(r.get("id") == rid for r in reqs), "accepted request not found"
    print({"ok": True, "rid": rid, "accepted": True})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
