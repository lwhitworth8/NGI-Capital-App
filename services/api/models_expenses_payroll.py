"""
Expenses & Payroll Models - Full Tax Compliance
Handles expense reports, timesheets, and payroll processing with Federal/State compliance
"""

from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from services.api.database import Base
from services.api.utils.datetime_utils import get_pst_now


class ExpenseReport(Base):
    """
    Expense Report with dual-approval workflow
    Partners submit expenses, other partner approves, then auto-reimburse
    """
    __tablename__ = "expense_reports"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("accounting_entities.id"), nullable=False, index=True)
    
    # Report identification
    report_number = Column(String(50), unique=True, nullable=False, index=True)
    report_date = Column(Date, nullable=False)
    period_start = Column(Date)
    period_end = Column(Date)
    
    # Employee/Partner
    employee_email = Column(String(255), nullable=False, index=True)
    employee_name = Column(String(255))
    
    # Amounts
    total_amount = Column(Numeric(15, 2), default=0)
    reimbursable_amount = Column(Numeric(15, 2), default=0)
    
    # Approval workflow
    status = Column(String(50), default="draft", index=True)  # draft, pending_approval, approved, reimbursed, rejected
    submitted_at = Column(DateTime)
    submitted_by_email = Column(String(255))
    
    approved_by_email = Column(String(255))
    approved_at = Column(DateTime)
    
    rejected_by_email = Column(String(255))
    rejected_at = Column(DateTime)
    rejection_reason = Column(Text)
    
    # Reimbursement
    reimbursement_method = Column(String(50))  # Direct Deposit, Check
    reimbursed_at = Column(DateTime)
    reimbursement_transaction_id = Column(String(100))  # Mercury ACH transaction ID
    
    # Bank info for direct deposit (encrypted in production)
    bank_account_last_four = Column(String(4))
    routing_number = Column(String(50))
    
    # Links
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"))
    
    # Notes
    memo = Column(Text)
    internal_notes = Column(Text)
    
    # Audit trail
    created_at = Column(DateTime, default=get_pst_now, nullable=False)
    updated_at = Column(DateTime, default=get_pst_now, onupdate=get_pst_now, nullable=False)
    
    # Relationships
    entity = relationship("AccountingEntity", backref="expense_reports")
    lines = relationship("ExpenseLine", back_populates="expense_report", cascade="all, delete-orphan")
    journal_entry = relationship("JournalEntry")
    
    def __repr__(self):
        return f"<ExpenseReport {self.report_number}: {self.employee_name}>"


class ExpenseLine(Base):
    """
    Individual expense line item
    Linked to uploaded receipt document
    """
    __tablename__ = "expense_lines"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    expense_report_id = Column(Integer, ForeignKey("expense_reports.id"), nullable=False, index=True)
    
    # Line details
    line_number = Column(Integer, nullable=False)
    expense_date = Column(Date, nullable=False)
    merchant = Column(String(255))
    category = Column(String(100))  # Meals, Travel, Office Supplies, Software, etc.
    description = Column(Text, nullable=False)
    
    # Amounts
    amount = Column(Numeric(15, 2), nullable=False)
    tax_amount = Column(Numeric(15, 2), default=0)
    
    # Tax deductibility
    is_tax_deductible = Column(Boolean, default=True)
    deductibility_percentage = Column(Numeric(5, 2), default=100)  # 50% for meals, 100% for most
    
    # Accounting
    expense_account_id = Column(Integer, ForeignKey("chart_of_accounts.id"))
    project_id = Column(Integer)  # For project tracking if needed
    
    # Document link
    receipt_document_id = Column(Integer, ForeignKey("accounting_documents.id"))
    
    # OCR metadata
    ocr_extracted = Column(Boolean, default=False)
    ocr_confidence = Column(Numeric(5, 2))
    
    created_at = Column(DateTime, default=get_pst_now, nullable=False)
    
    # Relationships
    expense_report = relationship("ExpenseReport", back_populates="lines")
    expense_account = relationship("ChartOfAccounts")
    receipt_document = relationship("AccountingDocument", foreign_keys=[receipt_document_id])
    
    def __repr__(self):
        return f"<ExpenseLine {self.line_number}: {self.merchant} ${self.amount}>"


class Timesheet(Base):
    """
    Weekly timesheet for partners
    Hours tracked per day with approval workflow
    """
    __tablename__ = "timesheets"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("accounting_entities.id"), nullable=False, index=True)
    
    # Timesheet identification
    timesheet_number = Column(String(50), unique=True, nullable=False)
    week_start_date = Column(Date, nullable=False, index=True)
    week_end_date = Column(Date, nullable=False)
    
    # Employee/Partner
    employee_email = Column(String(255), nullable=False, index=True)
    employee_name = Column(String(255))
    
    # Hours
    total_hours = Column(Numeric(10, 2), default=0)
    regular_hours = Column(Numeric(10, 2), default=0)
    overtime_hours = Column(Numeric(10, 2), default=0)
    
    # Status
    status = Column(String(50), default="draft", index=True)  # draft, submitted, approved, rejected, processed
    submitted_at = Column(DateTime)
    
    approved_by_email = Column(String(255))
    approved_at = Column(DateTime)
    
    rejected_by_email = Column(String(255))
    rejected_at = Column(DateTime)
    rejection_reason = Column(Text)
    
    # Payroll link
    payroll_run_id = Column(Integer, ForeignKey("payroll_runs.id"))
    processed_in_payroll = Column(Boolean, default=False)
    
    # Audit trail
    created_at = Column(DateTime, default=get_pst_now, nullable=False)
    updated_at = Column(DateTime, default=get_pst_now, onupdate=get_pst_now, nullable=False)
    
    # Relationships
    entity = relationship("AccountingEntity", backref="timesheets")
    entries = relationship("TimesheetEntry", back_populates="timesheet", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Timesheet {self.timesheet_number}: {self.employee_name} Week {self.week_start_date}>"


class TimesheetEntry(Base):
    """
    Daily timesheet entry
    Tracks hours per day with project/task allocation
    """
    __tablename__ = "timesheet_entries"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    timesheet_id = Column(Integer, ForeignKey("timesheets.id"), nullable=False, index=True)
    
    # Date and hours
    work_date = Column(Date, nullable=False)
    hours = Column(Numeric(10, 2), nullable=False)
    
    # Project/Task tracking
    project_name = Column(String(255))
    task_description = Column(Text)
    
    # Pay type
    pay_type = Column(String(50), default="Regular")  # Regular, Overtime, Holiday
    
    created_at = Column(DateTime, default=get_pst_now, nullable=False)
    
    # Relationships
    timesheet = relationship("Timesheet", back_populates="entries")
    
    def __repr__(self):
        return f"<TimesheetEntry {self.work_date}: {self.hours} hours>"


class PayrollRun(Base):
    """
    Payroll run for a pay period
    Full Federal and State tax compliance (2025 regulations)
    """
    __tablename__ = "payroll_runs"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("accounting_entities.id"), nullable=False, index=True)
    
    # Payroll identification
    payroll_run_number = Column(String(50), unique=True, nullable=False)
    pay_period_start = Column(Date, nullable=False, index=True)
    pay_period_end = Column(Date, nullable=False, index=True)
    pay_date = Column(Date, nullable=False)
    payroll_type = Column(String(50), default="Regular")  # Regular, Bonus, Adjustment
    
    # Totals
    total_gross_wages = Column(Numeric(15, 2), default=0)
    total_federal_withholding = Column(Numeric(15, 2), default=0)
    total_state_withholding = Column(Numeric(15, 2), default=0)
    total_fica_employee = Column(Numeric(15, 2), default=0)
    total_medicare_employee = Column(Numeric(15, 2), default=0)
    total_fica_employer = Column(Numeric(15, 2), default=0)
    total_medicare_employer = Column(Numeric(15, 2), default=0)
    total_futa = Column(Numeric(15, 2), default=0)
    total_suta = Column(Numeric(15, 2), default=0)
    total_ca_sdi = Column(Numeric(15, 2), default=0)  # CA State Disability Insurance
    total_ca_ett = Column(Numeric(15, 2), default=0)  # CA Employment Training Tax
    total_deductions = Column(Numeric(15, 2), default=0)
    total_net_pay = Column(Numeric(15, 2), default=0)
    
    # Status
    status = Column(String(50), default="draft", index=True)  # draft, approved, processed, completed
    
    approved_by_email = Column(String(255))
    approved_at = Column(DateTime)
    
    processed_at = Column(DateTime)
    processed_by_email = Column(String(255))
    
    # ACH batch
    ach_batch_id = Column(String(100))  # Mercury ACH batch ID
    ach_batch_status = Column(String(50))  # pending, processed, failed
    
    # Links
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"))
    
    # Tax filing tracking
    form_941_filed = Column(Boolean, default=False)  # Quarterly federal
    form_941_filed_date = Column(Date)
    
    # Audit trail
    created_at = Column(DateTime, default=get_pst_now, nullable=False)
    updated_at = Column(DateTime, default=get_pst_now, onupdate=get_pst_now, nullable=False)
    
    # Relationships
    entity = relationship("AccountingEntity", backref="payroll_runs")
    paystubs = relationship("Paystub", back_populates="payroll_run", cascade="all, delete-orphan")
    journal_entry = relationship("JournalEntry")
    
    def __repr__(self):
        return f"<PayrollRun {self.payroll_run_number}: {self.pay_period_start} to {self.pay_period_end}>"


class Paystub(Base):
    """
    Individual employee paystub
    Full breakdown of earnings, deductions, and taxes
    """
    __tablename__ = "paystubs"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    payroll_run_id = Column(Integer, ForeignKey("payroll_runs.id"), nullable=False, index=True)
    
    # Employee
    employee_email = Column(String(255), nullable=False, index=True)
    employee_name = Column(String(255))
    
    # Earnings
    gross_wages = Column(Numeric(15, 2), nullable=False)
    regular_wages = Column(Numeric(15, 2), default=0)
    overtime_wages = Column(Numeric(15, 2), default=0)
    bonus = Column(Numeric(15, 2), default=0)
    
    # Hours
    regular_hours = Column(Numeric(10, 2), default=0)
    overtime_hours = Column(Numeric(10, 2), default=0)
    
    # Federal taxes
    federal_withholding = Column(Numeric(15, 2), default=0)
    fica_employee = Column(Numeric(15, 2), default=0)  # Social Security 6.2%
    medicare_employee = Column(Numeric(15, 2), default=0)  # Medicare 1.45%
    additional_medicare = Column(Numeric(15, 2), default=0)  # 0.9% if over $200k
    
    # State taxes (California)
    state_withholding = Column(Numeric(15, 2), default=0)
    ca_sdi = Column(Numeric(15, 2), default=0)  # State Disability Insurance ~1%
    
    # Employer taxes (for accounting)
    fica_employer = Column(Numeric(15, 2), default=0)
    medicare_employer = Column(Numeric(15, 2), default=0)
    futa = Column(Numeric(15, 2), default=0)  # Federal Unemployment 0.6%
    suta = Column(Numeric(15, 2), default=0)  # State Unemployment ~3.4%
    ca_ett = Column(Numeric(15, 2), default=0)  # Employment Training Tax 0.1%
    
    # Total deductions and net pay
    total_deductions = Column(Numeric(15, 2), default=0)
    net_pay = Column(Numeric(15, 2), nullable=False)
    
    # Year-to-date totals
    ytd_gross = Column(Numeric(15, 2), default=0)
    ytd_federal_withholding = Column(Numeric(15, 2), default=0)
    ytd_fica = Column(Numeric(15, 2), default=0)
    ytd_medicare = Column(Numeric(15, 2), default=0)
    ytd_state_withholding = Column(Numeric(15, 2), default=0)
    ytd_net_pay = Column(Numeric(15, 2), default=0)
    
    # Direct deposit info
    payment_method = Column(String(50), default="Direct Deposit")
    bank_account_last_four = Column(String(4))
    direct_deposit_transaction_id = Column(String(100))
    
    # W-4 and tax configuration (stored as JSON)
    w4_configuration = Column(JSON)  # Filing status, allowances, additional withholding
    de4_configuration = Column(JSON)  # California state withholding
    
    # Links
    timesheet_ids = Column(JSON)  # List of timesheet IDs included in this paystub
    
    # Paystub generation
    paystub_pdf_path = Column(String(500))
    paystub_generated_at = Column(DateTime)
    
    created_at = Column(DateTime, default=get_pst_now, nullable=False)
    
    # Relationships
    payroll_run = relationship("PayrollRun", back_populates="paystubs")
    
    def __repr__(self):
        return f"<Paystub {self.employee_name}: ${self.net_pay}>"


class EmployeePayrollInfo(Base):
    """
    Employee payroll configuration and tax information
    Stores W-4, DE-4, direct deposit details
    """
    __tablename__ = "employee_payroll_info"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("accounting_entities.id"), nullable=False)
    
    # Employee identification
    employee_email = Column(String(255), unique=True, nullable=False, index=True)
    employee_name = Column(String(255), nullable=False)
    
    # Employment details
    job_title = Column(String(255))
    hire_date = Column(Date)
    employment_type = Column(String(50))  # Full-Time, Part-Time, Contractor
    
    # Compensation
    hourly_rate = Column(Numeric(15, 2))
    salary = Column(Numeric(15, 2))
    pay_frequency = Column(String(50))  # Weekly, Bi-Weekly, Monthly
    
    # Tax identification
    ssn_last_four = Column(String(4))  # Only store last 4 digits
    
    # W-4 Federal withholding (2025 form)
    w4_filing_status = Column(String(50))  # Single, Married Filing Jointly, Head of Household
    w4_multiple_jobs = Column(Boolean, default=False)
    w4_dependents_amount = Column(Numeric(15, 2), default=0)
    w4_other_income = Column(Numeric(15, 2), default=0)
    w4_deductions = Column(Numeric(15, 2), default=0)
    w4_extra_withholding = Column(Numeric(15, 2), default=0)
    
    # DE-4 California state withholding
    de4_filing_status = Column(String(50))
    de4_allowances = Column(Integer, default=0)
    de4_extra_withholding = Column(Numeric(15, 2), default=0)
    
    # Direct deposit (encrypted in production)
    bank_name = Column(String(255))
    bank_routing_number = Column(String(50))
    bank_account_number_encrypted = Column(String(500))  # Encrypted
    bank_account_last_four = Column(String(4))
    bank_account_type = Column(String(50))  # Checking, Savings
    
    # Benefits (for future)
    health_insurance_deduction = Column(Numeric(15, 2), default=0)
    retirement_contribution = Column(Numeric(15, 2), default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    termination_date = Column(Date)
    
    # Audit trail
    created_at = Column(DateTime, default=get_pst_now, nullable=False)
    updated_at = Column(DateTime, default=get_pst_now, onupdate=get_pst_now, nullable=False)
    
    def __repr__(self):
        return f"<EmployeePayrollInfo {self.employee_name}>"

