"""
Database Migration: Bank Reconciliation US GAAP Compliance
Adds new fields to BankTransaction model for staging workflow

Run in Docker: python scripts/migrate_bank_reconciliation_us_gaap.py

Author: NGI Capital Development Team
Date: December 2025
"""

import asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy import text
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.api.database_async import get_async_database_url


async def migrate_bank_transactions():
    """
    Add new fields to bank_transactions table for US GAAP compliance
    """

    # Create async engine
    db_url = get_async_database_url()
    engine = create_async_engine(db_url, echo=True)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as db:
        print("\n" + "="*80)
        print("DATABASE MIGRATION: Bank Reconciliation US GAAP Compliance")
        print("="*80 + "\n")

        # Check if columns already exist (SQLite compatible)
        check_query = text("PRAGMA table_info(bank_transactions)")

        result = await db.execute(check_query)
        existing_columns = {row[1] for row in result}  # row[1] is column name in SQLite PRAGMA

        if 'suggested_account_id' in existing_columns and 'suggested_vendor_id' in existing_columns:
            print("Migration already applied. Skipping.")
            return

        print("Adding new fields to bank_transactions table...\n")

        # Add new columns
        migrations = [
            # Smart matching fields
            ("suggested_vendor_id", "INTEGER"),
            ("suggested_account_id", "INTEGER"),
            ("suggested_document_ids", "TEXT"),
            ("grouped_transaction_ids", "TEXT"),
            ("match_type", "VARCHAR(50)"),

            # Staging workflow
            ("needs_review", "BOOLEAN DEFAULT TRUE"),
            ("reviewed_at", "TIMESTAMP"),
            ("reviewed_by_id", "INTEGER"),

            # Recurring vendor detection
            ("is_recurring_vendor", "BOOLEAN DEFAULT FALSE"),
            ("recurring_vendor_name", "VARCHAR(255)"),
            ("recurring_pattern_id", "INTEGER"),
        ]

        for column_name, column_type in migrations:
            try:
                alter_query = text(
                    f"ALTER TABLE bank_transactions ADD COLUMN {column_name} {column_type}"
                )
                await db.execute(alter_query)
                print(f"  Added column: {column_name} ({column_type})")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"  Column {column_name} already exists, skipping...")
                else:
                    print(f"  Error adding {column_name}: {str(e)}")

        # Add foreign key constraints
        try:
            fk_query = text("""
                ALTER TABLE bank_transactions
                ADD CONSTRAINT fk_suggested_account
                FOREIGN KEY (suggested_account_id)
                REFERENCES chart_of_accounts(id)
            """)
            await db.execute(fk_query)
            print("  Added foreign key: suggested_account_id -> chart_of_accounts")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("  Foreign key already exists, skipping...")

        try:
            fk_query2 = text("""
                ALTER TABLE bank_transactions
                ADD CONSTRAINT fk_reviewed_by
                FOREIGN KEY (reviewed_by_id)
                REFERENCES partners(id)
            """)
            await db.execute(fk_query2)
            print("  Added foreign key: reviewed_by_id -> partners")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("  Foreign key already exists, skipping...")

        # Create indexes for performance
        indexes = [
            ("idx_bank_tx_needs_review", "needs_review"),
            ("idx_bank_tx_recurring", "is_recurring_vendor"),
            ("idx_bank_tx_suggested_account", "suggested_account_id"),
        ]

        for index_name, column_name in indexes:
            try:
                index_query = text(
                    f"CREATE INDEX {index_name} ON bank_transactions({column_name})"
                )
                await db.execute(index_query)
                print(f"  Created index: {index_name}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"  Index {index_name} already exists, skipping...")

        await db.commit()

        print("\n" + "="*80)
        print("MIGRATION COMPLETE")
        print("="*80)
        print("\nNew fields added to bank_transactions:")
        print("  - suggested_account_id (smart categorization)")
        print("  - suggested_document_ids (match suggestions)")
        print("  - grouped_transaction_ids (monthly aggregation)")
        print("  - match_type (single/monthly_aggregate/partial/split)")
        print("  - needs_review (staging workflow)")
        print("  - reviewed_at, reviewed_by_id (audit trail)")
        print("  - is_recurring_vendor, recurring_vendor_name (vendor detection)")
        print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(migrate_bank_transactions())
