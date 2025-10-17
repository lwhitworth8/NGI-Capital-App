#!/usr/bin/env python3
"""
Fix Investment and Investment Income parent-child relationships
15400 should be parent of 15410, 15420, 15430 (but child of 15000)
40200 should be parent of 40210, 40220, 40230 (but child of 40000)
"""
import sys
import os
sys.path.insert(0, os.path.abspath('.'))
sys.stdout.reconfigure(encoding='utf-8')

import sqlite3

def fix_investment_parents():
    """Fix parent relationships for investment accounts"""

    conn = sqlite3.connect('./data/ngi_capital.db')
    cursor = conn.cursor()

    try:
        # Get all entities
        cursor.execute('SELECT id, entity_name FROM accounting_entities ORDER BY id')
        entities = cursor.fetchall()

        print("=" * 100)
        print("FIXING INVESTMENT ACCOUNT PARENT RELATIONSHIPS")
        print("=" * 100)

        for entity_id, entity_name in entities:
            print(f"\n[{entity_name}] Entity {entity_id}")
            print("-" * 100)

            # ========================================
            # FIX 15400 - Investments Long-term
            # ========================================

            # Get ID of 15000 (NON-CURRENT ASSETS - top parent)
            cursor.execute('''
                SELECT id FROM chart_of_accounts
                WHERE entity_id = ? AND account_number = '15000'
            ''', (entity_id,))

            parent_15000 = cursor.fetchone()
            if not parent_15000:
                print(f"   [WARNING] Account 15000 not found - skipping 15400 series")
                continue

            parent_15000_id = parent_15000[0]

            # Make 15400 a sub-parent: parent of its children, but child of 15000
            cursor.execute('''
                UPDATE chart_of_accounts
                SET allow_posting = 0,
                    parent_account_id = ?
                WHERE entity_id = ? AND account_number = '15400'
            ''', (parent_15000_id, entity_id))

            # Get ID of 15400
            cursor.execute('''
                SELECT id FROM chart_of_accounts
                WHERE entity_id = ? AND account_number = '15400'
            ''', (entity_id,))

            result = cursor.fetchone()
            if not result:
                print(f"   [WARNING] Account 15400 not found - skipping")
                continue

            parent_15400_id = result[0]
            print(f"   [OK] Account 15400 set as sub-parent (parent: 15000, allow_posting=False)")

            # Update children: 15410, 15420, 15430
            child_accounts_15 = ['15410', '15420', '15430']
            for child_num in child_accounts_15:
                cursor.execute('''
                    UPDATE chart_of_accounts
                    SET parent_account_id = ?
                    WHERE entity_id = ? AND account_number = ?
                ''', (parent_15400_id, entity_id, child_num))

                if cursor.rowcount > 0:
                    # Get account name
                    cursor.execute('''
                        SELECT account_name FROM chart_of_accounts
                        WHERE entity_id = ? AND account_number = ?
                    ''', (entity_id, child_num))
                    name = cursor.fetchone()
                    if name:
                        print(f"   [OK] {child_num} {name[0]:50} -> parent: 15400")
                else:
                    print(f"   [WARNING] Account {child_num} not found")

            # ========================================
            # FIX 40200 - Investment Income
            # ========================================

            # Get ID of 40000 (REVENUE - top parent)
            cursor.execute('''
                SELECT id FROM chart_of_accounts
                WHERE entity_id = ? AND account_number = '40000'
            ''', (entity_id,))

            parent_40000 = cursor.fetchone()
            if not parent_40000:
                print(f"   [WARNING] Account 40000 not found - skipping 40200 series")
                continue

            parent_40000_id = parent_40000[0]

            # Make 40200 a sub-parent: parent of its children, but child of 40000
            cursor.execute('''
                UPDATE chart_of_accounts
                SET allow_posting = 0,
                    parent_account_id = ?
                WHERE entity_id = ? AND account_number = '40200'
            ''', (parent_40000_id, entity_id))

            # Get ID of 40200
            cursor.execute('''
                SELECT id FROM chart_of_accounts
                WHERE entity_id = ? AND account_number = '40200'
            ''', (entity_id,))

            result = cursor.fetchone()
            if not result:
                print(f"   [WARNING] Account 40200 not found - skipping")
                continue

            parent_40200_id = result[0]
            print(f"   [OK] Account 40200 set as sub-parent (parent: 40000, allow_posting=False)")

            # Update children: 40210, 40220, 40230
            child_accounts_40 = ['40210', '40220', '40230']
            for child_num in child_accounts_40:
                cursor.execute('''
                    UPDATE chart_of_accounts
                    SET parent_account_id = ?
                    WHERE entity_id = ? AND account_number = ?
                ''', (parent_40200_id, entity_id, child_num))

                if cursor.rowcount > 0:
                    # Get account name
                    cursor.execute('''
                        SELECT account_name FROM chart_of_accounts
                        WHERE entity_id = ? AND account_number = ?
                    ''', (entity_id, child_num))
                    name = cursor.fetchone()
                    if name:
                        print(f"   [OK] {child_num} {name[0]:50} -> parent: 40200")
                else:
                    print(f"   [WARNING] Account {child_num} not found")

        conn.commit()

        # ========================================
        # VERIFICATION
        # ========================================
        print("\n" + "=" * 100)
        print("VERIFICATION - CHECKING ALL ENTITIES")
        print("=" * 100)

        for entity_id, entity_name in entities:
            print(f"\n[{entity_name}]")

            # Check 15400 series
            cursor.execute('''
                SELECT account_number, account_name, parent_account_id, allow_posting
                FROM chart_of_accounts
                WHERE entity_id = ? AND account_number IN ('15400', '15410', '15420', '15430')
                ORDER BY account_number
            ''', (entity_id,))

            print("   15400 Series (Investments):")
            for row in cursor.fetchall():
                parent = f"Parent:{row[2]}" if row[2] else "Parent:None"
                posting = "Posting:Yes" if row[3] else "Posting:No"
                print(f"      {row[0]} {row[1]:45} {parent:15} {posting}")

            # Check 40200 series
            cursor.execute('''
                SELECT account_number, account_name, parent_account_id, allow_posting
                FROM chart_of_accounts
                WHERE entity_id = ? AND account_number IN ('40200', '40210', '40220', '40230')
                ORDER BY account_number
            ''', (entity_id,))

            print("   40200 Series (Investment Income):")
            for row in cursor.fetchall():
                parent = f"Parent:{row[2]}" if row[2] else "Parent:None"
                posting = "Posting:Yes" if row[3] else "Posting:No"
                print(f"      {row[0]} {row[1]:45} {parent:15} {posting}")

        print("\n" + "=" * 100)
        print("[SUCCESS] ALL INVESTMENT ACCOUNT PARENTS FIXED!")
        print("=" * 100)

        return True

    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = fix_investment_parents()
    if not success:
        sys.exit(1)
