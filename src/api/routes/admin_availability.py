"""
Admin availability management for interview scheduling.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json

from src.api.database import get_db
from .advisory import require_ngiadvisory_admin

router = APIRouter()

def _ensure_tables(db: Session):
    """Ensure admin availability table exists."""
    db.execute(sa_text("""
        CREATE TABLE IF NOT EXISTS admin_availability (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_email TEXT NOT NULL,
            date TEXT NOT NULL,
            time_slots TEXT NOT NULL,  -- JSON array of time slots
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))

@router.get("/admin/availability")
async def get_admin_availability(
    admin_email: Optional[str] = None,
    admin=Depends(require_ngiadvisory_admin()),
    db: Session = Depends(get_db)
):
    """Get admin availability for the next week."""
    _ensure_tables(db)
    
    if admin_email:
        query = "SELECT * FROM admin_availability WHERE admin_email = :email ORDER BY date"
        params = {"email": admin_email}
    else:
        query = "SELECT * FROM admin_availability ORDER BY date"
        params = {}
    
    rows = db.execute(sa_text(query), params).fetchall()
    
    availability = []
    for row in rows:
        availability.append({
            "id": row[0],
            "admin_email": row[1],
            "date": row[2],
            "time_slots": json.loads(row[3]),
            "created_at": row[4],
            "updated_at": row[5]
        })
    
    return {"availability": availability}

@router.post("/admin/availability")
async def set_admin_availability(
    payload: Dict[str, Any],
    admin=Depends(require_ngiadvisory_admin()),
    db: Session = Depends(get_db)
):
    """Set admin availability for interview scheduling."""
    _ensure_tables(db)
    
    admin_email = payload.get("admin_email")
    date = payload.get("date")
    time_slots = payload.get("time_slots", [])
    
    if not admin_email or not date or not time_slots:
        raise HTTPException(status_code=400, detail="admin_email, date, and time_slots are required")
    
    # Check if availability already exists for this date
    existing = db.execute(
        sa_text("SELECT id FROM admin_availability WHERE admin_email = :email AND date = :date"),
        {"email": admin_email, "date": date}
    ).fetchone()
    
    if existing:
        # Update existing
        db.execute(
            sa_text("""
                UPDATE admin_availability 
                SET time_slots = :slots, updated_at = CURRENT_TIMESTAMP 
                WHERE admin_email = :email AND date = :date
            """),
            {"slots": json.dumps(time_slots), "email": admin_email, "date": date}
        )
    else:
        # Create new
        db.execute(
            sa_text("""
                INSERT INTO admin_availability (admin_email, date, time_slots)
                VALUES (:email, :date, :slots)
            """),
            {"email": admin_email, "date": date, "slots": json.dumps(time_slots)}
        )
    
    db.commit()
    
    return {
        "admin_email": admin_email,
        "date": date,
        "time_slots": time_slots,
        "message": "Availability updated successfully"
    }

@router.get("/admin/availability/next-week")
async def get_next_week_availability(
    admin=Depends(require_ngiadvisory_admin()),
    db: Session = Depends(get_db)
):
    """Get availability for the next 7 days."""
    _ensure_tables(db)
    
    # Get next 7 days
    today = datetime.now().date()
    next_week = []
    
    for i in range(7):
        date = today + timedelta(days=i)
        next_week.append(date.strftime("%Y-%m-%d"))
    
    # Get availability for next week
    placeholders = ",".join([f":date{i}" for i in range(7)])
    query = f"""
        SELECT admin_email, date, time_slots 
        FROM admin_availability 
        WHERE date IN ({placeholders})
        ORDER BY date, admin_email
    """
    
    params = {f"date{i}": date for i, date in enumerate(next_week)}
    rows = db.execute(sa_text(query), params).fetchall()
    
    # Group by date
    availability_by_date = {}
    for row in rows:
        admin_email, date, time_slots_json = row
        time_slots = json.loads(time_slots_json)
        
        if date not in availability_by_date:
            availability_by_date[date] = []
        
        availability_by_date[date].append({
            "admin_email": admin_email,
            "time_slots": time_slots
        })
    
    return {
        "next_week": next_week,
        "availability": availability_by_date
    }
