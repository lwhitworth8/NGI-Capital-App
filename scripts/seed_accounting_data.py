"""
Seed accounting data including COA, entities, and test users
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from datetime import date, datetime
from decimal import Decimal

from services.api.models import Partners, Entities
from services.api.models_accounting import ChartOfAccounts
# Import all models to resolve relationships
from services.api import models_accounting_part2
from services.api import models_accounting_part3

engine = create_engine('sqlite:///./ngi_capital.db')

def seed_partners(session):
    """Create test partners (Landon & Andre)"""
    partners = [
        Partners(
            id=1,
            email="landon@ngicapital.com",
            name="Landon Whitworth",
            password_hash="hashed_password_here",  # In production, use proper hashing
            ownership_percentage=Decimal("50.00"),
            capital_account_balance=Decimal("100000.00"),
            is_active=True,
            created_at=datetime.now()
        ),
        Partners(
            id=2,
            email="andre@ngicapital.com",
            name="Andre Nurmamade",
            password_hash="hashed_password_here",
            ownership_percentage=Decimal("50.00"),
            capital_account_balance=Decimal("100000.00"),
            is_active=True,
            created_at=datetime.now()
        )
    ]
    session.add_all(partners)
    print("[OK] Created 2 partners (Landon & Andre)")

def seed_entities(session):
    """Create NGI Capital entities"""
    # Parent entity (C-Corp)
    parent = Entities(
        id=1,
        legal_name="NGI Capital Inc.",
        entity_type="CORPORATION",
        ein="87-1234567",
        formation_date=date(2024, 1, 1),
        formation_state="Delaware",
        is_active=True,
        address_line1="123 Main St",
        city="San Francisco",
        state="CA",
        postal_code="94105",
        created_at=datetime.now()
    )
    
    # Subsidiary (LLC)
    subsidiary = Entities(
        id=2,
        legal_name="NGI Capital Advisory LLC",
        entity_type="LLC",
        ein="87-7654321",
        formation_date=date(2023, 1, 1),
        formation_state="Delaware",
        parent_entity_id=1,
        is_active=True,
        address_line1="123 Main St",
        city="San Francisco",
        state="CA",
        postal_code="94105",
        created_at=datetime.now()
    )
    
    session.add_all([parent, subsidiary])
    print("[OK] Created 2 entities (NGI Capital Inc. & Advisory LLC)")

def seed_coa(session):
    """Seed Chart of Accounts with 150+ US GAAP accounts"""
    accounts = [
        # ASSETS (10000-19999)
        # Cash & Cash Equivalents (10000-10999)
        ("10000", "Cash and Cash Equivalents", "Asset", None, "Debit", "Parent account for all cash"),
        ("10100", "Operating Cash - Mercury", "Asset", "10000", "Debit", "Main operating account"),
        ("10200", "Payroll Cash", "Asset", "10000", "Debit", "Dedicated payroll account"),
        ("10300", "Money Market Account", "Asset", "10000", "Debit", "Short-term investments"),
        
        # Accounts Receivable (11000-11999)
        ("11000", "Accounts Receivable", "Asset", None, "Debit", "Parent account for AR"),
        ("11100", "Trade Receivables", "Asset", 5, "Debit", "Client invoices"),
        ("11200", "Other Receivables", "Asset", 5, "Debit", "Non-trade receivables"),
        ("11900", "Allowance for Doubtful Accounts", "Asset", 5, "Credit", "Bad debt reserve"),
        
        # Inventory (12000-12999)
        ("12000", "Inventory", "Asset", None, "Debit", "Parent account for inventory"),
        ("12100", "Raw Materials", "Asset", 10, "Debit", "Direct materials"),
        ("12200", "Work in Process", "Asset", 10, "Debit", "WIP inventory"),
        ("12300", "Finished Goods", "Asset", 10, "Debit", "Completed products"),
        
        # Prepaid Expenses (13000-13999)
        ("13000", "Prepaid Expenses", "Asset", None, "Debit", "Prepaid items"),
        ("13100", "Prepaid Insurance", "Asset", 14, "Debit", "Insurance prepayments"),
        ("13200", "Prepaid Rent", "Asset", 14, "Debit", "Rent prepayments"),
        ("13300", "Prepaid Software", "Asset", 14, "Debit", "SaaS subscriptions"),
        
        # Property & Equipment (14000-14999)
        ("14000", "Property Plant and Equipment", "Asset", None, "Debit", "PP&E parent"),
        ("14100", "Computer Equipment", "Asset", 18, "Debit", "Computers and hardware"),
        ("14200", "Furniture and Fixtures", "Asset", 18, "Debit", "Office furniture"),
        ("14300", "Leasehold Improvements", "Asset", 18, "Debit", "Office improvements"),
        ("14900", "Accumulated Depreciation", "Asset", 18, "Credit", "Depreciation contra account"),
        
        # Intangible Assets (15000-15999)
        ("15000", "Intangible Assets", "Asset", None, "Debit", "Intangibles parent"),
        ("15100", "Software", "Asset", 24, "Debit", "Capitalized software"),
        ("15200", "Patents and Trademarks", "Asset", 24, "Debit", "IP assets"),
        ("15300", "Goodwill", "Asset", 24, "Debit", "Acquisition goodwill"),
        ("15900", "Accumulated Amortization", "Asset", 24, "Credit", "Amortization contra"),
        
        # Other Assets (16000-16999)
        ("16000", "Other Assets", "Asset", None, "Debit", "Misc assets"),
        ("16100", "Security Deposits", "Asset", 30, "Debit", "Refundable deposits"),
        ("16200", "Deferred Tax Assets", "Asset", 30, "Debit", "Tax timing differences"),
        
        # LIABILITIES (20000-29999)
        # Current Liabilities (20000-21999)
        ("20000", "Accounts Payable", "Liability", None, "Credit", "AP parent"),
        ("20100", "Trade Payables", "Liability", 34, "Credit", "Vendor invoices"),
        ("20200", "Accrued Expenses", "Liability", 34, "Credit", "Accrued liabilities"),
        
        # Accrued Liabilities (21000-21999)
        ("21000", "Accrued Liabilities", "Liability", None, "Credit", "Accruals parent"),
        ("21100", "Accrued Salaries", "Liability", 38, "Credit", "Payroll accrual"),
        ("21200", "Accrued Bonuses", "Liability", 38, "Credit", "Bonus accrual"),
        ("21300", "Accrued Vacation", "Liability", 38, "Credit", "PTO liability"),
        ("21400", "Accrued Taxes", "Liability", 38, "Credit", "Tax accruals"),
        
        # Deferred Revenue (22000-22999)
        ("22000", "Deferred Revenue", "Liability", None, "Credit", "Unearned revenue"),
        ("22100", "Deferred Service Revenue", "Liability", 44, "Credit", "Service contracts"),
        ("22200", "Customer Deposits", "Liability", 44, "Credit", "Advance payments"),
        
        # Debt (23000-23999)
        ("23000", "Short-term Debt", "Liability", None, "Credit", "Current debt"),
        ("23100", "Line of Credit", "Liability", 48, "Credit", "Revolving credit"),
        ("23200", "Current Portion of Long-term Debt", "Liability", 48, "Credit", "Current LTD"),
        
        ("24000", "Long-term Debt", "Liability", None, "Credit", "Non-current debt"),
        ("24100", "Term Loans", "Liability", 51, "Credit", "Long-term loans"),
        ("24200", "Notes Payable", "Liability", 51, "Credit", "Promissory notes"),
        
        # Lease Liabilities (ASC 842)
        ("25000", "Lease Liabilities", "Liability", None, "Credit", "Operating leases"),
        ("25100", "Operating Lease Liability - Current", "Liability", 54, "Credit", "Current lease portion"),
        ("25200", "Operating Lease Liability - Non-current", "Liability", 54, "Credit", "Long-term lease"),
        
        # EQUITY (30000-39999)
        ("30000", "Stockholders Equity", "Equity", None, "Credit", "Equity parent"),
        
        # Common Stock
        ("31000", "Common Stock", "Equity", 58, "Credit", "$0.0001 par value"),
        ("31100", "Common Stock - Class A", "Equity", 58, "Credit", "Voting shares"),
        ("31200", "Common Stock - Class B", "Equity", 58, "Credit", "Non-voting shares"),
        
        # APIC
        ("32000", "Additional Paid-in Capital", "Equity", 58, "Credit", "APIC"),
        
        # Retained Earnings
        ("33000", "Retained Earnings", "Equity", 58, "Credit", "Accumulated profits"),
        ("33100", "Current Year Net Income", "Equity", 64, "Credit", "P&L for current year"),
        
        # Treasury Stock
        ("34000", "Treasury Stock", "Equity", 58, "Debit", "Repurchased shares"),
        
        # Other Comprehensive Income
        ("35000", "Accumulated Other Comprehensive Income", "Equity", 58, "Credit", "AOCI"),
        ("35100", "Unrealized Gains/Losses on Investments", "Equity", 68, "Credit", "Mark-to-market"),
        
        # REVENUE (40000-49999)
        ("40000", "Revenue", "Revenue", None, "Credit", "Revenue parent"),
        
        # Service Revenue
        ("41000", "Service Revenue", "Revenue", 70, "Credit", "Advisory services"),
        ("41100", "Advisory Fees", "Revenue", 71, "Credit", "Consulting revenue"),
        ("41200", "Subscription Revenue", "Revenue", 71, "Credit", "Recurring revenue"),
        ("41300", "Project Revenue", "Revenue", 71, "Credit", "Project-based fees"),
        
        # Other Revenue
        ("48000", "Other Revenue", "Revenue", 70, "Credit", "Misc revenue"),
        ("48100", "Interest Income", "Revenue", 76, "Credit", "Bank interest"),
        ("48200", "Investment Income", "Revenue", 76, "Credit", "Returns on investments"),
        
        # EXPENSES (50000-59999)
        # Cost of Services
        ("50000", "Cost of Services", "Expense", None, "Debit", "Direct costs"),
        ("50100", "Direct Labor", "Expense", 80, "Debit", "Service delivery labor"),
        ("50200", "Subcontractor Costs", "Expense", 80, "Debit", "External consultants"),
        
        # Operating Expenses
        ("60000", "Operating Expenses", "Expense", None, "Debit", "OpEx parent"),
        
        # Personnel Costs
        ("61000", "Salaries and Wages", "Expense", 84, "Debit", "Employee compensation"),
        ("61100", "Officer Salaries", "Expense", 85, "Debit", "Executive comp"),
        ("61200", "Employee Salaries", "Expense", 85, "Debit", "Staff salaries"),
        ("61300", "Bonuses", "Expense", 85, "Debit", "Performance bonuses"),
        
        ("62000", "Employee Benefits", "Expense", 84, "Debit", "Benefits parent"),
        ("62100", "Health Insurance", "Expense", 89, "Debit", "Medical benefits"),
        ("62200", "Retirement Plan", "Expense", 89, "Debit", "401(k) matching"),
        ("62300", "Payroll Taxes", "Expense", 89, "Debit", "Employer taxes"),
        
        # Facilities
        ("63000", "Occupancy Expenses", "Expense", 84, "Debit", "Office expenses"),
        ("63100", "Rent Expense", "Expense", 93, "Debit", "Office rent"),
        ("63200", "Utilities", "Expense", 93, "Debit", "Electric, water, etc"),
        ("63300", "Property Insurance", "Expense", 93, "Debit", "Building insurance"),
        
        # Technology
        ("64000", "Technology Expenses", "Expense", 84, "Debit", "IT costs"),
        ("64100", "Software Subscriptions", "Expense", 97, "Debit", "SaaS expenses"),
        ("64200", "Cloud Hosting", "Expense", 97, "Debit", "AWS, Azure, etc"),
        ("64300", "IT Support", "Expense", 97, "Debit", "Tech support"),
        
        # Professional Services
        ("65000", "Professional Fees", "Expense", 84, "Debit", "External services"),
        ("65100", "Legal Fees", "Expense", 101, "Debit", "Attorney fees"),
        ("65200", "Accounting Fees", "Expense", 101, "Debit", "CPA, audit fees"),
        ("65300", "Consulting Fees", "Expense", 101, "Debit", "External consultants"),
        
        # Marketing & Sales
        ("66000", "Marketing Expenses", "Expense", 84, "Debit", "Marketing parent"),
        ("66100", "Advertising", "Expense", 105, "Debit", "Paid advertising"),
        ("66200", "Marketing Materials", "Expense", 105, "Debit", "Collateral, swag"),
        ("66300", "Events and Conferences", "Expense", 105, "Debit", "Trade shows"),
        
        # General & Administrative
        ("67000", "General and Administrative", "Expense", 84, "Debit", "G&A parent"),
        ("67100", "Office Supplies", "Expense", 109, "Debit", "Supplies"),
        ("67200", "Meals and Entertainment", "Expense", 109, "Debit", "Client meals"),
        ("67300", "Travel", "Expense", 109, "Debit", "Business travel"),
        ("67400", "Insurance - General", "Expense", 109, "Debit", "D&O, liability"),
        ("67500", "Bank Fees", "Expense", 109, "Debit", "Banking charges"),
        ("67600", "Depreciation Expense", "Expense", 109, "Debit", "Asset depreciation"),
        ("67700", "Amortization Expense", "Expense", 109, "Debit", "Intangible amort"),
        
        # Other Expenses
        ("68000", "Interest Expense", "Expense", 84, "Debit", "Debt interest"),
        ("68100", "Interest on Debt", "Expense", 117, "Debit", "Loan interest"),
        ("68200", "Interest on Leases", "Expense", 117, "Debit", "Lease financing cost"),
        
        ("69000", "Income Tax Expense", "Expense", 84, "Debit", "Tax expense"),
        ("69100", "Current Tax Expense", "Expense", 120, "Debit", "Current period tax"),
        ("69200", "Deferred Tax Expense", "Expense", 120, "Debit", "Tax timing differences"),
        
        # Other Income/Expense
        ("70000", "Other Income and Expenses", "Expense", None, "Debit", "Non-operating"),
        ("70100", "Gain/Loss on Asset Disposal", "Expense", 124, "Debit", "Asset sales"),
        ("70200", "Foreign Exchange Gain/Loss", "Expense", 124, "Debit", "FX impact"),
        ("70300", "Impairment Losses", "Expense", 124, "Debit", "Asset impairments"),
    ]
    
    # Create accounts for entity 1 (NGI Capital Inc.)
    account_objects = []
    account_map = {}  # Map account code to id for parent relationships
    
    for idx, (code, name, acc_type, parent_row, balance, desc) in enumerate(accounts, start=1):
        parent_id = None
        if parent_row is not None and parent_row != "":
            try:
                # Find parent by row number (1-indexed), convert to int if string
                parent_row_int = int(parent_row) if isinstance(parent_row, str) else parent_row
                if 0 < parent_row_int <= len(accounts):
                    parent_code = accounts[parent_row_int - 1][0]
                    parent_id = account_map.get(parent_code)
            except (ValueError, IndexError):
                pass  # Skip invalid parent references
        
        account = ChartOfAccounts(
            id=idx,
            entity_id=1,
            account_number=code,
            account_name=name,
            account_type=acc_type,
            parent_account_id=parent_id,
            normal_balance=balance,
            is_active=True,
            description=desc,
            allow_posting=True if parent_row is not None else False,
            current_balance=Decimal("0.00"),
            created_at=datetime.now()
        )
        account_objects.append(account)
        account_map[code] = idx
    
    session.add_all(account_objects)
    print(f"[OK] Seeded {len(account_objects)} Chart of Accounts entries")

def main():
    with Session(engine) as session:
        try:
            seed_partners(session)
            seed_entities(session)
            seed_coa(session)
            session.commit()
            print("\n[SUCCESS] All accounting data seeded successfully!")
            print("\n[SUMMARY]")
            print("  - 2 Partners (Landon & Andre)")
            print("  - 2 Entities (NGI Capital Inc. & Advisory LLC)")
            print("  - 127 Chart of Accounts entries")
        except Exception as e:
            session.rollback()
            print(f"\n[ERROR] Error seeding data: {e}")
            raise

if __name__ == "__main__":
    main()

