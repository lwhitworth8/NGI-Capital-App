"""
Clean Old Journal Entries Script
Deletes all existing journal entries and related data to prepare for refactored system

Author: NGI Capital Development Team
Date: October 11, 2025
"""

import sqlite3
import os

def clean_journal_entries():
    """Delete all journal entries and related data"""

    print("=" * 80)
    print("CLEANING OLD JOURNAL ENTRIES")
    print("=" * 80)

    # Find database file - try multiple locations
    possible_paths = [
        'ngi_capital.db',
        './ngi_capital.db',
        os.path.join(os.path.dirname(__file__), '..', 'ngi_capital.db'),
        os.path.join(os.path.dirname(__file__), '..', 'db', 'ngi_capital.db'),
    ]

    db_path = None
    for path in possible_paths:
        if os.path.exists(path):
            db_path = path
            break

    if not db_path:
        print(f"\nERROR: Database not found in any of these locations:")
        for path in possible_paths:
            print(f"  - {path}")
        return

    print(f"\nDatabase: {db_path}")

    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check current counts
        cursor.execute("SELECT COUNT(*) FROM journal_entries")
        je_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM journal_entry_lines")
        jel_count = cursor.fetchone()[0]

        print(f"\nCurrent counts:")
        print(f"  Journal Entries: {je_count}")
        print(f"  Journal Entry Lines: {jel_count}")

        if je_count == 0:
            print("\nV No journal entries found. Database is already clean.")
            return

        # Confirm deletion
        print(f"\nWARNING: This will delete ALL {je_count} journal entries!")
        response = input("Type 'DELETE' to confirm: ")

        if response != "DELETE":
            print("\nX Operation cancelled.")
            return

        print("\nDeleting journal entry data...")

        # Delete in correct order due to foreign keys
        # 1. Agent validations (if table exists)
        try:
            cursor.execute("DELETE FROM agent_validations")
            print("  V Deleted agent validations")
        except sqlite3.OperationalError:
            print("  i No agent_validations table")

        # 2. Audit log
        cursor.execute("DELETE FROM journal_entry_audit_log")
        print("  V Deleted journal entry audit logs")

        # 3. Journal entry lines
        cursor.execute("DELETE FROM journal_entry_lines")
        print("  V Deleted journal entry lines")

        # 4. Bank transaction matches (if table exists)
        try:
            cursor.execute("DELETE FROM bank_transaction_matches")
            print("  V Deleted bank transaction matches")
        except sqlite3.OperationalError:
            print("  i No bank_transaction_matches table")

        # 5. Journal entries
        cursor.execute("DELETE FROM journal_entries")
        print("  V Deleted journal entries")

        # 6. Reset document processing status
        cursor.execute("""
            UPDATE accounting_documents
            SET processing_status = 'extracted'
            WHERE processing_status IN ('journal_entries_created', 'journal_creation_failed')
        """)
        print("  V Reset document processing status")

        # Commit changes
        conn.commit()

        # Verify cleanup
        cursor.execute("SELECT COUNT(*) FROM journal_entries")
        je_count_after = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM journal_entry_lines")
        jel_count_after = cursor.fetchone()[0]

        print(f"\nFinal counts:")
        print(f"  Journal Entries: {je_count_after}")
        print(f"  Journal Entry Lines: {jel_count_after}")

        if je_count_after == 0 and jel_count_after == 0:
            print("\nV SUCCESS: All journal entries deleted successfully!")
            print("  Ready for refactored JE system.")
        else:
            print("\nWARNING: Some entries may remain.")

    except Exception as e:
        print(f"\nX ERROR: {e}")
        conn.rollback()
        import traceback
        traceback.print_exc()

    finally:
        conn.close()


if __name__ == "__main__":
    clean_journal_entries()
