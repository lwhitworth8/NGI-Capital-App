"""
Delete Old Journal Entries - PostgreSQL Version
Connects directly to PostgreSQL database to delete all journal entries
"""

import psycopg2
import os

def delete_old_jes():
    """Delete all journal entries from PostgreSQL database"""

    print("=" * 80)
    print("DELETING OLD JOURNAL ENTRIES FROM POSTGRESQL")
    print("=" * 80)

    # Get database connection from environment
    db_url = os.getenv('DATABASE_URL', 'postgresql+psycopg2://postgres:postgres@localhost:5432/creator_terminal')

    # Parse connection string
    # Format: postgresql+psycopg2://user:password@host:port/database
    if 'postgresql' in db_url:
        db_url = db_url.replace('postgresql+psycopg2://', '').replace('postgresql://', '')

    print(f"\nConnecting to database...")

    try:
        # Connect using psycopg2 format
        conn = psycopg2.connect(
            dbname="creator_terminal",
            user="postgres",
            password="postgres",
            host="localhost",
            port="5432"
        )
        cursor = conn.cursor()
        print("✓ Connected to PostgreSQL database")

        # Check current counts
        cursor.execute("SELECT COUNT(*) FROM journal_entries")
        je_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM journal_entry_lines")
        jel_count = cursor.fetchone()[0]

        print(f"\nCurrent counts:")
        print(f"  Journal Entries: {je_count}")
        print(f"  Journal Entry Lines: {jel_count}")

        if je_count == 0:
            print("\n✓ No journal entries found. Database is already clean.")
            return

        # Confirm deletion
        print(f"\n⚠ WARNING: This will delete ALL {je_count} journal entries!")
        response = input("Type 'DELETE' to confirm: ")

        if response != "DELETE":
            print("\n✗ Operation cancelled.")
            return

        print("\nDeleting journal entry data...")

        # Delete in correct order due to foreign keys
        # 1. Agent validations (if table exists)
        try:
            cursor.execute("DELETE FROM agent_validations")
            conn.commit()
            print("  ✓ Deleted agent_validations")
        except Exception as e:
            print(f"  ℹ No agent_validations table: {e}")
            conn.rollback()

        # 2. Audit log
        cursor.execute("DELETE FROM journal_entry_audit_log")
        conn.commit()
        print("  ✓ Deleted journal_entry_audit_log")

        # 3. Journal entry lines
        cursor.execute("DELETE FROM journal_entry_lines")
        conn.commit()
        print("  ✓ Deleted journal_entry_lines")

        # 4. Bank transaction matches (if table exists)
        try:
            cursor.execute("DELETE FROM bank_transaction_matches")
            conn.commit()
            print("  ✓ Deleted bank_transaction_matches")
        except Exception as e:
            print(f"  ℹ No bank_transaction_matches: {e}")
            conn.rollback()

        # 5. Journal entries
        cursor.execute("DELETE FROM journal_entries")
        conn.commit()
        print("  ✓ Deleted journal_entries")

        # 6. Reset document processing status
        cursor.execute("""
            UPDATE accounting_documents
            SET processing_status = 'extracted',
                workflow_status = 'pending'
            WHERE processing_status IN ('journal_entries_created', 'journal_creation_failed', 'journal_entry_created')
        """)
        conn.commit()
        print("  ✓ Reset document processing status")

        # Verify cleanup
        cursor.execute("SELECT COUNT(*) FROM journal_entries")
        je_count_after = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM journal_entry_lines")
        jel_count_after = cursor.fetchone()[0]

        print(f"\nFinal counts:")
        print(f"  Journal Entries: {je_count_after}")
        print(f"  Journal Entry Lines: {jel_count_after}")

        if je_count_after == 0 and jel_count_after == 0:
            print("\n✓ SUCCESS: All journal entries deleted successfully!")
            print("  Database is clean and ready for new JE system.")
            print("\n  Next steps:")
            print("  1. Restart your backend")
            print("  2. Documents will auto-create JEs on next upload")
            print("  3. Or call /api/admin/cleanup/reprocess-documents-for-jes to process existing docs")
        else:
            print("\n⚠ WARNING: Some entries may remain.")

    except psycopg2.Error as e:
        print(f"\n✗ DATABASE ERROR: {e}")
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if 'conn' in locals():
            cursor.close()
            conn.close()
            print("\n✓ Database connection closed")


if __name__ == "__main__":
    delete_old_jes()
