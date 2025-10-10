"""
Unified Entity API for NGI Capital App
Provides entity selection across all modules (Dashboard, Accounting, Finance, Employees)
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel

from ..database_async import get_async_db
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
