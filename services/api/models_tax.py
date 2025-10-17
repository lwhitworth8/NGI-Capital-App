"""
Tax Compliance Models
Full Federal and State Tax Compliance (ASC 740, IRC)
"""

from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from services.api.database import Base
from services.api.utils.datetime_utils import get_pst_now


class TaxPayment(Base):
    """
    Tax Payment Record
    Tracks all tax payments for federal, state, payroll, and sales taxes
    """
    __tablename__ = "tax_payments"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("accounting_entities.id"), nullable=False, index=True)
    
    # Tax payment identification
    payment_number = Column(String(50), unique=True, nullable=False)
    tax_type = Column(String(50), nullable=False, index=True)  # Federal Income Tax, State Income Tax, Form 941, FUTA, SUTA, Sales Tax
    tax_period = Column(String(50), nullable=False)  # Q1 2025, 2025, etc.
    tax_year = Column(Integer, index=True)
    
    # Payment details
    payment_date = Column(Date, nullable=False, index=True)
    amount_paid = Column(Numeric(15, 2), nullable=False)
    payment_method = Column(String(50))  # EFTPS, IRS Direct Pay, State Portal, Online, Check
    confirmation_number = Column(String(100))
    
    # Tax calculation details
    taxable_income = Column(Numeric(15, 2))
    tax_rate = Column(Numeric(5, 4))  # e.g., 0.2100 for 21%
    
    # Links
    document_id = Column(Integer, ForeignKey("accounting_documents.id"))
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"))
    
    # Status
    status = Column(String(50), default="pending")  # pending, paid, confirmed
    is_estimated_payment = Column(Boolean, default=False)
    
    # Metadata
    notes = Column(Text)
    created_at = Column(DateTime, default=get_pst_now, index=True)
    updated_at = Column(DateTime, default=get_pst_now, onupdate=get_pst_now)
    created_by_email = Column(String(255))


class TaxProvision(Base):
    """
    Income Tax Provision (ASC 740)
    Calculates current and deferred tax for financial reporting
    """
    __tablename__ = "tax_provisions"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("accounting_entities.id"), nullable=False, index=True)
    
    # Period
    provision_year = Column(Integer, nullable=False, index=True)
    provision_period = Column(String(50))  # Annual, Q1, Q2, Q3, Q4
    
    # Book income
    pretax_book_income = Column(Numeric(15, 2), nullable=False)
    
    # M-1 Reconciliation (Book-Tax Differences)
    m1_additions = Column(JSON)  # {"Meals & Entertainment 50%": 5000, "Penalties": 1000}
    m1_subtractions = Column(JSON)  # {"Municipal Bond Interest": 2000}
    total_m1_additions = Column(Numeric(15, 2), default=0)
    total_m1_subtractions = Column(Numeric(15, 2), default=0)
    
    # Taxable income
    taxable_income = Column(Numeric(15, 2), nullable=False)
    
    # Current tax expense
    federal_taxable_income = Column(Numeric(15, 2))
    state_taxable_income = Column(Numeric(15, 2))
    federal_tax_rate = Column(Numeric(5, 4), default=0.2100)  # 21% for C-Corp
    state_tax_rate = Column(Numeric(5, 4), default=0.0884)  # 8.84% for California
    
    current_federal_tax = Column(Numeric(15, 2), default=0)
    current_state_tax = Column(Numeric(15, 2), default=0)
    total_current_tax = Column(Numeric(15, 2), default=0)
    
    # Deferred tax
    temporary_differences = Column(JSON)  # {"Depreciation": {"book": 10000, "tax": 15000, "difference": -5000}}
    deferred_tax_asset = Column(Numeric(15, 2), default=0)
    deferred_tax_liability = Column(Numeric(15, 2), default=0)
    net_deferred_tax = Column(Numeric(15, 2), default=0)
    
    # Total provision
    total_tax_provision = Column(Numeric(15, 2), nullable=False)
    effective_tax_rate = Column(Numeric(5, 4))  # Total provision / pretax income
    
    # Links
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"))
    
    # Status
    status = Column(String(50), default="draft")  # draft, calculated, posted
    calculation_date = Column(DateTime, default=get_pst_now)
    
    # Metadata
    notes = Column(Text)
    created_at = Column(DateTime, default=get_pst_now, index=True)
    updated_at = Column(DateTime, default=get_pst_now, onupdate=get_pst_now)
    created_by_email = Column(String(255))


class TaxReturn(Base):
    """
    Tax Return Filing Record
    Tracks filed tax returns and extensions
    """
    __tablename__ = "tax_returns"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("accounting_entities.id"), nullable=False, index=True)
    
    # Return identification
    return_type = Column(String(50), nullable=False)  # Form 1120, 1120S, 1065, 1040, 100 (CA), 568 (CA LLC)
    tax_year = Column(Integer, nullable=False, index=True)
    filing_period = Column(String(50))  # Annual, Q1, Q2, Q3, Q4 for quarterly returns
    
    # Filing details
    due_date = Column(Date, nullable=False)
    extension_filed = Column(Boolean, default=False)
    extended_due_date = Column(Date)
    filing_date = Column(Date)
    
    # Return summary
    taxable_income = Column(Numeric(15, 2))
    total_tax = Column(Numeric(15, 2))
    payments_and_credits = Column(Numeric(15, 2), default=0)
    refund_amount = Column(Numeric(15, 2), default=0)
    balance_due = Column(Numeric(15, 2), default=0)
    
    # Filing details
    filing_method = Column(String(50))  # E-file, Paper
    confirmation_number = Column(String(100))
    preparer_name = Column(String(255))
    preparer_ein = Column(String(50))
    
    # Document links
    return_document_id = Column(Integer, ForeignKey("accounting_documents.id"))  # PDF of filed return
    extension_document_id = Column(Integer, ForeignKey("accounting_documents.id"))  # Form 7004, etc.
    
    # Status
    status = Column(String(50), default="not_filed")  # not_filed, filed, accepted, amended
    
    # Metadata
    notes = Column(Text)
    created_at = Column(DateTime, default=get_pst_now, index=True)
    updated_at = Column(DateTime, default=get_pst_now, onupdate=get_pst_now)
    created_by_email = Column(String(255))


class TaxWithholding(Base):
    """
    Tax Withholding Record
    Tracks payroll tax withholdings (Federal, State, FICA, Medicare)
    """
    __tablename__ = "tax_withholdings"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("accounting_entities.id"), nullable=False, index=True)
    
    # Employee/payroll run link
    payroll_run_id = Column(Integer, ForeignKey("payroll_runs.id"), index=True)
    employee_email = Column(String(255), nullable=False, index=True)
    
    # Withholding period
    pay_date = Column(Date, nullable=False, index=True)
    pay_period_start = Column(Date)
    pay_period_end = Column(Date)
    
    # Gross wages
    gross_wages = Column(Numeric(15, 2), nullable=False)
    
    # Federal withholdings
    federal_income_tax = Column(Numeric(15, 2), default=0)
    social_security_employee = Column(Numeric(15, 2), default=0)
    medicare_employee = Column(Numeric(15, 2), default=0)
    additional_medicare = Column(Numeric(15, 2), default=0)  # 0.9% on wages > $200k
    
    # State withholdings
    state_income_tax = Column(Numeric(15, 2), default=0)
    sdi = Column(Numeric(15, 2), default=0)  # California SDI
    
    # Employer taxes (for tracking)
    social_security_employer = Column(Numeric(15, 2), default=0)
    medicare_employer = Column(Numeric(15, 2), default=0)
    futa = Column(Numeric(15, 2), default=0)  # Federal Unemployment
    suta = Column(Numeric(15, 2), default=0)  # State Unemployment (CA)
    ett = Column(Numeric(15, 2), default=0)  # Employment Training Tax (CA)
    
    # Totals
    total_employee_withholding = Column(Numeric(15, 2), default=0)
    total_employer_taxes = Column(Numeric(15, 2), default=0)
    net_pay = Column(Numeric(15, 2), nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=get_pst_now, index=True)
    updated_at = Column(DateTime, default=get_pst_now, onupdate=get_pst_now)


class TaxDeadline(Base):
    """
    Tax Deadline Tracker
    Tracks important tax filing and payment deadlines
    """
    __tablename__ = "tax_deadlines"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("accounting_entities.id"), nullable=False, index=True)
    
    # Deadline details
    deadline_name = Column(String(255), nullable=False)
    deadline_type = Column(String(50))  # Filing, Payment, Estimated Payment
    tax_form = Column(String(50))  # 1120, 941, etc.
    due_date = Column(Date, nullable=False, index=True)
    tax_year = Column(Integer, index=True)
    tax_period = Column(String(50))  # Annual, Q1, Q2, Q3, Q4
    
    # Status
    is_completed = Column(Boolean, default=False)
    completed_date = Column(Date)
    
    # Reminders
    reminder_sent = Column(Boolean, default=False)
    reminder_date = Column(Date)
    
    # Links
    tax_return_id = Column(Integer, ForeignKey("tax_returns.id"))
    tax_payment_id = Column(Integer, ForeignKey("tax_payments.id"))
    
    # Metadata
    notes = Column(Text)
    created_at = Column(DateTime, default=get_pst_now, index=True)
    updated_at = Column(DateTime, default=get_pst_now, onupdate=get_pst_now)

