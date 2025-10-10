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
from ..utils.datetime_utils import get_pst_now
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

from pydantic import BaseModel, Field, field_validator, ConfigDict, computed_field
from ..database_async import get_async_db
from ..models import Partners as Partner  # For queries only
from ..models_accounting import (
    JournalEntry, JournalEntryLine, ChartOfAccounts,
    AccountingEntity, JournalEntryAuditLog
)
from ..services.journal_workflow import JournalWorkflowService
from ..services.journal_workflow_enhanced import JournalWorkflowServiceEnhanced


router = APIRouter(prefix="/api/accounting/journal-entries", tags=["Accounting - Journal Entries"])

# Test endpoint to verify routing works
@router.get("/health")
async def test_journal_entries():
    """Test endpoint to verify routing works"""
    return {"message": "Journal entries API is working", "status": "ok"}

# Test endpoint to get journal entries without authentication
@router.get("/data")
async def get_test_journal_entries(db: AsyncSession = Depends(get_async_db)):
    """Test endpoint to get journal entries data without authentication"""
    try:
        # Get all journal entries
        result = await db.execute(select(JournalEntry).order_by(JournalEntry.id))
        entries = result.scalars().all()
        
        # Convert to response format
        response_data = []
        for entry in entries:
            # Get journal entry lines
            lines_result = await db.execute(
                select(JournalEntryLine).where(JournalEntryLine.journal_entry_id == entry.id)
            )
            lines = lines_result.scalars().all()
            
            # Get account names for lines
            line_data = []
            for line in lines:
                account_result = await db.execute(
                    select(ChartOfAccounts).where(ChartOfAccounts.id == line.account_id)
                )
                account = account_result.scalar_one_or_none()
                
                line_data.append({
                    "line_number": line.line_number,
                    "account_number": account.account_number if account else "Unknown",
                    "account_name": account.account_name if account else "Unknown",
                    "debit_amount": float(line.debit_amount),
                    "credit_amount": float(line.credit_amount),
                    "description": line.description
                })
            
            response_data.append({
                "id": entry.id,
                "entry_number": entry.entry_number,
                "entity_id": entry.entity_id,
                "entry_date": entry.entry_date.isoformat() if entry.entry_date else None,
                "fiscal_year": entry.fiscal_year,
                "fiscal_period": entry.fiscal_period,
                "entry_type": entry.entry_type,
                "memo": entry.memo,
                "reference": entry.reference,
                "source_type": entry.source_type,
                "source_id": entry.source_id,
                "status": entry.status,
                "workflow_stage": entry.workflow_stage,
                "created_at": entry.created_at.isoformat() if entry.created_at else None,
                "lines": line_data
            })
        
        return {
            "message": "Journal entries retrieved successfully",
            "count": len(response_data),
            "entries": response_data
        }
    except Exception as e:
        return {"error": str(e), "message": "Failed to retrieve journal entries"}

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
    debit_amount: float
    credit_amount: float
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
    total_debits: float
    total_credits: float
    
    model_config = ConfigDict(from_attributes=True)
    
    @computed_field
    @property
    def description(self) -> Optional[str]:
        """Alias for memo to match frontend expectations"""
        return self.memo
    
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
        created_at=get_pst_now()
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
        performed_at=get_pst_now(),
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
        performed_at=get_pst_now()
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
            performed_at=get_pst_now(),
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
        entry.first_approved_at = get_pst_now()
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
        entry.final_approved_at = get_pst_now()
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
        performed_at=get_pst_now(),
        comment=request.notes
    )
    db.add(audit)
    
    await db.commit()
    
    return {"message": message}


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
    created_by_name = creator.name if creator else "Unknown User"
    
    # Get approver names
    first_approved_by_name = None
    if entry.first_approved_by_id:
        approver_result = await db.execute(
            select(Partner).where(Partner.id == entry.first_approved_by_id)
        )
        approver = approver_result.scalar_one_or_none()
        if approver:
            first_approved_by_name = approver.name
    
    final_approved_by_name = None
    if entry.final_approved_by_id:
        approver_result = await db.execute(
            select(Partner).where(Partner.id == entry.final_approved_by_id)
        )
        approver = approver_result.scalar_one_or_none()
        if approver:
            final_approved_by_name = approver.name
    
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
            debit_amount=float(line.debit_amount),
            credit_amount=float(line.credit_amount),
            description=line.description,
            project_id=line.project_id,
            cost_center=line.cost_center,
            department=line.department
        )
        line_responses.append(line_response)
        
        total_debits += line.debit_amount
        total_credits += line.credit_amount
    
    response = JournalEntryResponse(
        id=entry.id,
        entry_number=entry.entry_number,
        entity_id=entry.entity_id,
        entity_name=entity_name,
        entry_date=entry.entry_date,
        posting_date=entry.posted_at,
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
        total_debits=float(total_debits),
        total_credits=float(total_credits)
    )
    
    # Add description field for frontend compatibility
    response_dict = response.model_dump()
    response_dict['description'] = entry.memo
    
    # Convert string amounts to numbers for frontend compatibility
    response_dict['total_debits'] = float(response_dict['total_debits'])
    response_dict['total_credits'] = float(response_dict['total_credits'])
    
    # Convert line amounts to numbers
    for line in response_dict['lines']:
        line['debit_amount'] = float(line['debit_amount'])
        line['credit_amount'] = float(line['credit_amount'])
    
    # Debug logging
    print(f"DEBUG: Added description field: {response_dict.get('description')}")
    print(f"DEBUG: Total debits type: {type(response_dict['total_debits'])}")
    
    return response_dict


# ============================================================================
# JOURNAL ENTRY WORKFLOW ENDPOINTS
# ============================================================================

@router.post("/{entry_id}/submit-for-approval")
async def submit_for_approval(
    entry_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Submit a draft journal entry for first partner approval"""
    workflow_service = JournalWorkflowService(db)
    result = await workflow_service.submit_for_approval(entry_id, 1)  # TODO: Get from auth context
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.post("/{entry_id}/approve-first")
async def approve_first(
    entry_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """First partner approves the journal entry"""
    workflow_service = JournalWorkflowService(db)
    result = await workflow_service.approve_first(entry_id, 1)  # TODO: Get from auth context
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.post("/{entry_id}/approve-final")
async def approve_final(
    entry_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Second partner gives final approval and posts the entry"""
    workflow_service = JournalWorkflowService(db)
    result = await workflow_service.approve_final(entry_id, 1)  # TODO: Get from auth context
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.post("/{entry_id}/reject")
async def reject_entry(
    entry_id: int,
    rejection_data: dict,
    db: AsyncSession = Depends(get_async_db)
):
    """Reject a journal entry and return to draft"""
    reason = rejection_data.get("reason", "No reason provided")
    workflow_service = JournalWorkflowService(db)
    result = await workflow_service.reject(entry_id, 1, reason)  # TODO: Get from auth context
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.get("/{entry_id}/workflow-status")
async def get_workflow_status(
    entry_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Get the current workflow status of a journal entry"""
    workflow_service = JournalWorkflowService(db)
    result = await workflow_service.get_workflow_status(entry_id)
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    
    return result


# ============================================================================
# SIMPLIFIED APPROVAL WORKFLOW
# ============================================================================

@router.post("/{entry_id}/submit")
async def submit_journal_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Submit journal entry for human approval"""
    try:
        # Submit for human approval
        workflow_service = JournalWorkflowServiceEnhanced(db)
        # TODO: Get actual user email from auth context, using system for now
        result = await workflow_service.submit_for_approval(entry_id, "system@ngicapitaladvisory.com")
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        return result
        
    except Exception as e:
        logger.error(f"Error submitting journal entry {entry_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Submission failed: {str(e)}")


@router.post("/{entry_id}/approve")
async def approve_journal_entry(
    entry_id: int,
    approval_data: dict = None,
    db: AsyncSession = Depends(get_async_db)
):
    """Approve journal entry (handles both first and final approval)"""
    try:
        workflow_service = JournalWorkflowServiceEnhanced(db)
        
        # TODO: Get actual user email from Clerk auth context
        # For now, use a test email from approval_data or default
        approver_email = (approval_data or {}).get("approver_email", "lwhitworth@ngicapitaladvisory.com")
        
        # The enhanced service automatically determines if this is first or final approval
        result = await workflow_service.approve(entry_id, approver_email)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        return result
        
    except Exception as e:
        logger.error(f"Error approving journal entry {entry_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Approval failed: {str(e)}")


@router.post("/{entry_id}/post")
async def post_journal_entry(
    entry_id: int,
    post_data: dict = None,
    db: AsyncSession = Depends(get_async_db)
):
    """Post approved journal entry to general ledger"""
    try:
        workflow_service = JournalWorkflowServiceEnhanced(db)
        
        # TODO: Get actual user email from Clerk auth context
        posted_by_email = (post_data or {}).get("posted_by_email", "system@ngicapitaladvisory.com")
        
        result = await workflow_service.post_to_gl(entry_id, posted_by_email)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        return result
        
    except Exception as e:
        logger.error(f"Error posting journal entry {entry_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Posting failed: {str(e)}")


@router.post("/{entry_id}/reject")
async def reject_journal_entry(
    entry_id: int,
    rejection_data: dict,
    db: AsyncSession = Depends(get_async_db)
):
    """Reject journal entry with notes"""
    try:
        reason = rejection_data.get("reason", "No reason provided")
        # TODO: Get actual user email from Clerk auth context
        rejected_by_email = rejection_data.get("rejected_by_email", "lwhitworth@ngicapitaladvisory.com")
        
        workflow_service = JournalWorkflowServiceEnhanced(db)
        result = await workflow_service.reject(entry_id, rejected_by_email, reason)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        return result
        
    except Exception as e:
        logger.error(f"Error rejecting journal entry {entry_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Rejection failed: {str(e)}")


@router.post("/{entry_id}/reverse")
async def reverse_journal_entry(
    entry_id: int,
    reversal_data: dict,
    db: AsyncSession = Depends(get_async_db)
):
    """Create reversal entry for posted journal entry"""
    try:
        reason = reversal_data.get("reason", "Reversal entry")
        workflow_service = JournalWorkflowService(db)
        result = await workflow_service.reverse(entry_id, 1, reason)  # TODO: Get from auth context
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        return result
        
    except Exception as e:
        logger.error(f"Error reversing journal entry {entry_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Reversal failed: {str(e)}")



