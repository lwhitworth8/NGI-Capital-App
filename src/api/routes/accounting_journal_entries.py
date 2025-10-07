"""
NGI Capital - Journal Entries API
Epic 3: Double-entry accounting with dual approval (Landon + Andre)

Author: NGI Capital Development Team
Date: October 3, 2025
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator, ConfigDict, computed_field
from ..database_async import get_async_db
from ..models import Partners as Partner  # For queries only
from ..models_accounting import (
    JournalEntry, JournalEntryLine, ChartOfAccounts,
    AccountingEntity, JournalEntryAuditLog
)


router = APIRouter(prefix="/api/accounting/journal-entries", tags=["Accounting - Journal Entries"])


# ============================================================================
# SCHEMAS
# ============================================================================

class JournalEntryLineRequest(BaseModel):
    line_number: int
    account_id: int
    debit_amount: Decimal = Decimal("0.00")
    credit_amount: Decimal = Decimal("0.00")
    description: Optional[str] = None
    project_id: Optional[int] = None
    cost_center: Optional[str] = None
    department: Optional[str] = None
    
    @field_validator("debit_amount", "credit_amount")
    @classmethod
    def validate_amounts(cls, v):
        if v < 0:
            raise ValueError("Amounts cannot be negative")
        return v
    
    @field_validator("credit_amount")
    @classmethod
    def validate_debit_or_credit(cls, v, info):
        debit = info.data.get("debit_amount", Decimal("0.00"))
        if (v > 0 and debit > 0) or (v == 0 and debit == 0):
            raise ValueError("Each line must have either debit or credit, not both or neither")
        return v


class JournalEntryLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    line_number: int
    account_id: int
    account_number: str
    account_name: str
    debit_amount: Decimal
    credit_amount: Decimal
    description: Optional[str]
    project_id: Optional[int] = None
    cost_center: Optional[str] = None
    department: Optional[str] = None


class JournalEntryRequest(BaseModel):
    entity_id: int
    entry_date: date
    fiscal_year: int
    fiscal_period: int
    entry_type: str = "Standard"  # Standard, Adjusting, Closing, Reversing
    memo: Optional[str] = None
    reference: Optional[str] = None
    source_type: Optional[str] = "Manual"
    lines: List[JournalEntryLineRequest]
    
    @field_validator("lines")
    @classmethod
    def validate_balanced(cls, v):
        total_debits = sum(line.debit_amount for line in v)
        total_credits = sum(line.credit_amount for line in v)
        
        if total_debits != total_credits:
            raise ValueError(
                f"Journal entry must be balanced. Debits: {total_debits}, Credits: {total_credits}"
            )
        
        if len(v) < 2:
            raise ValueError("Journal entry must have at least 2 lines")
        
        return v


class JournalEntryResponse(BaseModel):
    id: int
    entry_number: str
    entity_id: int
    entity_name: str
    entry_date: date
    posting_date: Optional[date]
    fiscal_year: int
    fiscal_period: int
    entry_type: str
    memo: Optional[str]
    reference: Optional[str]
    status: str
    workflow_stage: int
    created_by_name: str
    created_at: datetime
    first_approved_by_name: Optional[str]
    first_approved_at: Optional[datetime]
    final_approved_by_name: Optional[str]
    final_approved_at: Optional[datetime]
    is_locked: bool
    lines: List[JournalEntryLineResponse]
    total_debits: Decimal
    total_credits: Decimal
    
    model_config = ConfigDict(from_attributes=True)
    
    @computed_field
    @property
    def total_debit(self) -> Decimal:
        """Alias for total_debits for backward compatibility"""
        return self.total_debits
    
    @computed_field
    @property
    def total_credit(self) -> Decimal:
        """Alias for total_credits for backward compatibility"""
        return self.total_credits


class JournalEntryApprovalRequest(BaseModel):
    action: str  # approve, reject
    notes: Optional[str] = None


# ============================================================================
# GENERATE ENTRY NUMBER
# ============================================================================

async def generate_entry_number(db: AsyncSession, fiscal_year: int) -> str:
    """Generate JE-YYYY-NNNNNN format"""
    result = await db.execute(
        select(func.count(JournalEntry.id)).where(
            JournalEntry.fiscal_year == fiscal_year
        )
    )
    count = result.scalar()
    return f"JE-{fiscal_year}-{(count + 1):06d}"


# ============================================================================
# CREATE JOURNAL ENTRY
# ============================================================================

@router.post("/", response_model=JournalEntryResponse)
async def create_journal_entry(
    request: JournalEntryRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Create a new journal entry (draft status)
    Must be balanced (debits = credits)
    """
    
    # Validate entity
    entity_result = await db.execute(
        select(AccountingEntity).where(AccountingEntity.id == request.entity_id)
    )
    entity = entity_result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Validate all accounts exist
    account_ids = [line.account_id for line in request.lines]
    accounts_result = await db.execute(
        select(ChartOfAccounts).where(ChartOfAccounts.id.in_(account_ids))
    )
    accounts = {acc.id: acc for acc in accounts_result.scalars().all()}
    
    if len(accounts) != len(account_ids):
        raise HTTPException(status_code=400, detail="One or more accounts not found")
    
    # Validate all accounts allow posting
    for acc_id in account_ids:
        if not accounts[acc_id].allow_posting:
            raise HTTPException(
                status_code=400,
                detail=f"Account {accounts[acc_id].account_number} does not allow posting"
            )
    
    # Generate entry number
    entry_number = await generate_entry_number(db, request.fiscal_year)
    
    # Create journal entry
    journal_entry = JournalEntry(
        entry_number=entry_number,
        entity_id=request.entity_id,
        entry_date=request.entry_date,
        fiscal_year=request.fiscal_year,
        fiscal_period=request.fiscal_period,
        entry_type=request.entry_type,
        memo=request.memo,
        reference=request.reference,
        source_type=request.source_type,
        status="draft",
        workflow_stage=0,
        created_by_id=1,  # current_user.id - Auth disabled for dev
        created_at=datetime.utcnow()
    )
    
    db.add(journal_entry)
    await db.flush()
    
    # Create lines
    for line_req in request.lines:
        line = JournalEntryLine(
            journal_entry_id=journal_entry.id,
            line_number=line_req.line_number,
            account_id=line_req.account_id,
            debit_amount=line_req.debit_amount,
            credit_amount=line_req.credit_amount,
            description=line_req.description,
            project_id=line_req.project_id,
            cost_center=line_req.cost_center,
            department=line_req.department
        )
        db.add(line)
    
    # Audit log
    audit = JournalEntryAuditLog(
        journal_entry_id=journal_entry.id,
        action="created",
        performed_by_id=1,  # current_user.id - Auth disabled for dev
        performed_at=datetime.utcnow(),
        comment="Journal entry created"
    )
    db.add(audit)
    
    await db.commit()
    await db.refresh(journal_entry)
    
    # Build response
    return await build_journal_entry_response(db, journal_entry)


# ============================================================================
# APPROVAL WORKFLOW
# ============================================================================

@router.post("/{entry_id}/submit-for-approval")
async def submit_for_approval(
    entry_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Submit journal entry for approval
    Moves from draft → pending_approval
    """
    
    result = await db.execute(
        select(JournalEntry).where(JournalEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    if entry.status != "draft":
        raise HTTPException(status_code=400, detail="Entry is not in draft status")
    
    # Update status
    entry.status = "pending_approval"
    entry.workflow_stage = 1
    
    # Audit log
    audit = JournalEntryAuditLog(
        journal_entry_id=entry.id,
        action="submitted_for_approval",
        performed_by_id=1,  # current_user.id - Auth disabled for dev
        performed_at=datetime.utcnow()
    )
    db.add(audit)
    
    await db.commit()
    
    return {"message": "Journal entry submitted for approval"}


@router.post("/{entry_id}/approve")
async def approve_journal_entry(
    entry_id: int,
    request: JournalEntryApprovalRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Approve journal entry
    First approval → workflow_stage 2
    Second approval → workflow_stage 3, status = approved
    """
    
    result = await db.execute(
        select(JournalEntry).where(JournalEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    if entry.status not in ["pending_approval", "approved"]:
        raise HTTPException(status_code=400, detail="Entry is not pending approval")
    
    # Cannot approve own entry
    if entry.created_by_id == 1:  # current_user.id - Auth disabled for dev
        raise HTTPException(status_code=400, detail="Cannot approve your own journal entry")
    
    # Handle approval action
    if request.action == "reject":
        entry.status = "draft"
        entry.workflow_stage = 0
        entry.rejection_reason = request.notes
        
        audit = JournalEntryAuditLog(
            journal_entry_id=entry.id,
            action="rejected",
            performed_by_id=1,  # current_user.id - Auth disabled for dev
            performed_at=datetime.utcnow(),
            comment=request.notes
        )
        db.add(audit)
        
        await db.commit()
        return {"message": "Journal entry rejected"}
    
    # Approve
    if entry.workflow_stage == 1:
        # First approval
        if entry.first_approved_by_id:
            raise HTTPException(status_code=400, detail="Entry already has first approval")
        
        entry.first_approved_by_id = 1  # current_user.id - Auth disabled for dev
        entry.first_approved_at = datetime.utcnow()
        entry.workflow_stage = 2
        
        audit_action = "first_approval"
        message = "First approval recorded. Requires one more approval."
    
    elif entry.workflow_stage == 2:
        # Final approval
        if entry.first_approved_by_id == 1:  # current_user.id - Auth disabled for dev
            raise HTTPException(status_code=400, detail="Cannot provide both approvals")
        
        if entry.final_approved_by_id:
            raise HTTPException(status_code=400, detail="Entry already has final approval")
        
        entry.final_approved_by_id = 1  # current_user.id - Auth disabled for dev
        entry.final_approved_at = datetime.utcnow()
        entry.workflow_stage = 3
        entry.status = "approved"
        
        audit_action = "final_approval"
        message = "Journal entry fully approved. Ready to post."
    
    else:
        raise HTTPException(status_code=400, detail="Invalid workflow stage")
    
    # Audit log
    audit = JournalEntryAuditLog(
        journal_entry_id=entry.id,
        action=audit_action,
        performed_by_id=1,  # current_user.id - Auth disabled for dev
        performed_at=datetime.utcnow(),
        comment=request.notes
    )
    db.add(audit)
    
    await db.commit()
    
    return {"message": message}


@router.post("/{entry_id}/post")
async def post_journal_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Post approved journal entry
    Updates account balances
    Entry becomes immutable after posting
    """
    
    result = await db.execute(
        select(JournalEntry).where(JournalEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    if entry.status != "approved":
        raise HTTPException(status_code=400, detail="Entry must be approved before posting")
    
    if entry.workflow_stage != 3:
        raise HTTPException(status_code=400, detail="Entry requires dual approval before posting")
    
    # Get lines
    lines_result = await db.execute(
        select(JournalEntryLine).where(JournalEntryLine.journal_entry_id == entry.id)
    )
    lines = lines_result.scalars().all()
    
    # Update account balances
    for line in lines:
        account_result = await db.execute(
            select(ChartOfAccounts).where(ChartOfAccounts.id == line.account_id)
        )
        account = account_result.scalar_one()
        
        # Update balance based on normal balance
        if line.debit_amount > 0:
            if account.normal_balance == "Debit":
                account.current_balance += line.debit_amount
            else:
                account.current_balance -= line.debit_amount
            account.ytd_activity += line.debit_amount
        else:
            if account.normal_balance == "Credit":
                account.current_balance += line.credit_amount
            else:
                account.current_balance -= line.credit_amount
            account.ytd_activity += line.credit_amount
        
        account.last_transaction_date = entry.entry_date
    
    # Update entry
    entry.status = "posted"
    entry.posted_at = datetime.utcnow()
    entry.posted_by_id = 1  # current_user.id - Auth disabled for dev
    entry.posting_date = entry.entry_date
    entry.is_locked = True
    entry.locked_at = datetime.utcnow()
    entry.locked_by_id = 1  # current_user.id - Auth disabled for dev
    
    # Audit log
    audit = JournalEntryAuditLog(
        journal_entry_id=entry.id,
        action="posted",
        performed_by_id=1,  # current_user.id - Auth disabled for dev
        performed_at=datetime.utcnow()
    )
    db.add(audit)
    
    await db.commit()
    
    return {"message": "Journal entry posted successfully"}


# ============================================================================
# GET JOURNAL ENTRIES
# ============================================================================

@router.get("/", response_model=List[JournalEntryResponse])
async def get_journal_entries(
    entity_id: int = Query(...),
    status: Optional[str] = None,
    fiscal_year: Optional[int] = None,
    fiscal_period: Optional[int] = None,
    entry_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_async_db)
):
    """Get journal entries with filters"""
    
    query = select(JournalEntry).where(JournalEntry.entity_id == entity_id)
    
    if status:
        query = query.where(JournalEntry.status == status)
    
    if fiscal_year:
        query = query.where(JournalEntry.fiscal_year == fiscal_year)
    
    if fiscal_period:
        query = query.where(JournalEntry.fiscal_period == fiscal_period)
    
    if entry_type:
        query = query.where(JournalEntry.entry_type == entry_type)
    
    if date_from:
        query = query.where(JournalEntry.entry_date >= date_from)
    
    if date_to:
        query = query.where(JournalEntry.entry_date <= date_to)
    
    query = query.order_by(desc(JournalEntry.entry_date), desc(JournalEntry.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    entries = result.scalars().all()
    
    # Build responses
    responses = []
    for entry in entries:
        responses.append(await build_journal_entry_response(db, entry))
    
    return responses


@router.get("/{entry_id}", response_model=JournalEntryResponse)
async def get_journal_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Get journal entry by ID"""
    
    result = await db.execute(
        select(JournalEntry).where(JournalEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    return await build_journal_entry_response(db, entry)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def build_journal_entry_response(
    db: AsyncSession,
    entry: JournalEntry
) -> JournalEntryResponse:
    """Build complete journal entry response with lines and names"""
    
    # Get entity name
    entity_result = await db.execute(
        select(AccountingEntity.entity_name).where(AccountingEntity.id == entry.entity_id)
    )
    entity_name = entity_result.scalar()
    
    # Get creator name
    creator_result = await db.execute(
        select(Partner).where(Partner.id == entry.created_by_id)
    )
    creator = creator_result.scalar_one_or_none()
    created_by_name = f"{creator.first_name} {creator.last_name}" if creator else "Unknown User"
    
    # Get approver names
    first_approved_by_name = None
    if entry.first_approved_by_id:
        approver_result = await db.execute(
            select(Partner).where(Partner.id == entry.first_approved_by_id)
        )
        approver = approver_result.scalar_one_or_none()
        if approver:
            first_approved_by_name = f"{approver.first_name} {approver.last_name}"
    
    final_approved_by_name = None
    if entry.final_approved_by_id:
        approver_result = await db.execute(
            select(Partner).where(Partner.id == entry.final_approved_by_id)
        )
        approver = approver_result.scalar_one_or_none()
        if approver:
            final_approved_by_name = f"{approver.first_name} {approver.last_name}"
    
    # Get lines
    lines_result = await db.execute(
        select(JournalEntryLine).where(
            JournalEntryLine.journal_entry_id == entry.id
        ).order_by(JournalEntryLine.line_number)
    )
    lines = lines_result.scalars().all()
    
    # Build line responses
    line_responses = []
    total_debits = Decimal("0.00")
    total_credits = Decimal("0.00")
    
    for line in lines:
        # Get account info
        account_result = await db.execute(
            select(ChartOfAccounts).where(ChartOfAccounts.id == line.account_id)
        )
        account = account_result.scalar_one()
        
        line_response = JournalEntryLineResponse(
            id=line.id,
            line_number=line.line_number,
            account_id=line.account_id,
            account_number=account.account_number,
            account_name=account.account_name,
            debit_amount=line.debit_amount,
            credit_amount=line.credit_amount,
            description=line.description,
            project_id=line.project_id,
            cost_center=line.cost_center,
            department=line.department
        )
        line_responses.append(line_response)
        
        total_debits += line.debit_amount
        total_credits += line.credit_amount
    
    return JournalEntryResponse(
        id=entry.id,
        entry_number=entry.entry_number,
        entity_id=entry.entity_id,
        entity_name=entity_name,
        entry_date=entry.entry_date,
        posting_date=entry.posting_date,
        fiscal_year=entry.fiscal_year,
        fiscal_period=entry.fiscal_period,
        entry_type=entry.entry_type,
        memo=entry.memo,
        reference=entry.reference,
        status=entry.status,
        workflow_stage=entry.workflow_stage,
        created_by_name=created_by_name,
        created_at=entry.created_at,
        first_approved_by_name=first_approved_by_name,
        first_approved_at=entry.first_approved_at,
        final_approved_by_name=final_approved_by_name,
        final_approved_at=entry.final_approved_at,
        is_locked=entry.is_locked,
        lines=line_responses,
        total_debits=total_debits,
        total_credits=total_credits
    )

