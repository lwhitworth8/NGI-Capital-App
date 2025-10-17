"""
Unified Entity API for NGI Capital App
Provides entity selection across all modules (Dashboard, Accounting, Finance, Employees)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text as sa_text
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel

from ..database_async import get_async_db
from ..database import get_db
from ..models_accounting import AccountingEntity

router = APIRouter(prefix="/api", tags=["entities"])


class EntityResponse(BaseModel):
    id: int
    entity_name: str
    entity_type: str
    ein: str | None
    entity_status: str
    is_available: bool
    parent_entity_id: int | None
    ownership_percentage: float | None
    display_label: str
    status_label: str


def _get_status_label(entity: AccountingEntity) -> str:
    """Generate clean status label for entity"""
    parts = []
    
    if entity.entity_status == "active":
        parts.append("Active")
    elif entity.entity_status == "planned":
        parts.append("Pending Conversion")
    
    if entity.parent_entity_id is None:
        parts.append("Parent Entity")
    else:
        parts.append("Subsidiary")
    
    return " · ".join(parts)


@router.get("/entities", response_model=List[EntityResponse])
async def get_entities(db: AsyncSession = Depends(get_async_db)):
    """
    Get all entities for entity selector
    
    Returns entities ordered by:
    1. Parents first (no parent_entity_id)
    2. Then alphabetically by name
    """
    query = select(AccountingEntity).order_by(
        AccountingEntity.parent_entity_id.is_(None).desc(),
        AccountingEntity.entity_name
    )
    result = await db.execute(query)
    entities = result.scalars().all()
    
    return [
        EntityResponse(
            id=e.id,
            entity_name=e.entity_name,
            entity_type=e.entity_type,
            ein=e.ein,
            entity_status=e.entity_status,
            is_available=e.is_available,
            parent_entity_id=e.parent_entity_id,
            ownership_percentage=float(e.ownership_percentage) if e.ownership_percentage else None,
            display_label=e.entity_name,
            status_label=_get_status_label(e)
        )
        for e in entities
    ]


@router.get("/entities/{entity_id}/org-chart")
def get_org_chart(
    entity_id: int,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Return a simple org chart structure for the given entity.
    Uses teams table to get board/executives from team memberships.
    """
    # Get the actual entity from the database
    try:
        entity_row = db.execute(sa_text("""
            SELECT id, entity_name, entity_type, ein, entity_status 
            FROM accounting_entities 
            WHERE id = :entity_id
        """), {"entity_id": entity_id}).fetchone()
        
        if entity_row:
            entity = {
                "id": entity_row[0],
                "entity_name": entity_row[1],
                "entity_type": entity_row[2],
                "ein": entity_row[3],
                "entity_status": entity_row[4] or "active"
            }
        else:
            # Fallback if entity not found
            entity = {
                "id": entity_id,
                "entity_name": f"Entity {entity_id}",
                "entity_type": "Unknown",
                "ein": None,
                "entity_status": "active"
            }
    except Exception:
        # Fallback if database query fails
        entity = {
            "id": entity_id,
            "entity_name": f"Entity {entity_id}",
            "entity_type": "Unknown",
            "ein": None,
            "entity_status": "active"
        }

    # Fetch board members from teams table
    board_members = []
    try:
        res = db.execute(sa_text("""
            SELECT e.id, e.name, e.email, e.title, e.role, tm.role_on_team
            FROM employees e
            JOIN team_memberships tm ON e.id = tm.employee_id
            JOIN teams t ON tm.team_id = t.id
            WHERE t.entity_id = :entity_id 
            AND LOWER(t.name) = 'board'
            AND e.is_deleted = 0
        """), {"entity_id": entity_id})
        board_members = [
            {
                "id": r[0],
                "name": r[1],
                "email": r[2],
                "title": r[3] or "Board Member",
                "role": r[4] or "Board Member",
                "role_on_team": r[5] or "Board Member",
            }
            for r in res.fetchall()
        ]
    except Exception:
        board_members = []

    # Fetch executive members from teams table
    executive_members = []
    try:
        res = db.execute(sa_text("""
            SELECT e.id, e.name, e.email, e.title, e.role, tm.role_on_team
            FROM employees e
            JOIN team_memberships tm ON e.id = tm.employee_id
            JOIN teams t ON tm.team_id = t.id
            WHERE t.entity_id = :entity_id 
            AND LOWER(t.name) = 'executive'
            AND e.is_deleted = 0
        """), {"entity_id": entity_id})
        executive_members = [
            {
                "id": r[0],
                "name": r[1],
                "email": r[2],
                "title": r[3] or "Executive",
                "role": r[4] or "Executive",
                "role_on_team": r[5] or "Executive",
            }
            for r in res.fetchall()
        ]
    except Exception:
        executive_members = []

    # Fetch teams for the entity
    teams_data = []
    try:
        res = db.execute(sa_text("""
            SELECT t.id, t.name, t.description, t.type, t.lead_employee_id, t.active,
                   COUNT(tm.employee_id) as member_count
            FROM teams t
            LEFT JOIN team_memberships tm ON t.id = tm.team_id
            WHERE t.entity_id = :entity_id
            GROUP BY t.id, t.name, t.description, t.type, t.lead_employee_id, t.active
            ORDER BY t.name
        """), {"entity_id": entity_id})
        teams_data = [
            {
                "id": r[0],
                "name": r[1],
                "description": r[2],
                "type": r[3],
                "lead_employee_id": r[4],
                "active": bool(r[5]),
                "member_count": r[6] or 0,
            }
            for r in res.fetchall()
        ]
    except Exception:
        teams_data = []

    # Fetch projects for the entity
    projects_data = []
    try:
        # First try advisory_projects table
        res = db.execute(sa_text("""
            SELECT id, project_name, client_name, summary, status, mode, 
                   project_code, created_at, updated_at, location_text, 
                   hero_image_url, gallery_urls, showcase_pdf_url, tags, 
                   team_size, team_composition, default_hourly_rate, pay_currency
            FROM advisory_projects 
            WHERE (entity_id = :entity_id OR entity_id IS NULL)
            AND LOWER(status) IN ('active', 'in_progress', 'open')
            ORDER BY created_at DESC
        """), {"entity_id": entity_id})
        projects_data = [
            {
                "id": r[0],
                "name": r[1],  # project_name -> name
                "client_name": r[2],
                "summary": r[3],
                "status": r[4],
                "mode": r[5],
                "code": r[6],  # project_code -> code
                "created_at": r[7],
                "updated_at": r[8],
                "location_text": r[9],
                "hero_image_url": r[10],
                "gallery_urls": r[11],
                "showcase_pdf_url": r[12],
                "tags": r[13],
                "team_size": r[14],
                "team_composition": r[15],
                "default_hourly_rate": r[16],
                "pay_currency": r[17],
            }
            for r in res.fetchall()
        ]
    except Exception:
        # If advisory_projects doesn't exist, try regular projects table
        try:
            res = db.execute(sa_text("""
                SELECT id, name, description, status, created_at, updated_at
                FROM projects 
                WHERE entity_id = :entity_id
                AND LOWER(status) IN ('active', 'in_progress', 'open')
                ORDER BY created_at DESC
            """), {"entity_id": entity_id})
            projects_data = [
                {
                    "id": r[0],
                    "name": r[1],  # name -> name
                    "client_name": None,
                    "summary": r[2],
                    "status": r[3],
                    "mode": None,
                    "code": None,  # project_code -> code
                    "created_at": r[4],
                    "updated_at": r[5],
                    "location_text": None,
                    "hero_image_url": None,
                    "gallery_urls": None,
                    "showcase_pdf_url": None,
                    "tags": None,
                    "team_size": None,
                    "team_composition": None,
                    "default_hourly_rate": None,
                    "pay_currency": None,
                }
                for r in res.fetchall()
            ]
        except Exception:
            projects_data = []

    name_l = (entity["entity_name"] or "").lower()
    structure_type = 'advisory' if 'advisory' in name_l else ('teams' if 'creator' in name_l else 'corporate')

    return {
        "entity": {
            "id": entity["id"],
            "entity_name": entity["entity_name"],
            "entity_type": entity["entity_type"],
            "ein": entity["ein"],
            "entity_status": entity["entity_status"],
            "is_available": True,
            "parent_entity_id": None,
        },
        "structure_type": structure_type,
        "board": board_members,
        "executives": executive_members,
        "projects": projects_data,
        "teams": teams_data,
    }
