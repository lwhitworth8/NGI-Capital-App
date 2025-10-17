#!/usr/bin/env python3
"""
Fix Suspense/Clearing account parent relationship
Account 10190 should have parent_account_id = 2 (10100 - Cash and Cash Equivalents)
"""
import sys
import os
sys.path.insert(0, os.path.abspath('.'))

# Fix Windows encoding issue
sys.stdout.reconfigure(encoding='utf-8')

import sqlite3

def fix_suspense_account():
    """Fix the parent relationship for Suspense/Clearing account"""

    # Connect to database
    conn = sqlite3.connect('./data/ngi_capital.db')
    cursor = conn.cursor()

    try:
        # Get the ID of account 10100 (Cash and Cash Equivalents)
        cursor.execute('''
            SELECT id, account_name FROM chart_of_accounts
            WHERE account_number = '10100' AND entity_id = 1
        ''')
        parent = cursor.fetchone()

        if not parent:
            print("❌ Parent account 10100 (Cash and Cash Equivalents) not found!")
            return False

        parent_id, parent_name = parent
        print(f"✓ Found parent account: {parent_id} - {parent_name}")

        # Get current Suspense account info
        cursor.execute('''
            SELECT id, parent_account_id FROM chart_of_accounts
            WHERE account_number = '10190' AND entity_id = 1
        ''')
        suspense = cursor.fetchone()

        if not suspense:
            print("❌ Suspense account 10190 not found!")
            return False

        suspense_id, current_parent = suspense
        print(f"✓ Found Suspense account: ID {suspense_id}, Current parent: {current_parent}")

        if current_parent == parent_id:
            print(f"✓ Suspense account already has correct parent ({parent_id})")
            return True

        # Update the parent_account_id
        cursor.execute('''
            UPDATE chart_of_accounts
            SET parent_account_id = ?
            WHERE id = ?
        ''', (parent_id, suspense_id))

        conn.commit()

        # Verify the change
        cursor.execute('''
            SELECT account_number, account_name, parent_account_id
            FROM chart_of_accounts
            WHERE id = ?
        ''', (suspense_id,))

        result = cursor.fetchone()
        print(f"\n✅ SUCCESS! Updated Suspense/Clearing account:")
        print(f"   Account: {result[0]} - {result[1]}")
        print(f"   Parent ID: {result[2]} (10100 - Cash and Cash Equivalents)")

        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Fixing Suspense/Clearing Account Parent Relationship")
    print("=" * 60)

    success = fix_suspense_account()

    if success:
        print("\n" + "=" * 60)
        print("✅ Fix completed successfully!")
    else:
        print("\n" + "=" * 60)
        print("❌ Fix failed!")
        sys.exit(1)
