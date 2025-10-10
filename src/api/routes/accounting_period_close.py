"""
Period Close API Routes
Month/Quarter/Year-end close workflow management
"""

from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from datetime import date
from typing import List, Optional
from pydantic import BaseModel
import logging

from ..database_async import get_async_db
from src.api.models_period_close import PeriodClose, PeriodLock, AdjustingEntry
from src.api.models_accounting import AccountingEntity
from src.api.services.period_close_service import PeriodCloseService

router = APIRouter(prefix="/api/accounting/period-close", tags=["Period Close"])
logger = logging.getLogger(__name__)


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class InitiateCloseRequest(BaseModel):
    period_type: str  # month, quarter, year
    period_end_date: str  # YYYY-MM-DD
    initiated_by_email: str


class ExecuteCloseRequest(BaseModel):
    closed_by_email: str
    force: bool = False


class ReopenRequest(BaseModel):
    reopened_by_email: str
    reason: str


class AdjustingEntryCreate(BaseModel):
    adjustment_type: str
    description: str
    reason: Optional[str] = None
    total_amount: float


# ============================================================================
# PERIOD CLOSE ROUTES
# ============================================================================

@router.get("/list")
async def list_period_closes(
    entity_id: int = Query(...),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_async_db)
):
    """List all period closes for entity"""
    try:
        result = await db.execute(
            select(PeriodClose).where(
                PeriodClose.entity_id == entity_id
            ).order_by(desc(PeriodClose.period_end)).limit(limit)
        )
        closes = result.scalars().all()
        
        return {
            "success": True,
            "closes": [
                {
                    "id": c.id,
                    "period_type": c.period_type,
                    "period_start": str(c.period_start),
                    "period_end": str(c.period_end),
                    "fiscal_period": c.fiscal_period,
                    "status": c.status,
                    "is_balanced": c.is_balanced,
                    "net_income": float(c.net_income) if c.net_income else 0,
                    "closed_at": c.closed_at.isoformat() if c.closed_at else None,
                    "closed_by_email": c.closed_by_email
                }
                for c in closes
            ]
        }
    except Exception as e:
        logger.error(f"Failed to list period closes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/initiate")
async def initiate_period_close(
    entity_id: int = Query(...),
    request: InitiateCloseRequest = None,
    db: AsyncSession = Depends(get_async_db)
):
    """Initiate period close process"""
    try:
        service = PeriodCloseService(db)
        
        period_end = date.fromisoformat(request.period_end_date)
        
        result = await service.initiate_period_close(
            entity_id=entity_id,
            period_type=request.period_type,
            period_end_date=period_end,
            initiated_by_email=request.initiated_by_email
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to initiate period close: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{close_id}/checklist")
async def get_period_close_checklist(
    close_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Get period close checklist with current status"""
    try:
        service = PeriodCloseService(db)
        checklist = await service.run_checklist(close_id)
        
        return {
            "success": True,
            "checklist": checklist
        }
        
    except Exception as e:
        logger.error(f"Failed to get checklist: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{close_id}")
async def get_period_close_details(
    close_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Get detailed period close information"""
    try:
        close = await db.get(PeriodClose, close_id)
        if not close:
            raise HTTPException(status_code=404, detail="Period close not found")
        
        return {
            "success": True,
            "close": {
                "id": close.id,
                "entity_id": close.entity_id,
                "period_type": close.period_type,
                "period_start": str(close.period_start),
                "period_end": str(close.period_end),
                "fiscal_year": close.fiscal_year,
                "fiscal_period": close.fiscal_period,
                "status": close.status,
                "checklist_status": close.checklist_status,
                "financial_summary": {
                    "total_assets": float(close.total_assets) if close.total_assets else 0,
                    "total_liabilities": float(close.total_liabilities) if close.total_liabilities else 0,
                    "total_equity": float(close.total_equity) if close.total_equity else 0,
                    "period_revenue": float(close.period_revenue) if close.period_revenue else 0,
                    "period_expenses": float(close.period_expenses) if close.period_expenses else 0,
                    "net_income": float(close.net_income) if close.net_income else 0
                },
                "trial_balance": {
                    "debits": float(close.trial_balance_debits) if close.trial_balance_debits else 0,
                    "credits": float(close.trial_balance_credits) if close.trial_balance_credits else 0,
                    "is_balanced": close.is_balanced
                },
                "completion_status": {
                    "documents_complete": close.documents_complete,
                    "reconciliation_complete": close.reconciliation_complete,
                    "journal_entries_complete": close.journal_entries_complete,
                    "depreciation_complete": close.depreciation_complete,
                    "adjusting_entries_complete": close.adjusting_entries_complete,
                    "trial_balance_complete": close.trial_balance_complete,
                    "statements_complete": close.statements_complete
                },
                "workflow": {
                    "initiated_by_email": close.initiated_by_email,
                    "initiated_at": close.initiated_at.isoformat() if close.initiated_at else None,
                    "closed_by_email": close.closed_by_email,
                    "closed_at": close.closed_at.isoformat() if close.closed_at else None,
                    "reopened_by_email": close.reopened_by_email,
                    "reopened_at": close.reopened_at.isoformat() if close.reopened_at else None,
                    "reopen_reason": close.reopen_reason
                },
                "close_notes": close.close_notes,
                "financial_statements": close.financial_statements
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get period close details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{close_id}/execute")
async def execute_period_close(
    close_id: int,
    request: ExecuteCloseRequest = None,
    db: AsyncSession = Depends(get_async_db)
):
    """Execute period close after checklist complete"""
    try:
        service = PeriodCloseService(db)
        
        result = await service.execute_period_close(
            close_id=close_id,
            closed_by_email=request.closed_by_email,
            force=request.force
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to execute period close: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{close_id}/reopen")
async def reopen_period_close(
    close_id: int,
    request: ReopenRequest = None,
    db: AsyncSession = Depends(get_async_db)
):
    """Reopen a closed period (requires approval)"""
    try:
        service = PeriodCloseService(db)
        
        result = await service.reopen_period(
            close_id=close_id,
            reopened_by_email=request.reopened_by_email,
            reason=request.reason
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to reopen period: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{close_id}/statements")
async def get_period_close_statements(
    close_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Get financial statements for closed period"""
    try:
        close = await db.get(PeriodClose, close_id)
        if not close:
            raise HTTPException(status_code=404, detail="Period close not found")
        
        if close.status != "closed":
            return {
                "success": False,
                "message": "Financial statements only available after period close"
            }
        
        return {
            "success": True,
            "statements": close.financial_statements
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get statements: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# PERIOD LOCKS
# ============================================================================

@router.get("/locks")
async def get_period_locks(
    entity_id: int = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Get all period locks for entity"""
    try:
        result = await db.execute(
            select(PeriodLock).where(
                PeriodLock.entity_id == entity_id
            ).order_by(desc(PeriodLock.lock_end_date))
        )
        locks = result.scalars().all()
        
        return {
            "success": True,
            "locks": [
                {
                    "id": lock.id,
                    "lock_start_date": str(lock.lock_start_date),
                    "lock_end_date": str(lock.lock_end_date),
                    "is_locked": lock.is_locked,
                    "lock_reason": lock.lock_reason,
                    "locked_by_email": lock.locked_by_email,
                    "locked_at": lock.locked_at.isoformat() if lock.locked_at else None,
                    "period_close_id": lock.period_close_id
                }
                for lock in locks
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to get period locks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/locks/check")
async def check_period_locked(
    entity_id: int = Query(...),
    check_date: str = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Check if a specific date is in a locked period"""
    try:
        check_dt = date.fromisoformat(check_date)
        
        result = await db.execute(
            select(PeriodLock).where(
                and_(
                    PeriodLock.entity_id == entity_id,
                    PeriodLock.is_locked == True,
                    PeriodLock.lock_start_date <= check_dt,
                    PeriodLock.lock_end_date >= check_dt
                )
            )
        )
        lock = result.scalar_one_or_none()
        
        return {
            "success": True,
            "is_locked": lock is not None,
            "lock": {
                "id": lock.id,
                "lock_start_date": str(lock.lock_start_date),
                "lock_end_date": str(lock.lock_end_date),
                "lock_reason": lock.lock_reason
            } if lock else None
        }
        
    except Exception as e:
        logger.error(f"Failed to check period lock: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ADJUSTING ENTRIES
# ============================================================================

@router.get("/{close_id}/adjusting-entries")
async def get_adjusting_entries(
    close_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Get adjusting entries for period close"""
    try:
        result = await db.execute(
            select(AdjustingEntry).where(
                AdjustingEntry.period_close_id == close_id
            )
        )
        entries = result.scalars().all()
        
        return {
            "success": True,
            "entries": [
                {
                    "id": entry.id,
                    "adjustment_type": entry.adjustment_type,
                    "description": entry.description,
                    "reason": entry.reason,
                    "total_amount": float(entry.total_amount),
                    "status": entry.status,
                    "journal_entry_id": entry.journal_entry_id,
                    "approved_by_email": entry.approved_by_email,
                    "approved_at": entry.approved_at.isoformat() if entry.approved_at else None
                }
                for entry in entries
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to get adjusting entries: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{close_id}/adjusting-entries")
async def create_adjusting_entry(
    close_id: int,
    entity_id: int = Query(...),
    entry: AdjustingEntryCreate = None,
    db: AsyncSession = Depends(get_async_db)
):
    """Create adjusting entry for period close"""
    try:
        adj_entry = AdjustingEntry(
            entity_id=entity_id,
            period_close_id=close_id,
            adjustment_type=entry.adjustment_type,
            description=entry.description,
            reason=entry.reason,
            total_amount=entry.total_amount,
            status="draft"
        )
        
        db.add(adj_entry)
        await db.commit()
        await db.refresh(adj_entry)
        
        return {
            "success": True,
            "message": "Adjusting entry created",
            "entry_id": adj_entry.id
        }
        
    except Exception as e:
        logger.error(f"Failed to create adjusting entry: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
