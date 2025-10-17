"""
Cleanup Script - Delete Auto-Generated Journal Entries from Bank Sync
This script removes all JEs that were automatically created by Mercury sync
before the US GAAP refactoring.

Run this in Docker: python scripts/cleanup_auto_generated_jes.py

Author: NGI Capital Development Team
Date: December 2025
"""

import asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy import select, and_, func, delete
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.api.models_accounting import JournalEntry, JournalEntryLine
from services.api.models_accounting_part2 import BankTransaction
from services.api.database_async import get_async_database_url


async def cleanup_auto_generated_jes():
    """
    Delete all journal entries that were auto-created from Mercury sync
    Criteria:
    1. source_type = 'Mercury'
    2. created_by_email = 'mercury-sync@system'
    3. status = 'draft'
    """

    # Create async engine
    db_url = get_async_database_url()
    engine = create_async_engine(db_url, echo=True)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as db:
        print("\n" + "="*80)
        print("CLEANUP: Auto-Generated Journal Entries from Mercury Sync")
        print("="*80 + "\n")

        # Count JEs to be deleted
        count_result = await db.execute(
            select(func.count(JournalEntry.id)).where(
                and_(
                    JournalEntry.source_type == "Mercury",
                    JournalEntry.created_by_email == "mercury-sync@system"
                )
            )
        )
        total_jes = count_result.scalar()

        if total_jes == 0:
            print("No auto-generated JEs found. Database is clean.")
            return

        print(f"Found {total_jes} auto-generated journal entries to delete.")
        print("\nThese JEs were created before US GAAP refactoring and need to be removed.")
        print("Bank transactions will be preserved - they're now in staging for proper matching.\n")

        confirm = input(f"Delete {total_jes} journal entries? (yes/no): ")

        if confirm.lower() != "yes":
            print("Aborted. No changes made.")
            return

        print("\nDeleting...")

        # Get all JE IDs to delete
        je_ids_result = await db.execute(
            select(JournalEntry.id).where(
                and_(
                    JournalEntry.source_type == "Mercury",
                    JournalEntry.created_by_email == "mercury-sync@system"
                )
            )
        )
        je_ids = [row[0] for row in je_ids_result]

        # Delete JE lines first (foreign key constraint)
        if je_ids:
            deleted_lines_result = await db.execute(
                delete(JournalEntryLine).where(
                    JournalEntryLine.journal_entry_id.in_(je_ids)
                )
            )
            deleted_lines = deleted_lines_result.rowcount
            print(f"  Deleted {deleted_lines} journal entry lines")

        # Delete JEs
        deleted_jes_result = await db.execute(
            delete(JournalEntry).where(
                and_(
                    JournalEntry.source_type == "Mercury",
                    JournalEntry.created_by_email == "mercury-sync@system"
                )
            )
        )
        deleted_jes = deleted_jes_result.rowcount
        print(f"  Deleted {deleted_jes} journal entries")

        # Update bank transactions - remove matched_journal_entry_id
        updated_txns_result = await db.execute(
            select(BankTransaction).where(
                BankTransaction.matched_journal_entry_id.in_(je_ids)
            )
        )
        bank_txns = updated_txns_result.scalars().all()

        for txn in bank_txns:
            txn.matched_journal_entry_id = None
            txn.status = "unmatched"
            txn.needs_review = True

        print(f"  Updated {len(bank_txns)} bank transactions (unlinked from deleted JEs)")

        await db.commit()

        print("\n" + "="*80)
        print("CLEANUP COMPLETE")
        print("="*80)
        print(f"\nDeleted: {deleted_jes} journal entries + {deleted_lines} lines")
        print(f"Updated: {len(bank_txns)} bank transactions")
        print("\nNext steps:")
        print("  1. Bank transactions are now in 'unmatched' staging")
        print("  2. Upload invoices/receipts to trigger smart matching")
        print("  3. System will suggest matches and create DRAFT JEs")
        print("  4. Review and approve JEs with supporting docs")
        print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(cleanup_auto_generated_jes())
