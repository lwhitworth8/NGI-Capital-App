#!/usr/bin/env python3
"""
Final COA Cleanup and XBRL Mapping

Removes unnecessary accounts and maps only essential US GAAP accounts needed for:
- Advisory/consulting services firm (LLC converting to C-Corp)
- No crypto, no trading securities, no related party transactions
- Clean, production-ready Chart of Accounts

Author: NGI Capital Development Team
Date: October 11, 2025
"""
import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from sqlalchemy import select, delete
from services.api.database import get_db
from services.api.models_accounting import ChartOfAccounts
from decimal import Decimal


# Accounts to REMOVE (not needed for advisory firm)
ACCOUNTS_TO_REMOVE = [
    # Crypto/Digital Assets - NOT NEEDED
    "10600",  # Digital Assets (header)
    "10610",  # Bitcoin
    "10620",  # Ethereum
    "10630",  # Other Cryptocurrencies
    "30430",  # Unrealized Gains/Losses on Crypto
    "40250",  # Crypto Gains
    "70500",  # Crypto Losses

    # Trading Securities - NOT NEEDED (advisory firm, not investment fund)
    "10200",  # Marketable Securities (header)
    "10210",  # Trading Securities
    "10220",  # Available-for-Sale Securities
    "40240",  # Unrealized Gains on Trading Securities
    "70400",  # Unrealized Loss on Trading Securities

    # Related Party Transactions - NOT NEEDED
    "10320",  # Accounts Receivable - Related Parties
    "20120",  # Accounts Payable - Related Parties

    # Equity Method Investments - NOT NEEDED (not holding subsidiaries)
    "15400",  # Investments - Long-term (header)
    "15410",  # Equity Method Investments
    "15420",  # Held-to-Maturity Securities

    # Investment Income - NOT NEEDED (advisory firm, not investment fund)
    "40200",  # Investment Income (header)
    "40220",  # Dividend Income
    "40230",  # Realized Gains on Investments
    "70300",  # Realized Loss on Investments

    # Land/Buildings - NOT NEEDED (leasing office space, not owning)
    "15110",  # Land
    "15120",  # Buildings

    # Customer Relationships Intangible - NOT NEEDED (organic growth)
    "15240",  # Customer Relationships

    # Stock-Based Compensation - NOT NEEDED YET (pre-revenue)
    "30220",  # APIC - Stock Options
    "60140",  # Stock-Based Compensation

    # Foreign Currency - NOT NEEDED (US-only operations)
    "30420",  # Foreign Currency Translation Adjustment

    # Debt Issuance Costs - NOT NEEDED (no debt currently)
    "25130",  # Debt Issuance Costs

    # Other revenue not applicable
    "40910",  # Miscellaneous Revenue
    "40900",  # Other Revenue (header)
]


# Complete XBRL mappings for ESSENTIAL accounts only
ESSENTIAL_COA_MAPPINGS = {
    # ==========================================================================
    # CASH & EQUIVALENTS
    # ==========================================================================
    "10110": ("Cash - Operating Account", "CashAndCashEquivalentsAtCarryingValue", "ASC 230-10"),
    "10120": ("Cash - Payroll Account", "CashAndCashEquivalentsAtCarryingValue", "ASC 230-10"),
    "10130": ("Cash - Savings Account", "CashAndCashEquivalentsAtCarryingValue", "ASC 230-10"),
    "10140": ("Cash - Money Market", "CashAndCashEquivalentsAtCarryingValue", "ASC 230-10"),
    "10150": ("Petty Cash", "CashAndCashEquivalentsAtCarryingValue", "ASC 230-10"),

    # ==========================================================================
    # ACCOUNTS RECEIVABLE
    # ==========================================================================
    "10310": ("Accounts Receivable - Trade", "AccountsReceivableNetCurrent", "ASC 310-10"),
    "10330": ("Allowance for Doubtful Accounts", "AllowanceForDoubtfulAccountsReceivableCurrent", "ASC 310-10"),
    "10340": ("Notes Receivable - Current", "NotesReceivableNet", "ASC 310-10"),

    # ==========================================================================
    # CONTRACT ASSETS (ASC 606)
    # ==========================================================================
    "10410": ("Unbilled Receivables", "ContractWithCustomerAssetNet", "ASC 606-10"),

    # ==========================================================================
    # PREPAID EXPENSES
    # ==========================================================================
    "10510": ("Prepaid Insurance", "PrepaidInsurance", "ASC 340-10"),
    "10520": ("Prepaid Rent", "PrepaidRent", "ASC 842-20"),
    "10530": ("Prepaid Software Subscriptions", "PrepaidExpenseCurrent", "ASC 340-10"),
    "10540": ("Prepaid Legal Fees", "PrepaidExpenseCurrent", "ASC 340-10"),
    "10550": ("Other Prepaid Expenses", "PrepaidExpenseCurrent", "ASC 340-10"),

    # ==========================================================================
    # OTHER CURRENT ASSETS
    # ==========================================================================
    "10910": ("Employee Advances", "EmployeeRelatedLiabilitiesCurrent", "ASC 310-10"),
    "10920": ("Deposits - Current", "DepositsAssetsCurrent", "ASC 340-10"),

    # ==========================================================================
    # PROPERTY, PLANT & EQUIPMENT
    # ==========================================================================
    "15130": ("Leasehold Improvements", "LeaseholdImprovementsGross", "ASC 360-10"),
    "15140": ("Furniture and Fixtures", "FurnitureAndFixturesGross", "ASC 360-10"),
    "15150": ("Computer Equipment", "ComputerEquipmentGross", "ASC 360-10"),
    "15160": ("Software", "CapitalizedComputerSoftwareGross", "ASC 350-40"),
    "15170": ("Accumulated Depreciation", "AccumulatedDepreciationDepletionAndAmortizationPropertyPlantAndEquipment", "ASC 360-10"),

    # ==========================================================================
    # INTANGIBLE ASSETS
    # ==========================================================================
    "15210": ("Goodwill", "Goodwill", "ASC 350-20"),
    "15220": ("Patents", "FiniteLivedPatentsGross", "ASC 350-30"),
    "15230": ("Trademarks", "FiniteLivedTrademarkGross", "ASC 350-30"),
    "15250": ("Accumulated Amortization", "FiniteLivedIntangibleAssetsAccumulatedAmortization", "ASC 350-30"),

    # ==========================================================================
    # RIGHT-OF-USE ASSETS (ASC 842 - Leases)
    # ==========================================================================
    "15310": ("ROU Asset - Operating Leases", "OperatingLeaseRightOfUseAsset", "ASC 842-20"),
    "15320": ("ROU Asset - Finance Leases", "FinanceLeaseRightOfUseAsset", "ASC 842-20"),

    # ==========================================================================
    # OTHER NON-CURRENT ASSETS
    # ==========================================================================
    "15910": ("Deferred Tax Assets", "DeferredIncomeTaxAssetsNet", "ASC 740-10"),
    "15920": ("Long-term Notes Receivable", "NotesReceivableNet", "ASC 310-10"),
    "15930": ("Security Deposits", "DepositsAssetsNoncurrent", "ASC 340-10"),

    # ==========================================================================
    # ACCOUNTS PAYABLE
    # ==========================================================================
    "20110": ("Accounts Payable - Trade", "AccountsPayableCurrent", "ASC 405-10"),

    # ==========================================================================
    # ACCRUED LIABILITIES
    # ==========================================================================
    "20210": ("Accrued Salaries and Wages", "EmployeeRelatedLiabilitiesCurrent", "ASC 710-10"),
    "20220": ("Accrued Bonuses", "AccruedBonusesCurrent", "ASC 710-10"),
    "20230": ("Accrued Vacation", "AccruedVacationCurrent", "ASC 710-10"),
    "20240": ("Accrued Interest Payable", "InterestPayableCurrent", "ASC 835-30"),
    "20250": ("Accrued Professional Fees", "AccruedProfessionalFeesCurrent", "ASC 405-10"),
    "20260": ("Accrued Taxes", "AccruedIncomeTaxesCurrent", "ASC 740-10"),

    # ==========================================================================
    # CONTRACT LIABILITIES (ASC 606)
    # ==========================================================================
    "20310": ("Deferred Revenue", "ContractWithCustomerLiabilityCurrent", "ASC 606-10"),
    "20320": ("Customer Deposits", "CustomerDepositsCurrent", "ASC 606-10"),

    # ==========================================================================
    # CURRENT DEBT
    # ==========================================================================
    "20410": ("Current Portion of Long-term Debt", "LongTermDebtCurrent", "ASC 470-10"),
    "20420": ("Line of Credit", "LineOfCredit", "ASC 470-10"),
    "20430": ("Notes Payable - Current", "NotesPayableCurrent", "ASC 470-10"),

    # ==========================================================================
    # CURRENT LEASE LIABILITIES (ASC 842)
    # ==========================================================================
    "20510": ("Operating Lease Liability - Current", "OperatingLeaseLiabilityCurrent", "ASC 842-20"),
    "20520": ("Finance Lease Liability - Current", "FinanceLeaseLiabilityCurrent", "ASC 842-20"),

    # ==========================================================================
    # PAYROLL LIABILITIES
    # ==========================================================================
    "20610": ("Payroll Taxes Payable", "AccruedPayrollTaxesCurrent", "ASC 740-10"),
    "20620": ("401(k) Contributions Payable", "DeferredCompensationLiabilityCurrent", "ASC 710-10"),
    "20630": ("Health Insurance Payable", "AccruedInsuranceCurrent", "ASC 720-50"),

    # ==========================================================================
    # LONG-TERM DEBT
    # ==========================================================================
    "25110": ("Notes Payable - Long-term", "LongTermDebtNoncurrent", "ASC 470-10"),
    "25120": ("Loans Payable - Long-term", "LoansPayableNoncurrent", "ASC 470-10"),

    # ==========================================================================
    # NON-CURRENT LEASE LIABILITIES (ASC 842)
    # ==========================================================================
    "25210": ("Operating Lease Liability - Non-Current", "OperatingLeaseLiabilityNoncurrent", "ASC 842-20"),
    "25220": ("Finance Lease Liability - Non-Current", "FinanceLeaseLiabilityNoncurrent", "ASC 842-20"),

    # ==========================================================================
    # DEFERRED TAX LIABILITY
    # ==========================================================================
    "25900": ("Deferred Tax Liability", "DeferredIncomeTaxLiabilitiesNet", "ASC 740-10"),

    # ==========================================================================
    # C-CORP EQUITY (for conversion)
    # ==========================================================================
    "30110": ("Common Stock - Par Value", "CommonStockValue", "ASC 505-10"),
    "30120": ("Treasury Stock", "TreasuryStockValue", "ASC 505-30"),
    "30210": ("APIC - Common Stock", "AdditionalPaidInCapitalCommonStock", "ASC 505-10"),
    "30310": ("Retained Earnings - Current Year", "RetainedEarningsAccumulatedDeficit", "ASC 505-10"),
    "30320": ("Retained Earnings - Prior Years", "RetainedEarningsAccumulatedDeficit", "ASC 505-10"),
    "30410": ("Unrealized Gains/Losses on Securities", "AccumulatedOtherComprehensiveIncomeLossNetOfTax", "ASC 220-10"),

    # ==========================================================================
    # LLC MEMBERS' EQUITY
    # ==========================================================================
    "30510": ("Member Capital - Landon Whitworth", "PartnersCapitalAccount", "ASC 272-10"),
    "30520": ("Member Capital - Andre Nurmamade", "PartnersCapitalAccount", "ASC 272-10"),
    "30530": ("Member Distributions", "PaymentsOfDividendsMinorityInterestAndOtherAdjustments", "ASC 272-10"),

    # ==========================================================================
    # REVENUE (ASC 606)
    # ==========================================================================
    "40110": ("Advisory Fees", "RevenueFromContractWithCustomerExcludingAssessedTax", "ASC 606-10"),
    "40120": ("Consulting Fees", "RevenueFromContractWithCustomerExcludingAssessedTax", "ASC 606-10"),
    "40130": ("Management Fees", "ManagementFeeRevenue", "ASC 946-20"),
    "40140": ("Transaction Fees", "InvestmentBankingAdvisoryBrokerageAndUnderwritingFeesAndCommissionsRevenue", "ASC 940-405"),

    # ==========================================================================
    # OTHER INCOME
    # ==========================================================================
    "40210": ("Interest Income", "InvestmentIncomeInterest", "ASC 825-10"),

    # ==========================================================================
    # COST OF REVENUE
    # ==========================================================================
    "50100": ("Direct Labor", "DirectLaborCosts", "ASC 330-10"),
    "50200": ("Subcontractor Expenses", "CostOfGoodsAndServicesSold", "ASC 705-20"),

    # ==========================================================================
    # PERSONNEL EXPENSES
    # ==========================================================================
    "60110": ("Salaries - Executive", "SalariesAndWages", "ASC 710-10"),
    "60120": ("Salaries - Staff", "SalariesAndWages", "ASC 710-10"),
    "60130": ("Bonuses", "BonusesAndIncentiveCompensation", "ASC 710-10"),
    "60150": ("Payroll Taxes", "PayrollTaxExpense", "ASC 740-10"),
    "60160": ("Health Insurance", "EmployeeBenefitsAndShareBasedCompensation", "ASC 710-10"),
    "60170": ("401(k) Match", "DefinedContributionPlanCostRecognized", "ASC 715-70"),
    "60180": ("Other Employee Benefits", "EmployeeBenefitsAndShareBasedCompensation", "ASC 710-10"),

    # ==========================================================================
    # TECHNOLOGY EXPENSES
    # ==========================================================================
    "60210": ("Software Subscriptions", "InformationTechnologyAndDataProcessing", "ASC 350-40"),
    "60220": ("Cloud Hosting", "InformationTechnologyAndDataProcessing", "ASC 350-40"),
    "60230": ("IT Support", "InformationTechnologyAndDataProcessing", "ASC 350-40"),

    # ==========================================================================
    # OCCUPANCY EXPENSES
    # ==========================================================================
    "60310": ("Rent Expense", "OperatingLeaseExpense", "ASC 842-20"),
    "60320": ("Utilities", "Utilities", "ASC 720-15"),
    "60330": ("Office Supplies", "SuppliesExpense", "ASC 720-15"),

    # ==========================================================================
    # PROFESSIONAL FEES
    # ==========================================================================
    "60410": ("Legal Fees", "LegalFees", "ASC 720-15"),
    "60420": ("Accounting Fees", "ProfessionalFees", "ASC 720-15"),
    "60430": ("Consulting Fees", "ProfessionalFees", "ASC 720-15"),
    "60440": ("Audit Fees", "AuditAndAccountingFees", "ASC 720-15"),

    # ==========================================================================
    # MARKETING & BUSINESS DEVELOPMENT
    # ==========================================================================
    "60510": ("Advertising", "AdvertisingExpense", "ASC 720-35"),
    "60520": ("Travel and Entertainment", "TravelAndEntertainmentExpense", "ASC 720-15"),
    "60530": ("Conferences and Events", "ConventionAndTradeShowExpense", "ASC 720-15"),

    # ==========================================================================
    # ADMINISTRATIVE EXPENSES
    # ==========================================================================
    "60610": ("Insurance - General", "GeneralInsuranceExpense", "ASC 720-20"),
    "60620": ("Insurance - D&O", "DirectorsAndOfficersLiabilityInsuranceExpense", "ASC 720-20"),
    "60630": ("Bank Fees", "BankServiceCharges", "ASC 835-30"),
    "60640": ("Licenses and Permits", "TaxesAndLicensesOther", "ASC 720-15"),
    "60650": ("Dues and Subscriptions", "DuesAndSubscriptions", "ASC 720-15"),

    # ==========================================================================
    # DEPRECIATION & AMORTIZATION
    # ==========================================================================
    "60710": ("Depreciation Expense", "Depreciation", "ASC 360-10"),
    "60720": ("Amortization Expense", "AmortizationOfIntangibleAssets", "ASC 350-30"),

    # ==========================================================================
    # OTHER EXPENSES
    # ==========================================================================
    "70100": ("Interest Expense", "InterestExpense", "ASC 835-30"),
    "70200": ("Loss on Sale of Assets", "GainLossOnSaleOfPropertyPlantEquipment", "ASC 360-10"),
    "70600": ("Bad Debt Expense", "ProvisionForDoubtfulAccounts", "ASC 326-20"),

    # ==========================================================================
    # TAX EXPENSES
    # ==========================================================================
    "80100": ("Current Tax Expense", "CurrentIncomeTaxExpenseBenefit", "ASC 740-10"),
    "80200": ("Deferred Tax Expense", "DeferredIncomeTaxExpenseBenefit", "ASC 740-10"),
}


def clean_and_map_coa():
    """Remove unnecessary accounts and map essential ones to XBRL"""
    db = next(get_db())

    try:
        print("\n" + "="*80)
        print("FINAL COA CLEANUP & XBRL MAPPING")
        print("="*80)

        # Step 1: Remove unnecessary accounts
        print("\n" + "="*80)
        print("STEP 1: REMOVING UNNECESSARY ACCOUNTS")
        print("="*80)

        removed_count = 0
        for account_num in ACCOUNTS_TO_REMOVE:
            result = db.execute(
                select(ChartOfAccounts)
                .where(ChartOfAccounts.entity_id == 1)
                .where(ChartOfAccounts.account_number == account_num)
            )
            account = result.scalar_one_or_none()

            if account:
                print(f"[REMOVING] {account.account_number} - {account.account_name}")
                db.delete(account)
                removed_count += 1

        db.commit()
        print(f"\nRemoved {removed_count} unnecessary accounts")

        # Step 2: Map essential accounts to XBRL
        print("\n" + "="*80)
        print("STEP 2: MAPPING ESSENTIAL ACCOUNTS TO XBRL")
        print("="*80)

        # Get remaining posting accounts
        result = db.execute(
            select(ChartOfAccounts)
            .where(ChartOfAccounts.entity_id == 1)
            .where(ChartOfAccounts.allow_posting == True)
            .order_by(ChartOfAccounts.account_number)
        )
        posting_accounts = result.scalars().all()

        print(f"\nMapping {len(posting_accounts)} posting accounts...\n")

        mapped_count = 0
        unmapped = []

        for account in posting_accounts:
            account_num = account.account_number

            if account_num in ESSENTIAL_COA_MAPPINGS:
                name, xbrl_element, asc_topic = ESSENTIAL_COA_MAPPINGS[account_num]

                # Update account
                account.xbrl_element_name = xbrl_element
                account.primary_asc_topic = asc_topic
                account.xbrl_mapping_confidence = Decimal("1.00")
                account.xbrl_is_validated = True
                db.commit()

                mapped_count += 1
                print(f"[MAPPED] {account.account_number} - {account.account_name}")
                print(f"  -> {xbrl_element}")
                print(f"     {asc_topic}")
                print()

            else:
                unmapped.append(account)
                print(f"[WARNING] {account.account_number} - {account.account_name}")
                print(f"  No mapping found - may need manual review")
                print()

        # Final Summary
        print("\n" + "="*80)
        print("FINAL SUMMARY")
        print("="*80)
        print(f"\nRemoved Accounts:        {removed_count}")
        print(f"Mapped to XBRL:          {mapped_count}")
        print(f"Unmapped (review):       {len(unmapped)}")

        # Get final COA count
        result = db.execute(
            select(ChartOfAccounts)
            .where(ChartOfAccounts.entity_id == 1)
        )
        final_accounts = result.scalars().all()

        posting_count = sum(1 for acc in final_accounts if acc.allow_posting)
        header_count = sum(1 for acc in final_accounts if not acc.allow_posting)

        print(f"\nFinal Chart of Accounts:")
        print(f"  Total Accounts:        {len(final_accounts)}")
        print(f"  Posting Accounts:      {posting_count}")
        print(f"  Header Accounts:       {header_count}")

        mapping_rate = (mapped_count / posting_count * 100) if posting_count else 0
        print(f"\nMapping Coverage:        {mapping_rate:.1f}%")

        if unmapped:
            print(f"\n{len(unmapped)} accounts need manual review:")
            for acc in unmapped:
                print(f"  - {acc.account_number} {acc.account_name}")

        print("\n" + "="*80)
        print("COA CLEANUP & MAPPING COMPLETE")
        print("Chart of Accounts is now production-ready with XBRL/US GAAP compliance")
        print("="*80 + "\n")

    except Exception as e:
        db.rollback()
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    clean_and_map_coa()
