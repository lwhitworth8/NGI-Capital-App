"""
Banking API Routes
Mercury sync, bank reconciliation, and transaction management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import date
from decimal import Decimal
import logging

from ..database_async import get_async_db
from src.api.models_accounting_part2 import BankAccount, BankTransaction, BankReconciliation
from src.api.services.mercury_sync_service import MercurySyncService
from src.api.services.bank_reconciliation_service import BankReconciliationService
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/accounting/banking", tags=["banking"])


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class BankAccountCreate(BaseModel):
    bank_name: str
    account_name: str
    account_number_last_four: str
    account_type: str
    routing_number: Optional[str] = None
    is_primary: bool = False

class ReconciliationCreate(BaseModel):
    period_start: date
    period_end: date
    ending_bank_balance: float


# ============================================================================
# BANK ACCOUNTS
# ============================================================================

@router.get("/accounts")
async def get_bank_accounts(
    entity_id: int = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Get all bank accounts for entity"""
    try:
        result = await db.execute(
            select(BankAccount).where(BankAccount.entity_id == entity_id)
        )
        accounts = result.scalars().all()
        
        return {
            "success": True,
            "accounts": [
                {
                    "id": a.id,
                    "bank_name": a.bank_name,
                    "account_name": a.account_name,
                    "account_number_last_four": a.account_number_last_four,
                    "account_type": a.account_type,
                    "routing_number": a.routing_number,
                    "is_primary": a.is_primary,
                    "is_active": a.is_active,
                    "current_balance": float(a.current_balance) if a.current_balance else 0
                }
                for a in accounts
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching bank accounts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/accounts")
async def create_bank_account(
    entity_id: int,
    account_data: BankAccountCreate,
    db: AsyncSession = Depends(get_async_db)
):
    """Create new bank account"""
    try:
        from src.api.utils.datetime_utils import get_pst_now
        
        account = BankAccount(
            entity_id=entity_id,
            bank_name=account_data.bank_name,
            account_name=account_data.account_name,
            account_number_last_four=account_data.account_number_last_four,
            account_type=account_data.account_type,
            routing_number=account_data.routing_number,
            is_primary=account_data.is_primary,
            is_active=True,
            current_balance=Decimal("0"),
            created_at=get_pst_now()
        )
        
        db.add(account)
        await db.commit()
        await db.refresh(account)
        
        return {
            "success": True,
            "message": "Bank account created",
            "account_id": account.id
        }
        
    except Exception as e:
        logger.error(f"Error creating bank account: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# MERCURY SYNC
# ============================================================================

@router.post("/mercury/sync")
async def sync_mercury_transactions(
    entity_id: int = Query(...),
    days_back: int = Query(30),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Sync Mercury transactions (auto-matches or creates drafts)
    This endpoint can be called manually or via cron job
    """
    try:
        sync_service = MercurySyncService(db)
        result = await sync_service.sync_transactions(entity_id, days_back)
        
        return result
        
    except Exception as e:
        logger.error(f"Error syncing Mercury: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# TRANSACTIONS
# ============================================================================

@router.get("/transactions")
async def get_bank_transactions(
    entity_id: int = Query(...),
    bank_account_id: Optional[int] = None,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """Get bank transactions with filters"""
    try:
        query = select(BankTransaction).where(BankTransaction.entity_id == entity_id)
        
        if bank_account_id:
            query = query.where(BankTransaction.bank_account_id == bank_account_id)
        if status:
            query = query.where(BankTransaction.status == status)
        if date_from:
            query = query.where(BankTransaction.transaction_date >= date_from)
        if date_to:
            query = query.where(BankTransaction.transaction_date <= date_to)
        
        query = query.order_by(BankTransaction.transaction_date.desc())
        
        result = await db.execute(query)
        transactions = result.scalars().all()
        
        return {
            "success": True,
            "transactions": [
                {
                    "id": t.id,
                    "bank_account_id": t.bank_account_id,
                    "mercury_transaction_id": t.mercury_transaction_id,
                    "transaction_date": t.transaction_date.isoformat(),
                    "description": t.description,
                    "amount": float(t.amount),
                    "transaction_type": t.transaction_type,
                    "status": t.status,
                    "matched_je_id": t.matched_journal_entry_id,
                    "is_matched": t.matched_journal_entry_id is not None
                }
                for t in transactions
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# RECONCILIATION
# ============================================================================

@router.get("/reconciliation/status")
async def get_reconciliation_status(
    bank_account_id: int = Query(...),
    as_of_date: date = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Get current reconciliation status for bank account"""
    try:
        rec_service = BankReconciliationService(db)
        result = await rec_service.get_reconciliation_status(bank_account_id, as_of_date)
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting reconciliation status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reconciliation/match")
async def match_transaction_to_je(
    transaction_id: int,
    journal_entry_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Manually match a transaction to a journal entry"""
    try:
        rec_service = BankReconciliationService(db)
        result = await rec_service.match_transaction_to_je(transaction_id, journal_entry_id)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error matching transaction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reconciliation/unmatch")
async def unmatch_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Remove match between transaction and JE"""
    try:
        rec_service = BankReconciliationService(db)
        result = await rec_service.unmatch_transaction(transaction_id)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unmatching transaction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reconciliation/create")
async def create_reconciliation_report(
    bank_account_id: int,
    reconciliation_data: ReconciliationCreate,
    db: AsyncSession = Depends(get_async_db)
):
    """Create formal bank reconciliation report"""
    try:
        rec_service = BankReconciliationService(db)
        result = await rec_service.create_reconciliation_report(
            bank_account_id,
            reconciliation_data.period_start,
            reconciliation_data.period_end,
            Decimal(str(reconciliation_data.ending_bank_balance))
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating reconciliation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reconciliation/history")
async def get_reconciliation_history(
    entity_id: int = Query(...),
    bank_account_id: Optional[int] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """Get reconciliation history"""
    try:
        query = select(BankReconciliation).where(
            BankReconciliation.entity_id == entity_id
        )
        
        if bank_account_id:
            query = query.where(BankReconciliation.bank_account_id == bank_account_id)
        
        query = query.order_by(BankReconciliation.reconciliation_date.desc())
        
        result = await db.execute(query)
        reconciliations = result.scalars().all()
        
        return {
            "success": True,
            "reconciliations": [
                {
                    "id": r.id,
                    "bank_account_id": r.bank_account_id,
                    "reconciliation_date": r.reconciliation_date.isoformat(),
                    "period_start": r.period_start.isoformat(),
                    "period_end": r.period_end.isoformat(),
                    "gl_balance": float(r.gl_balance),
                    "bank_balance": float(r.bank_balance),
                    "adjusted_bank_balance": float(r.adjusted_bank_balance),
                    "difference": float(r.difference),
                    "is_reconciled": r.is_reconciled
                }
                for r in reconciliations
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching reconciliation history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

