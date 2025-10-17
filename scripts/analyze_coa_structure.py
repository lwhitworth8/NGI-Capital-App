#!/usr/bin/env python3
"""
Comprehensive COA Analysis for all NGI Entities
Checks hierarchy, XBRL mappings, and completeness
"""
import sys
import os
sys.path.insert(0, os.path.abspath('.'))
sys.stdout.reconfigure(encoding='utf-8')

import sqlite3
from collections import defaultdict

def analyze_coa():
    """Analyze COA structure for all entities"""

    conn = sqlite3.connect('./data/ngi_capital.db')
    cursor = conn.cursor()

    print("=" * 100)
    print(" NGI CAPITAL - CHART OF ACCOUNTS ANALYSIS".center(100))
    print("=" * 100)

    # Get all entities
    cursor.execute('SELECT id, entity_name, entity_type FROM accounting_entities ORDER BY id')
    entities = cursor.fetchall()

    print("\n📊 ENTITIES:")
    for e in entities:
        print(f"   {e[0]}. {e[1]} ({e[2]})")

    for entity_id, entity_name, entity_type in entities:
        print("\n" + "=" * 100)
        print(f" {entity_name}".center(100))
        print("=" * 100)

        # Get account count
        cursor.execute('SELECT COUNT(*) FROM chart_of_accounts WHERE entity_id = ?', (entity_id,))
        total_accounts = cursor.fetchone()[0]

        # Get accounts by type
        cursor.execute('''
            SELECT account_type, COUNT(*) FROM chart_of_accounts
            WHERE entity_id = ?
            GROUP BY account_type
        ''', (entity_id,))
        by_type = dict(cursor.fetchall())

        # Get parent accounts (no posting)
        cursor.execute('''
            SELECT COUNT(*) FROM chart_of_accounts
            WHERE entity_id = ? AND allow_posting = 0
        ''', (entity_id,))
        parent_count = cursor.fetchone()[0]

        # Get posting accounts
        posting_count = total_accounts - parent_count

        # Get accounts with XBRL
        cursor.execute('''
            SELECT COUNT(*) FROM chart_of_accounts
            WHERE entity_id = ? AND xbrl_element_name IS NOT NULL AND xbrl_element_name != ''
        ''', (entity_id,))
        xbrl_count = cursor.fetchone()[0]

        # Get accounts without parent (orphans)
        cursor.execute('''
            SELECT account_number, account_name, account_type
            FROM chart_of_accounts
            WHERE entity_id = ? AND parent_account_id IS NULL AND allow_posting = 1
        ''', (entity_id,))
        orphans = cursor.fetchall()

        print(f"\n📈 SUMMARY:")
        print(f"   Total Accounts:      {total_accounts}")
        print(f"   Parent Accounts:     {parent_count} (no posting)")
        print(f"   Posting Accounts:    {posting_count}")
        print(f"   With XBRL Mapping:   {xbrl_count}/{total_accounts} ({xbrl_count/total_accounts*100:.1f}%)")

        print(f"\n📂 BY TYPE:")
        for acct_type, count in sorted(by_type.items()):
            print(f"   {acct_type:15} {count:3}")

        if orphans:
            print(f"\n⚠️  ORPHAN POSTING ACCOUNTS (no parent):")
            for acc in orphans:
                print(f"   {acc[0]} - {acc[1]} ({acc[2]})")
        else:
            print(f"\n✅ No orphan posting accounts")

        # Check hierarchy structure
        print(f"\n🌳 HIERARCHY CHECK:")

        # Get top-level parents
        cursor.execute('''
            SELECT id, account_number, account_name, account_type
            FROM chart_of_accounts
            WHERE entity_id = ? AND parent_account_id IS NULL AND allow_posting = 0
            ORDER BY account_number
        ''', (entity_id,))
        top_level = cursor.fetchall()

        for parent_id, acc_num, acc_name, acc_type in top_level:
            # Count children
            cursor.execute('''
                WITH RECURSIVE children AS (
                    SELECT id FROM chart_of_accounts WHERE parent_account_id = ?
                    UNION ALL
                    SELECT c.id FROM chart_of_accounts c
                    JOIN children p ON c.parent_account_id = p.id
                )
                SELECT COUNT(*) FROM children
            ''', (parent_id,))
            child_count = cursor.fetchone()[0]

            print(f"   {acc_num} {acc_name:40} → {child_count} descendants")

        # Check for specific important accounts
        print(f"\n🔍 KEY ACCOUNTS CHECK:")

        key_accounts = [
            ('10110', 'Cash - Operating'),
            ('10190', 'Suspense/Clearing'),
            ('10310', 'Accounts Receivable'),
            ('20110', 'Accounts Payable'),
            ('30310', 'Retained Earnings - Current' if entity_type == 'C-Corporation' else 'Members Equity'),
            ('40110', 'Advisory/Service Revenue'),
            ('60110', 'Salaries')
        ]

        for acc_num, desc in key_accounts:
            cursor.execute('''
                SELECT account_number, account_name, parent_account_id, xbrl_element_name
                FROM chart_of_accounts
                WHERE entity_id = ? AND account_number = ?
            ''', (entity_id, acc_num))
            result = cursor.fetchone()

            if result:
                has_parent = "✓" if result[2] else "✗"
                has_xbrl = "✓" if result[3] else "✗"
                print(f"   ✓ {result[0]} {result[1]:40} Parent:{has_parent} XBRL:{has_xbrl}")
            else:
                print(f"   ✗ {acc_num} {desc:40} NOT FOUND")

    conn.close()

    print("\n" + "=" * 100)
    print("✅ ANALYSIS COMPLETE")
    print("=" * 100)

if __name__ == "__main__":
    analyze_coa()
