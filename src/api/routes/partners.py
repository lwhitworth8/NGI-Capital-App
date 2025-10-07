"""
Partners API endpoint for fetching partner/owner information
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from ..database import get_db
from ..models import Partners

router = APIRouter(prefix="/api", tags=["partners"])


class PartnerResponse(BaseModel):
    id: int
    name: str
    email: str
    ownership_percentage: float

    model_config = ConfigDict(from_attributes=True)


@router.get("/partners", response_model=List[PartnerResponse])
def get_partners(db: Session = Depends(get_db)):
    """
    Get all partners/owners.
    No auth required for dev environment.
    """
    try:
        partners = db.query(Partners).filter(Partners.is_active == True).all()
        
        return [
            PartnerResponse(
                id=p.id,
                name=p.name,
                email=p.email,
                ownership_percentage=float(p.ownership_percentage or 0.0)
            )
            for p in partners
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch partners: {str(e)}")

