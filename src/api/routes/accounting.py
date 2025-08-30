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
from pydantic import BaseModel, validator, Field
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
    
    @validator('account_code')
    def validate_account_code(cls, v):
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
    debit_amount: Decimal = Decimal('0.00')
    credit_amount: Decimal = Decimal('0.00')
    
    @validator('debit_amount', 'credit_amount')
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
    
    @validator('lines')
    def validate_balanced_entry(cls, lines):
        total_debits = sum(line.debit_amount for line in lines)
        total_credits = sum(line.credit_amount for line in lines)
        
        if total_debits != total_credits:
            raise ValueError(f'Journal entry must be balanced. Debits: {total_debits}, Credits: {total_credits}')
        
        if total_debits == 0:
            raise ValueError('Journal entry cannot be zero')
            
        return lines

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
    created_by_partner: Optional[str]
    approved_by_partner: Optional[str]
    lines: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True

class TransactionRequest(BaseModel):
    entity_id: int
    account_id: int
    transaction_date: date
    amount: Decimal
    transaction_type: TransactionType
    description: str
    reference_number: Optional[str]
    
    @validator('amount')
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
    amount: Decimal
    tax_amount: Decimal = Decimal('0.00')
    merchant_name: Optional[str]
    category: Optional[str]
    is_billable: bool = False
    
    @validator('amount')
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
    
    @validator('recognition_method')
    def validate_method(cls, v):
        if v not in ['over_time', 'point_in_time']:
            raise ValueError('Recognition method must be "over_time" or "point_in_time"')
        return v

# Dependency to get current user from JWT token
async def get_current_partner(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Partners:
    # This would decode JWT token and return partner
    # For now, returning a placeholder
    # In production, implement proper JWT validation
    pass

# Dependency to get database session
def get_db():
    # This would return SQLAlchemy database session
    # Implementation depends on your database setup
    pass

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
    existing = db.query(ChartOfAccounts).filter(
        and_(
            ChartOfAccounts.entity_id == account.entity_id,
            ChartOfAccounts.account_code == account.account_code
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Account code already exists for this entity")
    
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
    
    new_account = ChartOfAccounts(**account.dict())
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    
    # Log audit trail
    audit_log = AuditLog(
        user_id=current_user.id,
        action="CREATE",
        table_name="chart_of_accounts",
        record_id=new_account.id,
        new_values=json.dumps(account.dict())
    )
    db.add(audit_log)
    db.commit()
    
    return ChartOfAccountResponse(
        **new_account.__dict__,
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
    
    # Calculate totals
    total_debit = sum(line.debit_amount for line in entry.lines)
    total_credit = sum(line.credit_amount for line in entry.lines)
    
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
    
    # Log audit trail
    audit_log = AuditLog(
        user_id=current_user.id,
        action="APPROVE" if approval.approve else "REJECT",
        table_name="journal_entries",
        record_id=entry.id,
        old_values=json.dumps({"approval_status": old_status.value}),
        new_values=json.dumps({"approval_status": entry.approval_status.value})
    )
    db.add(audit_log)
    db.commit()
    
    return {"message": "Journal entry processed successfully", "status": entry.approval_status}

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
        balance_change = entry.debit_amount - entry.credit_amount
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