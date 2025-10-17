"""
Entity Conversion API Routes for NGI Capital Accounting Module
Implements Epic 7: Entity Conversion (LLC to C-Corp)
Handles historical tracking, equity conversion, and LLC closing
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from ..database_async import get_async_db
from ..models_accounting import AccountingEntity, EntityRelationship
from ..models_accounting_part3 import EntityConversion, EquityConversion

router = APIRouter(prefix="/accounting/entity-conversion", tags=["accounting-entity-conversion"])


@router.post("/start-conversion")
async def start_entity_conversion(
    source_entity_id: int,
    conversion_type: str,  # "LLC_TO_C_CORP"
    conversion_date: str,
    new_entity_name: str,
    new_entity_ein: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Initiate LLC to C-Corp conversion process
    Creates new C-Corp entity while preserving LLC historical data
    """
    # Validate source entity exists and is LLC
    source_entity_stmt = select(AccountingEntity).where(AccountingEntity.id == source_entity_id)
    source_result = await db.execute(source_entity_stmt)
    source_entity = source_result.scalar_one_or_none()
    
    if not source_entity:
        raise HTTPException(status_code=404, detail="Source entity not found")
    
    if source_entity.entity_type != "LLC":
        raise HTTPException(status_code=400, detail="Source entity must be an LLC")
    
    # Create new C-Corp entity
    new_entity = AccountingEntity(
        entity_name=new_entity_name,
        entity_type="C-Corp",
        ein=new_entity_ein,
        formation_date=datetime.fromisoformat(conversion_date),
        parent_entity_id=None,  # C-Corp becomes new parent
        is_active=True,
        fiscal_year_end=source_entity.fiscal_year_end,
        functional_currency="USD",
        metadata={
            "converted_from": source_entity.entity_name,
            "conversion_date": conversion_date,
            "original_llc_id": source_entity.id
        }
    )
    db.add(new_entity)
    await db.flush()
    
    # Create conversion record
    conversion = EntityConversion(
        source_entity_id=source_entity_id,
        target_entity_id=new_entity.id,
        conversion_type=conversion_type,
        conversion_date=datetime.fromisoformat(conversion_date),
        conversion_status="In Progress",
        pre_conversion_equity=Decimal("0.00"),  # Will be updated
        post_conversion_shares_issued=0,
        conversion_initiated_by="system@ngicapital.com",  # TODO: Get from auth context
        conversion_notes=f"Conversion from {source_entity.entity_name} to {new_entity_name}"
    )
    db.add(conversion)
    await db.flush()
    
    # Update source LLC to mark as being converted
    source_entity.is_active = True  # Keep active until conversion completes
    source_entity.metadata = source_entity.metadata or {}
    source_entity.metadata["conversion_status"] = "In Progress"
    source_entity.metadata["conversion_id"] = conversion.id
    source_entity.metadata["target_c_corp_id"] = new_entity.id
    
    await db.commit()
    await db.refresh(conversion)
    await db.refresh(new_entity)
    
    return {
        "success": True,
        "conversion_id": conversion.id,
        "source_entity": {
            "id": source_entity.id,
            "name": source_entity.entity_name,
            "type": source_entity.entity_type
        },
        "target_entity": {
            "id": new_entity.id,
            "name": new_entity.entity_name,
            "type": new_entity.entity_type
        },
        "conversion_date": conversion_date,
        "next_steps": [
            "Review and approve equity conversion ratios",
            "Transfer assets and liabilities",
            "Issue C-Corp stock certificates",
            "Complete final LLC books",
            "Close LLC entity"
        ]
    }


@router.post("/conversion/{conversion_id}/transfer-equity")
async def transfer_equity(
    conversion_id: int,
    equity_transfers: List[dict],  # [{"member_name": "...", "llc_capital": 100000, "shares_issued": 1000000}]
    db: AsyncSession = Depends(get_async_db)
):
    """
    Transfer LLC member equity to C-Corp stock
    Records equity conversion details for each member
    """
    # Get conversion record
    conversion_stmt = select(EntityConversion).where(EntityConversion.id == conversion_id)
    conversion_result = await db.execute(conversion_stmt)
    conversion = conversion_result.scalar_one_or_none()
    
    if not conversion:
        raise HTTPException(status_code=404, detail="Conversion not found")
    
    if conversion.conversion_status != "In Progress":
        raise HTTPException(status_code=400, detail="Conversion is not in progress")
    
    # Create equity conversion records
    total_shares = 0
    total_capital = Decimal("0.00")
    
    for transfer in equity_transfers:
        equity_conv = EquityConversion(
            conversion_id=conversion_id,
            member_name=transfer["member_name"],
            llc_capital_account=Decimal(str(transfer["llc_capital"])),
            c_corp_shares_issued=transfer["shares_issued"],
            share_class=transfer.get("share_class", "Common"),
            conversion_date=conversion.conversion_date,
            conversion_notes=transfer.get("notes", "")
        )
        db.add(equity_conv)
        
        total_shares += transfer["shares_issued"]
        total_capital += Decimal(str(transfer["llc_capital"]))
    
    # Update conversion record
    conversion.pre_conversion_equity = total_capital
    conversion.post_conversion_shares_issued = total_shares
    
    await db.commit()
    
    return {
        "success": True,
        "conversion_id": conversion_id,
        "total_llc_capital": float(total_capital),
        "total_shares_issued": total_shares,
        "transfers_recorded": len(equity_transfers)
    }


@router.post("/conversion/{conversion_id}/complete")
async def complete_conversion(
    conversion_id: int,
    final_llc_book_date: str,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Complete the entity conversion and close LLC books
    Marks LLC as inactive, C-Corp as primary
    """
    # Get conversion record
    conversion_stmt = select(EntityConversion).where(EntityConversion.id == conversion_id)
    conversion_result = await db.execute(conversion_stmt)
    conversion = conversion_result.scalar_one_or_none()
    
    if not conversion:
        raise HTTPException(status_code=404, detail="Conversion not found")
    
    # Get source and target entities
    source_stmt = select(AccountingEntity).where(AccountingEntity.id == conversion.source_entity_id)
    source_result = await db.execute(source_stmt)
    source_entity = source_result.scalar_one_or_none()
    
    target_stmt = select(AccountingEntity).where(AccountingEntity.id == conversion.target_entity_id)
    target_result = await db.execute(target_stmt)
    target_entity = target_result.scalar_one_or_none()
    
    # Update conversion status
    conversion.conversion_status = "Completed"
    conversion.conversion_completed_by = "system@ngicapital.com"  # TODO: Get from auth context
    conversion.conversion_completed_date = datetime.now()
    
    # Close LLC entity
    source_entity.is_active = False
    source_entity.metadata = source_entity.metadata or {}
    source_entity.metadata["conversion_status"] = "Completed"
    source_entity.metadata["closed_date"] = final_llc_book_date
    source_entity.metadata["final_book_closing_date"] = final_llc_book_date
    source_entity.metadata["converted_to_c_corp_id"] = target_entity.id
    
    # Ensure C-Corp is active
    target_entity.is_active = True
    target_entity.metadata = target_entity.metadata or {}
    target_entity.metadata["conversion_status"] = "Completed"
    target_entity.metadata["c_corp_start_date"] = str(conversion.conversion_date)
    
    # If there were any subsidiary LLCs under the original LLC, update them to be under C-Corp
    subsidiaries_stmt = select(AccountingEntity).where(AccountingEntity.parent_entity_id == source_entity.id)
    subsidiaries_result = await db.execute(subsidiaries_stmt)
    subsidiaries = subsidiaries_result.scalars().all()
    
    for sub in subsidiaries:
        # Create new relationship under C-Corp
        sub.parent_entity_id = target_entity.id
    
    await db.commit()
    
    return {
        "success": True,
        "conversion_id": conversion_id,
        "source_entity": {
            "id": source_entity.id,
            "name": source_entity.entity_name,
            "status": "Closed",
            "final_book_date": final_llc_book_date
        },
        "target_entity": {
            "id": target_entity.id,
            "name": target_entity.entity_name,
            "status": "Active",
            "entity_type": "C-Corp"
        },
        "subsidiaries_migrated": len(subsidiaries),
        "message": f"Conversion complete. {source_entity.entity_name} is now closed. All operations transferred to {target_entity.entity_name}."
    }


@router.get("/conversions")
async def get_all_conversions(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all entity conversions with details
    """
    query = select(EntityConversion)
    
    if status:
        query = query.where(EntityConversion.conversion_status == status)
    
    query = query.order_by(EntityConversion.conversion_date.desc())
    
    result = await db.execute(query)
    conversions = result.scalars().all()
    
    conversion_list = []
    for conv in conversions:
        # Get source and target entity names
        source_stmt = select(AccountingEntity).where(AccountingEntity.id == conv.source_entity_id)
        source_result = await db.execute(source_stmt)
        source_entity = source_result.scalar_one_or_none()
        
        target_stmt = select(AccountingEntity).where(AccountingEntity.id == conv.target_entity_id)
        target_result = await db.execute(target_stmt)
        target_entity = target_result.scalar_one_or_none()
        
        conversion_list.append({
            "id": conv.id,
            "conversion_type": conv.conversion_type,
            "conversion_date": conv.conversion_date.isoformat(),
            "conversion_status": conv.conversion_status,
            "source_entity": {
                "id": source_entity.id if source_entity else None,
                "name": source_entity.entity_name if source_entity else None,
                "type": source_entity.entity_type if source_entity else None
            },
            "target_entity": {
                "id": target_entity.id if target_entity else None,
                "name": target_entity.entity_name if target_entity else None,
                "type": target_entity.entity_type if target_entity else None
            },
            "pre_conversion_equity": float(conv.pre_conversion_equity) if conv.pre_conversion_equity else 0,
            "post_conversion_shares_issued": conv.post_conversion_shares_issued or 0,
            "initiated_by": conv.conversion_initiated_by,
            "completed_date": conv.conversion_completed_date.isoformat() if conv.conversion_completed_date else None
        })
    
    return {
        "conversions": conversion_list,
        "total": len(conversion_list)
    }


@router.get("/conversion/{conversion_id}/equity-details")
async def get_equity_conversion_details(
    conversion_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get detailed equity conversion information
    Shows how LLC capital was converted to C-Corp stock
    """
    equity_stmt = select(EquityConversion).where(EquityConversion.conversion_id == conversion_id)
    result = await db.execute(equity_stmt)
    equity_conversions = result.scalars().all()
    
    return {
        "conversion_id": conversion_id,
        "equity_transfers": [
            {
                "id": ec.id,
                "member_name": ec.member_name,
                "llc_capital_account": float(ec.llc_capital_account),
                "c_corp_shares_issued": ec.c_corp_shares_issued,
                "share_class": ec.share_class,
                "conversion_date": ec.conversion_date.isoformat(),
                "conversion_notes": ec.conversion_notes
            }
            for ec in equity_conversions
        ],
        "total_llc_capital": float(sum(ec.llc_capital_account for ec in equity_conversions)),
        "total_shares_issued": sum(ec.c_corp_shares_issued for ec in equity_conversions)
    }

