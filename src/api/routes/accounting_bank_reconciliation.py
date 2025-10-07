"""
NGI Capital - Bank Reconciliation API
Epic 4: Automated reconciliation with Mercury

Author: NGI Capital Development Team
Date: October 3, 2025
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

from pydantic import BaseModel, Field, ConfigDict
from ..database_async import get_async_db
from ..models import Partners
from ..models_accounting import (
    AccountingEntity, ChartOfAccounts, JournalEntry
)
from ..models_accounting_part2 import (
    BankAccount, BankTransaction, BankTransactionMatch,
    BankReconciliation, BankMatchingRule
)
# Import Mercury service functions
from ..services.mercury_sync import (
    sync_mercury_account, match_bank_transaction, auto_match_transactions,
    apply_matching_rules
)


router = APIRouter(prefix="/api/accounting/bank-reconciliation", tags=["Accounting - Bank Reconciliation"])


# ============================================================================
# SCHEMAS
# ============================================================================

class BankAccountResponse(BaseModel):
    id: int
    entity_id: int
    bank_name: str
    account_name: str
    account_number_masked: Optional[str]
    account_type: str
    currency: str
    mercury_account_id: Optional[str]
    auto_sync_enabled: bool
    last_sync_at: Optional[datetime]
    last_sync_status: Optional[str]
    gl_account_id: int
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)


class BankTransactionResponse(BaseModel):
    id: int
    bank_account_id: int
    transaction_date: date
    description: str
    amount: Decimal
    running_balance: Optional[Decimal]
    merchant_name: Optional[str]
    merchant_category: Optional[str]
    is_matched: bool
    matched_at: Optional[datetime]
    confidence_score: Optional[Decimal]
    status: str
    suggested_account_id: Optional[int] = None
    suggested_account_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class ReconciliationResponse(BaseModel):
    id: int
    bank_account_id: int
    reconciliation_date: date
    fiscal_year: int
    fiscal_period: int
    beginning_balance: Decimal
    ending_balance_per_bank: Decimal
    ending_balance_per_books: Decimal
    cleared_deposits: Decimal
    cleared_withdrawals: Decimal
    outstanding_deposits: Decimal
    outstanding_checks: Decimal
    adjustments: Decimal
    difference: Decimal
    is_balanced: bool
    status: str
    prepared_by_name: Optional[str] = None
    approved_by_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class SyncRequest(BaseModel):
    days_back: int = 30


class MatchRequest(BaseModel):
    bank_transaction_id: int
    journal_entry_id: int
    confidence: Optional[Decimal] = None


class ReconciliationCreateRequest(BaseModel):
    bank_account_id: int
    reconciliation_date: date
    ending_balance_per_bank: Decimal
    notes: Optional[str] = None


# ============================================================================
# BANK ACCOUNTS
# ============================================================================

@router.get("/accounts", response_model=List[BankAccountResponse])
async def get_bank_accounts(
    entity_id: int = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Get all bank accounts for an entity"""
    
    result = await db.execute(
        select(BankAccount).where(
            and_(
                BankAccount.entity_id == entity_id,
                BankAccount.is_active == True
            )
        )
    )
    
    accounts = result.scalars().all()
    return [BankAccountResponse.model_validate(acc) for acc in accounts]


@router.get("/accounts/{account_id}", response_model=BankAccountResponse)
async def get_bank_account(
    account_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Get bank account by ID"""
    
    result = await db.execute(
        select(BankAccount).where(BankAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    return BankAccountResponse.model_validate(account)


# ============================================================================
# MERCURY SYNC
# ============================================================================

@router.post("/accounts/{account_id}/sync")
async def sync_transactions(
    account_id: int,
    request: SyncRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Sync transactions from Mercury
    Fetches last N days of transactions
    """
    
    try:
        result = await sync_mercury_account(db, account_id, request.days_back)
        return {
            "message": f"Successfully synced {result['transactions_imported']} transactions",
            **result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.post("/accounts/{account_id}/auto-match")
async def auto_match(
    account_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Automatically match unmatched transactions
    Uses rules and AI matching (95%+ accuracy target)
    """
    
    try:
        result = await auto_match_transactions(db, account_id)
        return {
            "message": f"Matched {result['matched']} transactions",
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto-match failed: {str(e)}")


# ============================================================================
# TRANSACTIONS
# ============================================================================

@router.get("/transactions", response_model=List[BankTransactionResponse])
async def get_transactions(
    bank_account_id: int = Query(...),
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = 1,
    page_size: int = 100,
    db: AsyncSession = Depends(get_async_db)
):
    """Get bank transactions with filters"""
    
    query = select(BankTransaction).where(
        BankTransaction.bank_account_id == bank_account_id
    )
    
    if status:
        query = query.where(BankTransaction.status == status)
    
    if date_from:
        query = query.where(BankTransaction.transaction_date >= date_from)
    
    if date_to:
        query = query.where(BankTransaction.transaction_date <= date_to)
    
    query = query.order_by(desc(BankTransaction.transaction_date))
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    # Build responses with suggested accounts
    responses = []
    for txn in transactions:
        response = BankTransactionResponse.model_validate(txn)
        
        # Get suggested account if unmatched
        if txn.status == "unmatched":
            suggested_account_id = await apply_matching_rules(db, txn)
            if suggested_account_id:
                account_result = await db.execute(
                    select(ChartOfAccounts).where(ChartOfAccounts.id == suggested_account_id)
                )
                account = account_result.scalar_one_or_none()
                if account:
                    response.suggested_account_id = account.id
                    response.suggested_account_name = f"{account.account_number} - {account.account_name}"
        
        responses.append(response)
    
    return responses


@router.post("/transactions/match")
async def match_transaction(
    request: MatchRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """Manually match a transaction to a journal entry"""
    
    try:
        match = await match_bank_transaction(
            db,
            request.bank_transaction_id,
            request.journal_entry_id,
            match_type="manual",
            confidence=request.confidence or Decimal("1.0")
        )
        
        return {
            "message": "Transaction matched successfully",
            "match_id": match.id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Match failed: {str(e)}")


class MatchByIdRequest(BaseModel):
    journal_entry_id: int
    matched_amount: Optional[Decimal] = None


@router.post("/transactions/{transaction_id}/match")
async def match_transaction_by_id(
    transaction_id: int,
    request: MatchByIdRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """Manually match a transaction to a journal entry by transaction ID"""
    
    try:
        match = await match_bank_transaction(
            db,
            transaction_id,
            request.journal_entry_id,
            match_type="manual",
            confidence=Decimal("1.0")
        )
        
        return {
            "message": "Transaction matched successfully",
            "match_id": match.id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Match failed: {str(e)}")


@router.delete("/transactions/{transaction_id}/unmatch")
async def unmatch_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Remove match from a transaction"""
    
    # Get transaction
    txn_result = await db.execute(
        select(BankTransaction).where(BankTransaction.id == transaction_id)
    )
    txn = txn_result.scalar_one_or_none()
    
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Delete matches
    await db.execute(
        select(BankTransactionMatch).where(
            BankTransactionMatch.bank_transaction_id == transaction_id
        )
    )
    
    # Update transaction
    txn.is_matched = False
    txn.matched_at = None
    txn.status = "unmatched"
    txn.confidence_score = None
    
    await db.commit()
    
    return {"message": "Transaction unmatched successfully"}


# ============================================================================
# RECONCILIATION
# ============================================================================

@router.post("/reconciliations", response_model=ReconciliationResponse)
async def create_reconciliation(
    request: ReconciliationCreateRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Create a new bank reconciliation
    Calculates beginning balance, cleared items, outstanding items
    """
    
    # Get bank account
    account_result = await db.execute(
        select(BankAccount).where(BankAccount.id == request.bank_account_id)
    )
    account = account_result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    # Calculate beginning balance (previous rec ending balance or 0)
    prev_rec_result = await db.execute(
        select(BankReconciliation).where(
            BankReconciliation.bank_account_id == request.bank_account_id
        ).order_by(desc(BankReconciliation.reconciliation_date)).limit(1)
    )
    prev_rec = prev_rec_result.scalar_one_or_none()
    beginning_balance = prev_rec.ending_balance_per_bank if prev_rec else Decimal("0.00")
    
    # Calculate cleared transactions
    cleared_result = await db.execute(
        select(
            func.sum(BankTransaction.amount).filter(BankTransaction.amount > 0).label("deposits"),
            func.sum(BankTransaction.amount).filter(BankTransaction.amount < 0).label("withdrawals")
        ).where(
            and_(
                BankTransaction.bank_account_id == request.bank_account_id,
                BankTransaction.transaction_date <= request.reconciliation_date,
                BankTransaction.is_matched == True
            )
        )
    )
    cleared = cleared_result.first()
    cleared_deposits = cleared.deposits or Decimal("0.00")
    cleared_withdrawals = abs(cleared.withdrawals or Decimal("0.00"))
    
    # Calculate outstanding transactions
    outstanding_result = await db.execute(
        select(
            func.sum(BankTransaction.amount).filter(BankTransaction.amount > 0).label("deposits"),
            func.sum(BankTransaction.amount).filter(BankTransaction.amount < 0).label("checks")
        ).where(
            and_(
                BankTransaction.bank_account_id == request.bank_account_id,
                BankTransaction.transaction_date <= request.reconciliation_date,
                BankTransaction.is_matched == False
            )
        )
    )
    outstanding = outstanding_result.first()
    outstanding_deposits = outstanding.deposits or Decimal("0.00")
    outstanding_checks = abs(outstanding.checks or Decimal("0.00"))
    
    # Get GL account balance
    gl_account_result = await db.execute(
        select(ChartOfAccounts).where(ChartOfAccounts.id == account.gl_account_id)
    )
    gl_account = gl_account_result.scalar_one()
    ending_balance_per_books = gl_account.current_balance
    
    # Calculate difference
    reconciled_balance = (
        beginning_balance +
        cleared_deposits -
        cleared_withdrawals +
        outstanding_deposits -
        outstanding_checks
    )
    difference = request.ending_balance_per_bank - reconciled_balance
    
    # Create reconciliation
    reconciliation = BankReconciliation(
        bank_account_id=request.bank_account_id,
        reconciliation_date=request.reconciliation_date,
        fiscal_year=request.reconciliation_date.year,
        fiscal_period=request.reconciliation_date.month,
        beginning_balance=beginning_balance,
        ending_balance_per_bank=request.ending_balance_per_bank,
        ending_balance_per_books=ending_balance_per_books,
        cleared_deposits=cleared_deposits,
        cleared_withdrawals=cleared_withdrawals,
        outstanding_deposits=outstanding_deposits,
        outstanding_checks=outstanding_checks,
        adjustments=Decimal("0.00"),
        difference=difference,
        is_balanced=(abs(difference) < Decimal("0.01")),
        status="draft",
        prepared_by_id=1,  # Default user ID for testing (auth disabled in dev)
        prepared_at=datetime.utcnow(),
        notes=request.notes
    )
    
    db.add(reconciliation)
    await db.commit()
    await db.refresh(reconciliation)
    
    # Build response
    response = ReconciliationResponse.model_validate(reconciliation)
    response.prepared_by_name = "Test User"  # Default for testing (auth disabled in dev)
    
    return response


@router.get("/reconciliations", response_model=List[ReconciliationResponse])
async def get_reconciliations(
    bank_account_id: int = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Get all reconciliations for a bank account"""
    
    result = await db.execute(
        select(BankReconciliation).where(
            BankReconciliation.bank_account_id == bank_account_id
        ).order_by(desc(BankReconciliation.reconciliation_date))
    )
    
    reconciliations = result.scalars().all()
    
    # Build responses
    responses = []
    for rec in reconciliations:
        response = ReconciliationResponse.model_validate(rec)
        
        # Get preparer name
        if rec.prepared_by_id:
            user_result = await db.execute(
                select(Partners).where(Partners.id == rec.prepared_by_id)
            )
            user = user_result.scalar_one_or_none()
            if user:
                response.prepared_by_name = f"{user.first_name} {user.last_name}"
        
        # Get approver name
        if rec.approved_by_id:
            user_result = await db.execute(
                select(Partners).where(Partners.id == rec.approved_by_id)
            )
            user = user_result.scalar_one_or_none()
            if user:
                response.approved_by_name = f"{user.first_name} {user.last_name}"
        
        responses.append(response)
    
    return responses


@router.post("/reconciliations/{reconciliation_id}/approve")
async def approve_reconciliation(
    reconciliation_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Approve a reconciliation"""
    
    result = await db.execute(
        select(BankReconciliation).where(BankReconciliation.id == reconciliation_id)
    )
    rec = result.scalar_one_or_none()
    
    if not rec:
        raise HTTPException(status_code=404, detail="Reconciliation not found")
    
    if rec.status != "draft":
        raise HTTPException(status_code=400, detail="Reconciliation already processed")
    
    # Update status
    rec.status = "approved"
    rec.approved_by_id = 1  # Default user ID for testing (auth disabled in dev)
    rec.approved_at = datetime.utcnow()
    
    await db.commit()
    
    return {"message": "Reconciliation approved successfully"}

