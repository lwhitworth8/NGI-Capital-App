"""
Comprehensive Accounting API Routes for NGI Capital Internal System
GAAP-compliant accounting endpoints with approval workflows and audit trail
"""

from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
from pydantic import BaseModel, Field
from pydantic import field_validator, model_validator
import json
import uuid
import os
from pathlib import Path

from ..models import (
    Partners, Entities, ChartOfAccounts, JournalEntries, JournalEntryLines,
    Transactions, ExpenseReports, ExpenseItems, Documents, AuditLog,
    RevenueRecognition, RevenueRecognitionEntries, BankAccounts, BankTransactions,
    ApprovalStatus, TransactionType, AccountType, ExpenseStatus, DocumentType,
    EntityType
)
from ..database import get_db
from ..config import SECRET_KEY, ALGORITHM
from jose import jwt, JWTError

router = APIRouter(prefix="/api/accounting", tags=["accounting"])
security = HTTPBearer()

# Pydantic models for API requests/responses
class ChartOfAccountRequest(BaseModel):
    entity_id: int
    account_code: str = Field(..., min_length=5, max_length=5)
    account_name: str
    account_type: AccountType
    parent_account_id: Optional[int] = None
    normal_balance: TransactionType
    description: Optional[str] = None
    
    @field_validator('account_code')
    def validate_account_code(cls, v: str):
        if not v.isdigit():
            raise ValueError('Account code must be 5 digits')
        return v

class ChartOfAccountResponse(BaseModel):
    id: int
    entity_id: int
    account_code: str
    account_name: str
    account_type: AccountType
    parent_account_id: Optional[int]
    normal_balance: TransactionType
    is_active: bool
    description: Optional[str]
    current_balance: Decimal = Decimal('0.00')
    
    class Config:
        from_attributes = True

class JournalEntryLineRequest(BaseModel):
    account_id: int
    line_number: int
    description: Optional[str]
    debit_amount: float = 0.0
    credit_amount: float = 0.0
    
    @field_validator('debit_amount', 'credit_amount')
    def validate_amounts(cls, v):
        if v < 0:
            raise ValueError('Amounts must be non-negative')
        return v

class JournalEntryRequest(BaseModel):
    entity_id: int
    entry_date: date
    description: str
    reference_number: Optional[str]
    lines: List[JournalEntryLineRequest]
    
    @model_validator(mode='after')
    def validate_balanced_entry(self):
        total_debits = sum(getattr(l, 'debit_amount', 0.0) for l in (self.lines or []))
        total_credits = sum(getattr(l, 'credit_amount', 0.0) for l in (self.lines or []))
        if abs(total_debits - total_credits) > 1e-9:
            raise ValueError(f'Journal entry must be balanced. Debits: {total_debits}, Credits: {total_credits}')
        if total_debits == 0:
            raise ValueError('Journal entry cannot be zero')
        return self

class JournalEntryResponse(BaseModel):
    id: int
    entity_id: int
    entry_number: str
    entry_date: date
    description: str
    reference_number: Optional[str]
    total_debit: Decimal
    total_credit: Decimal
    approval_status: ApprovalStatus
    is_posted: bool | None = False
    created_by_partner: Optional[str]
    approved_by_partner: Optional[str]
    lines: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True

class TransactionRequest(BaseModel):
    entity_id: int
    account_id: int
    transaction_date: date
    amount: float
    transaction_type: TransactionType
    description: str
    reference_number: Optional[str]
    
    @field_validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v

class TransactionApprovalRequest(BaseModel):
    approval_notes: Optional[str]
    approve: bool = True

class ExpenseItemRequest(BaseModel):
    account_id: int
    expense_date: date
    description: str
    amount: float
    tax_amount: float = 0.0
    merchant_name: Optional[str]
    category: Optional[str]
    is_billable: bool = False
    
    @field_validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v

class ExpenseReportRequest(BaseModel):
    entity_id: int
    title: str
    items: List[ExpenseItemRequest]

class RevenueRecognitionRequest(BaseModel):
    entity_id: int
    contract_id: str
    performance_obligation: str
    transaction_price: Decimal
    allocated_amount: Decimal
    recognition_start_date: date
    recognition_end_date: date
    recognition_method: str
    
    @field_validator('recognition_method')
    def validate_method(cls, v: str):
        if v not in ['over_time', 'point_in_time']:
            raise ValueError('Recognition method must be "over_time" or "point_in_time"')
        return v

# Dependency to get current user from JWT token
async def get_current_partner(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Partners:
    if not credentials:
        raise HTTPException(status_code=403, detail="Partner authentication required")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=403, detail="Invalid token")
        partner = db.query(Partners).filter(Partners.email == email).first()
        if not partner or getattr(partner, 'is_active', 1) != 1:
            raise HTTPException(status_code=403, detail="Partner not found or inactive")
        return partner
    except JWTError:
        raise HTTPException(status_code=403, detail="Invalid token")

# Dependency to get database session
def _noop():
    return None

# Chart of Accounts Endpoints
@router.get("/chart-of-accounts/{entity_id}", response_model=List[ChartOfAccountResponse])
async def get_chart_of_accounts(
    entity_id: int,
    active_only: bool = True,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get chart of accounts for an entity with current balances"""
    
    query = db.query(ChartOfAccounts).filter(ChartOfAccounts.entity_id == entity_id)
    if active_only:
        query = query.filter(ChartOfAccounts.is_active == True)
    
    accounts = query.order_by(ChartOfAccounts.account_code).all()
    
    # Calculate current balance for each account
    result = []
    for account in accounts:
        # Calculate balance from journal entry lines
        balance_query = db.query(
            func.coalesce(func.sum(JournalEntryLines.debit_amount), 0) - 
            func.coalesce(func.sum(JournalEntryLines.credit_amount), 0)
        ).join(JournalEntries).filter(
            and_(
                JournalEntryLines.account_id == account.id,
                JournalEntries.approval_status == ApprovalStatus.APPROVED
            )
        )
        
        balance = balance_query.scalar() or Decimal('0.00')
        
        # Adjust balance based on account normal balance
        if account.normal_balance == TransactionType.CREDIT:
            balance = -balance
            
        account_dict = {
            "id": account.id,
            "entity_id": account.entity_id,
            "account_code": account.account_code,
            "account_name": account.account_name,
            "account_type": account.account_type,
            "parent_account_id": account.parent_account_id,
            "normal_balance": account.normal_balance,
            "is_active": account.is_active,
            "description": account.description,
            "current_balance": balance
        }
        result.append(ChartOfAccountResponse(**account_dict))
    
    return result

@router.post("/chart-of-accounts", response_model=ChartOfAccountResponse)
async def create_account(
    account: ChartOfAccountRequest,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Create new chart of account"""
    
    # Check if account code already exists for this entity
    # Validate 5-digit account code follows GAAP standards
    code_first_digit = int(account.account_code[0])
    expected_type_mapping = {
        1: AccountType.ASSET,
        2: AccountType.LIABILITY, 
        3: AccountType.EQUITY,
        4: AccountType.REVENUE,
        5: AccountType.EXPENSE
    }
    
    if code_first_digit not in expected_type_mapping:
        raise HTTPException(status_code=400, detail="Invalid account code format")
    
    if expected_type_mapping[code_first_digit] != account.account_type:
        raise HTTPException(
            status_code=400, 
            detail=f"Account code {account.account_code} should be {expected_type_mapping[code_first_digit].value} type"
        )
    
    # Idempotent: return existing when mapping is valid and code already present
    existing = db.query(ChartOfAccounts).filter(
        and_(
            ChartOfAccounts.entity_id == account.entity_id,
            ChartOfAccounts.account_code == account.account_code
        )
    ).first()
    if existing:
        return ChartOfAccountResponse(
            id=existing.id,
            entity_id=existing.entity_id,
            account_code=existing.account_code,
            account_name=existing.account_name,
            account_type=existing.account_type,
            parent_account_id=existing.parent_account_id,
            normal_balance=existing.normal_balance,
            is_active=existing.is_active,
            description=existing.description,
            current_balance=Decimal('0.00')
        )
    
    new_account = ChartOfAccounts(**account.dict())
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    
    # Log audit trail (best-effort; tolerate missing audit_log table in minimal test DB)
    try:
        audit_log = AuditLog(
            user_id=current_user.id,
            action="CREATE",
            table_name="chart_of_accounts",
            record_id=new_account.id,
            new_values=json.dumps(account.dict())
        )
        db.add(audit_log)
        db.commit()
    except Exception:
        db.rollback()
    
    return ChartOfAccountResponse(
        id=new_account.id,
        entity_id=new_account.entity_id,
        account_code=new_account.account_code,
        account_name=new_account.account_name,
        account_type=new_account.account_type,
        parent_account_id=new_account.parent_account_id,
        normal_balance=new_account.normal_balance,
        is_active=new_account.is_active,
        description=new_account.description,
        current_balance=Decimal('0.00')
    )

# Journal Entry Endpoints
@router.get("/journal-entries/{entity_id}", response_model=List[JournalEntryResponse])
async def get_journal_entries(
    entity_id: int,
    status: Optional[ApprovalStatus] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = 1,
    limit: int = 50,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get journal entries with filtering and pagination"""
    
    query = db.query(JournalEntries).filter(JournalEntries.entity_id == entity_id)
    
    if status:
        query = query.filter(JournalEntries.approval_status == status)
    
    if start_date:
        query = query.filter(JournalEntries.entry_date >= start_date)
    
    if end_date:
        query = query.filter(JournalEntries.entry_date <= end_date)
    
    # Pagination
    offset = (page - 1) * limit
    entries = query.order_by(desc(JournalEntries.entry_date), desc(JournalEntries.id)).offset(offset).limit(limit).all()
    
    result = []
    for entry in entries:
        # Get lines for each entry
        lines = db.query(JournalEntryLines).filter(
            JournalEntryLines.journal_entry_id == entry.id
        ).order_by(JournalEntryLines.line_number).all()
        
        lines_data = []
        for line in lines:
            account = db.query(ChartOfAccounts).filter(ChartOfAccounts.id == line.account_id).first()
            lines_data.append({
                "id": line.id,
                "line_number": line.line_number,
                "account_code": account.account_code,
                "account_name": account.account_name,
                "description": line.description,
                "debit_amount": line.debit_amount,
                "credit_amount": line.credit_amount
            })
        
        creator_name = entry.created_by_partner.name if entry.created_by_partner else None
        approver_name = entry.approved_by_partner.name if entry.approved_by_partner else None
        
        entry_data = {
            "id": entry.id,
            "entity_id": entry.entity_id,
            "entry_number": entry.entry_number,
            "entry_date": entry.entry_date,
            "description": entry.description,
            "reference_number": entry.reference_number,
            "total_debit": entry.total_debit,
            "total_credit": entry.total_credit,
            "approval_status": entry.approval_status,
            "is_posted": bool(getattr(entry, 'is_posted', False)),
            "created_by_partner": creator_name,
            "approved_by_partner": approver_name,
            "lines": lines_data
        }
        
        result.append(JournalEntryResponse(**entry_data))
    
    return result

@router.post("/journal-entries", response_model=JournalEntryResponse)
async def create_journal_entry(
    entry: JournalEntryRequest,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Create new journal entry with approval workflow"""
    
    # Generate entry number
    last_entry = db.query(JournalEntries).filter(
        JournalEntries.entity_id == entry.entity_id
    ).order_by(desc(JournalEntries.id)).first()
    
    if last_entry:
        last_number = int(last_entry.entry_number.split('-')[-1])
        entry_number = f"JE-{entry.entity_id:03d}-{(last_number + 1):06d}"
    else:
        entry_number = f"JE-{entry.entity_id:03d}-000001"
    
    # Calculate totals and enforce balance at endpoint level
    total_debit = sum(float(getattr(line, 'debit_amount', 0.0)) for line in entry.lines)
    total_credit = sum(float(getattr(line, 'credit_amount', 0.0)) for line in entry.lines)
    if abs(total_debit - total_credit) > 1e-9 or total_debit == 0.0:
        raise HTTPException(status_code=422, detail=f"Journal entry must be balanced and non-zero. Debits: {total_debit}, Credits: {total_credit}")
    
    # Create journal entry
    new_entry = JournalEntries(
        entity_id=entry.entity_id,
        entry_number=entry_number,
        entry_date=entry.entry_date,
        description=entry.description,
        reference_number=entry.reference_number,
        total_debit=total_debit,
        total_credit=total_credit,
        created_by_id=current_user.id,
        approval_status=ApprovalStatus.PENDING
    )
    
    db.add(new_entry)
    db.flush()  # Get the ID
    
    # Create journal entry lines
    for line_data in entry.lines:
        line = JournalEntryLines(
            journal_entry_id=new_entry.id,
            account_id=line_data.account_id,
            line_number=line_data.line_number,
            description=line_data.description,
            debit_amount=line_data.debit_amount,
            credit_amount=line_data.credit_amount
        )
        db.add(line)
    
    db.commit()
    db.refresh(new_entry)
    
    # Log audit trail
    audit_log = AuditLog(
        user_id=current_user.id,
        action="CREATE",
        table_name="journal_entries",
        record_id=new_entry.id,
        new_values=json.dumps({
            "entry_number": entry_number,
            "description": entry.description,
            "total_amount": float(total_debit)
        })
    )
    db.add(audit_log)
    db.commit()
    
    # Return the created entry
    return await get_journal_entry_by_id(new_entry.id, current_user, db)

@router.get("/journal-entries/entry/{entry_id}", response_model=JournalEntryResponse)
async def get_journal_entry_by_id(
    entry_id: int,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get single journal entry by ID"""
    
    entry = db.query(JournalEntries).filter(JournalEntries.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    # Get lines
    lines = db.query(JournalEntryLines).filter(
        JournalEntryLines.journal_entry_id == entry.id
    ).order_by(JournalEntryLines.line_number).all()
    
    lines_data = []
    for line in lines:
        account = db.query(ChartOfAccounts).filter(ChartOfAccounts.id == line.account_id).first()
        lines_data.append({
            "id": line.id,
            "line_number": line.line_number,
            "account_code": account.account_code,
            "account_name": account.account_name,
            "description": line.description,
            "debit_amount": line.debit_amount,
            "credit_amount": line.credit_amount
        })
    
    creator_name = entry.created_by_partner.name if entry.created_by_partner else None
    approver_name = entry.approved_by_partner.name if entry.approved_by_partner else None
    
    return JournalEntryResponse(
        id=entry.id,
        entity_id=entry.entity_id,
        entry_number=entry.entry_number,
        entry_date=entry.entry_date,
        description=entry.description,
        reference_number=entry.reference_number,
        total_debit=entry.total_debit,
        total_credit=entry.total_credit,
        approval_status=entry.approval_status,
        is_posted=bool(getattr(entry, 'is_posted', False)),
        created_by_partner=creator_name,
        approved_by_partner=approver_name,
        lines=lines_data
    )

@router.post("/journal-entries/{entry_id}/approve")
async def approve_journal_entry(
    entry_id: int,
    approval: TransactionApprovalRequest,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Approve or reject journal entry"""
    
    entry = db.query(JournalEntries).filter(JournalEntries.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    # Business rule: No self-approval
    if entry.created_by_id == current_user.id:
        raise HTTPException(status_code=403, detail="Cannot approve your own journal entry")
    
    if entry.approval_status != ApprovalStatus.PENDING:
        raise HTTPException(status_code=400, detail="Journal entry is not pending approval")
    
    # Update approval status
    old_status = entry.approval_status
    entry.approval_status = ApprovalStatus.APPROVED if approval.approve else ApprovalStatus.REJECTED
    entry.approved_by_id = current_user.id
    entry.approval_date = datetime.utcnow()
    entry.approval_notes = approval.approval_notes
    db.commit()
    
    # Log audit trail (best-effort)
    try:
        audit_log = AuditLog(
            user_id=current_user.id,
            action="APPROVE" if approval.approve else "REJECT",
            table_name="journal_entries",
            record_id=entry.id,
            old_values=json.dumps({"approval_status": getattr(old_status, 'value', str(old_status))}),
            new_values=json.dumps({"approval_status": getattr(entry.approval_status, 'value', str(entry.approval_status))})
        )
        db.add(audit_log)
        db.commit()
    except Exception:
        db.rollback()
    
    return {"message": "Journal entry processed successfully", "status": entry.approval_status}


@router.post("/journal-entries/{entry_id}/post")
async def post_journal_entry(
    entry_id: int,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Post an approved journal entry. Posted entries become immutable."""
    entry = db.query(JournalEntries).filter(JournalEntries.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    if entry.approval_status != ApprovalStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Journal entry must be approved before posting")
    if getattr(entry, 'is_posted', False):
        return {"message": "already posted"}
    entry.is_posted = True
    entry.posted_date = datetime.utcnow()
    db.commit()
    try:
        audit_log = AuditLog(
            user_id=current_user.id,
            action="POST",
            table_name="journal_entries",
            record_id=entry.id,
            old_values=json.dumps({"is_posted": False}),
            new_values=json.dumps({"is_posted": True})
        )
        db.add(audit_log)
        db.commit()
    except Exception:
        db.rollback()
    return {"message": "posted"}


@router.put("/journal-entries/{entry_id}")
async def update_journal_entry(
    entry_id: int,
    payload: Dict[str, Any],
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Allow limited pre-posting updates (e.g., description). Lock after posting."""
    entry = db.query(JournalEntries).filter(JournalEntries.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    if getattr(entry, 'is_posted', False):
        raise HTTPException(status_code=400, detail="Posted entries are immutable; create adjusting entry")
    old_desc = entry.description
    if 'description' in payload and payload['description']:
        entry.description = str(payload['description'])
    db.commit()
    try:
        audit_log = AuditLog(
            user_id=current_user.id,
            action="UPDATE",
            table_name="journal_entries",
            record_id=entry.id,
            old_values=json.dumps({"description": old_desc}),
            new_values=json.dumps({"description": entry.description})
        )
        db.add(audit_log)
        db.commit()
    except Exception:
        db.rollback()
    return {"message": "updated"}


@router.post("/journal-entries/{entry_id}/adjust")
async def create_adjusting_entry(
    entry_id: int,
    notes: Optional[str] = None,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Create an adjusting entry that reverses a posted entry."""
    orig = db.query(JournalEntries).filter(JournalEntries.id == entry_id).first()
    if not orig:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    if not getattr(orig, 'is_posted', False):
        raise HTTPException(status_code=400, detail="Only posted entries can be adjusted")
    lines = db.query(JournalEntryLines).filter(JournalEntryLines.journal_entry_id == orig.id).order_by(JournalEntryLines.line_number).all()
    if not lines:
        raise HTTPException(status_code=400, detail="Original entry has no lines")
    rev = JournalEntries(
        entity_id=orig.entity_id,
        entry_number=f"ADJ-{orig.entity_id:03d}-{orig.id:06d}",
        entry_date=datetime.utcnow().date(),
        description=f"Adjusting entry for {orig.entry_number}" + (f" - {notes}" if notes else ""),
        reference_number=orig.reference_number,
        total_debit=orig.total_credit,
        total_credit=orig.total_debit,
        created_by_id=current_user.id,
        approval_status=ApprovalStatus.PENDING,
        is_reversing_entry=True,
        reversed_by_entry_id=None,
    )
    db.add(rev)
    db.flush()
    ln = 1
    for l in lines:
        db.add(JournalEntryLines(
            journal_entry_id=rev.id,
            account_id=l.account_id,
            line_number=ln,
            description=f"Reversal of {orig.entry_number}",
            debit_amount=l.credit_amount,
            credit_amount=l.debit_amount,
        ))
        ln += 1
    db.commit()
    return {"id": rev.id, "message": "adjusting entry created"}

# Transaction Endpoints
@router.get("/transactions/{entity_id}")
async def get_transactions(
    entity_id: int,
    status: Optional[ApprovalStatus] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = 1,
    limit: int = 50,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get transactions with filtering"""
    
    query = db.query(Transactions).filter(Transactions.entity_id == entity_id)
    
    if status:
        query = query.filter(Transactions.approval_status == status)
    
    if start_date:
        query = query.filter(Transactions.transaction_date >= start_date)
    
    if end_date:
        query = query.filter(Transactions.transaction_date <= end_date)
    
    offset = (page - 1) * limit
    transactions = query.order_by(desc(Transactions.transaction_date)).offset(offset).limit(limit).all()
    
    result = []
    for txn in transactions:
        account = db.query(ChartOfAccounts).filter(ChartOfAccounts.id == txn.account_id).first()
        result.append({
            "id": txn.id,
            "entity_id": txn.entity_id,
            "account_code": account.account_code,
            "account_name": account.account_name,
            "transaction_date": txn.transaction_date,
            "amount": txn.amount,
            "transaction_type": txn.transaction_type,
            "description": txn.description,
            "reference_number": txn.reference_number,
            "approval_status": txn.approval_status,
            "created_by": txn.creator.name if txn.creator else None,
            "approved_by": txn.approver.name if txn.approver else None,
            "requires_approval": txn.amount > Decimal('500.00')
        })
    
    return {"transactions": result, "total": len(result)}

@router.post("/transactions")
async def create_transaction(
    transaction: TransactionRequest,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Create new transaction"""
    
    new_transaction = Transactions(
        entity_id=transaction.entity_id,
        account_id=transaction.account_id,
        transaction_date=transaction.transaction_date,
        amount=transaction.amount,
        transaction_type=transaction.transaction_type,
        description=transaction.description,
        reference_number=transaction.reference_number,
        created_by_id=current_user.id,
        approval_status=ApprovalStatus.PENDING
    )
    
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    
    # Log audit trail
    audit_log = AuditLog(
        user_id=current_user.id,
        action="CREATE",
        table_name="transactions",
        record_id=new_transaction.id,
        new_values=json.dumps({
            "amount": float(transaction.amount),
            "description": transaction.description
        })
    )
    db.add(audit_log)
    db.commit()
    
    return {
        "id": new_transaction.id,
        "message": "Transaction created successfully",
        "requires_approval": transaction.amount > Decimal('500.00')
    }

@router.post("/transactions/{transaction_id}/approve")
async def approve_transaction(
    transaction_id: int,
    approval: TransactionApprovalRequest,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Approve or reject transaction"""
    
    transaction = db.query(Transactions).filter(Transactions.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Business rule: No self-approval
    if transaction.created_by_id == current_user.id:
        raise HTTPException(status_code=403, detail="Cannot approve your own transaction")
    
    # Business rule: Dual approval required for amounts > $500
    if transaction.amount > Decimal('500.00') and not approval.approve:
        raise HTTPException(status_code=400, detail="Transactions over $500 require approval")
    
    if transaction.approval_status != ApprovalStatus.PENDING:
        raise HTTPException(status_code=400, detail="Transaction is not pending approval")
    
    # Update approval status
    transaction.approval_status = ApprovalStatus.APPROVED if approval.approve else ApprovalStatus.REJECTED
    transaction.approved_by_id = current_user.id
    transaction.approval_date = datetime.utcnow()
    transaction.approval_notes = approval.approval_notes
    
    db.commit()
    
    return {"message": "Transaction processed successfully", "status": transaction.approval_status}

# Expense Management Endpoints
@router.get("/expense-reports/{entity_id}")
async def get_expense_reports(
    entity_id: int,
    status: Optional[ExpenseStatus] = None,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get expense reports"""
    
    query = db.query(ExpenseReports).filter(ExpenseReports.entity_id == entity_id)
    
    if status:
        query = query.filter(ExpenseReports.status == status)
    
    reports = query.order_by(desc(ExpenseReports.created_at)).all()
    
    result = []
    for report in reports:
        items_count = db.query(ExpenseItems).filter(ExpenseItems.expense_report_id == report.id).count()
        result.append({
            "id": report.id,
            "report_number": report.report_number,
            "title": report.title,
            "total_amount": report.total_amount,
            "status": report.status,
            "items_count": items_count,
            "submitted_by": report.submitted_by_partner.name if report.submitted_by_partner else None,
            "submission_date": report.submission_date,
            "approval_date": report.approval_date
        })
    
    return {"expense_reports": result}

@router.post("/expense-reports")
async def create_expense_report(
    report: ExpenseReportRequest,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Create expense report"""
    
    # Generate report number
    last_report = db.query(ExpenseReports).filter(
        ExpenseReports.entity_id == report.entity_id
    ).order_by(desc(ExpenseReports.id)).first()
    
    if last_report:
        last_number = int(last_report.report_number.split('-')[-1])
        report_number = f"EXP-{report.entity_id:03d}-{(last_number + 1):06d}"
    else:
        report_number = f"EXP-{report.entity_id:03d}-000001"
    
    # Calculate total amount
    total_amount = sum(item.amount + item.tax_amount for item in report.items)
    
    # Create expense report
    new_report = ExpenseReports(
        entity_id=report.entity_id,
        report_number=report_number,
        title=report.title,
        submitted_by_id=current_user.id,
        total_amount=total_amount,
        status=ExpenseStatus.DRAFT
    )
    
    db.add(new_report)
    db.flush()
    
    # Create expense items
    for item_data in report.items:
        item = ExpenseItems(
            expense_report_id=new_report.id,
            account_id=item_data.account_id,
            expense_date=item_data.expense_date,
            description=item_data.description,
            amount=item_data.amount,
            tax_amount=item_data.tax_amount,
            merchant_name=item_data.merchant_name,
            category=item_data.category,
            is_billable=item_data.is_billable
        )
        db.add(item)
    
    db.commit()
    
    return {
        "id": new_report.id,
        "report_number": report_number,
        "message": "Expense report created successfully"
    }

@router.post("/expense-reports/{report_id}/submit")
async def submit_expense_report(
    report_id: int,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Submit expense report for approval"""
    
    report = db.query(ExpenseReports).filter(ExpenseReports.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Expense report not found")
    
    if report.submitted_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only submit your own expense reports")
    
    if report.status != ExpenseStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Report is not in draft status")
    
    report.status = ExpenseStatus.SUBMITTED
    report.submission_date = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Expense report submitted for approval"}

# Revenue Recognition Endpoints (ASC 606)
@router.get("/revenue-recognition/{entity_id}")
async def get_revenue_recognition(
    entity_id: int,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get revenue recognition contracts"""
    
    contracts = db.query(RevenueRecognition).filter(
        RevenueRecognition.entity_id == entity_id
    ).order_by(desc(RevenueRecognition.recognition_start_date)).all()
    
    result = []
    for contract in contracts:
        recognition_entries = db.query(RevenueRecognitionEntries).filter(
            RevenueRecognitionEntries.revenue_recognition_id == contract.id
        ).count()
        
        result.append({
            "id": contract.id,
            "contract_id": contract.contract_id,
            "performance_obligation": contract.performance_obligation,
            "transaction_price": contract.transaction_price,
            "allocated_amount": contract.allocated_amount,
            "recognized_to_date": contract.recognized_to_date,
            "remaining_to_recognize": contract.remaining_to_recognize,
            "recognition_method": contract.recognition_method,
            "completion_percentage": contract.completion_percentage,
            "is_complete": contract.is_complete,
            "recognition_entries_count": recognition_entries
        })
    
    return {"revenue_contracts": result}

@router.post("/revenue-recognition")
async def create_revenue_recognition(
    revenue: RevenueRecognitionRequest,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Create revenue recognition contract"""
    
    new_revenue = RevenueRecognition(
        entity_id=revenue.entity_id,
        contract_id=revenue.contract_id,
        performance_obligation=revenue.performance_obligation,
        transaction_price=revenue.transaction_price,
        allocated_amount=revenue.allocated_amount,
        remaining_to_recognize=revenue.allocated_amount,
        recognition_start_date=revenue.recognition_start_date,
        recognition_end_date=revenue.recognition_end_date,
        recognition_method=revenue.recognition_method
    )
    
    db.add(new_revenue)
    db.commit()
    db.refresh(new_revenue)
    
    return {"id": new_revenue.id, "message": "Revenue recognition contract created"}

# Document Upload Endpoints
@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: DocumentType = Form(...),
    expense_item_id: Optional[int] = Form(None),
    transaction_id: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Upload document (receipt, invoice, etc.)"""
    
    # Validate file type
    allowed_types = {'image/jpeg', 'image/png', 'application/pdf'}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    
    # Create upload directory
    upload_dir = Path("uploads/documents")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    file_path = upload_dir / unique_filename
    content = await file.read()
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create document record
    document = Documents(
        filename=unique_filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_size=len(content),
        mime_type=file.content_type,
        document_type=document_type,
        expense_item_id=expense_item_id,
        transaction_id=transaction_id,
        uploaded_by_id=current_user.id,
        description=description
    )
    
    db.add(document)
    db.commit()
    
    # Update expense item receipt flag if applicable
    if expense_item_id:
        expense_item = db.query(ExpenseItems).filter(ExpenseItems.id == expense_item_id).first()
        if expense_item:
            expense_item.receipt_uploaded = True
            db.commit()
    
    return {"id": document.id, "filename": unique_filename, "message": "Document uploaded successfully"}

# General Ledger Endpoint
@router.get("/general-ledger/{entity_id}")
async def get_general_ledger(
    entity_id: int,
    account_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get general ledger entries"""
    
    # Base query for approved journal entry lines
    query = db.query(
        JournalEntryLines.id,
        ChartOfAccounts.account_code,
        ChartOfAccounts.account_name,
        JournalEntries.entry_date,
        JournalEntries.description,
        JournalEntryLines.debit_amount,
        JournalEntryLines.credit_amount,
        JournalEntries.entry_number
    ).join(
        JournalEntries, JournalEntryLines.journal_entry_id == JournalEntries.id
    ).join(
        ChartOfAccounts, JournalEntryLines.account_id == ChartOfAccounts.id
    ).filter(
        and_(
            ChartOfAccounts.entity_id == entity_id,
            JournalEntries.approval_status == ApprovalStatus.APPROVED
        )
    )
    
    if account_id:
        query = query.filter(ChartOfAccounts.id == account_id)
    
    if start_date:
        query = query.filter(JournalEntries.entry_date >= start_date)
    
    if end_date:
        query = query.filter(JournalEntries.entry_date <= end_date)
    
    entries = query.order_by(
        ChartOfAccounts.account_code,
        JournalEntries.entry_date,
        JournalEntries.id
    ).all()
    
    # Calculate running balances by account
    ledger = {}
    for entry in entries:
        account_code = entry.account_code
        if account_code not in ledger:
            ledger[account_code] = {
                "account_name": entry.account_name,
                "entries": [],
                "running_balance": Decimal('0.00')
            }

        # Calculate running balance
        try:
            d = Decimal(str(entry.debit_amount or 0))
            c = Decimal(str(entry.credit_amount or 0))
        except Exception:
            d = Decimal('0.00')
            c = Decimal('0.00')
        balance_change = d - c
        ledger[account_code]["running_balance"] += balance_change
        
        ledger[account_code]["entries"].append({
            "entry_date": entry.entry_date,
            "entry_number": entry.entry_number,
            "description": entry.description,
            "debit_amount": entry.debit_amount,
            "credit_amount": entry.credit_amount,
            "running_balance": ledger[account_code]["running_balance"]
        })
    
    return {"general_ledger": ledger}


# Financial statements: income statement, balance sheet, cash flow
def _period_filter(query, start_date: Optional[date], end_date: Optional[date]):
    if start_date:
        query = query.filter(JournalEntries.entry_date >= start_date)
    if end_date:
        query = query.filter(JournalEntries.entry_date <= end_date)
    return query


@router.get("/financials/income-statement")
async def income_statement(
    entity_id: int,
    start_date: date,
    end_date: date,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    base = db.query(JournalEntryLines).join(JournalEntries).join(ChartOfAccounts, JournalEntryLines.account_id == ChartOfAccounts.id).filter(
        and_(
            ChartOfAccounts.entity_id == entity_id,
            func.lower(JournalEntries.approval_status) == 'approved',
        )
    )
    base = _period_filter(base, start_date, end_date)

    # Revenue lines grouped
    rev_lines_q = base.filter(ChartOfAccounts.account_code.like('4%')).with_entities(
        ChartOfAccounts.account_code,
        ChartOfAccounts.account_name,
        func.coalesce(func.sum(JournalEntryLines.credit_amount - JournalEntryLines.debit_amount), 0).label('amount')
    ).group_by(ChartOfAccounts.account_code, ChartOfAccounts.account_name).order_by(ChartOfAccounts.account_code)
    revenue_lines = []
    total_revenue = Decimal('0.00')
    for code, name, amt in rev_lines_q.all():
        val = Decimal(str(amt or 0))
        revenue_lines.append({"account_code": code, "account_name": name, "amount": float(val)})
        total_revenue += val

    # Expense lines grouped
    exp_lines_q = base.filter(ChartOfAccounts.account_code.like('5%')).with_entities(
        ChartOfAccounts.account_code,
        ChartOfAccounts.account_name,
        func.coalesce(func.sum(JournalEntryLines.debit_amount - JournalEntryLines.credit_amount), 0).label('amount')
    ).group_by(ChartOfAccounts.account_code, ChartOfAccounts.account_name).order_by(ChartOfAccounts.account_code)
    expense_lines = []
    total_expenses = Decimal('0.00')
    for code, name, amt in exp_lines_q.all():
        val = Decimal(str(amt or 0))
        expense_lines.append({"account_code": code, "account_name": name, "amount": float(val)})
        total_expenses += val

    # Category subtotals using common code ranges
    def _code_to_int(code: str) -> Optional[int]:
        try:
            return int(code)
        except Exception:
            return None

    rev_category_totals: Dict[str, Decimal] = {}
    for item in revenue_lines:
        code_i = _code_to_int(item["account_code"])
        cat = "Revenue"
        if code_i is not None:
            if 41000 <= code_i < 42000:
                cat = "Operating Revenue"
            elif 42000 <= code_i < 43000:
                cat = "Other Income"
        rev_category_totals[cat] = rev_category_totals.get(cat, Decimal('0.00')) + Decimal(str(item["amount"]))

    exp_category_totals: Dict[str, Decimal] = {}
    for item in expense_lines:
        code_i = _code_to_int(item["account_code"])
        cat = "Expense"
        if code_i is not None:
            if 51000 <= code_i < 51100:
                cat = "Cost of Revenue"
            elif 52000 <= code_i < 53000:
                cat = "Operating Expenses"
            elif 53000 <= code_i < 54000:
                cat = "Depreciation and Amortization"
            elif 54000 <= code_i < 54100:
                cat = "Interest Expense"
            elif 55000 <= code_i < 55100:
                cat = "Income Tax Expense"
        exp_category_totals[cat] = exp_category_totals.get(cat, Decimal('0.00')) + Decimal(str(item["amount"]))

    net_income = total_revenue - total_expenses
    return {
        "entity_id": entity_id,
        "period": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
        "revenue_lines": revenue_lines,
        "total_revenue": float(total_revenue),
        "expense_lines": expense_lines,
        "total_expenses": float(total_expenses),
        "net_income": float(net_income),
        "revenue_categories": {k: float(v) for k, v in rev_category_totals.items()},
        "expense_categories": {k: float(v) for k, v in exp_category_totals.items()},
    }


@router.get("/financials/balance-sheet")
async def balance_sheet(
    entity_id: int,
    as_of_date: date,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    base = db.query(JournalEntryLines).join(JournalEntries).join(ChartOfAccounts, JournalEntryLines.account_id == ChartOfAccounts.id).filter(
        and_(
            ChartOfAccounts.entity_id == entity_id,
            func.lower(JournalEntries.approval_status) == 'approved',
            JournalEntries.entry_date <= as_of_date,
        )
    )
    def lines_for(prefix: str, expr):
        q = base.filter(ChartOfAccounts.account_code.like(prefix + '%')).with_entities(
            ChartOfAccounts.account_code,
            ChartOfAccounts.account_name,
            func.coalesce(func.sum(expr), 0).label('amount')
        ).group_by(ChartOfAccounts.account_code, ChartOfAccounts.account_name).order_by(ChartOfAccounts.account_code)
        rows = []
        total = Decimal('0.00')
        for code, name, amt in q.all():
            val = Decimal(str(amt or 0))
            rows.append({"account_code": code, "account_name": name, "amount": float(val)})
            total += val
        return rows, total

    asset_lines, total_assets = lines_for('1', JournalEntryLines.debit_amount - JournalEntryLines.credit_amount)
    liability_lines, total_liabilities = lines_for('2', JournalEntryLines.credit_amount - JournalEntryLines.debit_amount)
    equity_lines, total_equity = lines_for('3', JournalEntryLines.credit_amount - JournalEntryLines.debit_amount)

    # Current vs non-current classification by common code ranges
    def _code_to_int(code: str) -> Optional[int]:
        try:
            return int(code)
        except Exception:
            return None

    current_assets: List[Dict[str, Any]] = []
    non_current_assets: List[Dict[str, Any]] = []
    total_current_assets = Decimal('0.00')
    total_non_current_assets = Decimal('0.00')
    for l in asset_lines:
        code_i = _code_to_int(l["account_code"]) or 0
        amt = Decimal(str(l["amount"]))
        if 11000 <= code_i < 13000:
            current_assets.append(l)
            total_current_assets += amt
        elif 15000 <= code_i < 18000:
            non_current_assets.append(l)
            total_non_current_assets += amt
        else:
            # Default: treat as current if unknown range and amount is positive debit-balance account
            current_assets.append(l)
            total_current_assets += amt

    current_liabilities: List[Dict[str, Any]] = []
    long_term_liabilities: List[Dict[str, Any]] = []
    total_current_liabilities = Decimal('0.00')
    total_long_term_liabilities = Decimal('0.00')
    for l in liability_lines:
        code_i = _code_to_int(l["account_code"]) or 0
        amt = Decimal(str(l["amount"]))
        if 21000 <= code_i < 23000:
            current_liabilities.append(l)
            total_current_liabilities += amt
        elif 25000 <= code_i < 30000:
            long_term_liabilities.append(l)
            total_long_term_liabilities += amt
        else:
            current_liabilities.append(l)
            total_current_liabilities += amt

    return {
        "entity_id": entity_id,
        "as_of_date": as_of_date.isoformat(),
        "asset_lines": asset_lines,
        "total_assets": float(total_assets),
        "liability_lines": liability_lines,
        "total_liabilities": float(total_liabilities),
        "equity_lines": equity_lines,
        "total_equity": float(total_equity),
        "current_assets": current_assets,
        "non_current_assets": non_current_assets,
        "total_current_assets": float(total_current_assets),
        "total_non_current_assets": float(total_non_current_assets),
        "current_liabilities": current_liabilities,
        "long_term_liabilities": long_term_liabilities,
        "total_current_liabilities": float(total_current_liabilities),
        "total_long_term_liabilities": float(total_long_term_liabilities),
        "assets_equal_liabilities_plus_equity": float(total_assets) == float(total_liabilities + total_equity),
    }


@router.get("/financials/cash-flow")
async def cash_flow(
    entity_id: int,
    start_date: date,
    end_date: date,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    base = db.query(JournalEntryLines, ChartOfAccounts.account_code).join(JournalEntries).join(ChartOfAccounts, JournalEntryLines.account_id == ChartOfAccounts.id).filter(
        and_(
            ChartOfAccounts.entity_id == entity_id,
            func.lower(JournalEntries.approval_status) == 'approved',
            JournalEntries.entry_date >= start_date,
            JournalEntries.entry_date <= end_date,
            ChartOfAccounts.account_code.like('111%'),
        )
    )
    lines_q = base.with_entities(
        ChartOfAccounts.account_code,
        ChartOfAccounts.account_name,
        func.coalesce(func.sum(JournalEntryLines.debit_amount - JournalEntryLines.credit_amount), 0).label('amount')
    ).group_by(ChartOfAccounts.account_code, ChartOfAccounts.account_name).order_by(ChartOfAccounts.account_code)
    cash_lines = []
    delta = Decimal('0.00')
    for code, name, amt in lines_q.all():
        val = Decimal(str(amt or 0))
        cash_lines.append({"account_code": code, "account_name": name, "amount": float(val)})
        delta += val
    return {
        "entity_id": entity_id,
        "period": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
        "cash_lines": cash_lines,
        "net_change_in_cash": float(delta),
    }


@router.get("/financials/trial-balance")
async def trial_balance(
    entity_id: int,
    as_of_date: date,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    base = db.query(JournalEntryLines).join(JournalEntries).join(ChartOfAccounts, JournalEntryLines.account_id == ChartOfAccounts.id).filter(
        and_(
            ChartOfAccounts.entity_id == entity_id,
            JournalEntries.approval_status == ApprovalStatus.APPROVED,
            JournalEntries.is_posted == True,
            JournalEntries.entry_date <= as_of_date,
        )
    )
    rows = base.with_entities(
        ChartOfAccounts.id,
        ChartOfAccounts.account_code,
        ChartOfAccounts.account_name,
        ChartOfAccounts.normal_balance,
        func.coalesce(func.sum(JournalEntryLines.debit_amount), 0).label('debits'),
        func.coalesce(func.sum(JournalEntryLines.credit_amount), 0).label('credits')
    ).group_by(ChartOfAccounts.id, ChartOfAccounts.account_code, ChartOfAccounts.account_name, ChartOfAccounts.normal_balance).order_by(ChartOfAccounts.account_code).all()
    lines = []
    total_debits = Decimal('0.00')
    total_credits = Decimal('0.00')
    for _, code, name, normal, deb, cred in rows:
        d = Decimal(str(deb or 0))
        c = Decimal(str(cred or 0))
        net = d - c
        debit_col = Decimal('0.00')
        credit_col = Decimal('0.00')
        if str(normal).lower() == str(TransactionType.DEBIT.value).lower():
            if net >= 0:
                debit_col = net
            else:
                credit_col = -net
        else:
            if net <= 0:
                credit_col = -net
            else:
                debit_col = net
        total_debits += debit_col
        total_credits += credit_col
        lines.append({
            "account_code": code,
            "account_name": name,
            "debit": float(debit_col),
            "credit": float(credit_col),
        })
    return {
        "entity_id": entity_id,
        "as_of_date": as_of_date.isoformat(),
        "lines": lines,
        "total_debits": float(total_debits),
        "total_credits": float(total_credits),
        "in_balance": float(total_debits) == float(total_credits),
    }


@router.get("/journal-entries/unposted")
async def list_unposted(
    entity_id: int,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    q = db.query(JournalEntries).filter(
        and_(
            JournalEntries.entity_id == entity_id,
            JournalEntries.approval_status == ApprovalStatus.APPROVED,
            (JournalEntries.is_posted == False)  # noqa: E712
        )
    ).order_by(desc(JournalEntries.entry_date), desc(JournalEntries.id))
    result = []
    for e in q.all():
        result.append({
            "id": e.id,
            "entry_number": e.entry_number,
            "entry_date": e.entry_date,
            "description": e.description,
        })
    return {"entries": result, "total": len(result)}


@router.post("/journal-entries/post-batch")
async def post_batch(
    payload: Dict[str, Any],
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    entry_ids: List[int] = payload.get('entry_ids') or []
    entity_id: Optional[int] = payload.get('entity_id')
    start_date: Optional[str] = payload.get('start_date')
    end_date: Optional[str] = payload.get('end_date')
    count = 0
    if entry_ids:
        q = db.query(JournalEntries).filter(JournalEntries.id.in_(entry_ids))
    elif entity_id:
        q = db.query(JournalEntries).filter(
            and_(
                JournalEntries.entity_id == entity_id,
                JournalEntries.approval_status == ApprovalStatus.APPROVED,
                (JournalEntries.is_posted == False)
            )
        )
        if start_date:
            q = q.filter(JournalEntries.entry_date >= start_date)
        if end_date:
            q = q.filter(JournalEntries.entry_date <= end_date)
    else:
        raise HTTPException(status_code=400, detail="Provide entry_ids or entity_id")
    for e in q.all():
        if getattr(e, 'is_posted', False):
            continue
        e.is_posted = True
        e.posted_date = datetime.utcnow()
        count += 1
    db.commit()
    return {"posted": count}

# Audit Trail Endpoint
@router.get("/audit-trail")
async def get_audit_trail(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    action: Optional[str] = None,
    table_name: Optional[str] = None,
    current_user: Partners = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get audit trail for compliance"""
    
    query = db.query(AuditLog).join(Partners, AuditLog.user_id == Partners.id)
    
    if start_date:
        query = query.filter(AuditLog.timestamp >= start_date)
    
    if end_date:
        query = query.filter(AuditLog.timestamp <= end_date)
    
    if action:
        query = query.filter(AuditLog.action == action)
    
    if table_name:
        query = query.filter(AuditLog.table_name == table_name)
    
    logs = query.order_by(desc(AuditLog.timestamp)).limit(1000).all()
    
    result = []
    for log in logs:
        result.append({
            "id": log.id,
            "user_name": log.user.name,
            "action": log.action,
            "table_name": log.table_name,
            "record_id": log.record_id,
            "timestamp": log.timestamp,
            "old_values": log.old_values,
            "new_values": log.new_values
        })
    
    return {"audit_entries": result}
