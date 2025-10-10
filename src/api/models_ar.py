"""
NGI Capital - Accounts Receivable Models
Customer and Invoice management per ASC 606

Author: NGI Capital Development Team
Date: October 10, 2025

All datetime fields use PST (Pacific Standard Time).
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String, Integer, Numeric, Boolean, Date, DateTime, Text,
    ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import JSON

from .models import Base
from .utils.datetime_utils import get_pst_now


class Customer(Base):
    """
    Customer master data for accounts receivable
    """
    __tablename__ = "customers"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    
    # Customer details
    customer_number: Mapped[Optional[str]] = mapped_column(String(50), unique=True)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_type: Mapped[Optional[str]] = mapped_column(String(50))
    # Individual, Corporation, LLC, Government, Non-Profit
    
    # Contact information
    email: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    website: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Billing information
    billing_address_line1: Mapped[Optional[str]] = mapped_column(String(255))
    billing_address_line2: Mapped[Optional[str]] = mapped_column(String(255))
    billing_city: Mapped[Optional[str]] = mapped_column(String(100))
    billing_state: Mapped[Optional[str]] = mapped_column(String(2))
    billing_zip: Mapped[Optional[str]] = mapped_column(String(20))
    billing_country: Mapped[str] = mapped_column(String(2), default="US")
    
    # Payment terms
    payment_terms: Mapped[str] = mapped_column(String(50), default="Net 30")
    # Net 15, Net 30, Net 60, Due on Receipt
    credit_limit: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    
    # Tax information
    tax_id: Mapped[Optional[str]] = mapped_column(String(50))
    tax_exempt: Mapped[bool] = mapped_column(Boolean, default=False)
    tax_exempt_certificate: Mapped[Optional[str]] = mapped_column(String(100))
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Metadata
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now, onupdate=get_pst_now)
    
    # Relationships
    invoices: Mapped[List["Invoice"]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        Index("idx_customer_entity", "entity_id"),
        Index("idx_customer_name", "customer_name"),
        Index("idx_customer_number", "customer_number"),
    )


class Invoice(Base):
    """
    Customer invoices per ASC 606 revenue recognition
    """
    __tablename__ = "invoices"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("customers.id"))
    
    # Invoice identification
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    invoice_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Payment terms
    payment_terms: Mapped[str] = mapped_column(String(50), default="Net 30")
    
    # Amounts (ASC 606 - transaction price)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    tax_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    
    # Revenue recognition (ASC 606)
    revenue_recognized: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    revenue_recognition_date: Mapped[Optional[date]] = mapped_column(Date)
    performance_obligation_satisfied: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Status
    status: Mapped[str] = mapped_column(String(50), default="draft")
    # draft, sent, viewed, partially_paid, paid, overdue, cancelled
    
    # Payment tracking
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    amount_due: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    paid_date: Mapped[Optional[date]] = mapped_column(Date)
    
    # Document
    pdf_file_path: Mapped[Optional[str]] = mapped_column(Text)
    pdf_generated_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Email tracking
    sent_to_email: Mapped[Optional[str]] = mapped_column(String(255))
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    viewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Journal entry link
    journal_entry_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("journal_entries.id")
    )
    
    # Metadata
    memo: Mapped[Optional[str]] = mapped_column(Text)
    internal_notes: Mapped[Optional[str]] = mapped_column(Text)
    created_by_email: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now, onupdate=get_pst_now)
    
    # Relationships
    customer: Mapped["Customer"] = relationship(back_populates="invoices")
    lines: Mapped[List["InvoiceLine"]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        Index("idx_invoice_entity", "entity_id"),
        Index("idx_invoice_customer", "customer_id"),
        Index("idx_invoice_number", "invoice_number"),
        Index("idx_invoice_status", "status"),
        Index("idx_invoice_date", "invoice_date"),
    )


class InvoiceLine(Base):
    """
    Invoice line items - individual goods or services per ASC 606
    """
    __tablename__ = "invoice_lines"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("invoices.id", ondelete="CASCADE")
    )
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Line details
    description: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("1.00"))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    
    # Revenue account (GL account for revenue recognition)
    revenue_account_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("chart_of_accounts.id")
    )
    
    # ASC 606 - Performance obligation tracking
    performance_obligation_description: Mapped[Optional[str]] = mapped_column(Text)
    performance_obligation_satisfied: Mapped[bool] = mapped_column(Boolean, default=False)
    satisfaction_date: Mapped[Optional[date]] = mapped_column(Date)
    
    # Project/dimension tracking
    project_id: Mapped[Optional[int]] = mapped_column(Integer)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now)
    
    # Relationships
    invoice: Mapped["Invoice"] = relationship(back_populates="lines")
    
    __table_args__ = (
        Index("idx_invoice_line_invoice", "invoice_id"),
        UniqueConstraint("invoice_id", "line_number"),
    )


class InvoicePayment(Base):
    """
    Track payments received for invoices
    """
    __tablename__ = "invoice_payments"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[int] = mapped_column(Integer, ForeignKey("invoices.id"))
    
    # Payment details
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50))
    # Bank Transfer, Wire, ACH, Check, Credit Card
    
    # Bank/reference info
    reference_number: Mapped[Optional[str]] = mapped_column(String(100))
    bank_transaction_id: Mapped[Optional[str]] = mapped_column(String(100))
    
    # Journal entry link
    journal_entry_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("journal_entries.id")
    )
    
    # Metadata
    notes: Mapped[Optional[str]] = mapped_column(Text)
    recorded_by_email: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now)
    
    __table_args__ = (
        Index("idx_payment_invoice", "invoice_id"),
        Index("idx_payment_date", "payment_date"),
    )

