from datetime import datetime
from typing import Dict, Optional

# Entity formation dates are derived from documents; initialize as None
ENTITY_FORMATION_DATES: Dict[str, Optional[datetime]] = {
    'ngi-capital-llc': None,
    'ngi-capital-inc': None,
    'creator-terminal': None,
    'ngi-advisory': None,
}

# Entity status tracking (LLC to C-Corp conversion, etc.)
ENTITY_STATUS: Dict[str, str] = {
    'ngi-capital-llc': 'active',
    'ngi-capital-inc': 'converting',
    'ngi-advisory': 'pre-formation',
    'creator-terminal': 'pre-formation',
}


def getCurrentFiscalYear(date: datetime) -> int:
    """Fiscal year runs July 1 – June 30 (FY labeled by end year)."""
    month = date.month
    year = date.year
    return year + 1 if month >= 7 else year


def getFiscalYearDates(fiscalYear: int):
    """Return start/end datetimes for a given FY (July 1 prev year – June 30 FY)."""
    start = datetime(fiscalYear - 1, 7, 1)
    end = datetime(fiscalYear, 6, 30)
    return {"start": start, "end": end}

