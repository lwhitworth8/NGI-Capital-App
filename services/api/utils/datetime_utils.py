"""
PST Timezone Utilities for NGI Capital Accounting System

All datetime operations should use Pacific Standard Time (PST/PDT) for consistency.
This module provides utilities for timezone-aware datetime handling.
"""

import pytz
from datetime import datetime, date, time
from typing import Optional

# Pacific timezone (handles PST/PDT automatically)
PST = pytz.timezone('America/Los_Angeles')


def get_pst_now() -> datetime:
    """
    Returns current PST datetime.
    
    Returns:
        datetime: Current time in Pacific timezone
    """
    return datetime.now(PST)


def convert_to_pst(dt: datetime) -> datetime:
    """
    Converts any datetime to PST.
    
    Args:
        dt: Input datetime (can be naive or timezone-aware)
        
    Returns:
        datetime: Input datetime converted to PST
    """
    if dt is None:
        return None
    
    if dt.tzinfo is None:
        # Assume naive datetime is UTC
        dt = pytz.utc.localize(dt)
    
    return dt.astimezone(PST)


def pst_date_only(dt: datetime) -> date:
    """
    Returns PST date without time.
    
    Args:
        dt: Input datetime
        
    Returns:
        date: Date in PST timezone
    """
    if dt is None:
        return None
    
    pst_dt = convert_to_pst(dt)
    return pst_dt.date()


def pst_to_string(dt: datetime, format: str = '%Y-%m-%d %H:%M:%S') -> str:
    """
    Format PST datetime to string.
    
    Args:
        dt: Input datetime
        format: strftime format string (default: '%Y-%m-%d %H:%M:%S')
        
    Returns:
        str: Formatted datetime string in PST
    """
    if dt is None:
        return None
    
    pst_dt = convert_to_pst(dt)
    return pst_dt.strftime(format)


def pst_to_iso(dt: datetime) -> str:
    """
    Convert datetime to ISO 8601 string in PST.
    
    Args:
        dt: Input datetime
        
    Returns:
        str: ISO 8601 formatted string
    """
    if dt is None:
        return None
    
    pst_dt = convert_to_pst(dt)
    return pst_dt.isoformat()


def parse_to_pst(dt_string: str, format: str = '%Y-%m-%d %H:%M:%S') -> datetime:
    """
    Parse string to PST datetime.
    
    Args:
        dt_string: String representation of datetime
        format: strptime format string (default: '%Y-%m-%d %H:%M:%S')
        
    Returns:
        datetime: Parsed datetime in PST
    """
    if dt_string is None:
        return None
    
    dt = datetime.strptime(dt_string, format)
    return PST.localize(dt)


def combine_date_time_pst(d: date, t: time = None) -> datetime:
    """
    Combine date and time into PST datetime.
    
    Args:
        d: Date object
        t: Time object (defaults to midnight if None)
        
    Returns:
        datetime: Combined datetime in PST
    """
    if d is None:
        return None
    
    if t is None:
        t = time(0, 0, 0)
    
    dt = datetime.combine(d, t)
    return PST.localize(dt)


def get_pst_today() -> date:
    """
    Get today's date in PST.
    
    Returns:
        date: Today's date in PST timezone
    """
    return get_pst_now().date()


def start_of_day_pst(d: date) -> datetime:
    """
    Get start of day (00:00:00) in PST for given date.
    
    Args:
        d: Date object
        
    Returns:
        datetime: Start of day in PST
    """
    return combine_date_time_pst(d, time(0, 0, 0))


def end_of_day_pst(d: date) -> datetime:
    """
    Get end of day (23:59:59) in PST for given date.
    
    Args:
        d: Date object
        
    Returns:
        datetime: End of day in PST
    """
    return combine_date_time_pst(d, time(23, 59, 59))


def format_date_us(d: date) -> str:
    """
    Format date in US format (MM/DD/YYYY).
    
    Args:
        d: Date object
        
    Returns:
        str: Formatted date string
    """
    if d is None:
        return None
    
    return d.strftime('%m/%d/%Y')


def format_datetime_us(dt: datetime) -> str:
    """
    Format datetime in US format (MM/DD/YYYY HH:MM:SS AM/PM) in PST.
    
    Args:
        dt: Datetime object
        
    Returns:
        str: Formatted datetime string
    """
    if dt is None:
        return None
    
    pst_dt = convert_to_pst(dt)
    return pst_dt.strftime('%m/%d/%Y %I:%M:%S %p')
