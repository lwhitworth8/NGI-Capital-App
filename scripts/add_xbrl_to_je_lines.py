"""
Add XBRL fields to journal_entry_lines table
This enables automatic GAAP compliance tagging for each JE line

Author: NGI Capital Development Team
Date: October 11, 2025
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text, create_engine
from services.api.config import get_database_path
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_engine():
    """Get database engine"""
    path = get_database_path()
    if not os.path.isabs(path):
        path = os.path.abspath(path)
    url = f"sqlite:///{path}"
    return create_engine(url, connect_args={"check_same_thread": False})


def add_xbrl_columns():
    """Add XBRL columns to journal_entry_lines table"""

    engine = get_engine()

    with engine.connect() as conn:
        # Check existing columns
        result = conn.execute(text("PRAGMA table_info(journal_entry_lines)"))
        existing_columns = {row[1] for row in result.fetchall()}
        logger.info(f"Existing columns: {existing_columns}")

        # Add columns only if they don't exist
        columns_to_add = [
            ("xbrl_element_name", "VARCHAR(255)"),
            ("primary_asc_topic", "VARCHAR(100)"),
            ("xbrl_standard_label", "VARCHAR(500)"),
        ]

        for column_name, column_type in columns_to_add:
            if column_name not in existing_columns:
                try:
                    logger.info(f"Adding column: {column_name} {column_type}")
                    conn.execute(text(f"ALTER TABLE journal_entry_lines ADD COLUMN {column_name} {column_type}"))
                    conn.commit()
                    logger.info(f"✓ Added {column_name}")
                except Exception as e:
                    logger.error(f"Error adding {column_name}: {e}")
                    raise
            else:
                logger.info(f"Column {column_name} already exists, skipping")

        # Create indexes
        indexes = [
            ("idx_jel_xbrl_element", "xbrl_element_name"),
            ("idx_jel_asc_topic", "primary_asc_topic"),
        ]

        for index_name, column_name in indexes:
            try:
                logger.info(f"Creating index: {index_name}")
                conn.execute(text(f"CREATE INDEX IF NOT EXISTS {index_name} ON journal_entry_lines({column_name})"))
                conn.commit()
                logger.info(f"✓ Created index {index_name}")
            except Exception as e:
                logger.warning(f"Index {index_name} may already exist: {e}")

    logger.info("✓ All XBRL columns added successfully to journal_entry_lines")


def backfill_xbrl_data():
    """
    Backfill XBRL data for existing journal entry lines
    by copying from their associated Chart of Accounts
    """

    engine = get_engine()

    # SQLite syntax for UPDATE with JOIN
    backfill_query = """
    UPDATE journal_entry_lines
    SET
        xbrl_element_name = (
            SELECT xbrl_element_name
            FROM chart_of_accounts
            WHERE chart_of_accounts.id = journal_entry_lines.account_id
        ),
        primary_asc_topic = (
            SELECT primary_asc_topic
            FROM chart_of_accounts
            WHERE chart_of_accounts.id = journal_entry_lines.account_id
        ),
        xbrl_standard_label = (
            SELECT xbrl_element_name
            FROM chart_of_accounts
            WHERE chart_of_accounts.id = journal_entry_lines.account_id
        )
    WHERE EXISTS (
        SELECT 1
        FROM chart_of_accounts
        WHERE chart_of_accounts.id = journal_entry_lines.account_id
        AND chart_of_accounts.xbrl_element_name IS NOT NULL
    )
    AND journal_entry_lines.xbrl_element_name IS NULL;
    """

    with engine.connect() as conn:
        try:
            logger.info("Backfilling XBRL data for existing journal entry lines...")
            result = conn.execute(text(backfill_query))
            conn.commit()
            logger.info(f"✓ Updated {result.rowcount} journal entry lines with XBRL data")
        except Exception as e:
            logger.error(f"Error during backfill: {e}")
            raise


if __name__ == "__main__":
    logger.info("Starting XBRL migration for journal_entry_lines...")

    # Step 1: Add columns
    add_xbrl_columns()

    # Step 2: Backfill existing data
    backfill_xbrl_data()

    logger.info("✓ XBRL migration completed successfully!")
    logger.info("Journal entry lines will now automatically receive XBRL/ASC tagging")
