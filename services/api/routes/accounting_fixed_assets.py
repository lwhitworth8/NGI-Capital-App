"""
Fixed Assets API Routes - ASC 360 Compliance
Auto-detection, depreciation automation, and audit package generation
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from datetime import date
from decimal import Decimal
from pydantic import BaseModel

from ..database_async import get_async_db
from services.api.models_fixed_assets import FixedAsset, DepreciationEntry, AssetDisposal, AuditPackage
from services.api.services.depreciation_service import DepreciationService
from services.api.services.audit_package_generator import AuditPackageGenerator
from services.api.utils.datetime_utils import get_pst_now
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/accounting/fixed-assets", tags=["Accounting - Fixed Assets"])


# Pydantic models
class FixedAssetResponse(BaseModel):
    id: int
    asset_number: str
    asset_name: str
    asset_category: str
    acquisition_date: date
    acquisition_cost: Decimal
    useful_life_years: int
    depreciation_method: str
    accumulated_depreciation: Decimal
    net_book_value: Decimal
    status: str
    is_fully_depreciated: bool
    auto_detected: bool
    detection_confidence: Optional[Decimal]
    
    class Config:
        from_attributes = True


class DepreciationScheduleItem(BaseModel):
    asset_number: str
    asset_name: str
    asset_category: str
    acquisition_cost: float
    accumulated_depreciation: float
    net_book_value: float
    monthly_depreciation: float
    months_depreciated: int
    months_remaining: int
    percent_depreciated: float
    status: str


# Routes

@router.get("/assets")
async def get_fixed_assets(
    entity_id: int = Query(...),
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """Get all fixed assets for an entity"""
    query = select(FixedAsset).where(FixedAsset.entity_id == entity_id)
    
    if status:
        query = query.where(FixedAsset.status == status)
    if category:
        query = query.where(FixedAsset.asset_category == category)
    
    query = query.order_by(FixedAsset.asset_number)
    
    result = await db.execute(query)
    assets = result.scalars().all()
    
    return {
        "assets": [
            {
                "id": a.id,
                "asset_number": a.asset_number,
                "asset_name": a.asset_name,
                "asset_category": a.asset_category,
                "acquisition_date": a.acquisition_date.isoformat() if a.acquisition_date else None,
                "acquisition_cost": float(a.acquisition_cost),
                "salvage_value": float(a.salvage_value or 0),
                "useful_life_years": a.useful_life_years,
                "depreciation_method": a.depreciation_method,
                "accumulated_depreciation": float(a.accumulated_depreciation or 0),
                "net_book_value": float(a.net_book_value or a.acquisition_cost),
                "status": a.status,
                "is_fully_depreciated": a.is_fully_depreciated,
                "auto_detected": a.auto_detected,
                "detection_confidence": float(a.detection_confidence or 0),
                "location": a.location,
                "months_depreciated": a.months_depreciated or 0
            }
            for a in assets
        ],
        "count": len(assets),
        "summary": {
            "total_cost": float(sum(a.acquisition_cost for a in assets)),
            "total_accumulated_depreciation": float(sum(a.accumulated_depreciation or Decimal("0") for a in assets)),
            "total_net_book_value": float(sum(a.net_book_value or a.acquisition_cost for a in assets))
        }
    }


@router.get("/assets/{asset_id}")
async def get_fixed_asset(
    asset_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Get single fixed asset with full details"""
    asset = await db.get(FixedAsset, asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found")
    
    # Get depreciation entries
    dep_result = await db.execute(
        select(DepreciationEntry)
        .where(DepreciationEntry.asset_id == asset_id)
        .order_by(DepreciationEntry.period_date.desc())
    )
    dep_entries = dep_result.scalars().all()
    
    return {
        "id": asset.id,
        "asset_number": asset.asset_number,
        "asset_name": asset.asset_name,
        "asset_category": asset.asset_category,
        "asset_description": asset.asset_description,
        "acquisition_date": asset.acquisition_date.isoformat() if asset.acquisition_date else None,
        "acquisition_cost": float(asset.acquisition_cost),
        "salvage_value": float(asset.salvage_value or 0),
        "useful_life_years": asset.useful_life_years,
        "depreciation_method": asset.depreciation_method,
        "accumulated_depreciation": float(asset.accumulated_depreciation or 0),
        "net_book_value": float(asset.net_book_value or asset.acquisition_cost),
        "current_year_depreciation": float(asset.current_year_depreciation or 0),
        "status": asset.status,
        "is_fully_depreciated": asset.is_fully_depreciated,
        "location": asset.location,
        "serial_number": asset.serial_number,
        "auto_detected": asset.auto_detected,
        "detection_confidence": float(asset.detection_confidence or 0),
        "detection_metadata": asset.detection_metadata,
        "months_depreciated": asset.months_depreciated or 0,
        "depreciation_history": [
            {
                "period_date": entry.period_date.isoformat(),
                "depreciation_amount": float(entry.depreciation_amount),
                "accumulated_depreciation_after": float(entry.accumulated_depreciation_after),
                "net_book_value_after": float(entry.net_book_value_after),
                "status": entry.status
            }
            for entry in dep_entries
        ]
    }


@router.get("/depreciation-schedule")
async def get_depreciation_schedule(
    entity_id: int = Query(...),
    as_of_date: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """Get depreciation schedule for all assets"""
    if as_of_date:
        as_of = date.fromisoformat(as_of_date)
    else:
        as_of = date.today()
    
    schedule = await DepreciationService.get_depreciation_schedule(
        entity_id, as_of, db
    )
    
    return {
        "entity_id": entity_id,
        "as_of_date": as_of.isoformat(),
        "schedule": schedule,
        "summary": {
            "total_assets": len(schedule),
            "total_cost": sum(item["acquisition_cost"] for item in schedule),
            "total_accumulated_depreciation": sum(item["accumulated_depreciation"] for item in schedule),
            "total_net_book_value": sum(item["net_book_value"] for item in schedule),
            "total_monthly_depreciation": sum(item["monthly_depreciation"] for item in schedule)
        }
    }


@router.post("/generate-depreciation")
async def generate_monthly_depreciation(
    entity_id: int,
    period_date: str,  # YYYY-MM-DD format, last day of month
    db: AsyncSession = Depends(get_async_db)
):
    """Generate monthly depreciation entries for all in-service assets"""
    user_email = user.get("email")
    
    # Validate user is authorized partner
    if user_email not in ["lwhitworth@ngicapitaladvisory.com", "anurmamade@ngicapitaladvisory.com"]:
        raise HTTPException(403, "Only partners can generate depreciation entries")
    
    try:
        period = date.fromisoformat(period_date)
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD")
    
    # Generate depreciation
    je_id = await DepreciationService.generate_monthly_depreciation_entries(
        entity_id, period, db, user_email
    )
    
    if je_id is None:
        return {
            "message": "No depreciation entries generated",
            "reason": "No assets to depreciate or depreciation already exists for this period"
        }
    
    return {
        "message": "Depreciation entries generated successfully",
        "journal_entry_id": je_id,
        "period_date": period.isoformat(),
        "status": "draft"
    }




@router.post("/audit-package/generate")
async def generate_audit_package(
    entity_id: int,
    year: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Generate Big 4 audit package for fixed assets"""
    user_email = user.get("email")
    
    # Validate user is authorized partner
    if user_email not in ["lwhitworth@ngicapitaladvisory.com", "anurmamade@ngicapitaladvisory.com"]:
        raise HTTPException(403, "Only partners can generate audit packages")
    
    try:
        filepath = await AuditPackageGenerator.generate_fixed_asset_audit_package(
            entity_id, year, user_email, db
        )
        
        return {
            "message": "Audit package generated successfully",
            "filepath": filepath,
            "year": year,
            "download_url": f"/api/accounting/fixed-assets/audit-package/download?filepath={filepath}"
        }
    except Exception as e:
        logger.error(f"Failed to generate audit package: {e}")
        raise HTTPException(500, f"Failed to generate audit package: {str(e)}")


@router.get("/audit-package/list")
async def list_audit_packages(
    entity_id: int = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """List all generated audit packages"""
    result = await db.execute(
        select(AuditPackage)
        .where(AuditPackage.entity_id == entity_id)
        .order_by(AuditPackage.generated_at.desc())
    )
    packages = result.scalars().all()
    
    return {
        "packages": [
            {
                "id": p.id,
                "package_type": p.package_type,
                "period_year": p.period_year,
                "file_name": p.file_name,
                "file_size_bytes": p.file_size_bytes,
                "total_assets_count": p.total_assets_count,
                "total_net_book_value": float(p.total_net_book_value),
                "generated_at": p.generated_at.isoformat(),
                "generated_by_email": p.generated_by_email,
                "download_url": f"/api/accounting/fixed-assets/audit-package/download?filepath={p.file_path}"
            }
            for p in packages
        ]
    }


@router.get("/categories")
async def get_asset_categories(
    entity_id: int = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Get list of asset categories with counts"""
    result = await db.execute(
        select(
            FixedAsset.asset_category,
            func.count(FixedAsset.id).label("count"),
            func.sum(FixedAsset.acquisition_cost).label("total_cost"),
            func.sum(FixedAsset.net_book_value).label("total_nbv")
        )
        .where(FixedAsset.entity_id == entity_id)
        .group_by(FixedAsset.asset_category)
    )
    categories = result.all()
    
    return {
        "categories": [
            {
                "category": cat.asset_category,
                "count": cat.count,
                "total_cost": float(cat.total_cost or 0),
                "total_nbv": float(cat.total_nbv or 0)
            }
            for cat in categories
        ]
    }

