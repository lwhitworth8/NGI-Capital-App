#!/usr/bin/env python3
"""
Intelligent COA to XBRL Mapping Script

This script automatically maps NGI Capital's 191 Chart of Accounts to XBRL elements
using intelligent matching algorithms based on:
1. Account name keyword matching
2. Account type (Asset, Liability, Equity, Revenue, Expense)
3. Balance type (debit vs credit)
4. Industry-specific patterns

Author: NGI Capital Development Team
Date: October 11, 2025
"""
import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from sqlalchemy import select, update, text
from services.api.database import get_db
from services.api.models_accounting import ChartOfAccounts
from services.api.services.xbrl_taxonomy_service import get_xbrl_service
from typing import Dict, Optional, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Predefined high-confidence mappings for common accounts
EXACT_MAPPINGS = {
    # Cash & Banking
    "Cash - Operating Account": "CashAndCashEquivalents",
    "Cash - Payroll Account": "CashAndCashEquivalents",
    "Cash - Savings Account": "CashAndCashEquivalents",
    "Petty Cash": "CashAndCashEquivalents",

    # Accounts Receivable
    "Accounts Receivable": "AccountsReceivableCurrent",
    "Allowance for Doubtful Accounts": "AllowanceForDoubtfulAccountsReceivableCurrent",

    # Revenue
    "Advisory Fees": "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Consulting Revenue": "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Management Fees": "ManagementFeeRevenue",
    "Performance Fees": "PerformanceFees",
    "Investment Banking Fees": "InvestmentBankingRevenue",

    # Expenses - Operating
    "Salaries & Wages": "SalariesAndWages",
    "Payroll Taxes": "PayrollTaxExpense",
    "Employee Benefits": "EmployeeBenefitsAndShareBasedCompensation",
    "Health Insurance": "HealthInsuranceExpense",
    "Rent Expense": "OperatingLeaseExpense",
    "Office Supplies": "SuppliesExpense",
    "Legal Fees": "LegalFees",
    "Accounting Fees": "ProfessionalFees",
    "Marketing Expense": "MarketingAndAdvertisingExpense",
    "Travel Expense": "TravelAndEntertainmentExpense",
    "Meals & Entertainment": "MealsAndEntertainmentExpense",
    "Insurance Expense": "GeneralInsuranceExpense",
    "Bank Fees": "BankingAndFinancingFees",
    "Software Subscriptions": "InformationTechnologyAndDataProcessing",
    "Depreciation Expense": "DepreciationDepletionAndAmortization",

    # Equity - LLC
    "Member Capital": "PartnersCapitalAccount",
    "Member Distributions": "PaymentsOfDistributions",
    "Member Contributions": "ProceedsFromPartnersCapitalContribution",

    # Equity - C-Corp (for conversion)
    "Common Stock": "CommonStockValue",
    "Additional Paid-In Capital": "AdditionalPaidInCapital",
    "Retained Earnings": "RetainedEarningsAccumulatedDeficit",
    "Treasury Stock": "TreasuryStockValue",
    "Dividends Payable": "DividendsPayableCurrent",

    # Liabilities
    "Accounts Payable": "AccountsPayableCurrent",
    "Accrued Expenses": "AccruedLiabilitiesCurrent",
    "Income Tax Payable": "AccruedIncomeTaxesCurrent",
    "Deferred Revenue": "DeferredRevenueCurrent",
}


def calculate_similarity(account_name: str, xbrl_label: str) -> float:
    """
    Calculate similarity score between account name and XBRL label

    Returns:
        Float between 0.0 and 1.0 representing confidence
    """
    account_lower = account_name.lower()
    xbrl_lower = xbrl_label.lower()

    # Remove common words that don't add value
    stop_words = {'the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at'}

    account_words = set([w for w in account_lower.split() if w not in stop_words])
    xbrl_words = set([w for w in xbrl_lower.split() if w not in stop_words])

    if not account_words or not xbrl_words:
        return 0.0

    # Calculate Jaccard similarity
    intersection = account_words & xbrl_words
    union = account_words | xbrl_words

    if not union:
        return 0.0

    return len(intersection) / len(union)


def find_best_xbrl_match(
    account: ChartOfAccounts,
    xbrl_service
) -> Optional[Dict]:
    """
    Find the best XBRL element match for a COA account

    Returns:
        Dict with element_name, standard_label, primary_asc_topic, confidence
    """
    account_name = account.account_name

    # Check exact mappings first
    if account_name in EXACT_MAPPINGS:
        xbrl_element = EXACT_MAPPINGS[account_name]
        element_data = xbrl_service.get_element(xbrl_element)

        if element_data:
            return {
                'element_name': xbrl_element,
                'standard_label': element_data['standard_label'],
                'primary_asc_topic': element_data['primary_asc_topic'],
                'confidence': 1.00,
                'method': 'exact_mapping'
            }

    # Extract keywords from account name
    keywords = []

    # Split on common separators and take meaningful words
    for word in account_name.replace('-', ' ').replace('&', ' ').split():
        if len(word) > 2 and word.lower() not in ['the', 'and', 'for']:
            keywords.append(word)

    if not keywords:
        return None

    # Search for elements using primary keyword
    primary_keyword = keywords[0]
    search_results = xbrl_service.search_elements(primary_keyword, limit=50)

    if not search_results:
        return None

    # Calculate similarity scores for each result
    best_match = None
    best_score = 0.0

    for result in search_results:
        if not result.get('standard_label'):
            continue

        # Calculate similarity
        score = calculate_similarity(account_name, result['standard_label'])

        # Boost score if account type matches XBRL balance type
        if account.account_type and result.get('balance_type'):
            expected_balance = {
                'Asset': 'debit',
                'Expense': 'debit',
                'Liability': 'credit',
                'Equity': 'credit',
                'Revenue': 'credit'
            }.get(account.account_type)

            if expected_balance == result['balance_type']:
                score += 0.2  # 20% boost for matching balance type

        if score > best_score:
            best_score = score
            best_match = result

    if best_match and best_score > 0.3:  # Minimum 30% confidence
        return {
            'element_name': best_match['element_name'],
            'standard_label': best_match['standard_label'],
            'primary_asc_topic': best_match['primary_asc_topic'],
            'confidence': min(best_score, 1.0),
            'method': 'keyword_search'
        }

    return None


def map_all_accounts():
    """Map all COA accounts to XBRL elements"""
    db = next(get_db())
    xbrl_service = get_xbrl_service()

    try:
        print("\n" + "="*80)
        print("MAPPING CHART OF ACCOUNTS TO XBRL TAXONOMY")
        print("="*80)

        # Get all accounts
        result = db.execute(
            select(ChartOfAccounts)
            .where(ChartOfAccounts.entity_id == 1)
            .where(ChartOfAccounts.is_active == True)
            .order_by(ChartOfAccounts.account_number)
        )
        accounts = result.scalars().all()

        print(f"\nFound {len(accounts)} active accounts to map")
        print("\nStarting intelligent mapping...\n")

        # Statistics
        mapped_count = 0
        high_confidence_count = 0  # >= 0.90
        medium_confidence_count = 0  # 0.70 - 0.89
        low_confidence_count = 0  # 0.50 - 0.69
        very_low_confidence_count = 0  # < 0.50
        unmapped_count = 0

        # Process each account
        for account in accounts:
            account_display = f"{account.account_number} - {account.account_name}"

            try:
                match = find_best_xbrl_match(account, xbrl_service)

                if match:
                    # Update account with XBRL mapping
                    db.execute(
                        update(ChartOfAccounts)
                        .where(ChartOfAccounts.id == account.id)
                        .values(
                            xbrl_element_name=match['element_name'],
                            primary_asc_topic=match['primary_asc_topic'],
                            xbrl_mapping_confidence=match['confidence'],
                            xbrl_is_validated=False  # Requires manual validation
                        )
                    )
                    db.commit()

                    confidence = match['confidence']
                    method = match['method']

                    # Track confidence levels
                    if confidence >= 0.90:
                        high_confidence_count += 1
                        status = "HIGH CONFIDENCE"
                    elif confidence >= 0.70:
                        medium_confidence_count += 1
                        status = "MEDIUM"
                    elif confidence >= 0.50:
                        low_confidence_count += 1
                        status = "LOW"
                    else:
                        very_low_confidence_count += 1
                        status = "VERY LOW"

                    mapped_count += 1

                    print(f"[{status}] {account_display}")
                    print(f"  -> {match['element_name']}")
                    print(f"     {match['standard_label']}")
                    if match['primary_asc_topic']:
                        print(f"     ASC: {match['primary_asc_topic']}")
                    print(f"     Confidence: {confidence:.2f} ({method})")
                    print()

                else:
                    unmapped_count += 1
                    print(f"[UNMAPPED] {account_display}")
                    print(f"  -> No suitable XBRL element found")
                    print()

            except Exception as e:
                logger.error(f"Error mapping {account_display}: {e}")
                unmapped_count += 1
                continue

        # Summary
        print("\n" + "="*80)
        print("MAPPING SUMMARY")
        print("="*80)
        print(f"\nTotal Accounts:          {len(accounts)}")
        print(f"Successfully Mapped:     {mapped_count}")
        print(f"  - High Confidence:     {high_confidence_count}  (>= 0.90)")
        print(f"  - Medium Confidence:   {medium_confidence_count}  (0.70-0.89)")
        print(f"  - Low Confidence:      {low_confidence_count}  (0.50-0.69)")
        print(f"  - Very Low Confidence: {very_low_confidence_count}  (< 0.50)")
        print(f"Unmapped:                {unmapped_count}")

        mapping_rate = (mapped_count / len(accounts) * 100) if accounts else 0
        print(f"\nMapping Rate: {mapping_rate:.1f}%")

        if very_low_confidence_count > 0 or unmapped_count > 0:
            print("\nNOTE: Accounts with low confidence or unmapped require manual review")
            print("      Review these mappings in the UI and validate before using")

        print("\n" + "="*80)
        print("MAPPING COMPLETE - Ready for partner validation")
        print("="*80)

    except Exception as e:
        db.rollback()
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    map_all_accounts()
