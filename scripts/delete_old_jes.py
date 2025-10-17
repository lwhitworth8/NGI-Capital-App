"""
Delete old 4 journal entries from previous system
"""
import sqlite3
import sys

def delete_old_jes():
    db_path = '/app/data/ngi_capital.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get details first
    print("=" * 80)
    print("JOURNAL ENTRIES TO DELETE:")
    print("=" * 80)

    cursor.execute('''
        SELECT je.id, je.entry_number, je.memo, je.document_id,
               (SELECT COUNT(*) FROM journal_entry_lines WHERE journal_entry_id = je.id) as line_count
        FROM journal_entries je
        WHERE je.id IN (1,2,3,4)
        ORDER BY je.id
    ''')

    rows = cursor.fetchall()
    for row in rows:
        je_id, entry_num, memo, doc_id, line_count = row
        print(f"\nJE ID: {je_id}")
        print(f"  Entry Number: {entry_num}")
        print(f"  Document ID: {doc_id or 'None'}")
        print(f"  Lines: {line_count}")
        print(f"  Memo: {memo[:70] if memo else 'N/A'}...")

    print("\n" + "=" * 80)
    print(f"Total to delete: {len(rows)} journal entries")
    print("=" * 80)

    # Delete journal entry lines first (foreign key constraint)
    print("\nDeleting journal entry lines...")
    cursor.execute("DELETE FROM journal_entry_lines WHERE journal_entry_id IN (1,2,3,4)")
    lines_deleted = cursor.rowcount
    print(f"  ✓ Deleted {lines_deleted} journal entry lines")

    # Delete audit logs
    print("Deleting audit logs...")
    cursor.execute("DELETE FROM journal_entry_audit_log WHERE journal_entry_id IN (1,2,3,4)")
    audit_deleted = cursor.rowcount
    print(f"  ✓ Deleted {audit_deleted} audit log entries")

    # Delete journal entries
    print("Deleting journal entries...")
    cursor.execute("DELETE FROM journal_entries WHERE id IN (1,2,3,4)")
    jes_deleted = cursor.rowcount
    print(f"  ✓ Deleted {jes_deleted} journal entries")

    # Commit changes
    conn.commit()

    # Verify deletion
    cursor.execute("SELECT COUNT(*) FROM journal_entries")
    remaining = cursor.fetchone()[0]
    print(f"\n✓ SUCCESS! Remaining journal entries: {remaining}")

    conn.close()
    return True

if __name__ == "__main__":
    try:
        delete_old_jes()
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
