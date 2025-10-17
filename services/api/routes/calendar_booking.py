"""
Calendar booking API for interview scheduling from email.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import json

from services.api.database import get_db
from services.api.auth_deps import require_clerk_user
from ..integrations.google_calendar import create_event
from ..integrations.email_service import send_interview_confirmation

router = APIRouter()

def _ensure_tables(db: Session):
    """Ensure calendar bookings table exists."""
    db.execute(sa_text("""
        CREATE TABLE IF NOT EXISTS calendar_bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_email TEXT NOT NULL,
            student_name TEXT NOT NULL,
            project_name TEXT NOT NULL,
            role TEXT NOT NULL,
            selected_date TEXT NOT NULL,
            selected_time TEXT NOT NULL,
            booking_token TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'pending',
            calendar_event_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            confirmed_at TIMESTAMP
        )
    """))

@router.post("/calendar/booking")
async def create_calendar_booking(
    payload: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle calendar booking from email UI."""
    _ensure_tables(db)
    
    student_email = payload.get("student_email")
    student_name = payload.get("student_name")
    project_name = payload.get("project_name")
    role = payload.get("role")
    selected_date = payload.get("selected_date")
    selected_time = payload.get("selected_time")
    booking_token = payload.get("booking_token")
    
    if not all([student_email, student_name, project_name, role, selected_date, selected_time, booking_token]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Check if booking already exists
    existing = db.execute(
        sa_text("SELECT id, status FROM calendar_bookings WHERE booking_token = :token"),
        {"token": booking_token}
    ).fetchone()
    
    if existing:
        if existing[1] == 'confirmed':
            return {
                "success": True,
                "message": "Booking already confirmed",
                "booking_id": existing[0],
                "status": "confirmed"
            }
        else:
            return {
                "success": False,
                "message": "Booking already exists but not confirmed",
                "booking_id": existing[0],
                "status": "pending"
            }
    
    # Create new booking
    db.execute(
        sa_text("""
            INSERT INTO calendar_bookings 
            (student_email, student_name, project_name, role, selected_date, selected_time, booking_token)
            VALUES (:student_email, :student_name, :project_name, :role, :selected_date, :selected_time, :booking_token)
        """),
        {
            "student_email": student_email,
            "student_name": student_name,
            "project_name": project_name,
            "role": role,
            "selected_date": selected_date,
            "selected_time": selected_time,
            "booking_token": booking_token
        }
    )
    
    db.commit()
    
    # Get the booking ID
    booking = db.execute(
        sa_text("SELECT id FROM calendar_bookings WHERE booking_token = :token"),
        {"token": booking_token}
    ).fetchone()
    
    booking_id = booking[0] if booking else None
    
    return {
        "success": True,
        "message": "Booking created successfully",
        "booking_id": booking_id,
        "status": "pending"
    }

@router.post("/calendar/booking/{booking_id}/confirm")
async def confirm_calendar_booking(
    booking_id: int,
    admin=Depends(require_clerk_user),
    db: Session = Depends(get_db)
):
    """Confirm a calendar booking and create Google Calendar event."""
    _ensure_tables(db)
    
    # Get booking details
    booking = db.execute(
        sa_text("""
            SELECT student_email, student_name, project_name, role, selected_date, selected_time, booking_token
            FROM calendar_bookings 
            WHERE id = :id AND status = 'pending'
        """),
        {"id": booking_id}
    ).fetchone()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found or already confirmed")
    
    student_email, student_name, project_name, role, selected_date, selected_time, booking_token = booking
    
    try:
        # Parse the selected date and time
        # Format: "Monday, Oct 14" and "9:00 AM - 10:00 AM"
        from datetime import datetime
        import re
        
        # Extract date from "Monday, Oct 14" format
        date_match = re.search(r'(\w+), (\w+) (\d+)', selected_date)
        if not date_match:
            raise ValueError("Invalid date format")
        
        month_name = date_match.group(2)
        day = int(date_match.group(3))
        
        # Convert month name to number
        month_map = {
            'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
            'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
        }
        month = month_map.get(month_name)
        if not month:
            raise ValueError("Invalid month")
        
        # Get current year or next year if date has passed
        current_year = datetime.now().year
        event_date = datetime(current_year, month, day)
        if event_date < datetime.now():
            event_date = datetime(current_year + 1, month, day)
        
        # Parse time range "9:00 AM - 10:00 AM"
        time_match = re.search(r'(\d+):(\d+) (AM|PM) - (\d+):(\d+) (AM|PM)', selected_time)
        if not time_match:
            raise ValueError("Invalid time format")
        
        start_hour = int(time_match.group(1))
        start_min = int(time_match.group(2))
        start_ampm = time_match.group(3)
        end_hour = int(time_match.group(4))
        end_min = int(time_match.group(5))
        end_ampm = time_match.group(6)
        
        # Convert to 24-hour format
        if start_ampm == 'PM' and start_hour != 12:
            start_hour += 12
        elif start_ampm == 'AM' and start_hour == 12:
            start_hour = 0
            
        if end_ampm == 'PM' and end_hour != 12:
            end_hour += 12
        elif end_ampm == 'AM' and end_hour == 12:
            end_hour = 0
        
        # Create start and end datetime
        start_datetime = event_date.replace(hour=start_hour, minute=start_min)
        end_datetime = event_date.replace(hour=end_hour, minute=end_min)
        
        # Create Google Calendar event
        event_title = f"Interview - {role} at NGI Capital Advisory"
        event_description = f"""
        Interview for {student_name} for the {role} position on the {project_name} project.
        
        Student Email: {student_email}
        Booking Token: {booking_token}
        """
        
        # Convert datetime to timestamp strings
        start_ts = start_datetime.strftime('%Y-%m-%dT%H:%M:%S')
        end_ts = end_datetime.strftime('%Y-%m-%dT%H:%M:%S')
        
        calendar_result = create_event(
            owner_email='lwhitworth@ngicapitaladvisory.com',
            start_ts=start_ts,
            end_ts=end_ts,
            student_email=student_email,
            summary=event_title,
            description=event_description,
            extra_attendees=['anurmamade@ngicapitaladvisory.com']
        )
        
        if calendar_result.get('success'):
            # Update booking status
            db.execute(
                sa_text("""
                    UPDATE calendar_bookings 
                    SET status = 'confirmed', calendar_event_id = :event_id, confirmed_at = CURRENT_TIMESTAMP
                    WHERE id = :id
                """),
                {"event_id": calendar_result.get('event_id'), "id": booking_id}
            )
            db.commit()
            
            # Send confirmation email
            try:
                send_interview_confirmation(
                    student_email=student_email,
                    student_name=student_name,
                    project_name=project_name,
                    role=role,
                    interview_date=selected_date,
                    interview_time=selected_time,
                    calendar_link=calendar_result.get('event_link', ''),
                    meeting_link=calendar_result.get('meeting_link', '')
                )
            except Exception as e:
                print(f"WARNING: Failed to send confirmation email: {str(e)}")
            
            return {
                "success": True,
                "message": "Booking confirmed and calendar event created",
                "booking_id": booking_id,
                "calendar_event_id": calendar_result.get('event_id'),
                "event_link": calendar_result.get('event_link'),
                "meeting_link": calendar_result.get('meeting_link')
            }
        else:
            return {
                "success": False,
                "message": f"Failed to create calendar event: {calendar_result.get('message', 'Unknown error')}",
                "booking_id": booking_id
            }
            
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to confirm booking: {str(e)}",
            "booking_id": booking_id
        }

@router.get("/calendar/booking/{booking_id}")
async def get_booking_status(
    booking_id: int,
    db: Session = Depends(get_db)
):
    """Get booking status."""
    _ensure_tables(db)
    
    booking = db.execute(
        sa_text("""
            SELECT student_email, student_name, project_name, role, selected_date, selected_time, 
                   status, calendar_event_id, created_at, confirmed_at
            FROM calendar_bookings 
            WHERE id = :id
        """),
        {"id": booking_id}
    ).fetchone()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {
        "booking_id": booking_id,
        "student_email": booking[0],
        "student_name": booking[1],
        "project_name": booking[2],
        "role": booking[3],
        "selected_date": booking[4],
        "selected_time": booking[5],
        "status": booking[6],
        "calendar_event_id": booking[7],
        "created_at": booking[8],
        "confirmed_at": booking[9]
    }
