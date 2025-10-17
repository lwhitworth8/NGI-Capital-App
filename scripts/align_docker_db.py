#!/usr/bin/env python3
"""
Align Docker Database with Local Database

Remove extra accounts that don't exist in the clean local COA.
These are venture capital, investment management, and R&D accounts
that are not needed for the core advisory/investment banking business.

Author: NGI Capital Development Team
Date: October 11, 2025
"""
import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from sqlalchemy import select
from services.api.database import get_db
from services.api.models_accounting import ChartOfAccounts


# Accounts to remove from Docker DB (not in local clean DB)
ACCOUNTS_TO_REMOVE = [
    "15440",  # Venture Capital Investments
    "15450",  # Real Estate Investments
    "20335",  # Deferred Advisory Fees
    "40150",  # Performance Fees
    "40155",  # Success Fees
    "40160",  # Carried Interest Revenue
    "40165",  # AUM-Based Fees
    "40170",  # Retainer Fees
    "60800",  # Investment Management
    "60810",  # Due Diligence Costs
    "60820",  # Portfolio Monitoring
    "60830",  # Fund Administration
    "65000",  # RESEARCH AND DEVELOPMENT (header)
    "65100",  # Software Development
    "65110",  # Development Salaries
    "65120",  # Development Tools and Licenses
    "65130",  # Cloud Development Infrastructure
    "65140",  # Testing and QA
    "65200",  # Product Research
    "65300",  # Prototype Development
]


def align_docker_database():
    """Remove extra accounts to align Docker DB with local DB"""
    db = next(get_db())

    try:
        print("\n" + "="*80)
        print("ALIGNING DOCKER DATABASE WITH LOCAL DATABASE")
        print("="*80)

        entity_id = 1
        removed_count = 0

        for account_num in ACCOUNTS_TO_REMOVE:
            result = db.execute(
                select(ChartOfAccounts)
                .where(ChartOfAccounts.entity_id == entity_id)
                .where(ChartOfAccounts.account_number == account_num)
            )
            account = result.scalar_one_or_none()

            if account:
                print(f"[REMOVING] {account.account_number} - {account.account_name}")
                db.delete(account)
                removed_count += 1

        db.commit()

        print(f"\nRemoved {removed_count} accounts")

        # Get final counts
        result = db.execute(
            select(ChartOfAccounts)
            .where(ChartOfAccounts.entity_id == entity_id)
        )
        all_accounts = result.scalars().all()

        posting_count = sum(1 for acc in all_accounts if acc.allow_posting)
        header_count = sum(1 for acc in all_accounts if not acc.allow_posting)
        mapped_count = sum(1 for acc in all_accounts if acc.allow_posting and acc.xbrl_element_name)

        print("\n" + "="*80)
        print("DATABASE ALIGNMENT COMPLETE")
        print("="*80)
        print(f"\nFinal Chart of Accounts:")
        print(f"  Total Accounts:        {len(all_accounts)}")
        print(f"  Posting Accounts:      {posting_count}")
        print(f"  Header Accounts:       {header_count}")
        print(f"  Mapped to XBRL:        {mapped_count}")

        mapping_rate = (mapped_count / posting_count * 100) if posting_count else 0
        print(f"\nXBRL Mapping Coverage:   {mapping_rate:.1f}%")

        if mapping_rate == 100.0:
            print("\nSTATUS: Docker DB now matches Local DB")
            print("        All posting accounts mapped to XBRL/US GAAP")
        else:
            unmapped_count = posting_count - mapped_count
            print(f"\nWARNING: {unmapped_count} accounts still unmapped")

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
    align_docker_database()
