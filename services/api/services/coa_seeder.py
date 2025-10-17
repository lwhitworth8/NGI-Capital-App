"""
NGI Capital - US GAAP Chart of Accounts Seeder
5-digit COA structure following public company standards
October 2025 GAAP-compliant

Author: NGI Capital Development Team
Date: October 3, 2025
"""

from decimal import Decimal
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


# US GAAP 5-Digit Chart of Accounts
# Structure: 1XXXX = Assets, 2XXXX = Liabilities, 3XXXX = Equity, 4XXXX = Revenue, 5XXXX = Expenses

US_GAAP_COA_TEMPLATE = [
    {"number": "10000", "name": "CURRENT ASSETS", "type": "Asset", "balance": "Debit", "posting": False, "parent": None, "gaap": "ASC 210"},
    {"number": "10100", "name": "Cash and Cash Equivalents", "type": "Asset", "balance": "Debit", "posting": False, "parent": "10000", "gaap": "ASC 230"},
    {"number": "10110", "name": "Cash - Operating Account", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10100", "gaap": "ASC 230"},
    {"number": "10300", "name": "Accounts Receivable", "type": "Asset", "balance": "Debit", "posting": False, "parent": "10000", "gaap": "ASC 606"},
    {"number": "10310", "name": "Accounts Receivable", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10300", "gaap": "ASC 606"},
    {"number": "10500", "name": "Prepaid Expenses", "type": "Asset", "balance": "Debit", "posting": False, "parent": "10000", "gaap": "ASC 720"},
    {"number": "10510", "name": "Prepaid Insurance", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10500", "gaap": "ASC 720"},
    {"number": "10530", "name": "Prepaid Software", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10500", "gaap": "ASC 720"},
    {"number": "15000", "name": "NON-CURRENT ASSETS", "type": "Asset", "balance": "Debit", "posting": False, "parent": None, "gaap": "ASC 210"},
    {"number": "15100", "name": "Property, Plant and Equipment", "type": "Asset", "balance": "Debit", "posting": False, "parent": "15000", "gaap": "ASC 360"},
    {"number": "15150", "name": "Computer Equipment", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15100", "gaap": "ASC 360"},
    {"number": "15170", "name": "Accumulated Depreciation", "type": "Asset", "balance": "Credit", "posting": True, "parent": "15100", "gaap": "ASC 360"},
    {"number": "15400", "name": "Investments", "type": "Asset", "balance": "Debit", "posting": False, "parent": "15000", "gaap": "ASC 323"},
    {"number": "15410", "name": "Investment in NGI Capital Advisory LLC", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15400", "gaap": "ASC 810/323"},
    {"number": "15420", "name": "Investment in The Creator Terminal Inc.", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15400", "gaap": "ASC 810/323"},

    {"number": "20000", "name": "CURRENT LIABILITIES", "type": "Liability", "balance": "Credit", "posting": False, "parent": None, "gaap": "ASC 210"},
    {"number": "20100", "name": "Accounts Payable", "type": "Liability", "balance": "Credit", "posting": False, "parent": "20000", "gaap": "ASC 405"},
    {"number": "20110", "name": "Accounts Payable", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20100", "gaap": "ASC 405"},
    {"number": "20200", "name": "Accrued Liabilities", "type": "Liability", "balance": "Credit", "posting": False, "parent": "20000", "gaap": "ASC 450"},
    {"number": "20210", "name": "Accrued Salaries and Wages", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20200", "gaap": "ASC 710"},
    {"number": "20250", "name": "Accrued Professional Fees", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20200", "gaap": "ASC 450"},
    {"number": "20300", "name": "Contract Liabilities", "type": "Liability", "balance": "Credit", "posting": False, "parent": "20000", "gaap": "ASC 606"},
    {"number": "20310", "name": "Deferred Revenue - Current", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20300", "gaap": "ASC 606"},
    {"number": "20600", "name": "Payroll Liabilities", "type": "Liability", "balance": "Credit", "posting": False, "parent": "20000", "gaap": "ASC 710/740"},
    {"number": "20611", "name": "Federal Withholding Payable", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20600", "gaap": "ASC 740"},
    {"number": "20612", "name": "FICA - Social Security Withheld", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20600", "gaap": "ASC 740"},
    {"number": "20613", "name": "FICA - Medicare Withheld", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20600", "gaap": "ASC 740"},
    {"number": "20614", "name": "FUTA Payable", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20600", "gaap": "ASC 740"},
    {"number": "20621", "name": "CA PIT Withholding Payable", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20600", "gaap": "ASC 740"},
    {"number": "20622", "name": "CA SDI Withheld", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20600", "gaap": "ASC 740"},
    {"number": "20623", "name": "CA SUI/ETT Payable", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20600", "gaap": "ASC 740"},
    {"number": "20215", "name": "Wages Payable", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20200", "gaap": "ASC 710"},

    {"number": "30000", "name": "STOCKHOLDERS' EQUITY", "type": "Equity", "balance": "Credit", "posting": False, "parent": None, "gaap": "ASC 505"},
    {"number": "30100", "name": "Common Stock", "type": "Equity", "balance": "Credit", "posting": False, "parent": "30000", "gaap": "ASC 505"},
    {"number": "30110", "name": "Common Stock - Par Value", "type": "Equity", "balance": "Credit", "posting": True, "parent": "30100", "gaap": "ASC 505"},
    {"number": "30200", "name": "Additional Paid-in Capital", "type": "Equity", "balance": "Credit", "posting": False, "parent": "30000", "gaap": "ASC 505"},
    {"number": "30210", "name": "Additional Paid-in Capital", "type": "Equity", "balance": "Credit", "posting": True, "parent": "30200", "gaap": "ASC 505"},
    {"number": "30300", "name": "Retained Earnings", "type": "Equity", "balance": "Credit", "posting": False, "parent": "30000", "gaap": "ASC 505"},
    {"number": "30310", "name": "Retained Earnings", "type": "Equity", "balance": "Credit", "posting": True, "parent": "30300", "gaap": "ASC 505"},
    # LLC historical members' equity (for conversion audit trail)
    {"number": "30500", "name": "Members' Equity", "type": "Equity", "balance": "Credit", "posting": False, "parent": "30000", "gaap": "ASC 505"},
    {"number": "30510", "name": "Member Capital - Landon Whitworth", "type": "Equity", "balance": "Credit", "posting": True, "parent": "30500", "gaap": "ASC 505"},
    {"number": "30520", "name": "Member Capital - Andre Nurmamade", "type": "Equity", "balance": "Credit", "posting": True, "parent": "30500", "gaap": "ASC 505"},

    {"number": "40000", "name": "REVENUE", "type": "Revenue", "balance": "Credit", "posting": False, "parent": None, "gaap": "ASC 606"},
    {"number": "40100", "name": "Service Revenue", "type": "Revenue", "balance": "Credit", "posting": False, "parent": "40000", "gaap": "ASC 606"},
    {"number": "40110", "name": "Advisory Fees", "type": "Revenue", "balance": "Credit", "posting": True, "parent": "40100", "gaap": "ASC 606"},
    {"number": "40180", "name": "Sponsorship Revenue", "type": "Revenue", "balance": "Credit", "posting": True, "parent": "40100", "gaap": "ASC 606"},

    {"number": "50000", "name": "COST OF REVENUE", "type": "Expense", "balance": "Debit", "posting": False, "parent": None, "gaap": "ASC 220"},
    {"number": "50110", "name": "Direct Labor - FTE (Project)", "type": "Expense", "balance": "Debit", "posting": True, "parent": "50000", "gaap": "ASC 220", "require_project": True},
    {"number": "50120", "name": "Direct Labor - Contractors (Project)", "type": "Expense", "balance": "Debit", "posting": True, "parent": "50000", "gaap": "ASC 220", "require_project": True},
    {"number": "50210", "name": "Event/Program Direct Costs", "type": "Expense", "balance": "Debit", "posting": True, "parent": "50000", "gaap": "ASC 220", "require_project": True},

    {"number": "60000", "name": "OPERATING EXPENSES", "type": "Expense", "balance": "Debit", "posting": False, "parent": None, "gaap": "ASC 220"},
    {"number": "60100", "name": "Compensation and Benefits", "type": "Expense", "balance": "Debit", "posting": False, "parent": "60000", "gaap": "ASC 710"},
    {"number": "60110", "name": "Salaries - FTE (Overhead)", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60100", "gaap": "ASC 710"},
    {"number": "60130", "name": "Bonuses", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60100", "gaap": "ASC 710"},
    {"number": "60150", "name": "Employer Payroll Taxes", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60100", "gaap": "ASC 710"},
    {"number": "60200", "name": "Technology Expenses", "type": "Expense", "balance": "Debit", "posting": False, "parent": "60000", "gaap": "ASC 220"},
    {"number": "60210", "name": "Software & SaaS", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60200", "gaap": "ASC 220"},
    {"number": "60400", "name": "Professional Fees", "type": "Expense", "balance": "Debit", "posting": False, "parent": "60000", "gaap": "ASC 220"},
    {"number": "60410", "name": "Legal Fees", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60400", "gaap": "ASC 220"},
    {"number": "60420", "name": "Accounting Fees", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60400", "gaap": "ASC 220"},
    {"number": "60600", "name": "General and Administrative", "type": "Expense", "balance": "Debit", "posting": False, "parent": "60000", "gaap": "ASC 220"},
    {"number": "60630", "name": "Bank Fees", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60600", "gaap": "ASC 220"},
    {"number": "60640", "name": "Licenses and Permits", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60600", "gaap": "ASC 220"},
    {"number": "60650", "name": "Dues and Subscriptions", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60600", "gaap": "ASC 220"},
    {"number": "60660", "name": "State Franchise/Annual Fees", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60600", "gaap": "ASC 740"},
    {"number": "60700", "name": "Depreciation and Amortization", "type": "Expense", "balance": "Debit", "posting": False, "parent": "60000", "gaap": "ASC 360"},
    {"number": "60710", "name": "Depreciation Expense", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60700", "gaap": "ASC 360"},
]


async def seed_chart_of_accounts(session: AsyncSession, entity_id: int) -> int:
    """
    Seed Chart of Accounts for an entity
    Returns count of accounts created
    """
    from ..models_accounting import ChartOfAccounts
    
    # First pass: Create parent accounts
    account_map = {}
    created_count = 0
    
    for account_def in US_GAAP_COA_TEMPLATE:
        parent_id = None
        if account_def["parent"]:
            parent_id = account_map.get(account_def["parent"])
        
        account = ChartOfAccounts(
            entity_id=entity_id,
            account_number=account_def["number"],
            account_name=account_def["name"],
            account_type=account_def["type"],
            normal_balance=account_def["balance"],
            parent_account_id=parent_id,
            allow_posting=account_def["posting"],
            gaap_reference=account_def.get("gaap"),
            require_project=bool(account_def.get("require_project", False)),
            is_active=True,
            current_balance=Decimal("0.00"),
            ytd_activity=Decimal("0.00")
        )
        
        session.add(account)
        await session.flush()
        
        account_map[account_def["number"]] = account.id
        created_count += 1
    
    await session.commit()
    return created_count



