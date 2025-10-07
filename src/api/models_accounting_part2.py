"""
NGI Capital Accounting Module - SQLAlchemy Models (Part 2)
Documents, Bank Accounts, Reconciliation, Controls, Period Close

Author: NGI Capital Development Team
Date: October 3, 2025
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String, Integer, Numeric, Boolean, Date, DateTime, Text,
    ForeignKey, Index, UniqueConstraint, ARRAY
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import JSON  # Use JSON for SQLite compatibility instead of JSONB
from .models_accounting import Base


# ============================================================================
# DOCUMENTS
# ============================================================================

class AccountingDocument(Base):
    """
    Document management with AI extraction
    Formation docs, invoices, receipts, bank statements, etc.
    """
    __tablename__ = "accounting_documents"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    
    # Document classification
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    # formation, legal, banking, invoices, bills, receipts, tax, internal_controls
    
    # File details
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100))
    upload_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    uploaded_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("partners.id"))
    
    # Version control
    is_amendment: Mapped[bool] = mapped_column(Boolean, default=False)
    amendment_number: Mapped[int] = mapped_column(Integer, default=0)
    original_document_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("accounting_documents.id")
    )
    effective_date: Mapped[Optional[date]] = mapped_column(Date)
    
    # Status
    processing_status: Mapped[str] = mapped_column(String(50), default="uploaded")
    # uploaded, processing, extracted, verified, failed
    workflow_status: Mapped[str] = mapped_column(String(50), default="pending")
    # pending, approved, rejected
    
    # AI Extracted metadata
    extracted_data: Mapped[Optional[dict]] = mapped_column(JSON)
    extraction_confidence: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 2))
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Full-text search
    searchable_text: Mapped[Optional[str]] = mapped_column(Text)
    
    # Soft delete
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    archived_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    archived_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    entity: Mapped["AccountingEntity"] = relationship(back_populates="documents")
    
    __table_args__ = (
        Index("idx_acc_docs_entity", "entity_id"),
        Index("idx_acc_docs_type", "document_type"),
        Index("idx_acc_docs_status", "workflow_status"),
        Index("idx_acc_docs_date", "upload_date", postgresql_using="btree"),
    )


class AccountingDocumentCategory(Base):
    """Document categories lookup table"""
    __tablename__ = "accounting_document_categories"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category_name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon_name: Mapped[Optional[str]] = mapped_column(String(50))
    color_class: Mapped[Optional[str]] = mapped_column(String(50))
    description: Mapped[Optional[str]] = mapped_column(Text)
    required_for_entity: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


# ============================================================================
# BANK ACCOUNTS & RECONCILIATION
# ============================================================================

class BankAccount(Base):
    """
    Bank accounts with Mercury API integration
    Supports automated daily sync
    """
    __tablename__ = "bank_accounts"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    
    # Bank details
    bank_name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_number_masked: Mapped[Optional[str]] = mapped_column(String(20))  # Last 4
    account_type: Mapped[str] = mapped_column(String(50), default="checking")
    # checking, savings, credit_card
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    
    # Mercury API integration
    mercury_account_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True)
    mercury_access_token_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    auto_sync_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    sync_frequency: Mapped[str] = mapped_column(String(20), default="daily")
    # hourly, daily, manual
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    last_sync_status: Mapped[Optional[str]] = mapped_column(String(50))
    # success, failed, in_progress
    last_sync_error: Mapped[Optional[str]] = mapped_column(Text)
    
    # GL account link
    gl_account_id: Mapped[int] = mapped_column(Integer, ForeignKey("chart_of_accounts.id"))
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    transactions: Mapped[List["BankTransaction"]] = relationship(
        back_populates="bank_account", cascade="all, delete-orphan"
    )
    reconciliations: Mapped[List["BankReconciliation"]] = relationship(
        back_populates="bank_account", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        Index("idx_bank_accounts_entity", "entity_id"),
        Index("idx_bank_accounts_mercury", "mercury_account_id"),
    )


class BankTransaction(Base):
    """
    Imported bank transactions from Mercury
    AI-powered matching to journal entries
    """
    __tablename__ = "bank_transactions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bank_account_id: Mapped[int] = mapped_column(Integer, ForeignKey("bank_accounts.id"))
    
    # Transaction details
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    post_date: Mapped[Optional[date]] = mapped_column(Date)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    # Positive = deposit, Negative = withdrawal
    running_balance: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    
    # Mercury metadata
    mercury_transaction_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True)
    merchant_name: Mapped[Optional[str]] = mapped_column(String(255))
    merchant_category: Mapped[Optional[str]] = mapped_column(String(100))
    
    # Reconciliation
    is_matched: Mapped[bool] = mapped_column(Boolean, default=False)
    matched_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    matched_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    confidence_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 2))
    
    status: Mapped[str] = mapped_column(String(50), default="unmatched")
    # unmatched, matched, excluded
    
    imported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    bank_account: Mapped["BankAccount"] = relationship(back_populates="transactions")
    matches: Mapped[List["BankTransactionMatch"]] = relationship(
        back_populates="bank_transaction", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        Index("idx_bank_tx_account", "bank_account_id"),
        Index("idx_bank_tx_date", "transaction_date"),
        Index("idx_bank_tx_status", "status"),
        Index("idx_bank_tx_mercury", "mercury_transaction_id"),
        UniqueConstraint("bank_account_id", "transaction_date", "amount", "description"),
    )


class BankTransactionMatch(Base):
    """
    Many-to-many relationship between bank transactions and journal entries
    Supports split transactions
    """
    __tablename__ = "bank_transaction_matches"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bank_transaction_id: Mapped[int] = mapped_column(Integer, ForeignKey("bank_transactions.id"))
    journal_entry_id: Mapped[int] = mapped_column(Integer, ForeignKey("journal_entries.id"))
    
    match_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # exact, likely, manual
    confidence: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 2))
    
    matched_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("partners.id"))
    matched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    bank_transaction: Mapped["BankTransaction"] = relationship(back_populates="matches")
    
    __table_args__ = (
        Index("idx_matches_bank_tx", "bank_transaction_id"),
        Index("idx_matches_je", "journal_entry_id"),
        UniqueConstraint("bank_transaction_id", "journal_entry_id"),
    )


class BankReconciliation(Base):
    """
    Monthly bank reconciliations with approval workflow
    """
    __tablename__ = "bank_reconciliations"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bank_account_id: Mapped[int] = mapped_column(Integer, ForeignKey("bank_accounts.id"))
    
    # Period
    reconciliation_date: Mapped[date] = mapped_column(Date, nullable=False)
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    fiscal_period: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Balances
    beginning_balance: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    ending_balance_per_bank: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    ending_balance_per_books: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    
    # Items
    cleared_deposits: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    cleared_withdrawals: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    outstanding_deposits: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    outstanding_checks: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    adjustments: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    
    # Reconciliation
    difference: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    is_balanced: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Workflow
    status: Mapped[str] = mapped_column(String(50), default="draft")
    # draft, pending_approval, approved, locked
    prepared_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("partners.id"))
    prepared_at: Mapped[datetime] = mapped_column(DateTime)
    approved_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    bank_account: Mapped["BankAccount"] = relationship(back_populates="reconciliations")
    
    __table_args__ = (
        Index("idx_reconciliations_account", "bank_account_id"),
        Index("idx_reconciliations_date", "reconciliation_date"),
        UniqueConstraint("bank_account_id", "reconciliation_date"),
    )


class BankMatchingRule(Base):
    """
    Rules engine for automatic transaction categorization
    """
    __tablename__ = "bank_matching_rules"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    bank_account_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("bank_accounts.id"))
    
    # Rule definition
    rule_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Conditions
    description_contains: Mapped[Optional[str]] = mapped_column(String(255))
    amount_min: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    amount_max: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    merchant_name: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Action
    auto_categorize_account_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("chart_of_accounts.id")
    )
    auto_match: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Priority
    priority: Mapped[int] = mapped_column(Integer, default=0)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    times_applied: Mapped[int] = mapped_column(Integer, default=0)
    
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("partners.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_matching_rules_entity", "entity_id"),
        Index("idx_matching_rules_account", "bank_account_id"),
    )


# ============================================================================
# INTERNAL CONTROLS
# ============================================================================

class InternalControl(Base):
    """
    Internal controls for investor display
    Extracted from uploaded controls document
    """
    __tablename__ = "internal_controls"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    
    # Control identification
    control_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    # IC-CD-001
    control_title: Mapped[str] = mapped_column(String(255), nullable=False)
    control_description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Classification
    control_category: Mapped[str] = mapped_column(String(100), nullable=False)
    # Cash Disbursements, Revenue, Financial Reporting, IT
    control_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # Preventive, Detective, Corrective
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False)
    # High, Medium, Low
    
    # SOX designation
    is_key_control: Mapped[bool] = mapped_column(Boolean, default=False)
    is_sox_control: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Execution
    frequency: Mapped[str] = mapped_column(String(50), nullable=False)
    # Per transaction, Daily, Weekly, Monthly, Quarterly, Annual
    responsible_party_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    responsible_party_title: Mapped[Optional[str]] = mapped_column(String(100))
    # CEO, CFO, Controller
    
    # Status
    design_status: Mapped[str] = mapped_column(String(50), default="designed")
    # designed, implemented, operating
    operating_effectiveness: Mapped[Optional[str]] = mapped_column(String(50))
    # effective, needs_improvement, ineffective
    
    # Testing
    last_tested_date: Mapped[Optional[date]] = mapped_column(Date)
    last_test_result: Mapped[Optional[str]] = mapped_column(String(50))
    # passed, failed, not_applicable
    test_frequency: Mapped[Optional[str]] = mapped_column(String(50))
    next_test_date: Mapped[Optional[date]] = mapped_column(Date)
    
    # Documentation
    source_document_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("accounting_documents.id")
    )
    evidence_required: Mapped[Optional[str]] = mapped_column(Text)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    __table_args__ = (
        Index("idx_controls_entity", "entity_id"),
        Index("idx_controls_category", "control_category"),
        Index("idx_controls_risk", "risk_level"),
    )


class AuthorizationMatrix(Base):
    """
    Authorization matrix for approval thresholds
    Landon (CEO) + Andre (CFO/COO)
    """
    __tablename__ = "authorization_matrix"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    
    # Authorization rule
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    # CEO, CFO, Partner, Manager
    transaction_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # Expense, Invoice Payment, Payroll, etc.
    amount_min: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    amount_max: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    
    # Approval requirements
    approvals_required: Mapped[int] = mapped_column(Integer, default=1)
    requires_board: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Segregation of duties
    cannot_be_preparer: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_authz_matrix_entity", "entity_id"),
    )


class ControlTestResult(Base):
    """
    Control testing and evidence tracking
    """
    __tablename__ = "control_test_results"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    control_id: Mapped[int] = mapped_column(Integer, ForeignKey("internal_controls.id"))
    
    # Test details
    test_date: Mapped[date] = mapped_column(Date, nullable=False)
    test_period_start: Mapped[Optional[date]] = mapped_column(Date)
    test_period_end: Mapped[Optional[date]] = mapped_column(Date)
    sample_size: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Results
    test_result: Mapped[str] = mapped_column(String(50), nullable=False)
    # passed, failed, not_applicable
    exceptions_found: Mapped[int] = mapped_column(Integer, default=0)
    exception_details: Mapped[Optional[str]] = mapped_column(Text)
    
    # Evidence
    evidence_document_ids: Mapped[Optional[str]] = mapped_column(Text)  # Store as comma-separated IDs for SQLite compatibility
    
    # Follow-up
    remediation_required: Mapped[bool] = mapped_column(Boolean, default=False)
    remediation_plan: Mapped[Optional[str]] = mapped_column(Text)
    remediation_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Tester
    tested_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("partners.id"))
    reviewed_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_test_results_control", "control_id"),
        Index("idx_test_results_date", "test_date"),
    )


# Continue with Period Close models...

