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
    # ========================================================================
    # ASSETS (10000-19999)
    # ========================================================================
    
    # Current Assets (10000-14999)
    {"number": "10000", "name": "CURRENT ASSETS", "type": "Asset", "balance": "Debit", "posting": False, "parent": None, "gaap": "ASC 210"},
    
    # Cash & Cash Equivalents
    {"number": "10100", "name": "Cash and Cash Equivalents", "type": "Asset", "balance": "Debit", "posting": False, "parent": "10000", "gaap": "ASC 230"},
    {"number": "10110", "name": "Cash - Operating Account", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10100", "gaap": "ASC 230"},
    {"number": "10120", "name": "Cash - Payroll Account", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10100", "gaap": "ASC 230"},
    {"number": "10130", "name": "Cash - Savings Account", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10100", "gaap": "ASC 230"},
    {"number": "10140", "name": "Cash - Money Market", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10100", "gaap": "ASC 230"},
    {"number": "10150", "name": "Petty Cash", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10100", "gaap": "ASC 230"},
    
    # Marketable Securities
    {"number": "10200", "name": "Marketable Securities", "type": "Asset", "balance": "Debit", "posting": False, "parent": "10000", "gaap": "ASC 320"},
    {"number": "10210", "name": "Trading Securities", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10200", "gaap": "ASC 320"},
    {"number": "10220", "name": "Available-for-Sale Securities", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10200", "gaap": "ASC 320"},
    
    # Accounts Receivable
    {"number": "10300", "name": "Accounts Receivable", "type": "Asset", "balance": "Debit", "posting": False, "parent": "10000", "gaap": "ASC 606"},
    {"number": "10310", "name": "Accounts Receivable - Trade", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10300", "gaap": "ASC 606"},
    {"number": "10320", "name": "Accounts Receivable - Related Parties", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10300", "gaap": "ASC 850"},
    {"number": "10330", "name": "Allowance for Doubtful Accounts", "type": "Asset", "balance": "Credit", "posting": True, "parent": "10300", "gaap": "ASC 326"},
    {"number": "10340", "name": "Notes Receivable - Current", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10300", "gaap": "ASC 310"},
    
    # Contract Assets (ASC 606)
    {"number": "10400", "name": "Contract Assets", "type": "Asset", "balance": "Debit", "posting": False, "parent": "10000", "gaap": "ASC 606"},
    {"number": "10410", "name": "Unbilled Receivables", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10400", "gaap": "ASC 606"},
    
    # Prepaid Expenses
    {"number": "10500", "name": "Prepaid Expenses", "type": "Asset", "balance": "Debit", "posting": False, "parent": "10000", "gaap": "ASC 720"},
    {"number": "10510", "name": "Prepaid Insurance", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10500", "gaap": "ASC 720"},
    {"number": "10520", "name": "Prepaid Rent", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10500", "gaap": "ASC 842"},
    {"number": "10530", "name": "Prepaid Software Subscriptions", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10500", "gaap": "ASC 720"},
    {"number": "10540", "name": "Prepaid Legal Fees", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10500", "gaap": "ASC 720"},
    {"number": "10550", "name": "Other Prepaid Expenses", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10500", "gaap": "ASC 720"},
    
    # Crypto Assets (Digital Assets - 2025 GAAP)
    {"number": "10600", "name": "Digital Assets", "type": "Asset", "balance": "Debit", "posting": False, "parent": "10000", "gaap": "ASU 2023-08"},
    {"number": "10610", "name": "Bitcoin", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10600", "gaap": "ASU 2023-08"},
    {"number": "10620", "name": "Ethereum", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10600", "gaap": "ASU 2023-08"},
    {"number": "10630", "name": "Other Cryptocurrencies", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10600", "gaap": "ASU 2023-08"},
    
    # Other Current Assets
    {"number": "10900", "name": "Other Current Assets", "type": "Asset", "balance": "Debit", "posting": False, "parent": "10000", "gaap": "ASC 210"},
    {"number": "10910", "name": "Employee Advances", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10900", "gaap": "ASC 210"},
    {"number": "10920", "name": "Deposits - Current", "type": "Asset", "balance": "Debit", "posting": True, "parent": "10900", "gaap": "ASC 210"},
    
    # Non-Current Assets (15000-19999)
    {"number": "15000", "name": "NON-CURRENT ASSETS", "type": "Asset", "balance": "Debit", "posting": False, "parent": None, "gaap": "ASC 210"},
    
    # Property, Plant & Equipment
    {"number": "15100", "name": "Property, Plant, and Equipment", "type": "Asset", "balance": "Debit", "posting": False, "parent": "15000", "gaap": "ASC 360"},
    {"number": "15110", "name": "Land", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15100", "gaap": "ASC 360"},
    {"number": "15120", "name": "Buildings", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15100", "gaap": "ASC 360"},
    {"number": "15130", "name": "Leasehold Improvements", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15100", "gaap": "ASC 842"},
    {"number": "15140", "name": "Furniture and Fixtures", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15100", "gaap": "ASC 360"},
    {"number": "15150", "name": "Computer Equipment", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15100", "gaap": "ASC 360"},
    {"number": "15160", "name": "Software", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15100", "gaap": "ASC 350"},
    {"number": "15170", "name": "Accumulated Depreciation", "type": "Asset", "balance": "Credit", "posting": True, "parent": "15100", "gaap": "ASC 360"},
    
    # Intangible Assets
    {"number": "15200", "name": "Intangible Assets", "type": "Asset", "balance": "Debit", "posting": False, "parent": "15000", "gaap": "ASC 350"},
    {"number": "15210", "name": "Goodwill", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15200", "gaap": "ASC 350"},
    {"number": "15220", "name": "Patents", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15200", "gaap": "ASC 350"},
    {"number": "15230", "name": "Trademarks", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15200", "gaap": "ASC 350"},
    {"number": "15240", "name": "Customer Relationships", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15200", "gaap": "ASC 350"},
    {"number": "15250", "name": "Accumulated Amortization", "type": "Asset", "balance": "Credit", "posting": True, "parent": "15200", "gaap": "ASC 350"},
    
    # Right-of-Use Assets (ASC 842)
    {"number": "15300", "name": "Right-of-Use Assets", "type": "Asset", "balance": "Debit", "posting": False, "parent": "15000", "gaap": "ASC 842"},
    {"number": "15310", "name": "ROU Asset - Operating Leases", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15300", "gaap": "ASC 842"},
    {"number": "15320", "name": "ROU Asset - Finance Leases", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15300", "gaap": "ASC 842"},
    
    # Investments
    {"number": "15400", "name": "Investments - Long-term", "type": "Asset", "balance": "Debit", "posting": False, "parent": "15000", "gaap": "ASC 320"},
    {"number": "15410", "name": "Equity Method Investments", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15400", "gaap": "ASC 323"},
    {"number": "15420", "name": "Held-to-Maturity Securities", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15400", "gaap": "ASC 320"},
    
    # Other Non-Current Assets
    {"number": "15900", "name": "Other Non-Current Assets", "type": "Asset", "balance": "Debit", "posting": False, "parent": "15000", "gaap": "ASC 210"},
    {"number": "15910", "name": "Deferred Tax Assets", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15900", "gaap": "ASC 740"},
    {"number": "15920", "name": "Long-term Notes Receivable", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15900", "gaap": "ASC 310"},
    {"number": "15930", "name": "Security Deposits", "type": "Asset", "balance": "Debit", "posting": True, "parent": "15900", "gaap": "ASC 210"},
    
    # ========================================================================
    # LIABILITIES (20000-29999)
    # ========================================================================
    
    # Current Liabilities (20000-24999)
    {"number": "20000", "name": "CURRENT LIABILITIES", "type": "Liability", "balance": "Credit", "posting": False, "parent": None, "gaap": "ASC 210"},
    
    # Accounts Payable
    {"number": "20100", "name": "Accounts Payable", "type": "Liability", "balance": "Credit", "posting": False, "parent": "20000", "gaap": "ASC 405"},
    {"number": "20110", "name": "Accounts Payable - Trade", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20100", "gaap": "ASC 405"},
    {"number": "20120", "name": "Accounts Payable - Related Parties", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20100", "gaap": "ASC 850"},
    
    # Accrued Liabilities
    {"number": "20200", "name": "Accrued Liabilities", "type": "Liability", "balance": "Credit", "posting": False, "parent": "20000", "gaap": "ASC 450"},
    {"number": "20210", "name": "Accrued Salaries and Wages", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20200", "gaap": "ASC 710"},
    {"number": "20220", "name": "Accrued Bonuses", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20200", "gaap": "ASC 710"},
    {"number": "20230", "name": "Accrued Vacation", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20200", "gaap": "ASC 710"},
    {"number": "20240", "name": "Accrued Interest Payable", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20200", "gaap": "ASC 835"},
    {"number": "20250", "name": "Accrued Professional Fees", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20200", "gaap": "ASC 450"},
    {"number": "20260", "name": "Accrued Taxes", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20200", "gaap": "ASC 740"},
    
    # Contract Liabilities (ASC 606)
    {"number": "20300", "name": "Contract Liabilities", "type": "Liability", "balance": "Credit", "posting": False, "parent": "20000", "gaap": "ASC 606"},
    {"number": "20310", "name": "Deferred Revenue", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20300", "gaap": "ASC 606"},
    {"number": "20320", "name": "Customer Deposits", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20300", "gaap": "ASC 606"},
    
    # Short-term Debt
    {"number": "20400", "name": "Short-term Debt", "type": "Liability", "balance": "Credit", "posting": False, "parent": "20000", "gaap": "ASC 470"},
    {"number": "20410", "name": "Current Portion of Long-term Debt", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20400", "gaap": "ASC 470"},
    {"number": "20420", "name": "Line of Credit", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20400", "gaap": "ASC 470"},
    {"number": "20430", "name": "Notes Payable - Current", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20400", "gaap": "ASC 470"},
    
    # Lease Liabilities - Current (ASC 842)
    {"number": "20500", "name": "Current Lease Liabilities", "type": "Liability", "balance": "Credit", "posting": False, "parent": "20000", "gaap": "ASC 842"},
    {"number": "20510", "name": "Operating Lease Liability - Current", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20500", "gaap": "ASC 842"},
    {"number": "20520", "name": "Finance Lease Liability - Current", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20500", "gaap": "ASC 842"},
    
    # Payroll Liabilities
    {"number": "20600", "name": "Payroll Liabilities", "type": "Liability", "balance": "Credit", "posting": False, "parent": "20000", "gaap": "ASC 710"},
    {"number": "20610", "name": "Payroll Taxes Payable", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20600", "gaap": "ASC 740"},
    {"number": "20620", "name": "401(k) Contributions Payable", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20600", "gaap": "ASC 710"},
    {"number": "20630", "name": "Health Insurance Payable", "type": "Liability", "balance": "Credit", "posting": True, "parent": "20600", "gaap": "ASC 710"},
    
    # Non-Current Liabilities (25000-29999)
    {"number": "25000", "name": "NON-CURRENT LIABILITIES", "type": "Liability", "balance": "Credit", "posting": False, "parent": None, "gaap": "ASC 210"},
    
    # Long-term Debt
    {"number": "25100", "name": "Long-term Debt", "type": "Liability", "balance": "Credit", "posting": False, "parent": "25000", "gaap": "ASC 470"},
    {"number": "25110", "name": "Notes Payable - Long-term", "type": "Liability", "balance": "Credit", "posting": True, "parent": "25100", "gaap": "ASC 470"},
    {"number": "25120", "name": "Loans Payable - Long-term", "type": "Liability", "balance": "Credit", "posting": True, "parent": "25100", "gaap": "ASC 470"},
    {"number": "25130", "name": "Debt Issuance Costs", "type": "Liability", "balance": "Debit", "posting": True, "parent": "25100", "gaap": "ASC 470"},
    
    # Lease Liabilities - Non-Current
    {"number": "25200", "name": "Non-Current Lease Liabilities", "type": "Liability", "balance": "Credit", "posting": False, "parent": "25000", "gaap": "ASC 842"},
    {"number": "25210", "name": "Operating Lease Liability - Non-Current", "type": "Liability", "balance": "Credit", "posting": True, "parent": "25200", "gaap": "ASC 842"},
    {"number": "25220", "name": "Finance Lease Liability - Non-Current", "type": "Liability", "balance": "Credit", "posting": True, "parent": "25200", "gaap": "ASC 842"},
    
    # Deferred Tax Liability
    {"number": "25900", "name": "Deferred Tax Liability", "type": "Liability", "balance": "Credit", "posting": True, "parent": "25000", "gaap": "ASC 740"},
    
    # ========================================================================
    # EQUITY (30000-39999)
    # ========================================================================
    
    {"number": "30000", "name": "STOCKHOLDERS' EQUITY", "type": "Equity", "balance": "Credit", "posting": False, "parent": None, "gaap": "ASC 505"},
    
    # Common Stock
    {"number": "30100", "name": "Common Stock", "type": "Equity", "balance": "Credit", "posting": False, "parent": "30000", "gaap": "ASC 505"},
    {"number": "30110", "name": "Common Stock - Par Value", "type": "Equity", "balance": "Credit", "posting": True, "parent": "30100", "gaap": "ASC 505"},
    {"number": "30120", "name": "Treasury Stock", "type": "Equity", "balance": "Debit", "posting": True, "parent": "30100", "gaap": "ASC 505"},
    
    # Additional Paid-in Capital
    {"number": "30200", "name": "Additional Paid-in Capital", "type": "Equity", "balance": "Credit", "posting": False, "parent": "30000", "gaap": "ASC 505"},
    {"number": "30210", "name": "APIC - Common Stock", "type": "Equity", "balance": "Credit", "posting": True, "parent": "30200", "gaap": "ASC 505"},
    {"number": "30220", "name": "APIC - Stock Options", "type": "Equity", "balance": "Credit", "posting": True, "parent": "30200", "gaap": "ASC 718"},
    
    # Retained Earnings
    {"number": "30300", "name": "Retained Earnings", "type": "Equity", "balance": "Credit", "posting": False, "parent": "30000", "gaap": "ASC 505"},
    {"number": "30310", "name": "Retained Earnings - Current Year", "type": "Equity", "balance": "Credit", "posting": True, "parent": "30300", "gaap": "ASC 505"},
    {"number": "30320", "name": "Retained Earnings - Prior Years", "type": "Equity", "balance": "Credit", "posting": True, "parent": "30300", "gaap": "ASC 505"},
    
    # Accumulated Other Comprehensive Income (ASC 220)
    {"number": "30400", "name": "Accumulated Other Comprehensive Income", "type": "Equity", "balance": "Credit", "posting": False, "parent": "30000", "gaap": "ASC 220"},
    {"number": "30410", "name": "Unrealized Gains/Losses on Securities", "type": "Equity", "balance": "Credit", "posting": True, "parent": "30400", "gaap": "ASC 320"},
    {"number": "30420", "name": "Foreign Currency Translation Adjustment", "type": "Equity", "balance": "Credit", "posting": True, "parent": "30400", "gaap": "ASC 830"},
    {"number": "30430", "name": "Unrealized Gains/Losses on Crypto", "type": "Equity", "balance": "Credit", "posting": True, "parent": "30400", "gaap": "ASU 2023-08"},
    
    # LLC Members' Equity (for Advisory LLC subsidiary)
    {"number": "30500", "name": "Members' Equity", "type": "Equity", "balance": "Credit", "posting": False, "parent": "30000", "gaap": "ASC 505"},
    {"number": "30510", "name": "Member Capital - Landon Whitworth", "type": "Equity", "balance": "Credit", "posting": True, "parent": "30500", "gaap": "ASC 505"},
    {"number": "30520", "name": "Member Capital - Andre Nurmamade", "type": "Equity", "balance": "Credit", "posting": True, "parent": "30500", "gaap": "ASC 505"},
    {"number": "30530", "name": "Member Distributions", "type": "Equity", "balance": "Debit", "posting": True, "parent": "30500", "gaap": "ASC 505"},
    
    # ========================================================================
    # REVENUE (40000-49999)
    # ========================================================================
    
    {"number": "40000", "name": "REVENUE", "type": "Revenue", "balance": "Credit", "posting": False, "parent": None, "gaap": "ASC 606"},
    
    # Service Revenue
    {"number": "40100", "name": "Service Revenue", "type": "Revenue", "balance": "Credit", "posting": False, "parent": "40000", "gaap": "ASC 606"},
    {"number": "40110", "name": "Advisory Fees", "type": "Revenue", "balance": "Credit", "posting": True, "parent": "40100", "gaap": "ASC 606"},
    {"number": "40120", "name": "Consulting Fees", "type": "Revenue", "balance": "Credit", "posting": True, "parent": "40100", "gaap": "ASC 606"},
    {"number": "40130", "name": "Management Fees", "type": "Revenue", "balance": "Credit", "posting": True, "parent": "40100", "gaap": "ASC 606"},
    {"number": "40140", "name": "Transaction Fees", "type": "Revenue", "balance": "Credit", "posting": True, "parent": "40100", "gaap": "ASC 606"},
    
    # Investment Income
    {"number": "40200", "name": "Investment Income", "type": "Revenue", "balance": "Credit", "posting": False, "parent": "40000", "gaap": "ASC 320"},
    {"number": "40210", "name": "Interest Income", "type": "Revenue", "balance": "Credit", "posting": True, "parent": "40200", "gaap": "ASC 835"},
    {"number": "40220", "name": "Dividend Income", "type": "Revenue", "balance": "Credit", "posting": True, "parent": "40200", "gaap": "ASC 320"},
    {"number": "40230", "name": "Realized Gains on Investments", "type": "Revenue", "balance": "Credit", "posting": True, "parent": "40200", "gaap": "ASC 320"},
    {"number": "40240", "name": "Unrealized Gains on Trading Securities", "type": "Revenue", "balance": "Credit", "posting": True, "parent": "40200", "gaap": "ASC 320"},
    {"number": "40250", "name": "Crypto Gains", "type": "Revenue", "balance": "Credit", "posting": True, "parent": "40200", "gaap": "ASU 2023-08"},
    
    # Other Revenue
    {"number": "40900", "name": "Other Revenue", "type": "Revenue", "balance": "Credit", "posting": False, "parent": "40000", "gaap": "ASC 606"},
    {"number": "40910", "name": "Miscellaneous Revenue", "type": "Revenue", "balance": "Credit", "posting": True, "parent": "40900", "gaap": "ASC 606"},
    
    # ========================================================================
    # EXPENSES (50000-59999)
    # ========================================================================
    
    {"number": "50000", "name": "COST OF REVENUE", "type": "Expense", "balance": "Debit", "posting": False, "parent": None, "gaap": "ASC 220"},
    {"number": "50100", "name": "Direct Labor", "type": "Expense", "balance": "Debit", "posting": True, "parent": "50000", "gaap": "ASC 220"},
    {"number": "50200", "name": "Subcontractor Expenses", "type": "Expense", "balance": "Debit", "posting": True, "parent": "50000", "gaap": "ASC 220"},
    
    # Operating Expenses
    {"number": "60000", "name": "OPERATING EXPENSES", "type": "Expense", "balance": "Debit", "posting": False, "parent": None, "gaap": "ASC 220"},
    
    # Compensation & Benefits (Disaggregated per ASC 220)
    {"number": "60100", "name": "Compensation and Benefits", "type": "Expense", "balance": "Debit", "posting": False, "parent": "60000", "gaap": "ASC 710"},
    {"number": "60110", "name": "Salaries - Executive", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60100", "gaap": "ASC 710"},
    {"number": "60120", "name": "Salaries - Staff", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60100", "gaap": "ASC 710"},
    {"number": "60130", "name": "Bonuses", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60100", "gaap": "ASC 710"},
    {"number": "60140", "name": "Stock-Based Compensation", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60100", "gaap": "ASC 718"},
    {"number": "60150", "name": "Payroll Taxes", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60100", "gaap": "ASC 710"},
    {"number": "60160", "name": "Health Insurance", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60100", "gaap": "ASC 710"},
    {"number": "60170", "name": "401(k) Match", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60100", "gaap": "ASC 710"},
    {"number": "60180", "name": "Other Employee Benefits", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60100", "gaap": "ASC 710"},
    
    # Technology (Disaggregated per ASC 220)
    {"number": "60200", "name": "Technology Expenses", "type": "Expense", "balance": "Debit", "posting": False, "parent": "60000", "gaap": "ASC 220"},
    {"number": "60210", "name": "Software Subscriptions", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60200", "gaap": "ASC 220"},
    {"number": "60220", "name": "Cloud Hosting", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60200", "gaap": "ASC 220"},
    {"number": "60230", "name": "IT Support", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60200", "gaap": "ASC 220"},
    
    # Occupancy (Disaggregated per ASC 220)
    {"number": "60300", "name": "Occupancy Expenses", "type": "Expense", "balance": "Debit", "posting": False, "parent": "60000", "gaap": "ASC 220"},
    {"number": "60310", "name": "Rent Expense", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60300", "gaap": "ASC 842"},
    {"number": "60320", "name": "Utilities", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60300", "gaap": "ASC 220"},
    {"number": "60330", "name": "Office Supplies", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60300", "gaap": "ASC 220"},
    
    # Professional Fees (Disaggregated per ASC 220)
    {"number": "60400", "name": "Professional Fees", "type": "Expense", "balance": "Debit", "posting": False, "parent": "60000", "gaap": "ASC 220"},
    {"number": "60410", "name": "Legal Fees", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60400", "gaap": "ASC 220"},
    {"number": "60420", "name": "Accounting Fees", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60400", "gaap": "ASC 220"},
    {"number": "60430", "name": "Consulting Fees", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60400", "gaap": "ASC 220"},
    {"number": "60440", "name": "Audit Fees", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60400", "gaap": "ASC 220"},
    
    # Marketing & Business Development
    {"number": "60500", "name": "Marketing and Business Development", "type": "Expense", "balance": "Debit", "posting": False, "parent": "60000", "gaap": "ASC 220"},
    {"number": "60510", "name": "Advertising", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60500", "gaap": "ASC 720"},
    {"number": "60520", "name": "Travel and Entertainment", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60500", "gaap": "ASC 720"},
    {"number": "60530", "name": "Conferences and Events", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60500", "gaap": "ASC 720"},
    
    # General & Administrative
    {"number": "60600", "name": "General and Administrative", "type": "Expense", "balance": "Debit", "posting": False, "parent": "60000", "gaap": "ASC 220"},
    {"number": "60610", "name": "Insurance - General", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60600", "gaap": "ASC 720"},
    {"number": "60620", "name": "Insurance - D&O", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60600", "gaap": "ASC 720"},
    {"number": "60630", "name": "Bank Fees", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60600", "gaap": "ASC 220"},
    {"number": "60640", "name": "Licenses and Permits", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60600", "gaap": "ASC 220"},
    {"number": "60650", "name": "Dues and Subscriptions", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60600", "gaap": "ASC 220"},
    
    # Depreciation & Amortization (Separate line per ASC 220)
    {"number": "60700", "name": "Depreciation and Amortization", "type": "Expense", "balance": "Debit", "posting": False, "parent": "60000", "gaap": "ASC 360"},
    {"number": "60710", "name": "Depreciation Expense", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60700", "gaap": "ASC 360"},
    {"number": "60720", "name": "Amortization Expense", "type": "Expense", "balance": "Debit", "posting": True, "parent": "60700", "gaap": "ASC 350"},
    
    # Other Expenses
    {"number": "70000", "name": "OTHER INCOME (EXPENSE)", "type": "Expense", "balance": "Debit", "posting": False, "parent": None, "gaap": "ASC 220"},
    {"number": "70100", "name": "Interest Expense", "type": "Expense", "balance": "Debit", "posting": True, "parent": "70000", "gaap": "ASC 835"},
    {"number": "70200", "name": "Loss on Sale of Assets", "type": "Expense", "balance": "Debit", "posting": True, "parent": "70000", "gaap": "ASC 360"},
    {"number": "70300", "name": "Realized Loss on Investments", "type": "Expense", "balance": "Debit", "posting": True, "parent": "70000", "gaap": "ASC 320"},
    {"number": "70400", "name": "Unrealized Loss on Trading Securities", "type": "Expense", "balance": "Debit", "posting": True, "parent": "70000", "gaap": "ASC 320"},
    {"number": "70500", "name": "Crypto Losses", "type": "Expense", "balance": "Debit", "posting": True, "parent": "70000", "gaap": "ASU 2023-08"},
    {"number": "70600", "name": "Bad Debt Expense", "type": "Expense", "balance": "Debit", "posting": True, "parent": "70000", "gaap": "ASC 326"},
    
    # Income Tax
    {"number": "80000", "name": "INCOME TAX EXPENSE", "type": "Expense", "balance": "Debit", "posting": False, "parent": None, "gaap": "ASC 740"},
    {"number": "80100", "name": "Current Tax Expense", "type": "Expense", "balance": "Debit", "posting": True, "parent": "80000", "gaap": "ASC 740"},
    {"number": "80200", "name": "Deferred Tax Expense", "type": "Expense", "balance": "Debit", "posting": True, "parent": "80000", "gaap": "ASC 740"},
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


# Mercury Bank transaction mapping hints
MERCURY_CATEGORY_TO_ACCOUNT_MAP = {
    "software": "60210",  # Software Subscriptions
    "advertising": "60510",  # Advertising
    "consulting": "60430",  # Consulting Fees
    "legal": "60410",  # Legal Fees
    "travel": "60520",  # Travel and Entertainment
    "meals": "60520",  # Travel and Entertainment
    "office": "60330",  # Office Supplies
    "utilities": "60320",  # Utilities
    "insurance": "60610",  # Insurance - General
    "banking": "60630",  # Bank Fees
    "payroll": "60120",  # Salaries - Staff
}

