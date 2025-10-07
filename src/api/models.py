"""
SQLAlchemy models for NGI Capital Internal Accounting System
GAAP-compliant accounting models with audit trail and approval workflows
"""

from datetime import datetime, date
from decimal import Decimal
from enum import Enum as PyEnum
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, DateTime, Date, Boolean, 
    Text, ForeignKey, CheckConstraint, Index, UniqueConstraint, Enum
)
from sqlalchemy.types import DECIMAL as SQLDecimal
from sqlalchemy.orm import relationship, validates, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

# Import Learning Module models (they use the same Base)
# This ensures all models are registered with SQLAlchemy metadata
def register_learning_models():
    """Import learning models to register them with SQLAlchemy"""
    try:
        from . import models_learning
    except ImportError:
        pass  # Learning models not yet available

# Register at module load time
register_learning_models()

# Enums for various status fields
class ApprovalStatus(PyEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class TransactionType(PyEnum):
    DEBIT = "debit"
    CREDIT = "credit"

class AccountType(PyEnum):
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"

class EntityType(PyEnum):
    LLC = "llc"
    CORPORATION = "corporation"
    PARTNERSHIP = "partnership"
    SOLE_PROPRIETORSHIP = "sole_proprietorship"

class ExpenseStatus(PyEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    PAID = "paid"
    REJECTED = "rejected"

class DocumentType(PyEnum):
    RECEIPT = "receipt"
    INVOICE = "invoice"
    CONTRACT = "contract"
    STATEMENT = "statement"
    OTHER = "other"


class Partners(Base):
    """Partners table for NGI Capital partners with ownership tracking"""
    __tablename__ = 'partners'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    ownership_percentage = Column(SQLDecimal(5, 2), nullable=False)
    capital_account_balance = Column(SQLDecimal(15, 2), default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    created_transactions = relationship("Transactions", foreign_keys="[Transactions.created_by_id]", back_populates="creator")
    approved_transactions = relationship("Transactions", foreign_keys="[Transactions.approved_by_id]", back_populates="approver")
    # OLD DEPRECATED: journal_entries relationship - removed, use new accounting.JournalEntry instead
    expense_reports = relationship(
        "ExpenseReports",
        foreign_keys="[ExpenseReports.submitted_by_id]",
        back_populates="submitted_by_partner",
    )
    
    # Validation constraints
    __table_args__ = (
        CheckConstraint('ownership_percentage >= 0 AND ownership_percentage <= 100', 
                       name='valid_ownership_percentage'),
        CheckConstraint("email LIKE '%@ngicapitaladvisory.com'", name='valid_email_domain'),
    )
    
    @validates('email')
    def validate_email(self, key, address):
        assert '@ngicapitaladvisory.com' in address, "Email must be @ngicapitaladvisory.com domain"
        return address.lower()


class Entities(Base):
    """Legal entities managed by NGI Capital"""
    __tablename__ = 'entities'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    legal_name = Column(String(200), nullable=False)
    entity_type = Column(Enum(EntityType), nullable=False)
    ein = Column(String(20), unique=True, index=True)
    formation_date = Column(Date)
    formation_state = Column(String(50))
    parent_entity_id = Column(Integer, ForeignKey('entities.id'))
    is_active = Column(Boolean, default=True, nullable=False)
    address_line1 = Column(String(200))
    address_line2 = Column(String(200))
    city = Column(String(100))
    state = Column(String(50))
    postal_code = Column(String(20))
    phone = Column(String(20))
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    parent_entity = relationship("Entities", remote_side=[id], overlaps="child_entities")
    child_entities = relationship("Entities", overlaps="parent_entity")
    transactions = relationship("Transactions", back_populates="entity")
    # OLD DEPRECATED: chart_of_accounts, journal_entries, bank_accounts relationships removed
    # Use new accounting module models instead


# DEPRECATED: ChartOfAccounts - Use models_accounting.py instead


# DEPRECATED: JournalEntries - Use models_accounting.py instead


# DEPRECATED: JournalEntryLines - Use models_accounting.py instead


class Transactions(Base):
    """General transactions table with approval workflow and Mercury integration"""
    __tablename__ = 'transactions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_id = Column(Integer, ForeignKey('entities.id'), nullable=False)
    account_id = Column(Integer, ForeignKey('chart_of_accounts.id'), nullable=False)
    transaction_date = Column(Date, nullable=False)
    amount = Column(SQLDecimal(15, 2), nullable=False)
    transaction_type = Column(String(50), nullable=False)  # wire, ach, deposit, withdrawal, etc.
    description = Column(Text, nullable=False)
    reference_number = Column(String(50))
    counterparty = Column(String(200))  # Name of the other party in transaction
    created_by = Column(String(100), nullable=False)  # Email or system identifier
    approved_by = Column(String(100))  # Email of approver
    created_by_id = Column(Integer, ForeignKey('partners.id'))
    approved_by_id = Column(Integer, ForeignKey('partners.id'))
    approval_status = Column(String(20), default='pending', nullable=False)
    approval_date = Column(DateTime)
    approval_notes = Column(Text)
    status = Column(String(50), default='pending')  # pending, processing, completed, failed
    mercury_transaction_id = Column(String(200), unique=True)  # Mercury's transaction ID
    mercury_account_id = Column(String(200))  # Mercury account ID
    bank_account_id = Column(Integer, ForeignKey('bank_accounts.id'))
    transaction_metadata = Column(Text)  # JSON field for additional Mercury-specific data
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    entity = relationship("Entities", back_populates="transactions")
    # OLD DEPRECATED: account relationship to old ChartOfAccounts removed
    creator = relationship("Partners", foreign_keys=[created_by_id], back_populates="created_transactions")
    approver = relationship("Partners", foreign_keys=[approved_by_id], back_populates="approved_transactions")
    
    # Constraints - dual approval for transactions > $500 and no self-approval
    __table_args__ = (
        CheckConstraint('created_by_id != approved_by_id OR approved_by_id IS NULL', 
                       name='no_self_approval_transactions'),
        CheckConstraint('amount > 0', name='positive_amount'),
        CheckConstraint(
            '(amount <= 500.00 AND approval_status IN (\'pending\', \'approved\', \'rejected\')) OR ' +
            '(amount > 500.00 AND (approved_by_id IS NOT NULL OR approval_status = \'pending\'))',
            name='dual_approval_over_500'
        ),
        Index('idx_transaction_date', 'transaction_date'),
        Index('idx_approval_status_trans', 'approval_status'),
        Index('idx_mercury_transaction', 'mercury_transaction_id'),
    )


class ExpenseReports(Base):
    """Expense reports with receipt uploads and approval workflow"""
    __tablename__ = 'expense_reports'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_id = Column(Integer, ForeignKey('entities.id'), nullable=False)
    report_number = Column(String(20), nullable=False)
    title = Column(String(200), nullable=False)
    submitted_by_id = Column(Integer, ForeignKey('partners.id'), nullable=False)
    approved_by_id = Column(Integer, ForeignKey('partners.id'))
    total_amount = Column(SQLDecimal(15, 2), nullable=False, default=0)
    status = Column(Enum(ExpenseStatus), default=ExpenseStatus.DRAFT, nullable=False)
    submission_date = Column(DateTime)
    approval_date = Column(DateTime)
    approval_notes = Column(Text)
    reimbursement_date = Column(Date)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    entity = relationship("Entities")
    submitted_by_partner = relationship("Partners", foreign_keys=[submitted_by_id], back_populates="expense_reports")
    approved_by_partner = relationship("Partners", foreign_keys=[approved_by_id])
    expense_items = relationship("ExpenseItems", back_populates="expense_report", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('submitted_by_id != approved_by_id OR approved_by_id IS NULL', 
                       name='no_self_approval_expenses'),
        UniqueConstraint('entity_id', 'report_number', name='unique_report_number_per_entity'),
        Index('idx_expense_status', 'status'),
        Index('idx_submission_date', 'submission_date'),
    )


class ExpenseItems(Base):
    """Individual expense items within expense reports"""
    __tablename__ = 'expense_items'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    expense_report_id = Column(Integer, ForeignKey('expense_reports.id'), nullable=False)
    account_id = Column(Integer, ForeignKey('chart_of_accounts.id'), nullable=False)
    expense_date = Column(Date, nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(SQLDecimal(15, 2), nullable=False)
    tax_amount = Column(SQLDecimal(15, 2), default=0)
    merchant_name = Column(String(200))
    category = Column(String(100))
    is_billable = Column(Boolean, default=False)
    client_id = Column(Integer)  # Reference to client if billable
    receipt_uploaded = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    expense_report = relationship("ExpenseReports", back_populates="expense_items")
    # OLD DEPRECATED: account relationship to old ChartOfAccounts removed
    documents = relationship("Documents", back_populates="expense_item")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('amount > 0', name='positive_expense_amount'),
        CheckConstraint('tax_amount >= 0', name='non_negative_tax'),
    )


class Documents(Base):
    """Document management for receipts, invoices, and other supporting documents"""
    __tablename__ = 'documents'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(200), nullable=False)
    document_type = Column(Enum(DocumentType), nullable=False)
    expense_item_id = Column(Integer, ForeignKey('expense_items.id'))
    transaction_id = Column(Integer, ForeignKey('transactions.id'))
    journal_entry_id = Column(Integer, ForeignKey('journal_entries.id'))
    uploaded_by_id = Column(Integer, ForeignKey('partners.id'), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    expense_item = relationship("ExpenseItems", back_populates="documents")
    uploaded_by = relationship("Partners")
    # OLD DEPRECATED: relationships to old JournalEntries removed
    
    # Constraints
    __table_args__ = (
        CheckConstraint('file_size > 0', name='positive_file_size'),
        Index('idx_document_type', 'document_type'),
        Index('idx_upload_date', 'created_at'),
    )


# DEPRECATED: BankAccounts - Use models_accounting.py instead


# DEPRECATED: BankTransactions - Use models_accounting.py instead


class AuditLog(Base):
    """Immutable audit trail for all system actions"""
    __tablename__ = 'audit_log'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('partners.id'), nullable=False)
    action = Column(String(100), nullable=False)  # CREATE, UPDATE, DELETE, APPROVE, etc.
    table_name = Column(String(100), nullable=False)
    record_id = Column(Integer, nullable=False)
    old_values = Column(Text)  # JSON of old values
    new_values = Column(Text)  # JSON of new values
    ip_address = Column(String(45))
    user_agent = Column(Text)
    session_id = Column(String(200))
    timestamp = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("Partners")
    
    # Constraints - immutable audit log
    __table_args__ = (
        Index('idx_audit_timestamp', 'timestamp'),
        Index('idx_audit_action', 'action'),
        Index('idx_audit_table', 'table_name'),
        Index('idx_audit_user', 'user_id'),
    )


class RevenueRecognition(Base):
    """Revenue recognition tracking for ASC 606 compliance"""
    __tablename__ = 'revenue_recognition'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_id = Column(Integer, ForeignKey('entities.id'), nullable=False)
    contract_id = Column(String(100), nullable=False)
    performance_obligation = Column(Text, nullable=False)
    transaction_price = Column(SQLDecimal(15, 2), nullable=False)
    allocated_amount = Column(SQLDecimal(15, 2), nullable=False)
    recognized_to_date = Column(SQLDecimal(15, 2), default=0)
    remaining_to_recognize = Column(SQLDecimal(15, 2))
    recognition_start_date = Column(Date, nullable=False)
    recognition_end_date = Column(Date, nullable=False)
    recognition_method = Column(String(50), nullable=False)  # 'over_time', 'point_in_time'
    completion_percentage = Column(SQLDecimal(5, 2), default=0)
    is_complete = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    entity = relationship("Entities")
    recognition_entries = relationship("RevenueRecognitionEntries", back_populates="revenue_recognition")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('transaction_price > 0', name='positive_transaction_price'),
        CheckConstraint('allocated_amount > 0', name='positive_allocated_amount'),
        CheckConstraint('completion_percentage >= 0 AND completion_percentage <= 100', 
                       name='valid_completion_percentage'),
        CheckConstraint('recognition_end_date >= recognition_start_date', 
                       name='valid_recognition_period'),
    )


class RevenueRecognitionEntries(Base):
    """Individual revenue recognition entries"""
    __tablename__ = 'revenue_recognition_entries'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    revenue_recognition_id = Column(Integer, ForeignKey('revenue_recognition.id'), nullable=False)
    journal_entry_id = Column(Integer, ForeignKey('journal_entries.id'))
    recognition_date = Column(Date, nullable=False)
    amount = Column(SQLDecimal(15, 2), nullable=False)
    cumulative_recognized = Column(SQLDecimal(15, 2), nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    revenue_recognition = relationship("RevenueRecognition", back_populates="recognition_entries")
    # OLD DEPRECATED: journal_entry relationship to old JournalEntries removed
    
    # Constraints
    __table_args__ = (
        CheckConstraint('amount > 0', name='positive_recognition_amount'),
        CheckConstraint('cumulative_recognized >= 0', name='non_negative_cumulative'),
        Index('idx_recognition_date', 'recognition_date'),
    )


# Views for common queries (these would be created as database views)
class GeneralLedgerView(Base):
    """View for general ledger reporting"""
    __tablename__ = 'general_ledger_view'
    __table_args__ = {'info': {'is_view': True}}
    
    id = Column(Integer, primary_key=True)
    entity_id = Column(Integer)
    account_code = Column(String(5))
    account_name = Column(String(200))
    transaction_date = Column(Date)
    description = Column(Text)
    debit_amount = Column(SQLDecimal(15, 2))
    credit_amount = Column(SQLDecimal(15, 2))
    running_balance = Column(SQLDecimal(15, 2))
