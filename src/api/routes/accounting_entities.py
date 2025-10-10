"""
Entity selection API for multi-entity accounting - DEV FRIENDLY VERSION
No auth required in development mode for faster testing
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

from ..database_async import get_async_db
from ..models_accounting import AccountingEntity

router = APIRouter(prefix="/api/accounting", tags=["accounting-entities"])

_IN_DEV = os.getenv('NODE_ENV', 'development') == 'development'
_DISABLE_AUTH = os.getenv('DISABLE_ACCOUNTING_GUARD', '0') == '1'


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

    model_config = ConfigDict(from_attributes=True)


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
    
    return " - ".join(parts)


@router.get("/entities", response_model=List[EntityResponse])
async def get_accounting_entities(
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all active accounting entities for entity selector dropdown
    
    DEV MODE: Auth disabled for faster development
    PROD MODE: Add auth back via dependencies in main.py
    
    Returns:
        List of entities with id, name, type, EIN, status
    """
    try:
        # Query active AND planned entities (show all for dev)
        query = select(AccountingEntity).where(
            AccountingEntity.entity_status.in_(["active", "planned"])
        ).order_by(AccountingEntity.entity_name)
        
        result = await db.execute(query)
        entities = result.scalars().all()
        
        # Convert to response
        return [
            EntityResponse(
                id=e.id,
                entity_name=e.entity_name,
                entity_type=e.entity_type,
                ein=e.ein,
                entity_status=e.entity_status,
                is_available=e.is_available if hasattr(e, 'is_available') else True,
                parent_entity_id=e.parent_entity_id if hasattr(e, 'parent_entity_id') else None,
                ownership_percentage=float(e.ownership_percentage) if hasattr(e, 'ownership_percentage') and e.ownership_percentage else None,
                display_label=e.entity_name,
                status_label=_get_status_label(e)
            )
            for e in entities
        ]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch entities: {str(e)}")
