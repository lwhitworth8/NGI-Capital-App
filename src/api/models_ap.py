"""
NGI Capital - Accounts Payable Models
Vendor and Bill management

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


class Vendor(Base):
    """
    Vendor master data for accounts payable
    """
    __tablename__ = "vendors"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    
    # Vendor details
    vendor_number: Mapped[Optional[str]] = mapped_column(String(50), unique=True)
    vendor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    vendor_type: Mapped[Optional[str]] = mapped_column(String(50))
    # Service Provider, Supplier, Contractor, Software/SaaS, Professional Services
    
    # Contact information
    email: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    website: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Address
    address_line1: Mapped[Optional[str]] = mapped_column(String(255))
    address_line2: Mapped[Optional[str]] = mapped_column(String(255))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    state: Mapped[Optional[str]] = mapped_column(String(2))
    zip_code: Mapped[Optional[str]] = mapped_column(String(20))
    country: Mapped[str] = mapped_column(String(2), default="US")
    
    # Payment details
    payment_terms: Mapped[str] = mapped_column(String(50), default="Net 30")
    # Net 15, Net 30, Net 60, Due on Receipt
    autopay_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    # Most bills are autopay per plan requirements
    default_payment_method: Mapped[Optional[str]] = mapped_column(String(50))
    # ACH, Credit Card, Wire
    
    # Tax information
    tax_id: Mapped[Optional[str]] = mapped_column(String(50))
    is_1099_vendor: Mapped[bool] = mapped_column(Boolean, default=False)
    # True if vendor requires 1099 reporting
    
    # Default expense account (for auto-categorization)
    default_expense_account_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("chart_of_accounts.id")
    )
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Metadata
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now, onupdate=get_pst_now)
    
    # Relationships
    bills: Mapped[List["VendorBill"]] = relationship(
        back_populates="vendor", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        Index("idx_vendor_entity", "entity_id"),
        Index("idx_vendor_name", "vendor_name"),
        Index("idx_vendor_number", "vendor_number"),
    )


class VendorBill(Base):
    """
    Vendor bills (accounts payable)
    """
    __tablename__ = "vendor_bills"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounting_entities.id"))
    vendor_id: Mapped[int] = mapped_column(Integer, ForeignKey("vendors.id"))
    
    # Bill identification
    bill_number: Mapped[str] = mapped_column(String(50), nullable=False)
    # Vendor's invoice number
    internal_bill_number: Mapped[Optional[str]] = mapped_column(String(50), unique=True)
    # Our internal tracking number
    
    bill_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Payment terms
    payment_terms: Mapped[str] = mapped_column(String(50), default="Net 30")
    
    # Amounts
    subtotal: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    
    # Status
    status: Mapped[str] = mapped_column(String(50), default="draft")
    # draft, approved, paid, cancelled
    
    # Payment tracking
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    amount_due: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    paid_date: Mapped[Optional[date]] = mapped_column(Date)
    payment_method: Mapped[Optional[str]] = mapped_column(String(50))
    # ACH, Credit Card, Wire, Check
    payment_reference: Mapped[Optional[str]] = mapped_column(String(100))
    # Transaction ID, check number, etc.
    
    # Document link
    document_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("accounting_documents.id")
    )
    
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
    vendor: Mapped["Vendor"] = relationship(back_populates="bills")
    lines: Mapped[List["VendorBillLine"]] = relationship(
        back_populates="bill", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        Index("idx_bill_entity", "entity_id"),
        Index("idx_bill_vendor", "vendor_id"),
        Index("idx_bill_number", "bill_number"),
        Index("idx_bill_status", "status"),
        Index("idx_bill_date", "bill_date"),
    )


class VendorBillLine(Base):
    """
    Bill line items - individual expenses
    """
    __tablename__ = "vendor_bill_lines"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bill_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("vendor_bills.id", ondelete="CASCADE")
    )
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Line details
    description: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("1.00"))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    
    # Expense account (GL account for expense recognition)
    expense_account_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("chart_of_accounts.id")
    )
    
    # Project/dimension tracking
    project_id: Mapped[Optional[int]] = mapped_column(Integer)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_pst_now)
    
    # Relationships
    bill: Mapped["VendorBill"] = relationship(back_populates="lines")
    
    __table_args__ = (
        Index("idx_bill_line_bill", "bill_id"),
        UniqueConstraint("bill_id", "line_number"),
    )


class VendorBillPayment(Base):
    """
    Track payments made for vendor bills
    """
    __tablename__ = "vendor_bill_payments"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bill_id: Mapped[int] = mapped_column(Integer, ForeignKey("vendor_bills.id"))
    
    # Payment details
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50))
    # ACH, Credit Card, Wire, Check
    
    # Payment reference
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
        Index("idx_bill_payment_bill", "bill_id"),
        Index("idx_bill_payment_date", "payment_date"),
    )

