#!/usr/bin/env python3
"""
Add Parent Company Accounts for NGI Capital Structure

NGI Capital LLC (converting to C-Corp) is the parent company that owns:
- NGI Capital Advisory LLC (subsidiary)
- The Creator Terminal (subsidiary)

Need to add back:
1. Equity method investments for subsidiaries
2. Investment income (from subsidiaries)
3. Stock-based compensation (for future employee equity)

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


# Accounts to ADD BACK for parent company structure
PARENT_COMPANY_ACCOUNTS = [
    # ==========================================================================
    # EQUITY METHOD INVESTMENTS (ASC 323)
    # Parent company ownership of subsidiaries
    # ==========================================================================
    {
        "account_number": "15400",
        "account_name": "Investments - Long-term",
        "account_type": "Asset",
        "parent_account_id": None,
        "normal_balance": "Debit",
        "description": "Long-term investments in subsidiaries and other entities",
        "allow_posting": False,
        "xbrl_element_name": None,
        "primary_asc_topic": None,
        "xbrl_mapping_confidence": Decimal("0.00"),
    },
    {
        "account_number": "15410",
        "account_name": "Investment in NGI Capital Advisory LLC",
        "account_type": "Asset",
        "parent_account_id": None,  # Will be set to 15400's id
        "normal_balance": "Debit",
        "description": "Equity method investment in wholly-owned subsidiary NGI Capital Advisory LLC",
        "allow_posting": True,
        "xbrl_element_name": "EquityMethodInvestments",
        "primary_asc_topic": "ASC 323-10",
        "xbrl_mapping_confidence": Decimal("1.00"),
    },
    {
        "account_number": "15420",
        "account_name": "Investment in The Creator Terminal",
        "account_type": "Asset",
        "parent_account_id": None,  # Will be set to 15400's id
        "normal_balance": "Debit",
        "description": "Equity method investment in wholly-owned subsidiary The Creator Terminal",
        "allow_posting": True,
        "xbrl_element_name": "EquityMethodInvestments",
        "primary_asc_topic": "ASC 323-10",
        "xbrl_mapping_confidence": Decimal("1.00"),
    },
    {
        "account_number": "15430",
        "account_name": "Other Equity Method Investments",
        "account_type": "Asset",
        "parent_account_id": None,  # Will be set to 15400's id
        "normal_balance": "Debit",
        "description": "Equity method investments in other entities (20-50% ownership)",
        "allow_posting": True,
        "xbrl_element_name": "EquityMethodInvestments",
        "primary_asc_topic": "ASC 323-10",
        "xbrl_mapping_confidence": Decimal("1.00"),
    },

    # ==========================================================================
    # INVESTMENT INCOME (ASC 323)
    # Equity in earnings of subsidiaries
    # ==========================================================================
    {
        "account_number": "40200",
        "account_name": "Investment Income",
        "account_type": "Revenue",
        "parent_account_id": None,
        "normal_balance": "Credit",
        "description": "Income from investments in subsidiaries and other entities",
        "allow_posting": False,
        "xbrl_element_name": None,
        "primary_asc_topic": None,
        "xbrl_mapping_confidence": Decimal("0.00"),
    },
    {
        "account_number": "40220",
        "account_name": "Equity in Earnings of Subsidiaries",
        "account_type": "Revenue",
        "parent_account_id": None,  # Will be set to 40200's id
        "normal_balance": "Credit",
        "description": "Parent company's share of subsidiary net income (equity method)",
        "allow_posting": True,
        "xbrl_element_name": "IncomeLossFromEquityMethodInvestments",
        "primary_asc_topic": "ASC 323-10",
        "xbrl_mapping_confidence": Decimal("1.00"),
    },
    {
        "account_number": "40230",
        "account_name": "Dividend Income",
        "account_type": "Revenue",
        "parent_account_id": None,  # Will be set to 40200's id
        "normal_balance": "Credit",
        "description": "Dividends received from investments",
        "allow_posting": True,
        "xbrl_element_name": "DividendIncomeOperating",
        "primary_asc_topic": "ASC 323-10",
        "xbrl_mapping_confidence": Decimal("1.00"),
    },

    # ==========================================================================
    # STOCK-BASED COMPENSATION (ASC 718)
    # For employee equity incentives after C-Corp conversion
    # ==========================================================================
    {
        "account_number": "30220",
        "account_name": "APIC - Stock Options",
        "account_type": "Equity",
        "parent_account_id": None,  # Will be set to 30200's id (if exists)
        "normal_balance": "Credit",
        "description": "Additional paid-in capital from stock option exercises",
        "allow_posting": True,
        "xbrl_element_name": "AdditionalPaidInCapitalSharebasedCompensationRequisiteServicePeriodRecognitionValue",
        "primary_asc_topic": "ASC 718-10",
        "xbrl_mapping_confidence": Decimal("1.00"),
    },
    {
        "account_number": "60140",
        "account_name": "Stock-Based Compensation Expense",
        "account_type": "Expense",
        "parent_account_id": None,  # Will be set to 60100's id (if exists)
        "normal_balance": "Debit",
        "description": "Non-cash compensation expense for employee stock options and RSUs",
        "allow_posting": True,
        "xbrl_element_name": "ShareBasedCompensation",
        "primary_asc_topic": "ASC 718-10",
        "xbrl_mapping_confidence": Decimal("1.00"),
    },
]


def add_parent_company_accounts():
    """Add back accounts needed for parent company structure"""
    db = next(get_db())

    try:
        print("\n" + "="*80)
        print("ADDING PARENT COMPANY ACCOUNTS")
        print("="*80)
        print("\nNGI Capital LLC Structure:")
        print("  Parent: NGI Capital LLC (converting to C-Corp)")
        print("  Subsidiary 1: NGI Capital Advisory LLC")
        print("  Subsidiary 2: The Creator Terminal")
        print()

        # Get entity_id
        entity_id = 1

        # Find parent account IDs
        parent_accounts = {}
        for parent_num in ["15400", "40200", "30200", "60100"]:
            result = db.execute(
                select(ChartOfAccounts)
                .where(ChartOfAccounts.entity_id == entity_id)
                .where(ChartOfAccounts.account_number == parent_num)
            )
            parent = result.scalar_one_or_none()
            if parent:
                parent_accounts[parent_num] = parent.id

        added_count = 0

        for account_data in PARENT_COMPANY_ACCOUNTS:
            account_num = account_data["account_number"]

            # Check if account already exists
            result = db.execute(
                select(ChartOfAccounts)
                .where(ChartOfAccounts.entity_id == entity_id)
                .where(ChartOfAccounts.account_number == account_num)
            )
            existing = result.scalar_one_or_none()

            if existing:
                # Update existing account
                print(f"[UPDATING] {account_num} - {account_data['account_name']}")

                existing.xbrl_element_name = account_data.get("xbrl_element_name")
                existing.primary_asc_topic = account_data.get("primary_asc_topic")
                existing.xbrl_mapping_confidence = account_data.get("xbrl_mapping_confidence", Decimal("0.00"))
                existing.xbrl_is_validated = (account_data.get("xbrl_mapping_confidence", Decimal("0.00")) == Decimal("1.00"))
                existing.description = account_data.get("description")

                db.commit()

                if account_data.get("xbrl_element_name"):
                    print(f"  -> {account_data['xbrl_element_name']}")
                    print(f"     {account_data['primary_asc_topic']}")
                print()

            else:
                # Create new account
                print(f"[ADDING] {account_num} - {account_data['account_name']}")

                # Determine parent account ID
                parent_id = None
                if account_num.startswith("154") and account_num != "15400":
                    parent_id = parent_accounts.get("15400")
                elif account_num.startswith("402") and account_num != "40200":
                    parent_id = parent_accounts.get("40200")
                elif account_num == "30220":
                    parent_id = parent_accounts.get("30200")
                elif account_num == "60140":
                    parent_id = parent_accounts.get("60100")

                new_account = ChartOfAccounts(
                    entity_id=entity_id,
                    account_number=account_data["account_number"],
                    account_name=account_data["account_name"],
                    account_type=account_data["account_type"],
                    parent_account_id=parent_id,
                    normal_balance=account_data["normal_balance"],
                    description=account_data.get("description"),
                    allow_posting=account_data["allow_posting"],
                    is_active=True,
                    xbrl_element_name=account_data.get("xbrl_element_name"),
                    primary_asc_topic=account_data.get("primary_asc_topic"),
                    xbrl_mapping_confidence=account_data.get("xbrl_mapping_confidence", Decimal("0.00")),
                    xbrl_is_validated=(account_data.get("xbrl_mapping_confidence", Decimal("0.00")) == Decimal("1.00")),
                )

                db.add(new_account)
                db.commit()

                added_count += 1

                if account_data.get("xbrl_element_name"):
                    print(f"  -> {account_data['xbrl_element_name']}")
                    print(f"     {account_data['primary_asc_topic']}")
                print()

        # Final count
        result = db.execute(
            select(ChartOfAccounts)
            .where(ChartOfAccounts.entity_id == entity_id)
        )
        all_accounts = result.scalars().all()

        posting_count = sum(1 for acc in all_accounts if acc.allow_posting)
        header_count = sum(1 for acc in all_accounts if not acc.allow_posting)

        # Count mapped accounts
        mapped_count = sum(1 for acc in all_accounts if acc.allow_posting and acc.xbrl_element_name)

        print("\n" + "="*80)
        print("SUMMARY")
        print("="*80)
        print(f"\nAccounts Added:          {added_count}")
        print(f"\nFinal Chart of Accounts:")
        print(f"  Total Accounts:        {len(all_accounts)}")
        print(f"  Posting Accounts:      {posting_count}")
        print(f"  Header Accounts:       {header_count}")
        print(f"  Mapped to XBRL:        {mapped_count}")

        mapping_rate = (mapped_count / posting_count * 100) if posting_count else 0
        print(f"\nXBRL Mapping Coverage:   {mapping_rate:.1f}%")

        # List the parent company accounts
        print("\n" + "="*80)
        print("PARENT COMPANY ACCOUNTS")
        print("="*80)
        print("\nEquity Method Investments (ASC 323-10):")
        print("  15410 - Investment in NGI Capital Advisory LLC")
        print("  15420 - Investment in The Creator Terminal")
        print("  15430 - Other Equity Method Investments")
        print("\nInvestment Income (ASC 323-10):")
        print("  40220 - Equity in Earnings of Subsidiaries")
        print("  40230 - Dividend Income")
        print("\nStock-Based Compensation (ASC 718-10):")
        print("  30220 - APIC - Stock Options")
        print("  60140 - Stock-Based Compensation Expense")

        print("\n" + "="*80)
        print("PARENT COMPANY ACCOUNTS ADDED")
        print("Chart of Accounts ready for holding company structure")
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
    add_parent_company_accounts()
