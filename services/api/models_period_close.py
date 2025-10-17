"""
Period Close Models
Comprehensive period close tracking and workflow management
"""

from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey, Text, JSON, Numeric
from sqlalchemy.orm import relationship
from services.api.database import Base
from services.api.utils.datetime_utils import get_pst_now


class PeriodClose(Base):
    """Period close tracking and management"""
    __tablename__ = "period_closes"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("accounting_entities.id"), nullable=False)
    
    # Period information
    period_type = Column(String(50), nullable=False)  # month, quarter, year
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    fiscal_year = Column(Integer, nullable=False)
    fiscal_period = Column(String(50))  # Q1, Q2, Q3, Q4, or Month name
    
    # Status and workflow
    status = Column(String(50), default="draft")  # draft, in_progress, review, closed, reopened
    checklist_status = Column(JSON, nullable=True)  # Store checklist item statuses
    
    # Financial summary (snapshot at close)
    total_assets = Column(Numeric(15, 2), default=0)
    total_liabilities = Column(Numeric(15, 2), default=0)
    total_equity = Column(Numeric(15, 2), default=0)
    period_revenue = Column(Numeric(15, 2), default=0)
    period_expenses = Column(Numeric(15, 2), default=0)
    net_income = Column(Numeric(15, 2), default=0)
    
    # Trial balance
    trial_balance_debits = Column(Numeric(15, 2), default=0)
    trial_balance_credits = Column(Numeric(15, 2), default=0)
    is_balanced = Column(Boolean, default=False)
    
    # Checklist completion
    documents_complete = Column(Boolean, default=False)
    reconciliation_complete = Column(Boolean, default=False)
    journal_entries_complete = Column(Boolean, default=False)
    depreciation_complete = Column(Boolean, default=False)
    adjusting_entries_complete = Column(Boolean, default=False)
    trial_balance_complete = Column(Boolean, default=False)
    statements_complete = Column(Boolean, default=False)
    
    # Financial statements (stored as JSON)
    financial_statements = Column(JSON, nullable=True)
    
    # Workflow tracking
    initiated_by_email = Column(String(255))
    initiated_at = Column(DateTime, default=get_pst_now)
    reviewed_by_email = Column(String(255))
    reviewed_at = Column(DateTime)
    closed_by_email = Column(String(255))
    closed_at = Column(DateTime)
    
    # Reopening tracking
    reopened_by_email = Column(String(255))
    reopened_at = Column(DateTime)
    reopen_reason = Column(Text)
    
    # Notes and documentation
    close_notes = Column(Text)
    issues_encountered = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=get_pst_now)
    updated_at = Column(DateTime, default=get_pst_now, onupdate=get_pst_now)
    
    # Relationships
    entity = relationship("AccountingEntity")


class ClosingEntry(Base):
    """Closing journal entries (year-end only)"""
    __tablename__ = "closing_entries"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    period_close_id = Column(Integer, ForeignKey("period_closes.id"), nullable=False)
    entity_id = Column(Integer, ForeignKey("accounting_entities.id"), nullable=False)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    
    # Closing entry details
    entry_type = Column(String(50), nullable=False)  # Close Revenue, Close Expenses, Close Income Summary, Close Dividends
    description = Column(Text)
    total_amount = Column(Numeric(15, 2), nullable=False)
    
    # Status
    status = Column(String(50), default="draft")
    posted_at = Column(DateTime)
    
    created_at = Column(DateTime, default=get_pst_now)
    
    # Relationships
    period_close = relationship("PeriodClose")
    entity = relationship("AccountingEntity")


class PeriodLock(Base):
    """Lock periods to prevent changes after close"""
    __tablename__ = "period_locks"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("accounting_entities.id"), nullable=False)
    period_close_id = Column(Integer, ForeignKey("period_closes.id"), nullable=True)
    
    # Lock details
    lock_start_date = Column(Date, nullable=False)
    lock_end_date = Column(Date, nullable=False)
    is_locked = Column(Boolean, default=True)
    lock_reason = Column(Text)
    
    # Override capability (requires approval)
    can_override = Column(Boolean, default=False)
    override_approved_by = Column(String(255))
    override_approved_at = Column(DateTime)
    
    # Workflow
    locked_by_email = Column(String(255))
    locked_at = Column(DateTime, default=get_pst_now)
    unlocked_by_email = Column(String(255))
    unlocked_at = Column(DateTime)
    
    created_at = Column(DateTime, default=get_pst_now)
    
    # Relationships
    entity = relationship("AccountingEntity")
    period_close = relationship("PeriodClose")


class AdjustingEntry(Base):
    """Track adjusting entries for period close"""
    __tablename__ = "adjusting_entries"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("accounting_entities.id"), nullable=False)
    period_close_id = Column(Integer, ForeignKey("period_closes.id"), nullable=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    
    # Adjusting entry details
    adjustment_type = Column(String(50), nullable=False)  # Accrual, Prepayment, Reclassification, Correction
    description = Column(Text, nullable=False)
    reason = Column(Text)
    total_amount = Column(Numeric(15, 2), nullable=False)
    
    # Status
    status = Column(String(50), default="draft")
    approved_by_email = Column(String(255))
    approved_at = Column(DateTime)
    posted_at = Column(DateTime)
    
    created_at = Column(DateTime, default=get_pst_now)
    
    # Relationships
    entity = relationship("AccountingEntity")
    period_close = relationship("PeriodClose")

