"""
Google Calendar integration helpers (service account with domain-wide delegation).

This module gracefully degrades to mock behavior when credentials are not
configured, so development and tests can run without Google access.

Configuration (environment variables):
- ENABLE_GCAL=1                       # turn on real Google calls (default off)
- GOOGLE_SERVICE_ACCOUNT_JSON=...     # path to JSON file or inline JSON
- GOOGLE_IMPERSONATE_SUBJECT=...      # email to impersonate (e.g., accepting admin)
- GOOGLE_CALENDAR_IDS=...             # comma-separated mappings: email=calendarId

Example: GOOGLE_CALENDAR_IDS="lwhitworth@ngicapitaladvisory.com=primary,anurmamade@ngicapitaladvisory.com=primary"
"""

from __future__ import annotations

import os
import json
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime

_GCAL_ENABLED = str(os.getenv("ENABLE_GCAL", "0")).strip().lower() in ("1", "true", "yes")

def _load_credentials(subject_email: Optional[str] = None):
    """Load service account credentials with optional domain-wide delegation."""
    if not _GCAL_ENABLED:
        return None, None
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        scopes = [
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/calendar.readonly",
        ]
        raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        info: Optional[Dict[str, Any]] = None
        if raw and os.path.isfile(raw):
            with open(raw, "r", encoding="utf-8") as f:
                info = json.load(f)
        elif raw:
            try:
                info = json.loads(raw)
            except Exception:
                info = None
        if not info:
            return None, None
        creds = service_account.Credentials.from_service_account_info(info, scopes=scopes)
        subj = subject_email or os.getenv("GOOGLE_IMPERSONATE_SUBJECT")
        if subj:
            creds = creds.with_subject(subj)
        svc = build("calendar", "v3", credentials=creds, cache_discovery=False)
        return creds, svc
    except Exception:
        return None, None


def _calendar_id_for(email: str) -> str:
    mapping = os.getenv("GOOGLE_CALENDAR_IDS", "")
    if mapping:
        for part in mapping.split(","):
            if not part.strip():
                continue
            try:
                k, v = part.split("=", 1)
            except ValueError:
                continue
            if k.strip().lower() == email.strip().lower():
                return v.strip() or "primary"
    return "primary"


def freebusy(emails: List[str], time_min: str, time_max: str) -> Dict[str, List[Tuple[str, str]]]:
    """Return busy intervals per email as list of (start,end) ISO strings.
    If Google is not enabled/available, return empty busy lists.
    """
    if not _GCAL_ENABLED:
        return {e: [] for e in emails}
    _creds, svc = _load_credentials()
    if svc is None:
        return {e: [] for e in emails}
    # Build items list with calendar ids
    items = [{"id": _calendar_id_for(e)} for e in emails]
    try:
        body = {"timeMin": time_min, "timeMax": time_max, "items": items}
        resp = svc.freebusy().query(body=body).execute()
        cal_dict = resp.get("calendars", {})
        out: Dict[str, List[Tuple[str, str]]] = {}
        for idx, e in enumerate(emails):
            cid = items[idx]["id"]
            busy = cal_dict.get(cid, {}).get("busy", [])
            out[e] = [(b.get("start"), b.get("end")) for b in busy if b.get("start") and b.get("end")]
        return out
    except Exception:
        return {e: [] for e in emails}


def create_event(owner_email: str, *, start_ts: str, end_ts: str, student_email: str, summary: str, description: str = "") -> Dict[str, Any]:
    """Create a Google Calendar event with a Meet link. Returns {id, meet_link}.
    Falls back to mock event when Google is not configured.
    """
    if not _GCAL_ENABLED:
        # Mock event id and link
        import secrets
        return {"id": f"mock-{secrets.token_hex(6)}", "meet_link": f"https://meet.google.com/{secrets.token_hex(3)}"}
    _creds, svc = _load_credentials(owner_email)
    if svc is None:
        import secrets
        return {"id": f"mock-{secrets.token_hex(6)}", "meet_link": f"https://meet.google.com/{secrets.token_hex(3)}"}
    try:
        event = {
            "summary": summary,
            "description": description or "This coffee chat will be over Google Meet.",
            "start": {"dateTime": start_ts},
            "end": {"dateTime": end_ts},
            "attendees": [
                {"email": owner_email},
                {"email": student_email},
            ],
            "conferenceData": {
                "createRequest": {
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                    "requestId": f"ngi-coffee-{int(datetime.utcnow().timestamp())}"
                }
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "popup", "minutes": 24*60},
                    {"method": "popup", "minutes": 10},
                ],
            },
        }
        cal_id = _calendar_id_for(owner_email)
        created = svc.events().insert(calendarId=cal_id, body=event, conferenceDataVersion=1).execute()
        eid = created.get("id")
        hangout_link = created.get("hangoutLink") or (created.get("conferenceData", {}).get("entryPoints", [{}])[0].get("uri"))
        return {"id": eid, "meet_link": hangout_link}
    except Exception:
        import secrets
        return {"id": f"mock-{secrets.token_hex(6)}", "meet_link": f"https://meet.google.com/{secrets.token_hex(3)}"}

