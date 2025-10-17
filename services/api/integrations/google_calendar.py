"""
Google Calendar integration helpers (OAuth 2.0 authentication for 2025).

This module uses OAuth 2.0 authentication as required by Google Calendar API v3
for creating events and sending invites. It gracefully degrades to mock behavior 
when credentials are not configured.

Configuration (environment variables):
- ENABLE_GCAL=1                       # turn on real Google calls (default off)
- GOOGLE_CREDENTIALS_JSON=...         # path to OAuth 2.0 credentials JSON file
- GOOGLE_TOKEN_JSON=...               # path to stored token JSON file (optional)
- GOOGLE_CALENDAR_IDS=...             # comma-separated mappings: email=calendarId

Example: GOOGLE_CALENDAR_IDS="lwhitworth@ngicapitaladvisory.com=primary,anurmamade@ngicapitaladvisory.com=primary"

OAuth 2.0 Setup (Required for creating events and sending invites):
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID (Desktop application)
3. Download credentials.json file
4. Set GOOGLE_CREDENTIALS_JSON=path/to/credentials.json
5. Enable Google Calendar API in your project
6. Set up OAuth consent screen

Note: API keys cannot be used for creating events or sending invites.
Only OAuth 2.0 authentication allows full calendar management.
"""

from __future__ import annotations

import os
import json
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime

_GCAL_ENABLED = str(os.getenv("ENABLE_GCAL", "0")).strip().lower() in ("1", "true", "yes")

def _load_credentials():
    """Load Google Calendar API credentials (OAuth 2.0 preferred, API key fallback)."""
    if not _GCAL_ENABLED:
        return None, None
    
    try:
        from googleapiclient.discovery import build
        
        # Try OAuth 2.0 authentication first (required for creating events)
        try:
            from google_auth_oauthlib.flow import InstalledAppFlow
            from google.auth.transport.requests import Request
            from google.oauth2.credentials import Credentials
            
            # OAuth 2.0 scopes required for calendar management
            SCOPES = ['https://www.googleapis.com/auth/calendar']
            
            creds = None
            token_file = os.getenv("GOOGLE_TOKEN_JSON", "token.json")
            credentials_file = os.getenv("GOOGLE_CREDENTIALS_JSON", "credentials.json")
            
            # Load existing token if available
            if os.path.exists(token_file):
                print(f"INFO: Loading existing OAuth 2.0 token from {token_file}")
                creds = Credentials.from_authorized_user_file(token_file, SCOPES)
            
            # If there are no (valid) credentials available, let the user log in
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    print("INFO: Refreshing expired OAuth 2.0 token")
                    creds.refresh(Request())
                else:
                    if not os.path.exists(credentials_file):
                        print(f"WARNING: OAuth 2.0 credentials file not found: {credentials_file}")
                        raise Exception("OAuth 2.0 credentials not available")
                    
                    print(f"INFO: Starting OAuth 2.0 flow with {credentials_file}")
                    flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
                    creds = flow.run_local_server(port=0)
                
                # Save the credentials for the next run
                with open(token_file, 'w') as token:
                    token.write(creds.to_json())
                print(f"INFO: OAuth 2.0 token saved to {token_file}")
            
            # Build the service with OAuth 2.0
            service = build('calendar', 'v3', credentials=creds, cache_discovery=False)
            print("INFO: Google Calendar API service initialized with OAuth 2.0")
            return creds, service
            
        except Exception as oauth_error:
            print(f"WARNING: OAuth 2.0 authentication failed: {str(oauth_error)}")
            print("Falling back to API key authentication (read-only)...")
            
            # Fall back to API key authentication (read-only)
            api_key = os.getenv("GOOGLE_API_KEY")
            if api_key:
                print("INFO: Using Google API key authentication (read-only)")
                service = build("calendar", "v3", developerKey=api_key, cache_discovery=False)
                return None, service
            else:
                print("ERROR: No Google API key found")
                return None, None
        
    except Exception as e:
        print(f"ERROR: Failed to load Google Calendar credentials: {str(e)}")
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


def create_event(owner_email: str, *, start_ts: str, end_ts: str, student_email: str, summary: str, description: str = "", extra_attendees: Optional[List[str]] = None) -> Dict[str, Any]:
    """Create a Google Calendar event with Google Meet link using OAuth 2.0 authentication.
    Returns {id, meet_link, htmlLink}.
    Falls back to mock event when Google is not configured.
    """
    if not _GCAL_ENABLED:
        # Mock event id and link
        import secrets
        return {"id": f"mock-{secrets.token_hex(6)}", "meet_link": f"https://meet.google.com/{secrets.token_hex(3)}", "htmlLink": f"https://calendar.google.com/event?eid={secrets.token_hex(8)}"}
    
    _creds, svc = _load_credentials()
    if svc is None:
        print("ERROR: Google Calendar service not available")
        import secrets
        return {"id": f"mock-{secrets.token_hex(6)}", "meet_link": f"https://meet.google.com/{secrets.token_hex(3)}", "htmlLink": f"https://calendar.google.com/event?eid={secrets.token_hex(8)}"}
    
    # API key authentication - create events using the API
    # Note: API keys can create events but may have limitations
    
    try:
        print(f"INFO: Creating Google Calendar event for {owner_email} with {student_email}")
        
        # Build attendees list: owner + student + extras
        attendees = [
            {"email": owner_email, "responseStatus": "accepted"},
            {"email": student_email, "responseStatus": "needsAction"},
        ]
        for x in (extra_attendees or []):
            try:
                sx = str(x).strip()
                if sx and sx.lower() not in {owner_email.lower(), student_email.lower()}:
                    attendees.append({"email": sx, "responseStatus": "needsAction"})
            except Exception:
                continue

        # Convert UTC times to Pacific time for Google Calendar
        try:
            import pytz
            pacific_tz = pytz.timezone('America/Los_Angeles')
        except ImportError:
            # Fallback to basic timezone if pytz not available
            from datetime import timezone, timedelta
            pacific_tz = timezone(timedelta(hours=-8))  # PST is UTC-8
        
        # Parse the UTC timestamps and convert to Pacific time
        start_dt = datetime.fromisoformat(start_ts.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_ts.replace('Z', '+00:00'))
        
        # Convert to Pacific time
        if hasattr(pacific_tz, 'localize'):
            start_pacific = pacific_tz.localize(start_dt.replace(tzinfo=None))
            end_pacific = pacific_tz.localize(end_dt.replace(tzinfo=None))
        else:
            start_pacific = start_dt.astimezone(pacific_tz)
            end_pacific = end_dt.astimezone(pacific_tz)
        
        # Create event with Google Meet conference
        event = {
            "summary": summary,
            "description": description or f"Coffee chat meeting between {owner_email} and {student_email}. This meeting will be conducted via Google Meet.",
            "start": {
                "dateTime": start_pacific.isoformat(),
                "timeZone": "America/Los_Angeles"  # PST/PDT timezone
            },
            "end": {
                "dateTime": end_pacific.isoformat(),
                "timeZone": "America/Los_Angeles"  # PST/PDT timezone
            },
            "attendees": attendees,
            "conferenceData": {
                "createRequest": {
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                    "requestId": f"ngi-coffee-{int(datetime.utcnow().timestamp())}"
                }
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "email", "minutes": 24 * 60},  # 24 hours before
                    {"method": "popup", "minutes": 10},       # 10 minutes before
                ],
            },
            "guestsCanModify": False,
            "guestsCanInviteOthers": False,
            "guestsCanSeeOtherGuests": True,
        }
        
        cal_id = _calendar_id_for(owner_email)
        print(f"INFO: Inserting event into calendar {cal_id}")
        
        # Insert event with conference data using exact API v3 specification
        # Note: API keys may have limitations with sendUpdates parameter
        try:
            created = svc.events().insert(
                calendarId=cal_id, 
                body=event, 
                conferenceDataVersion=1,
                sendUpdates='all'  # Send email invitations to all attendees
            ).execute()
        except Exception as api_error:
            print(f"WARNING: Event creation with sendUpdates failed: {str(api_error)}")
            # Try without sendUpdates parameter
            created = svc.events().insert(
                calendarId=cal_id, 
                body=event, 
                conferenceDataVersion=1
            ).execute()
        
        eid = created.get("id")
        html_link = created.get("htmlLink")
        
        # Get Google Meet link from conference data
        meet_link = None
        if "conferenceData" in created:
            conference_data = created["conferenceData"]
            if "entryPoints" in conference_data and conference_data["entryPoints"]:
                meet_link = conference_data["entryPoints"][0].get("uri")
        
        # Fallback to hangoutLink if available
        if not meet_link:
            meet_link = created.get("hangoutLink")
        
        print(f"SUCCESS: Google Calendar event created - ID: {eid}")
        print(f"SUCCESS: Google Meet link: {meet_link}")
        print(f"SUCCESS: Calendar link: {html_link}")
        
        return {
            "id": eid, 
            "meet_link": meet_link,
            "htmlLink": html_link
        }
        
    except Exception as e:
        print(f"ERROR: Failed to create Google Calendar event: {str(e)}")
        import secrets
        return {"id": f"mock-{secrets.token_hex(6)}", "meet_link": f"https://meet.google.com/{secrets.token_hex(3)}", "htmlLink": f"https://calendar.google.com/event?eid={secrets.token_hex(8)}"}


def create_coffee_chat_event(student_email: str, start_ts: str, end_ts: str, owner_email: str, attendees: List[str], project_id: Optional[int] = None, db: Optional[Any] = None) -> Dict[str, Any]:
    """Create a coffee chat event specifically for NGI Capital app.
    
    Args:
        student_email: Email of the student requesting the coffee chat
        start_ts: Start timestamp in ISO format
        end_ts: End timestamp in ISO format  
        owner_email: Email of the admin/advisor hosting the coffee chat
        attendees: List of additional attendee emails
        project_id: Optional project ID for context
        db: Database session for fetching project details
        
    Returns:
        Dictionary with event details including Google Meet link
    """
    # Get project name and all project leads if project_id is provided
    project_name = None
    all_project_leads = []
    
    if project_id and db:
        try:
            from sqlalchemy import text as sa_text
            # Get project name
            project_row = db.execute(
                sa_text("SELECT project_name FROM advisory_projects WHERE id = :pid"), 
                {"pid": project_id}
            ).fetchone()
            if project_row:
                project_name = project_row[0]
            
            # Get all project leads
            leads_rows = db.execute(
                sa_text("SELECT email FROM advisory_project_leads WHERE project_id = :pid"), 
                {"pid": project_id}
            ).fetchall()
            all_project_leads = [str(row[0]).strip() for row in (leads_rows or []) if row and row[0]]
        except Exception as e:
            print(f"WARNING: Could not fetch project details: {e}")
    
    # Create title and description
    if project_name:
        summary = f"NGI Capital Advisory {project_name} Coffee Chat"
    else:
        summary = f"NGI Capital Advisory Coffee Chat"
    
    # Build description
    description = f"NGI Capital Advisory Coffee Chat\n\nStudent: {student_email}\nProject Leads: {', '.join(all_project_leads) if all_project_leads else owner_email}"
    
    if project_name:
        description += f"\nProject: {project_name}"
    
    description += "\n\nThis is an informal coffee chat to discuss your project and any questions you may have, in addition to getting to know each other better. Please reach out 24 hours in advance for reschedules and cancellations."
    
    return create_event(
        owner_email=owner_email,
        start_ts=start_ts,
        end_ts=end_ts,
        student_email=student_email,
        summary=summary,
        description=description,
        extra_attendees=attendees
    )


def get_event(owner_email: str, event_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific event by ID using Google Calendar API v3.
    
    Args:
        owner_email: Email of the calendar owner
        event_id: Google Calendar event ID
        
    Returns:
        Event details or None if not found
    """
    if not _GCAL_ENABLED:
        return None
    
    _creds, svc = _load_credentials()
    if svc is None:
        return None
    
    try:
        cal_id = _calendar_id_for(owner_email)
        event = svc.events().get(calendarId=cal_id, eventId=event_id).execute()
        return event
    except Exception as e:
        print(f"ERROR: Failed to get event {event_id}: {str(e)}")
        return None


def update_event(owner_email: str, event_id: str, event_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update an existing event using Google Calendar API v3.
    
    Args:
        owner_email: Email of the calendar owner
        event_id: Google Calendar event ID
        event_data: Updated event data
        
    Returns:
        Updated event details or None if failed
    """
    if not _GCAL_ENABLED:
        return None
    
    _creds, svc = _load_credentials()
    if svc is None:
        return None
    
    try:
        cal_id = _calendar_id_for(owner_email)
        updated_event = svc.events().update(
            calendarId=cal_id, 
            eventId=event_id, 
            body=event_data,
            sendUpdates='all'
        ).execute()
        return updated_event
    except Exception as e:
        print(f"ERROR: Failed to update event {event_id}: {str(e)}")
        return None


def delete_event(owner_email: str, event_id: str) -> bool:
    """Delete an event using Google Calendar API v3.
    
    Args:
        owner_email: Email of the calendar owner
        event_id: Google Calendar event ID
        
    Returns:
        True if successful, False otherwise
    """
    if not _GCAL_ENABLED:
        return False
    
    _creds, svc = _load_credentials()
    if svc is None:
        return False
    
    try:
        cal_id = _calendar_id_for(owner_email)
        svc.events().delete(calendarId=cal_id, eventId=event_id, sendUpdates='all').execute()
        return True
    except Exception as e:
        print(f"ERROR: Failed to delete event {event_id}: {str(e)}")
        return False


def list_events(owner_email: str, time_min: str = None, time_max: str = None, max_results: int = 10) -> List[Dict[str, Any]]:
    """List events from a calendar using Google Calendar API v3.
    
    Args:
        owner_email: Email of the calendar owner
        time_min: Lower bound for event start times (RFC3339 timestamp)
        time_max: Upper bound for event start times (RFC3339 timestamp)
        max_results: Maximum number of events to return
        
    Returns:
        List of event details
    """
    if not _GCAL_ENABLED:
        return []
    
    _creds, svc = _load_credentials()
    if svc is None:
        return []
    
    try:
        cal_id = _calendar_id_for(owner_email)
        
        # Build query parameters
        params = {
            'calendarId': cal_id,
            'maxResults': max_results,
            'singleEvents': True,
            'orderBy': 'startTime'
        }
        
        if time_min:
            params['timeMin'] = time_min
        if time_max:
            params['timeMax'] = time_max
        
        events_result = svc.events().list(**params).execute()
        events = events_result.get('items', [])
        
        return events
    except Exception as e:
        print(f"ERROR: Failed to list events: {str(e)}")
        return []


def get_calendar_info(owner_email: str) -> Optional[Dict[str, Any]]:
    """Get calendar metadata using Google Calendar API v3.
    
    Args:
        owner_email: Email of the calendar owner
        
    Returns:
        Calendar metadata or None if failed
    """
    if not _GCAL_ENABLED:
        return None
    
    _creds, svc = _load_credentials()
    if svc is None:
        return None
    
    try:
        cal_id = _calendar_id_for(owner_email)
        calendar = svc.calendars().get(calendarId=cal_id).execute()
        return calendar
    except Exception as e:
        print(f"ERROR: Failed to get calendar info: {str(e)}")
        return None
