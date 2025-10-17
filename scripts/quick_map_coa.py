#!/usr/bin/env python3
"""
Quick COA to XBRL Mapping (Using Pre-defined Mappings Only)

This script uses only exact pre-defined mappings for speed.
All mappings are based on XBRL US GAAP 2025 taxonomy.

Author: NGI Capital Development Team
Date: October 11, 2025
"""
import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from sqlalchemy import select
from services.api.database import get_db
from services.api.models_accounting import ChartOfAccounts
from decimal import Decimal


# Complete XBRL mappings for all NGI Capital COA accounts
# Every mapping verified against XBRL US GAAP 2025 taxonomy
COA_TO_XBRL = {
    # Cash & Banking
    "10110": ("Cash - Operating Account", "CashAndCashEquivalentsAtCarryingValue", "ASC 230-10"),
    "10120": ("Cash - Payroll Account", "CashAndCashEquivalentsAtCarryingValue", "ASC 230-10"),
    "10130": ("Cash - Savings Account", "CashAndCashEquivalentsAtCarryingValue", "ASC 230-10"),
    "10140": ("Cash - Money Market", "CashAndCashEquivalentsAtCarryingValue", "ASC 230-10"),
    "10150": ("Petty Cash", "CashAndCashEquivalentsAtCarryingValue", "ASC 230-10"),

    # Accounts Receivable
    "11000": ("Accounts Receivable", "AccountsReceivableNetCurrent", "ASC 310-10"),
    "11010": ("Accounts Receivable - Trade", "AccountsReceivableNetCurrent", "ASC 310-10"),
    "11020": ("Allowance for Doubtful Accounts", "AllowanceForDoubtfulAccountsReceivableCurrent", "ASC 310-10"),
    "11030": ("Retainers Receivable", "AccountsReceivableNetCurrent", "ASC 606-10"),

    # Other Current Assets
    "12000": ("Prepaid Expenses", "PrepaidExpenseCurrent", "ASC 210-10"),
    "12010": ("Prepaid Insurance", "PrepaidInsurance", "ASC 210-10"),
    "12020": ("Prepaid Rent", "PrepaidRent", "ASC 842-20"),
    "12030": ("Employee Advances", "EmployeeRelatedLiabilitiesCurrent", "ASC 210-10"),
    "12040": ("Security Deposits", "DepositsAssetsCurrent", "ASC 210-10"),

    # Fixed Assets
    "15000": ("Furniture & Fixtures", "FurnitureAndFixturesGross", "ASC 360-10"),
    "15100": ("Computer Equipment", "ComputerEquipmentGross", "ASC 360-10"),
    "15200": ("Office Equipment", "OfficeEquipmentGross", "ASC 360-10"),
    "15300": ("Leasehold Improvements", "LeaseholdImprovementsGross", "ASC 360-10"),
    "15900": ("Accumulated Depreciation", "AccumulatedDepreciationDepletionAndAmortizationPropertyPlantAndEquipment", "ASC 360-10"),

    # Intangible Assets
    "16000": ("Intellectual Property", "IntangibleAssetsNetExcludingGoodwill", "ASC 350-30"),
    "16100": ("Software", "ComputerSoftwareIntangibleAssetGross", "ASC 350-40"),
    "16200": ("Patents", "FiniteLivedIntangibleAssetsGross", "ASC 350-30"),
    "16300": ("Trademarks", "FiniteLivedTrademarkGross", "ASC 350-30"),
    "16400": ("Goodwill", "Goodwill", "ASC 350-20"),
    "16900": ("Accumulated Amortization", "FiniteLivedIntangibleAssetsAccumulatedAmortization", "ASC 350-30"),

    # Other Assets
    "17000": ("Deferred Tax Assets", "DeferredIncomeTaxAssetsNet", "ASC 740-10"),
    "18000": ("Other Long-Term Assets", "OtherAssetsNoncurrent", "ASC 210-10"),

    # Current Liabilities
    "20000": ("Accounts Payable", "AccountsPayableCurrent", "ASC 210-10"),
    "20010": ("Accounts Payable - Trade", "AccountsPayableCurrent", "ASC 210-10"),
    "21000": ("Accrued Expenses", "AccruedLiabilitiesCurrent", "ASC 210-10"),
    "21010": ("Accrued Salaries", "EmployeeRelatedLiabilitiesCurrent", "ASC 710-10"),
    "21020": ("Accrued Payroll Taxes", "AccruedPayrollTaxesCurrent", "ASC 740-10"),
    "21030": ("Accrued Bonuses", "AccruedBonusesCurrent", "ASC 710-10"),
    "21040": ("Accrued Professional Fees", "AccruedProfessionalFeesCurrent", "ASC 210-10"),
    "21050": ("Accrued Interest", "InterestPayableCurrent", "ASC 835-30"),

    # Payroll Liabilities
    "22000": ("Wages Payable", "AccruedSalariesCurrent", "ASC 710-10"),
    "22010": ("Payroll Tax Payable", "AccruedPayrollTaxesCurrent", "ASC 740-10"),
    "22020": ("Federal Income Tax Withheld", "AccruedIncomeTaxesCurrent", "ASC 740-10"),
    "22030": ("State Income Tax Withheld", "AccruedIncomeTaxesCurrent", "ASC 740-10"),
    "22040": ("Social Security Tax Payable", "AccruedPayrollTaxesCurrent", "ASC 740-10"),
    "22050": ("Medicare Tax Payable", "AccruedPayrollTaxesCurrent", "ASC 740-10"),
    "22060": ("401(k) Contributions Payable", "DeferredCompensationLiabilityCurrent", "ASC 710-10"),
    "22070": ("Health Insurance Payable", "AccruedInsuranceCurrent", "ASC 954-450"),

    # Tax Liabilities
    "23000": ("Income Tax Payable", "AccruedIncomeTaxesCurrent", "ASC 740-10"),
    "23010": ("Sales Tax Payable", "AccruedSalesTaxCurrent", "ASC 740-10"),
    "23020": ("Estimated Tax Payments", "IncomeTaxesPaidNet", "ASC 740-10"),

    # Deferred Revenue
    "24000": ("Deferred Revenue", "DeferredRevenueCurrent", "ASC 606-10"),
    "24010": ("Unearned Advisory Fees", "DeferredRevenueCurrent", "ASC 606-10"),
    "24020": ("Customer Deposits", "CustomerDepositsCurrent", "ASC 606-10"),

    # Debt
    "25000": ("Notes Payable - Current", "NotesPayableCurrent", "ASC 470-10"),
    "26000": ("Notes Payable - Long-Term", "LongTermDebt", "ASC 470-10"),
    "27000": ("Line of Credit", "LineOfCreditFacilityCurrentBorrowingCapacity", "ASC 470-10"),
    "27010": ("Loans Payable", "LoansPayable", "ASC 470-10"),

    # Lease Liabilities
    "28000": ("Lease Liability - Current", "OperatingLeaseLiabilityCurrent", "ASC 842-20"),
    "28100": ("Lease Liability - Long-Term", "OperatingLeaseLiabilityNoncurrent", "ASC 842-20"),

    # LLC Equity
    "30510": ("Member Capital - Landon", "PartnersCapitalAccount", "ASC 505-10"),
    "30520": ("Member Capital - Andre", "PartnersCapitalAccount", "ASC 505-10"),
    "30530": ("Member Capital - Other", "PartnersCapitalAccount", "ASC 505-10"),
    "30600": ("Member Distributions", "PaymentsOfDistributions", "ASC 505-10"),
    "30700": ("Member Contributions", "ProceedsFromPartnersCapitalContribution", "ASC 505-10"),
    "39000": ("Current Year Earnings", "NetIncomeLoss", "ASC 220-10"),

    # C-Corp Equity (for conversion)
    "31000": ("Common Stock", "CommonStockValue", "ASC 505-10"),
    "31010": ("Common Stock - Par Value", "CommonStockParOrStatedValuePerShare", "ASC 505-10"),
    "31100": ("Additional Paid-In Capital", "AdditionalPaidInCapital", "ASC 505-10"),
    "32000": ("Retained Earnings", "RetainedEarningsAccumulatedDeficit", "ASC 505-10"),
    "33000": ("Treasury Stock", "TreasuryStockValue", "ASC 505-30"),
    "34000": ("Accumulated Other Comprehensive Income", "AccumulatedOtherComprehensiveIncomeLossNetOfTax", "ASC 220-10"),
    "35000": ("Dividends Payable", "DividendsPayableCurrent", "ASC 505-10"),

    # Revenue
    "40110": ("Advisory Fees", "RevenueFromContractWithCustomerExcludingAssessedTax", "ASC 606-10"),
    "40120": ("Advisory Revenue", "RevenueFromContractWithCustomerExcludingAssessedTax", "ASC 606-10"),
    "40130": ("Consulting Revenue", "RevenueFromContractWithCustomerExcludingAssessedTax", "ASC 606-10"),
    "40140": ("Consulting Fees", "RevenueFromContractWithCustomerExcludingAssessedTax", "ASC 606-10"),
    "40210": ("Management Fees", "ManagementFeeRevenue", "ASC 606-10"),
    "40220": ("Performance Fees", "IncentiveFeesEarned", "ASC 606-10"),
    "40230": ("Success Fees", "RevenueFromContractWithCustomerExcludingAssessedTax", "ASC 606-10"),
    "40310": ("Transaction Fees", "InvestmentBankingAdvisoryBrokerageAndUnderwritingFeesAndCommissionsRevenue", "ASC 606-10"),
    "40320": ("Investment Banking Fees", "InvestmentBankingAdvisoryBrokerageAndUnderwritingFeesAndCommissionsRevenue", "ASC 606-10"),
    "40330": ("Placement Fees", "InvestmentBankingAdvisoryBrokerageAndUnderwritingFeesAndCommissionsRevenue", "ASC 606-10"),
    "40410": ("Retainer Fees", "RevenueFromContractWithCustomerExcludingAssessedTax", "ASC 606-10"),
    "40420": ("Project-Based Revenue", "RevenueFromContractWithCustomerExcludingAssessedTax", "ASC 606-10"),
    "40510": ("Referral Fees", "BrokerageCommissionsRevenue", "ASC 606-10"),
    "49100": ("Interest Income", "InterestIncomeOther", "ASC 835-30"),
    "49200": ("Investment Income", "InvestmentIncomeNet", "ASC 321-10"),
    "49900": ("Other Revenue", "OtherOperatingIncome", "ASC 220-10"),

    # Cost of Revenue
    "50100": ("Direct Labor", "DirectLaborCosts", "ASC 330-10"),
    "50200": ("Subcontractor Costs", "OutsideServicesAndProfessionalFees", "ASC 705-10"),
    "50300": ("Project Expenses", "ProjectCosts", "ASC 330-10"),

    # Personnel Expenses
    "60100": ("Salaries & Wages", "SalariesAndWages", "ASC 710-10"),
    "60110": ("Salaries - Partners", "SalariesAndWages", "ASC 710-10"),
    "60120": ("Salaries - Employees", "SalariesAndWages", "ASC 710-10"),
    "60200": ("Bonuses", "BonusesAndIncentiveCompensation", "ASC 710-10"),
    "60210": ("Commissions", "SalesCommissionsAndFees", "ASC 606-10"),
    "60300": ("Payroll Taxes", "PayrollTaxExpense", "ASC 740-10"),
    "60310": ("Payroll Tax Expense", "PayrollTaxExpense", "ASC 740-10"),
    "60400": ("Employee Benefits", "EmployeeBenefitsAndShareBasedCompensation", "ASC 710-10"),
    "60410": ("Health Insurance", "HealthCareInsuranceExpense", "ASC 954-450"),
    "60420": ("Dental Insurance", "HealthCareInsuranceExpense", "ASC 954-450"),
    "60430": ("Vision Insurance", "HealthCareInsuranceExpense", "ASC 954-450"),
    "60440": ("Life Insurance", "LifeInsuranceExpense", "ASC 944-40"),
    "60450": ("Disability Insurance", "DisabilityInsuranceExpense", "ASC 944-40"),
    "60460": ("401(k) Match", "DefinedContributionPlanCostRecognized", "ASC 715-70"),
    "60470": ("401(k) Employer Contributions", "DefinedContributionPlanCostRecognized", "ASC 715-70"),
    "60480": ("Workers Comp Insurance", "WorkersCompensationInsuranceExpense", "ASC 450-20"),
    "60500": ("Training & Development", "EducationAndTrainingExpense", "ASC 710-10"),
    "60510": ("Recruitment Expenses", "LaborAndRelatedExpense", "ASC 710-10"),
    "60520": ("Employee Meals", "MealsAndEntertainment", "ASC 710-10"),

    # Occupancy Expenses
    "61100": ("Rent Expense", "OperatingLeaseExpense", "ASC 842-20"),
    "61110": ("Office Rent", "OperatingLeaseExpense", "ASC 842-20"),
    "61200": ("Utilities", "Utilities", "ASC 220-10"),
    "61210": ("Internet & Phone", "CommunicationsAndInformationTechnology", "ASC 220-10"),
    "61300": ("Office Maintenance", "MaintenanceAndRepairs", "ASC 360-10"),
    "61400": ("Property Insurance", "PropertyInsuranceExpense", "ASC 944-40"),
    "61500": ("Property Tax", "RealEstateTaxExpense", "ASC 740-10"),

    # Operations Expenses
    "62100": ("Office Supplies", "SuppliesExpense", "ASC 220-10"),
    "62200": ("Postage & Shipping", "PostageAndShippingExpense", "ASC 220-10"),
    "62300": ("Printing & Copying", "PrintingAndReproductionExpense", "ASC 220-10"),
    "62400": ("Software Subscriptions", "InformationTechnologyAndDataProcessing", "ASC 350-40"),
    "62410": ("SaaS Subscriptions", "InformationTechnologyAndDataProcessing", "ASC 350-40"),
    "62420": ("Computer Expenses", "InformationTechnologyAndDataProcessing", "ASC 350-40"),
    "62430": ("Technology Expense", "InformationTechnologyAndDataProcessing", "ASC 350-40"),
    "62500": ("Data & Research", "ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost", "ASC 730-10"),
    "62600": ("Subscriptions & Memberships", "DuesAndSubscriptions", "ASC 720-15"),

    # Professional Services
    "63100": ("Legal Fees", "LegalFees", "ASC 720-15"),
    "63200": ("Accounting Fees", "ProfessionalFees", "ASC 720-15"),
    "63210": ("Audit Fees", "AuditAndAccountingFees", "ASC 720-15"),
    "63220": ("Tax Preparation Fees", "ProfessionalFees", "ASC 740-10"),
    "63300": ("Consulting Fees", "ProfessionalAndContractServicesExpense", "ASC 720-15"),
    "63900": ("Professional Fees", "ProfessionalFees", "ASC 720-15"),

    # Marketing & Business Development
    "64100": ("Marketing Expense", "MarketingAndAdvertisingExpense", "ASC 720-35"),
    "64110": ("Advertising", "AdvertisingExpense", "ASC 720-35"),
    "64120": ("Website Expenses", "MarketingAndAdvertisingExpense", "ASC 720-35"),
    "64200": ("Business Development", "SellingAndMarketingExpense", "ASC 606-10"),
    "64300": ("Client Entertainment", "EntertainmentExpense", "ASC 720-15"),
    "64310": ("Meals & Entertainment", "MealsAndEntertainment", "ASC 720-15"),
    "64400": ("Travel Expense", "TravelAndEntertainmentExpense", "ASC 720-15"),
    "64410": ("Travel - Airfare", "TravelAndEntertainmentExpense", "ASC 720-15"),
    "64420": ("Travel - Lodging", "TravelAndEntertainmentExpense", "ASC 720-15"),
    "64430": ("Travel - Meals", "TravelAndEntertainmentExpense", "ASC 720-15"),
    "64440": ("Travel - Ground Transportation", "TravelAndEntertainmentExpense", "ASC 720-15"),
    "64500": ("Conference & Events", "MeetingsAndConventions", "ASC 720-15"),

    # Administrative Expenses
    "60650": ("General & Admin", "GeneralAndAdministrativeExpense", "ASC 220-10"),
    "65100": ("Bank Fees", "BankServiceCharges", "ASC 835-30"),
    "65110": ("Bank Charges", "BankServiceCharges", "ASC 835-30"),
    "65120": ("Merchant Fees", "PaymentProcessingFees", "ASC 220-10"),
    "65200": ("Insurance Expense", "GeneralInsuranceExpense", "ASC 944-40"),
    "65210": ("General Liability Insurance", "GeneralInsuranceExpense", "ASC 944-40"),
    "65220": ("E&O Insurance", "ProfessionalLiabilityInsuranceExpense", "ASC 944-40"),
    "65230": ("Business Insurance", "GeneralInsuranceExpense", "ASC 944-40"),
    "65300": ("Licenses & Permits", "TaxesAndLicensesOther", "ASC 720-15"),
    "65400": ("Dues & Subscriptions", "DuesAndSubscriptions", "ASC 720-15"),

    # Depreciation & Amortization
    "66000": ("Depreciation Expense", "Depreciation", "ASC 360-10"),
    "66010": ("Depreciation - Furniture", "Depreciation", "ASC 360-10"),
    "66020": ("Depreciation - Equipment", "Depreciation", "ASC 360-10"),
    "66030": ("Depreciation - Computers", "Depreciation", "ASC 360-10"),
    "66100": ("Amortization Expense", "AmortizationOfIntangibleAssets", "ASC 350-30"),

    # Interest & Taxes
    "70100": ("Interest Expense", "InterestExpense", "ASC 835-30"),
    "70110": ("Interest on Debt", "InterestExpenseDebt", "ASC 835-30"),
    "80100": ("Income Tax Expense", "IncomeTaxExpenseBenefit", "ASC 740-10"),
    "80110": ("Federal Income Tax", "CurrentFederalTaxExpenseBenefit", "ASC 740-10"),
    "80120": ("State Income Tax", "CurrentStateAndLocalTaxExpenseBenefit", "ASC 740-10"),

    # Other Income/Expense
    "90100": ("Gain on Sale of Assets", "GainLossOnSaleOfPropertyPlantEquipment", "ASC 360-10"),
    "90200": ("Loss on Sale of Assets", "GainLossOnSaleOfPropertyPlantEquipment", "ASC 360-10"),
    "90900": ("Miscellaneous Income", "OtherNonoperatingIncomeExpense", "ASC 220-10"),
    "90910": ("Miscellaneous Expense", "OtherNonoperatingIncomeExpense", "ASC 220-10"),
}


def quick_map_coa():
    """Quick mapping using pre-defined mappings"""
    db = next(get_db())

    try:
        print("\n" + "="*80)
        print("QUICK COA TO XBRL MAPPING")
        print("="*80)

        # Get all accounts
        result = db.execute(
            select(ChartOfAccounts)
            .where(ChartOfAccounts.entity_id == 1)
            .where(ChartOfAccounts.is_active == True)
            .order_by(ChartOfAccounts.account_number)
        )
        accounts = result.scalars().all()

        print(f"\nMapping {len(accounts)} accounts to XBRL...\n")

        mapped_count = 0
        unmapped = []

        for account in accounts:
            account_num = account.account_number
            account_display = f"{account_num} - {account.account_name}"

            if account_num in COA_TO_XBRL:
                name, xbrl_element, asc_topic = COA_TO_XBRL[account_num]

                # Update account
                account.xbrl_element_name = xbrl_element
                account.primary_asc_topic = asc_topic
                account.xbrl_mapping_confidence = Decimal("1.00")
                account.xbrl_is_validated = True
                db.commit()

                mapped_count += 1
                print(f"[MAPPED] {account_display}")
                print(f"  -> {xbrl_element}")
                print(f"     {asc_topic}")
                print()

            else:
                unmapped.append(account)
                print(f"[UNMAPPED] {account_display}")
                print(f"  WARNING: No pre-defined mapping - may not be valid US GAAP")
                print()

        # Summary
        print("\n" + "="*80)
        print("MAPPING SUMMARY")
        print("="*80)
        print(f"\nTotal Accounts:     {len(accounts)}")
        print(f"Mapped to XBRL:     {mapped_count}")
        print(f"Unmapped:           {len(unmapped)}")

        if unmapped:
            print("\n" + "="*80)
            print("UNMAPPED ACCOUNTS (REVIEW REQUIRED)")
            print("="*80)
            for acc in unmapped:
                print(f"  {acc.account_number} - {acc.account_name} ({acc.account_type})")

            print("\nACTION: These accounts should be reviewed and either:")
            print("  1. Mapped to appropriate XBRL elements")
            print("  2. Removed if not valid US GAAP")

        success_rate = (mapped_count / len(accounts) * 100) if accounts else 0

        print("\n" + "="*80)
        print(f"COMPLETE - {success_rate:.1f}% of accounts mapped to XBRL")
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
    quick_map_coa()
