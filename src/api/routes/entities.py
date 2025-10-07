"""
NGI Capital Entity Management Routes
Simple placeholder implementation for entity management
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.orm import Session

import logging

# Import dependencies
from ..database import get_db
from ..auth_deps import require_clerk_user as _require_clerk_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/entities", tags=["entities"])

class Entity(BaseModel):
    id: int
    legal_name: str
    entity_type: str
    ein: Optional[str] = None
    formation_date: Optional[str] = None
    state: Optional[str] = None
    parent_entity_id: Optional[int] = None
    is_active: bool = True
    address: Optional[str] = None
    registered_agent: Optional[str] = None
    business_purpose: Optional[str] = None

@router.get("/")
async def get_entities():
    """
    Get all entities (placeholder implementation)
    Returns empty list for now - will be populated when documents are uploaded
    """
    try:
        logger.info("Fetching entities list")
        
        # Return empty list for now
        # In production, this will query the database for actual entities
        return {
            "entities": [],
            "total": 0,
            "message": "Entities will be populated when formation documents are uploaded"
        }
        
    except Exception as e:
        logger.error(f"Error fetching entities: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch entities"
        )

@router.get("/{entity_id}")
async def get_entity(entity_id: int):
    """Get a specific entity by ID"""
    try:
        logger.info(f"Fetching entity {entity_id}")
        
        # Placeholder - return 404 for now
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entity not found"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching entity {entity_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch entity"
        )

@router.post("/")
async def create_entity(entity: Entity):
    """Create a new entity"""
    try:
        logger.info(f"Creating entity: {entity.legal_name}")
        
        # Placeholder response
        return {
            "message": "Entity creation will be available after document upload feature is implemented",
            "entity": entity
        }
        
    except Exception as e:
        logger.error(f"Error creating entity: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create entity"
        )

@router.put("/{entity_id}")
async def update_entity(entity_id: int, entity: Entity):
    """Update an existing entity"""
    try:
        logger.info(f"Updating entity {entity_id}")
        
        # Placeholder response
        return {
            "message": "Entity update will be available after document upload feature is implemented",
            "entity_id": entity_id
        }
        
    except Exception as e:
        logger.error(f"Error updating entity {entity_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update entity"
        )

@router.delete("/{entity_id}")
async def delete_entity(entity_id: int):
    """Delete an entity"""
    try:
        logger.info(f"Deleting entity {entity_id}")
        
        # Placeholder response
        return {
            "message": "Entity deletion will be available after document upload feature is implemented",
            "entity_id": entity_id
        }
        
    except Exception as e:
        logger.error(f"Error deleting entity {entity_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete entity"
        )


@router.get("/{entity_id}/org-chart")
async def get_entity_org_chart(
    entity_id: int,
    partner=Depends(_require_clerk_user),
    db: Session = Depends(get_db)
):
    """Get entity-specific organizational chart"""
    from sqlalchemy import text as sa_text
    
    # Get entity from accounting_entities table (matches frontend entity selector)
    entity_row = db.execute(
        sa_text("SELECT id, entity_name, entity_type, parent_entity_id FROM accounting_entities WHERE id = :eid"),
        {"eid": entity_id}
    ).fetchone()
    
    if not entity_row:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    entity = {
        "id": entity_row[0],
        "legal_name": entity_row[1],
        "entity_type": entity_row[2],
        "parent_entity_id": entity_row[3] if entity_row[3] else None
    }
    
    # Determine structure using entity_name
    entity_name = entity["legal_name"].lower()
    is_advisory = "advisory" in entity_name
    is_creator = "creator" in entity_name
    is_parent = entity["parent_entity_id"] is None and not is_advisory and not is_creator
    
    result = {
        "entity": entity,
        "structure_type": "",
        "board": [],
        "executives": [],
        "teams": [],
        "projects": []
    }
    
    if is_parent:
        # NGI Capital LLC - Board/Executives
        result["structure_type"] = "corporate"
        partners = db.execute(sa_text("SELECT id, name, email, ownership_percentage FROM partners WHERE is_active = 1")).fetchall()
        for p in partners:
            member = {
                "id": p[0],
                "name": p[1],
                "email": p[2],
                "ownership_percentage": float(p[3] or 0),
                "role": "CEO" if "whitworth" in p[1].lower() else "CFO/COO"
            }
            result["board"].append(member)
            result["executives"].append(member)
    
    elif is_advisory:
        # Advisory - Projects with leads and team members
        result["structure_type"] = "advisory"
        try:
            projects = db.execute(
                sa_text("SELECT id, project_name, project_code, status, project_lead FROM advisory_projects WHERE status IN ('draft', 'active', 'closed') ORDER BY status, project_name LIMIT 50")
            ).fetchall()
            
            for proj in projects:
                proj_id = proj[0]
                
                # Fetch project leads from advisory_project_leads table
                leads = []
                try:
                    lead_rows = db.execute(
                        sa_text("SELECT email FROM advisory_project_leads WHERE project_id = :pid"),
                        {"pid": proj_id}
                    ).fetchall()
                    
                    # For each lead email, try to get their full info from partners or create placeholder
                    for lead_row in lead_rows:
                        lead_email = lead_row[0]
                        partner_info = db.execute(
                            sa_text("SELECT id, name, email FROM partners WHERE email = :email"),
                            {"email": lead_email}
                        ).fetchone()
                        
                        if partner_info:
                            leads.append({
                                "id": partner_info[0],
                                "name": partner_info[1],
                                "email": partner_info[2],
                                "title": "Project Lead",
                                "role": "Lead"
                            })
                        else:
                            # Create placeholder for external leads
                            leads.append({
                                "id": hash(lead_email) % 10000,
                                "name": lead_email.split('@')[0].title(),
                                "email": lead_email,
                                "title": "Project Lead",
                                "role": "Lead"
                            })
                except:
                    pass
                
                # Fetch team members from advisory_project_assignments + advisory_students
                team_members = []
                try:
                    member_rows = db.execute(
                        sa_text("""
                            SELECT a.id, a.student_id, s.first_name, s.last_name, s.email, 
                                   a.role, a.hours_planned, s.classification
                            FROM advisory_project_assignments a
                            LEFT JOIN advisory_students s ON s.id = a.student_id
                            WHERE a.project_id = :pid AND a.active = 1
                            ORDER BY a.id
                        """),
                        {"pid": proj_id}
                    ).fetchall()
                    
                    for mem in member_rows:
                        name = f"{mem[2] or ''} {mem[3] or ''}".strip() or "Student"
                        team_members.append({
                            "id": mem[1] or mem[0],
                            "name": name,
                            "email": mem[4] or "",
                            "title": mem[5] or "Student Analyst",
                            "role": mem[5] or "Analyst",
                            "classification": mem[7] or None,
                            "allocation_percent": mem[6] or None
                        })
                except:
                    pass
                
                result["projects"].append({
                    "id": proj_id,
                    "name": proj[1],
                    "code": proj[2],
                    "status": proj[3],
                    "lead_name": proj[4],
                    "leads": leads,
                    "team_members": team_members
                })
        except Exception as e:
            logger.error(f"Error fetching advisory projects: {e}")
            pass
    
    elif is_creator:
        # Creator Terminal - Teams
        result["structure_type"] = "teams"
        try:
            teams = db.execute(
                sa_text("SELECT id, name, description FROM teams WHERE entity_id = :eid AND active = 1"),
                {"eid": entity_id}
            ).fetchall()
            
            for team in teams:
                result["teams"].append({
                    "id": team[0],
                    "name": team[1],
                    "description": team[2] or "",
                    "lead_name": None,
                    "lead_email": None,
                    "members": []
                })
        except:
            pass
    
    return result