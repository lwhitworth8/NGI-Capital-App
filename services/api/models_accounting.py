"""
NGI Capital Accounting Module - SQLAlchemy Models
Modern async SQLAlchemy 2.0 implementation with full GAAP compliance

Author: NGI Capital Development Team
Date: October 3, 2025
Python: 3.11+
SQLAlchemy: 2.0+

All datetime fields use PST (Pacific Standard Time) via datetime_utils.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String, Integer, Numeric, Boolean, Date, DateTime, Text, 
    ForeignKey, Index, CheckConstraint, UniqueConstraint, ARRAY
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import JSON  # Use JSON for SQLite compatibility instead of JSONB

# Import the shared Base from main models to ensure all tables are registered
from .models import Base
from .utils.datetime_utils import get_pst_now


# ============================================================================
# ENTITIES & STRUCTURE
# ============================================================================

class AccountingEntity(Base):
    """
    Entities (NGI Capital Inc., NGI Capital Advisory LLC, etc.)
    Supports parent-subsidiary relationships for consolidation
    """
    __tablename__ = "accounting_entities"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    
    # Entity details
    entity_name: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # LLC, C-Corp, S-Corp
    ein: Mapped[Optional[str]] = mapped_column(String(20), unique=True)
    formation_date: Mapped[Optional[date]] = mapped_column(Date)
    formation_state: Mapped[Optional[str]] = mapped_column(String(2))
    
    # Status
    entity_status: Mapped[str] = mapped_column(String(50), default="active")
    # active, converted, closed, dissolved
    
    # Availability for user selection (unlocked after conversion/registration)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Parent-subsidiary ownership
    parent_entity_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("accounting_entities.id")
    )
    ownership_percentage: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))  # 100.00 = 100%
    
    # Conversion tracking
    converted_from_entity_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("accounting_entities.id")
    )
    conversion_date: Mapped[Optional[date]] = mapped_column(Date)
    conversion_type: Mapped[Optional[str]] = mapped_column(String(50))
    # statutory_conversion, asset_transfer
    
    # Invoice/Payment Settings
    default_payment_terms: Mapped[Optional[str]] = mapped_column(String(50), default="Net 30")
    late_payment_fee: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    late_payment_interest_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))  # e.g., 1.5% monthly
    invoice_payment_instructions: Mapped[Optional[str]] = mapped_column(Text)
    
    # Audit
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now, onupdate=get_pst_now)
    
    # Relationships
    chart_of_accounts: Mapped[List["ChartOfAccounts"]] = relationship(
        back_populates="entity", cascade="all, delete-orphan"
    )
    journal_entries: Mapped[List["JournalEntry"]] = relationship(
        back_populates="entity", cascade="all, delete-orphan"
    )
    documents: Mapped[List["AccountingDocument"]] = relationship(
        back_populates="entity", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        Index("idx_entity_status", "entity_status"),
        Index("idx_entity_type", "entity_type"),
    )


class EntityRelationship(Base):
    """
    Parent-subsidiary relationships for consolidated reporting
    Supports NGI Capital Inc. (parent) + NGI Capital Advisory LLC (sub)
    """
    __tablename__ = "entity_relationships"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parent_entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    subsidiary_entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    
    # Ownership
    ownership_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)  # 100.00
    ownership_effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    ownership_end_date: Mapped[Optional[date]] = mapped_column(Date)
    
    # Control
    has_control: Mapped[bool] = mapped_column(Boolean, default=True)
    voting_rights_percent: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    
    # Consolidation method
    consolidation_method: Mapped[str] = mapped_column(String(50), default="full")
    # full, equity_method, cost
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now, onupdate=get_pst_now)
    
    __table_args__ = (
        Index("idx_entity_rel_parent", "parent_entity_id"),
        Index("idx_entity_rel_sub", "subsidiary_entity_id"),
        UniqueConstraint("parent_entity_id", "subsidiary_entity_id", "ownership_effective_date"),
    )


# ============================================================================
# CHART OF ACCOUNTS
# ============================================================================

class ChartOfAccounts(Base):
    """
    5-digit US GAAP Chart of Accounts
    Pre-seeded with 150+ standard accounts
    """
    __tablename__ = "chart_of_accounts"
    __table_args__ = {'extend_existing': True}
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    
    # Account structure
    account_number: Mapped[str] = mapped_column(String(10), nullable=False)  # 10-digit: 10100
    account_name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # Asset, Liability, Equity, Revenue, Expense
    parent_account_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("chart_of_accounts.id")
    )
    
    # Accounting properties
    normal_balance: Mapped[str] = mapped_column(String(10), nullable=False)  # Debit, Credit
    description: Mapped[Optional[str]] = mapped_column(Text)
    gaap_reference: Mapped[Optional[str]] = mapped_column(String(50))  # ASC 606, ASC 842

    # XBRL Mapping (US GAAP Taxonomy)
    xbrl_element_name: Mapped[Optional[str]] = mapped_column(String(255))
    primary_asc_topic: Mapped[Optional[str]] = mapped_column(String(50))
    xbrl_mapping_confidence: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("0.00"))
    xbrl_is_validated: Mapped[bool] = mapped_column(Boolean, default=False)
    xbrl_validated_by: Mapped[Optional[str]] = mapped_column(String(255))
    xbrl_validated_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_posting: Mapped[bool] = mapped_column(Boolean, default=True)  # False for parent accounts
    require_project: Mapped[bool] = mapped_column(Boolean, default=False)
    require_cost_center: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Balances (cached for performance)
    current_balance: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    ytd_activity: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    last_transaction_date: Mapped[Optional[date]] = mapped_column(Date)
    
    # Audit
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now)
    created_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now, onupdate=get_pst_now)
    updated_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    
    # Relationships
    entity: Mapped["AccountingEntity"] = relationship(back_populates="chart_of_accounts")
    journal_entry_lines: Mapped[List["JournalEntryLine"]] = relationship(back_populates="account")
    
    __table_args__ = (
        Index("idx_coa_entity", "entity_id"),
        Index("idx_coa_type", "account_type"),
        Index("idx_coa_parent", "parent_account_id"),
        Index("idx_coa_number", "account_number"),
        UniqueConstraint("entity_id", "account_number"),
    )


class AccountMappingRule(Base):
    """
    Smart mapping rules for automatic transaction categorization
    AI learns from manual corrections
    """
    __tablename__ = "account_mapping_rules"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    
    # Rule definition
    rule_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # vendor, keyword, amount, category
    pattern: Mapped[str] = mapped_column(String(255), nullable=False)  # Vendor name, keyword
    account_id: Mapped[int] = mapped_column(Integer, ForeignKey("chart_of_accounts.id"))
    confidence_weight: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("1.00"))
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Learning metrics
    times_used: Mapped[int] = mapped_column(Integer, default=0)
    times_corrected: Mapped[int] = mapped_column(Integer, default=0)
    accuracy_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 2))
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now, onupdate=get_pst_now)
    
    __table_args__ = (
        Index("idx_mapping_entity", "entity_id"),
        Index("idx_mapping_pattern", "pattern"),
    )


# ============================================================================
# JOURNAL ENTRIES
# ============================================================================

class JournalEntry(Base):
    """
    Journal entries with dual approval workflow (Landon + Andre)
    Immutable after posting, complete audit trail
    """
    __tablename__ = "journal_entries"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    
    # Entry identification
    entry_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    # JE-2025-001234
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    fiscal_period: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-12
    
    # Entry metadata
    entry_type: Mapped[str] = mapped_column(String(50), default="Standard")
    # Standard, Adjusting, Closing, Reversing
    memo: Mapped[Optional[str]] = mapped_column(Text)
    reference: Mapped[Optional[str]] = mapped_column(String(100))
    
    # Source tracking
    source_type: Mapped[Optional[str]] = mapped_column(String(50))
    # Manual, MercuryImport, DocumentExtraction, Recurring
    source_id: Mapped[Optional[str]] = mapped_column(String(100))
    
    # Workflow status
    status: Mapped[str] = mapped_column(String(50), default="draft")
    # draft, pending_first_approval, pending_final_approval, posted, reversed
    workflow_stage: Mapped[int] = mapped_column(Integer, default=0)
    # Standardized workflow: 0=draft, 1=pending_first, 2=pending_final, 4=posted
    
    # Approval tracking (Landon + Andre)
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("partners.id"))
    created_by_email: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now)
    first_approved_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    first_approved_by_email: Mapped[Optional[str]] = mapped_column(String(255))
    first_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    final_approved_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    final_approved_by_email: Mapped[Optional[str]] = mapped_column(String(255))
    final_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text)
    
    # Reversal tracking
    is_reversing: Mapped[bool] = mapped_column(Boolean, default=False)
    reversed_entry_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("journal_entries.id")
    )
    reversal_entry_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("journal_entries.id")
    )
    
    # Recurring entry tracking
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recurring_template_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("recurring_journal_templates.id")
    )
    
    # Audit
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now, onupdate=get_pst_now)
    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    posted_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    posted_by_email: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Locking
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    locked_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    locked_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))

    # Mercury Integration
    mercury_transaction_id: Mapped[Optional[str]] = mapped_column(String(100))
    reconciliation_status: Mapped[Optional[str]] = mapped_column(String(50))
    # unmatched, matched, reconciled
    needs_review: Mapped[bool] = mapped_column(Boolean, default=False)

    # Document extraction data (for invoice metadata display)
    extracted_data: Mapped[Optional[dict]] = mapped_column(JSON)
    # Stores: invoice_number, invoice_date, vendor_name, total_amount, etc.
    document_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("accounting_documents.id")
    )

    # Relationships
    entity: Mapped["AccountingEntity"] = relationship(back_populates="journal_entries")
    lines: Mapped[List["JournalEntryLine"]] = relationship(
        back_populates="journal_entry", cascade="all, delete-orphan"
    )
    attachments: Mapped[List["JournalEntryAttachment"]] = relationship(
        back_populates="journal_entry", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        Index("idx_je_entity", "entity_id"),
        Index("idx_je_status", "status"),
        Index("idx_je_date", "entry_date"),
        Index("idx_je_number", "entry_number"),
    )


class JournalEntryLine(Base):
    """
    Journal entry lines - enforces double-entry (debits = credits)
    """
    __tablename__ = "journal_entry_lines"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    journal_entry_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("journal_entries.id", ondelete="CASCADE")
    )
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    account_id: Mapped[int] = mapped_column(Integer, ForeignKey("chart_of_accounts.id"))
    
    # Debit/Credit
    debit_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    credit_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    
    # Line metadata
    description: Mapped[Optional[str]] = mapped_column(Text)

    # XBRL Mapping (US GAAP Taxonomy) - automatically populated from Chart of Accounts
    # This ensures each JE line is tagged with the current GAAP accounting treatment
    xbrl_element_name: Mapped[Optional[str]] = mapped_column(String(255))
    # e.g., "CashAndCashEquivalents", "AccountsReceivableNet"
    primary_asc_topic: Mapped[Optional[str]] = mapped_column(String(100))
    # e.g., "ASC 230-10", "ASC 606-10-25"
    xbrl_standard_label: Mapped[Optional[str]] = mapped_column(String(500))
    # Human-readable label from XBRL taxonomy for audit clarity

    # ASC 720 Startup Cost Tracking
    is_startup_cost: Mapped[bool] = mapped_column(Boolean, default=False)
    startup_cost_metadata: Mapped[Optional[dict]] = mapped_column(JSON)
    # {"threshold_tracking": "first_5000", "entity_inception_date": "2025-07-16", "cumulative_amount": 2500.00}
    
    # Dimensions (optional) - project_id references advisory_projects but no FK constraint (table created via raw SQL)
    project_id: Mapped[Optional[int]] = mapped_column(Integer)
    cost_center: Mapped[Optional[str]] = mapped_column(String(50))
    department: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Links
    document_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("accounting_documents.id")
    )
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now)
    
    # Relationships
    journal_entry: Mapped["JournalEntry"] = relationship(back_populates="lines")
    account: Mapped["ChartOfAccounts"] = relationship(back_populates="journal_entry_lines")
    
    __table_args__ = (
        CheckConstraint(
            "(debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0)",
            name="chk_debit_or_credit"
        ),
        Index("idx_jel_entry", "journal_entry_id"),
        Index("idx_jel_account", "account_id"),
        UniqueConstraint("journal_entry_id", "line_number"),
    )

class RecurringJournalTemplate(Base):
    """
    Templates for recurring entries (monthly rent, depreciation, etc.)
    """
    __tablename__ = "recurring_journal_templates"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    
    template_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Recurrence
    frequency: Mapped[str] = mapped_column(String(20), nullable=False)
    # monthly, quarterly, annual
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date)
    next_generation_date: Mapped[Optional[date]] = mapped_column(Date)
    
    # Template lines (JSON for simplicity)
    template_lines: Mapped[dict] = mapped_column(JSON, nullable=False)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    require_review: Mapped[bool] = mapped_column(Boolean, default=True)
    
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("partners.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now, onupdate=get_pst_now)


class JournalEntryApprovalRule(Base):
    """
    Approval rules based on transaction amount
    <$500: Single approval
    $500-$5000: Dual approval (Landon + Andre)
    >$5000: Dual approval + notification
    """
    __tablename__ = "journal_entry_approval_rules"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    
    # Threshold
    min_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    max_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    
    # Approval requirements
    approvals_required: Mapped[int] = mapped_column(Integer, default=1)
    notify_cfo: Mapped[bool] = mapped_column(Boolean, default=False)
    notify_board: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now)


class JournalEntryAuditLog(Base):
    """
    Complete audit trail - every action logged
    Cannot be deleted or modified
    """
    __tablename__ = "journal_entry_audit_log"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    journal_entry_id: Mapped[int] = mapped_column(Integer, ForeignKey("journal_entries.id"))
    
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    # created, edited, approved, rejected, posted, reversed
    performed_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("partners.id"))
    performed_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now)
    
    # Details
    old_value: Mapped[Optional[dict]] = mapped_column(JSON)
    new_value: Mapped[Optional[dict]] = mapped_column(JSON)
    comment: Mapped[Optional[str]] = mapped_column(Text)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))  # IPv4 or IPv6
    
    __table_args__ = (
        Index("idx_audit_entry", "journal_entry_id"),
        Index("idx_audit_date", "performed_at"),
    )




class JournalEntryAttachment(Base):
    """
    Many-to-one attachments for a journal entry.
    Used to link invoices, bank statements, receipts, amortization schedules, etc.
    """
    __tablename__ = "journal_entry_attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    journal_entry_id: Mapped[int] = mapped_column(Integer, ForeignKey("journal_entries.id", ondelete="CASCADE"))
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_documents.id"), nullable=False)

    # Ordering and primary flag (primary used for default preview)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

    created_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now)

    # Relationships
    journal_entry: Mapped["JournalEntry"] = relationship(back_populates="attachments")

    __table_args__ = (
        UniqueConstraint("journal_entry_id", "document_id", name="uq_je_attachment_unique"),
        Index("idx_je_att_entry", "journal_entry_id"),
        Index("idx_je_att_doc", "document_id"),
        Index("idx_je_att_order", "journal_entry_id", "display_order"),
    )


