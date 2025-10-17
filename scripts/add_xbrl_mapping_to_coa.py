#!/usr/bin/env python3
"""
Add XBRL mapping columns to Chart of Accounts table

This script adds XBRL element mapping directly to the chart_of_accounts table
instead of creating a separate mapping table. This keeps the COA self-contained
and aligns with XBRL/US GAAP standards.
"""

import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from sqlalchemy import text
from services.api.database import get_db

def add_xbrl_columns():
    """Add XBRL mapping columns to chart_of_accounts table"""
    db = next(get_db())

    try:
        print("\n" + "="*80)
        print("ADDING XBRL MAPPING TO CHART OF ACCOUNTS")
        print("="*80)

        # Add columns one at a time with try/except for SQLite compatibility
        columns = [
            ("xbrl_element_name", "VARCHAR(255)"),
            ("primary_asc_topic", "VARCHAR(50)"),
            ("xbrl_mapping_confidence", "DECIMAL(3,2) DEFAULT 0.00"),
            ("xbrl_is_validated", "BOOLEAN DEFAULT FALSE"),
            ("xbrl_validated_by", "VARCHAR(255)"),
            ("xbrl_validated_at", "TIMESTAMP"),
        ]

        added_columns = []
        for col_name, col_type in columns:
            try:
                sql = f"ALTER TABLE chart_of_accounts ADD COLUMN {col_name} {col_type};"
                db.execute(text(sql))
                db.commit()
                added_columns.append(col_name)
                print(f"  + Added column: {col_name}")
            except Exception as e:
                if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                    print(f"  - Column already exists: {col_name}")
                else:
                    raise

        # Create indexes
        indexes = [
            ("idx_coa_xbrl_element", "xbrl_element_name"),
            ("idx_coa_asc_topic", "primary_asc_topic"),
        ]

        print("\nCreating indexes...")
        for idx_name, col_name in indexes:
            try:
                sql = f"CREATE INDEX IF NOT EXISTS {idx_name} ON chart_of_accounts({col_name});"
                db.execute(text(sql))
                db.commit()
                print(f"  + Created index: {idx_name}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"  - Index already exists: {idx_name}")
                else:
                    raise

        print("\n" + "="*80)
        print("SUCCESS! Chart of Accounts is ready for XBRL mapping")
        print("="*80)
        print(f"\nAdded {len(added_columns)} new columns")
        print("\nColumns Available:")
        print("  - xbrl_element_name         (VARCHAR 255)")
        print("  - primary_asc_topic         (VARCHAR 50)")
        print("  - xbrl_mapping_confidence   (DECIMAL 0-1)")
        print("  - xbrl_is_validated         (BOOLEAN)")
        print("  - xbrl_validated_by         (VARCHAR 255)")
        print("  - xbrl_validated_at         (TIMESTAMP)")

    except Exception as e:
        db.rollback()
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    add_xbrl_columns()
