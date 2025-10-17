"""
NGI Capital Accounting Module - SQLAlchemy Models (Part 3)
Period Close, Consolidation, Entity Conversion

Author: NGI Capital Development Team
Date: October 3, 2025
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String, Integer, Numeric, Boolean, Date, DateTime, Text,
    ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import JSON  # Use JSON for SQLite compatibility instead of JSONB
from .models_accounting import Base


# ============================================================================
# PERIOD CLOSE
# ============================================================================

class AccountingPeriod(Base):
    """
    Fiscal periods with close workflow and locking
    Monthly, Quarterly, Annual periods
    """
    __tablename__ = "accounting_periods"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    
    # Period definition
    period_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # monthly, quarterly, annual
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    fiscal_period: Mapped[Optional[int]] = mapped_column(Integer)
    # 1-12 for monthly, 1-4 for quarterly, NULL for annual
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Status
    status: Mapped[str] = mapped_column(String(50), default="open")
    # open, closing, closed, locked
    
    # Close workflow
    close_started_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    close_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    close_target_date: Mapped[Optional[date]] = mapped_column(Date)
    close_actual_date: Mapped[Optional[date]] = mapped_column(Date)
    
    # Approval (Landon + Andre)
    cfo_approved_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    cfo_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    final_approved_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    final_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Lock
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    locked_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    locked_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    unlock_reason: Mapped[Optional[str]] = mapped_column(Text)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    checklist_items: Mapped[List["PeriodCloseChecklistItem"]] = relationship(
        back_populates="period", cascade="all, delete-orphan"
    )
    validations: Mapped[List["PeriodCloseValidation"]] = relationship(
        back_populates="period", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        Index("idx_periods_entity", "entity_id"),
        Index("idx_periods_status", "status"),
        Index("idx_periods_dates", "start_date", "end_date"),
        UniqueConstraint("entity_id", "fiscal_year", "period_type", "fiscal_period"),
    )


class PeriodCloseChecklistItem(Base):
    """
    Period close checklist items with dependencies
    Guided workflow for month/quarter/year-end
    """
    __tablename__ = "period_close_checklist_items"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    period_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_periods.id"))
    
    # Task definition
    task_name: Mapped[str] = mapped_column(String(255), nullable=False)
    task_category: Mapped[Optional[str]] = mapped_column(String(100))
    # Pre-Close, Adjustments, Statements, Approval
    description: Mapped[Optional[str]] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    
    # Dependencies
    depends_on_task_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("period_close_checklist_items.id")
    )
    
    # Assignment
    assigned_to_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    due_date: Mapped[Optional[date]] = mapped_column(Date)
    
    # Status
    status: Mapped[str] = mapped_column(String(50), default="pending")
    # pending, in_progress, completed, blocked
    completed_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Validation
    requires_validation: Mapped[bool] = mapped_column(Boolean, default=False)
    validation_status: Mapped[Optional[str]] = mapped_column(String(50))
    # passed, failed, skipped
    validation_error: Mapped[Optional[str]] = mapped_column(Text)
    
    # Automation
    auto_completable: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    period: Mapped["AccountingPeriod"] = relationship(back_populates="checklist_items")
    
    __table_args__ = (
        Index("idx_checklist_period", "period_id"),
        Index("idx_checklist_status", "status"),
    )


class PeriodCloseChecklistTemplate(Base):
    """
    Reusable checklist templates
    """
    __tablename__ = "period_close_checklist_templates"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    template_name: Mapped[str] = mapped_column(String(255), nullable=False)
    period_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # monthly, quarterly, annual
    
    # Template items (JSON)
    items: Mapped[dict] = mapped_column(JSON, nullable=False)
    
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("partners.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PeriodCloseValidation(Base):
    """
    Pre-close validation results
    Automated checks before period lock
    """
    __tablename__ = "period_close_validations"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    period_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_periods.id"))
    
    # Validation
    validation_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # bank_rec, balance_sheet, cash_flow, draft_entries, etc.
    validation_status: Mapped[str] = mapped_column(String(50), nullable=False)
    # passed, warning, failed
    validation_message: Mapped[Optional[str]] = mapped_column(Text)
    validation_details: Mapped[Optional[dict]] = mapped_column(JSON)
    
    # Resolution
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    resolved_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text)
    
    validated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    period: Mapped["AccountingPeriod"] = relationship(back_populates="validations")
    
    __table_args__ = (
        Index("idx_validations_period", "period_id"),
        Index("idx_validations_status", "validation_status"),
    )


class StandardAdjustment(Base):
    """
    Templates for standard adjusting entries
    Depreciation, Amortization, Stock-Based Comp, etc.
    """
    __tablename__ = "standard_adjustments"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    
    # Adjustment definition
    adjustment_name: Mapped[str] = mapped_column(String(255), nullable=False)
    adjustment_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # depreciation, amortization, sbc, bad_debt, prepaid_amort, deferred_revenue_recog
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Calculation
    calculation_method: Mapped[Optional[str]] = mapped_column(String(100))
    # manual, formula, schedule
    calculation_formula: Mapped[Optional[str]] = mapped_column(Text)
    
    # Template JE lines (JSON)
    journal_entry_template: Mapped[dict] = mapped_column(JSON, nullable=False)
    
    # Frequency
    frequency: Mapped[str] = mapped_column(String(20), default="monthly")
    # monthly, quarterly, annual
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_generate: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("partners.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ============================================================================
# ENTITY CONVERSION (LLC → C-Corp)
# ============================================================================

class EntityConversion(Base):
    """
    Entity conversion tracking (NGI Capital LLC → NGI Capital Inc.)
    Preserves historical data, tracks conversion date and accounting
    """
    __tablename__ = "entity_conversions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    
    # Entities
    from_entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    to_entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    
    # Conversion details
    conversion_date: Mapped[date] = mapped_column(Date, nullable=False)
    conversion_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # statutory_conversion, asset_transfer
    legal_filing_date: Mapped[Optional[date]] = mapped_column(Date)
    effective_date: Mapped[Optional[date]] = mapped_column(Date)
    
    # Financial data
    net_assets_transferred: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    assets_transferred: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    liabilities_transferred: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    equity_transferred: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    
    # New entity capitalization
    common_stock_issued: Mapped[Optional[int]] = mapped_column(Integer)
    # Number of shares
    common_stock_par_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4))
    common_stock_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    apic_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    
    # Journal entries
    closing_journal_entry_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("journal_entries.id")
    )
    opening_journal_entry_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("journal_entries.id")
    )
    
    # Approval (Both co-founders must approve)
    initiated_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("partners.id"))
    initiated_at: Mapped[datetime] = mapped_column(DateTime)
    approved_by_ceo_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    approved_by_ceo_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    approved_by_cfo_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    approved_by_cfo_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Documentation
    certificate_of_conversion_doc_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("accounting_documents.id")
    )
    articles_of_incorporation_doc_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("accounting_documents.id")
    )
    ein_letter_doc_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("accounting_documents.id")
    )
    
    # Status
    conversion_status: Mapped[str] = mapped_column(String(50), default="initiated")
    # initiated, approved, completed, cancelled
    
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_conversions_from", "from_entity_id"),
        Index("idx_conversions_to", "to_entity_id"),
    )


class EquityConversion(Base):
    """
    Track conversion of LLC membership interests to C-Corp stock
    Landon 50% + Andre 50% ownership
    """
    __tablename__ = "equity_conversions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_conversion_id: Mapped[int] = mapped_column(Integer, ForeignKey("entity_conversions.id"))
    
    # Member/Owner
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("partners.id"))
    owner_name: Mapped[str] = mapped_column(String(255))
    
    # Pre-conversion (LLC)
    membership_interest_percent: Mapped[Decimal] = mapped_column(Numeric(5, 4))
    # 50.0000%
    membership_capital_account: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    
    # Post-conversion (C-Corp)
    common_shares_issued: Mapped[int] = mapped_column(Integer)
    ownership_percent: Mapped[Decimal] = mapped_column(Numeric(5, 4))
    fair_value_per_share: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4))
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_equity_conversions_entity", "entity_conversion_id"),
    )


# ============================================================================
# CONSOLIDATION & INTERCOMPANY
# ============================================================================

class IntercompanyTransaction(Base):
    """
    Track intercompany transactions for elimination
    NGI Capital Inc. ↔ NGI Capital Advisory LLC
    """
    __tablename__ = "intercompany_transactions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    
    # Transaction identification
    from_entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    to_entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    
    # Journal entries
    from_journal_entry_id: Mapped[int] = mapped_column(Integer, ForeignKey("journal_entries.id"))
    to_journal_entry_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("journal_entries.id")
    )
    
    # Transaction details
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    transaction_type: Mapped[Optional[str]] = mapped_column(String(100))
    # Management Fee, Service Fee, Reimbursement, Loan
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Reconciliation
    is_matched: Mapped[bool] = mapped_column(Boolean, default=False)
    matched_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    matched_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    
    # Elimination
    is_eliminated: Mapped[bool] = mapped_column(Boolean, default=False)
    elimination_entry_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("journal_entries.id")
    )
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_ic_from", "from_entity_id"),
        Index("idx_ic_to", "to_entity_id"),
        Index("idx_ic_matched", "is_matched"),
    )


class ConsolidatedFinancialStatement(Base):
    """
    Cached consolidated financial statements
    Parent (NGI Capital Inc.) + Subsidiary (NGI Capital Advisory LLC)
    """
    __tablename__ = "consolidated_financial_statements"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    
    # Period
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    fiscal_period: Mapped[int] = mapped_column(Integer, nullable=False)
    period_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # monthly, quarterly, annual
    as_of_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Entities included
    parent_entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    subsidiary_entity_ids: Mapped[Optional[str]] = mapped_column(Text)  # Store as comma-separated IDs for SQLite compatibility
    
    # Statement data (cached for performance)
    balance_sheet_data: Mapped[Optional[dict]] = mapped_column(JSON)
    income_statement_data: Mapped[Optional[dict]] = mapped_column(JSON)
    cash_flow_data: Mapped[Optional[dict]] = mapped_column(JSON)
    equity_statement_data: Mapped[Optional[dict]] = mapped_column(JSON)
    
    # Elimination entries
    elimination_entries_json: Mapped[Optional[dict]] = mapped_column(JSON)
    total_eliminations: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    
    # Status
    status: Mapped[str] = mapped_column(String(50), default="draft")
    # draft, approved, final
    
    # Approval
    generated_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("partners.id"))
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    approved_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"))
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_consol_period", "fiscal_year", "fiscal_period"),
        Index("idx_consol_status", "status"),
        UniqueConstraint("fiscal_year", "fiscal_period", "period_type"),
    )


# ============================================================================
# TRIAL BALANCE & FINANCIAL STATEMENTS CACHE
# ============================================================================

class TrialBalance(Base):
    """
    Trial balance snapshots for period-end
    Unadjusted, Adjustments, Adjusted
    """
    __tablename__ = "trial_balances"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    period_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("accounting_periods.id"))
    
    as_of_date: Mapped[date] = mapped_column(Date, nullable=False)
    trial_balance_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # unadjusted, adjusted
    
    # Trial balance data (JSON for performance)
    trial_balance_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    
    # Totals verification
    total_debits: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    total_credits: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    is_balanced: Mapped[bool] = mapped_column(Boolean)
    
    generated_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("partners.id"))
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_tb_entity", "entity_id"),
        Index("idx_tb_date", "as_of_date"),
    )


class FinancialStatementCache(Base):
    """
    Generated financial statements cache
    Performance optimization for repeated access
    """
    __tablename__ = "financial_statement_cache"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    period_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_periods.id"))
    
    statement_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # balance_sheet, income_statement, cash_flow, equity, comprehensive_income, notes
    statement_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    
    is_consolidated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("partners.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_fs_cache_entity_period", "entity_id", "period_id"),
        Index("idx_fs_cache_type", "statement_type"),
        UniqueConstraint("entity_id", "period_id", "statement_type", "is_consolidated"),
    )

