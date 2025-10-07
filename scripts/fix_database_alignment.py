#!/usr/bin/env python3
"""
Database Alignment Script - Fix Email Domains and Data Consistency
Fixes:
1. Partner email domains from @ngicapital.com to @ngicapitaladvisory.com
2. Aligns partners table with employees table
3. Ensures consistent data across all modules
4. Creates proper entity-employee relationships

Author: NGI Capital Development Team
Date: October 2025
"""

import sqlite3
import sys
from pathlib import Path
from datetime import datetime

def get_db_path():
    """Find the correct database path"""
    candidates = [
        'data/ngi_capital.db',
        'ngi_capital.db',
        './data/ngi_capital.db'
    ]
    for path in candidates:
        if Path(path).exists():
            return path
    # Default to data/ngi_capital.db
    return 'data/ngi_capital.db'

def fix_database_alignment():
    """Main alignment function"""
    db_path = get_db_path()
    print(f"Using database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("\n" + "="*80)
    print("DATABASE ALIGNMENT SCRIPT")
    print("="*80)
    
    # Step 1: Fix email domain constraint
    print("\n[1/6] Checking partner email domains...")
    cursor.execute("SELECT id, email, name FROM partners WHERE is_active = 1")
    partners = cursor.fetchall()
    
    for partner_id, email, name in partners:
        if '@ngicapital.com' in email and '@ngicapitaladvisory.com' not in email:
            new_email = email.replace('@ngicapital.com', '@ngicapitaladvisory.com')
            print(f"   Updating: {email} → {new_email}")
            cursor.execute("UPDATE partners SET email = ? WHERE id = ?", (new_email, partner_id))
        elif not email.endswith('@ngicapitaladvisory.com'):
            print(f"   ⚠️  WARNING: Partner {name} has non-standard email: {email}")
    
    conn.commit()
    print("   ✅ Partner emails aligned to @ngicapitaladvisory.com")
    
    # Step 2: Verify entities exist
    print("\n[2/6] Verifying entities...")
    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='entities'")
    if cursor.fetchone()[0] == 0:
        print("   ⚠️  Entities table doesn't exist. Run init_database.py first!")
        return
    
    cursor.execute("SELECT id, legal_name, entity_type FROM entities WHERE is_active = 1")
    entities = cursor.fetchall()
    print(f"   Found {len(entities)} active entities:")
    for ent_id, legal_name, entity_type in entities:
        print(f"      - {legal_name} ({entity_type})")
    
    # Step 3: Check accounting_entities table
    print("\n[3/6] Checking accounting_entities table...")
    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='accounting_entities'")
    has_acc_entities = cursor.fetchone()[0] > 0
    
    if has_acc_entities:
        cursor.execute("SELECT id, entity_name, entity_type, entity_status FROM accounting_entities")
        acc_entities = cursor.fetchall()
        print(f"   Found {len(acc_entities)} accounting entities:")
        for acc_id, name, etype, status in acc_entities:
            print(f"      - {name} ({etype}) - Status: {status}")
    else:
        print("   ⚠️  accounting_entities table doesn't exist yet")
    
    # Step 4: Align employees with partners
    print("\n[4/6] Aligning employees table with partners...")
    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='employees'")
    has_employees = cursor.fetchone()[0] > 0
    
    if not has_employees:
        print("   Creating employees table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                title TEXT,
                role TEXT,
                classification TEXT,
                status TEXT DEFAULT 'active',
                employment_type TEXT,
                start_date TEXT,
                end_date TEXT,
                team_id INTEGER,
                manager_id INTEGER,
                is_deleted INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
        conn.commit()
        print("   ✅ Employees table created")
    
    # Get NGI Capital LLC entity ID
    cursor.execute("SELECT id FROM entities WHERE legal_name LIKE '%NGI Capital%' AND entity_type LIKE '%LLC%' LIMIT 1")
    ngi_llc_row = cursor.fetchone()
    ngi_llc_entity_id = ngi_llc_row[0] if ngi_llc_row else 1
    
    # Create employee records for partners if they don't exist
    print(f"   Creating/updating employee records for partners (entity_id={ngi_llc_entity_id})...")
    cursor.execute("SELECT id, email, name FROM partners WHERE is_active = 1")
    partners = cursor.fetchall()
    
    for partner_id, email, name in partners:
        # Check if employee exists
        cursor.execute("SELECT id FROM employees WHERE email = ?", (email,))
        existing = cursor.fetchone()
        
        if not existing:
            # Determine title based on name
            if 'Landon' in name or 'Whitworth' in name:
                title = 'CEO & Co-Founder'
            elif 'Andre' in name or 'Nurmamade' in name:
                title = 'Co-Founder, CFO & COO'
            else:
                title = 'Partner'
            
            cursor.execute("""
                INSERT INTO employees (entity_id, name, email, title, role, classification, status, employment_type, start_date)
                VALUES (?, ?, ?, ?, 'Executive', 'full_time', 'active', 'full_time', date('now'))
            """, (ngi_llc_entity_id, name, email, title))
            print(f"      ✅ Created employee: {name} ({email})")
        else:
            print(f"      ℹ️  Employee already exists: {name}")
    
    conn.commit()
    
    # Step 5: Verify advisory_projects table
    print("\n[5/6] Checking advisory_projects table...")
    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='advisory_projects'")
    has_advisory = cursor.fetchone()[0] > 0
    
    if has_advisory:
        cursor.execute("SELECT COUNT(*) FROM advisory_projects")
        count = cursor.fetchone()[0]
        print(f"   Found {count} advisory projects")
        
        if count > 0:
            cursor.execute("SELECT id, project_name, status FROM advisory_projects LIMIT 5")
            projects = cursor.fetchall()
            for proj_id, proj_name, status in projects:
                print(f"      - {proj_name} ({status})")
    else:
        print("   ⚠️  advisory_projects table doesn't exist yet")
    
    # Step 6: Summary and recommendations
    print("\n[6/6] Database Alignment Summary")
    print("="*80)
    
    # Count records
    cursor.execute("SELECT COUNT(*) FROM partners WHERE is_active = 1")
    partner_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM entities WHERE is_active = 1")
    entity_count = cursor.fetchone()[0]
    
    if has_employees:
        cursor.execute("SELECT COUNT(*) FROM employees WHERE is_deleted = 0")
        employee_count = cursor.fetchone()[0]
    else:
        employee_count = 0
    
    if has_advisory:
        cursor.execute("SELECT COUNT(*) FROM advisory_projects")
        advisory_count = cursor.fetchone()[0]
    else:
        advisory_count = 0
    
    print(f"\n✅ Active Partners: {partner_count}")
    print(f"✅ Active Entities: {entity_count}")
    print(f"✅ Employees: {employee_count}")
    print(f"✅ Advisory Projects: {advisory_count}")
    
    print("\n📋 Next Steps:")
    print("   1. Restart Docker containers to pick up database changes")
    print("   2. Update API endpoints to use aligned data")
    print("   3. Update Entity UI to fetch dynamic org charts")
    print("   4. Run comprehensive test suite")
    
    conn.close()
    print("\n✅ Database alignment complete!")

if __name__ == "__main__":
    try:
        fix_database_alignment()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
"""
Database Alignment Script - Fix Email Domains and Data Consistency
Fixes:
1. Partner email domains from @ngicapital.com to @ngicapitaladvisory.com
2. Aligns partners table with employees table
3. Ensures consistent data across all modules
4. Creates proper entity-employee relationships

Author: NGI Capital Development Team
Date: October 2025
"""

import sqlite3
import sys
from pathlib import Path
from datetime import datetime

def get_db_path():
    """Find the correct database path"""
    candidates = [
        'data/ngi_capital.db',
        'ngi_capital.db',
        './data/ngi_capital.db'
    ]
    for path in candidates:
        if Path(path).exists():
            return path
    # Default to data/ngi_capital.db
    return 'data/ngi_capital.db'

def fix_database_alignment():
    """Main alignment function"""
    db_path = get_db_path()
    print(f"Using database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("\n" + "="*80)
    print("DATABASE ALIGNMENT SCRIPT")
    print("="*80)
    
    # Step 1: Fix email domain constraint
    print("\n[1/6] Checking partner email domains...")
    cursor.execute("SELECT id, email, name FROM partners WHERE is_active = 1")
    partners = cursor.fetchall()
    
    for partner_id, email, name in partners:
        if '@ngicapital.com' in email and '@ngicapitaladvisory.com' not in email:
            new_email = email.replace('@ngicapital.com', '@ngicapitaladvisory.com')
            print(f"   Updating: {email} → {new_email}")
            cursor.execute("UPDATE partners SET email = ? WHERE id = ?", (new_email, partner_id))
        elif not email.endswith('@ngicapitaladvisory.com'):
            print(f"   ⚠️  WARNING: Partner {name} has non-standard email: {email}")
    
    conn.commit()
    print("   ✅ Partner emails aligned to @ngicapitaladvisory.com")
    
    # Step 2: Verify entities exist
    print("\n[2/6] Verifying entities...")
    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='entities'")
    if cursor.fetchone()[0] == 0:
        print("   ⚠️  Entities table doesn't exist. Run init_database.py first!")
        return
    
    cursor.execute("SELECT id, legal_name, entity_type FROM entities WHERE is_active = 1")
    entities = cursor.fetchall()
    print(f"   Found {len(entities)} active entities:")
    for ent_id, legal_name, entity_type in entities:
        print(f"      - {legal_name} ({entity_type})")
    
    # Step 3: Check accounting_entities table
    print("\n[3/6] Checking accounting_entities table...")
    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='accounting_entities'")
    has_acc_entities = cursor.fetchone()[0] > 0
    
    if has_acc_entities:
        cursor.execute("SELECT id, entity_name, entity_type, entity_status FROM accounting_entities")
        acc_entities = cursor.fetchall()
        print(f"   Found {len(acc_entities)} accounting entities:")
        for acc_id, name, etype, status in acc_entities:
            print(f"      - {name} ({etype}) - Status: {status}")
    else:
        print("   ⚠️  accounting_entities table doesn't exist yet")
    
    # Step 4: Align employees with partners
    print("\n[4/6] Aligning employees table with partners...")
    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='employees'")
    has_employees = cursor.fetchone()[0] > 0
    
    if not has_employees:
        print("   Creating employees table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                title TEXT,
                role TEXT,
                classification TEXT,
                status TEXT DEFAULT 'active',
                employment_type TEXT,
                start_date TEXT,
                end_date TEXT,
                team_id INTEGER,
                manager_id INTEGER,
                is_deleted INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
        conn.commit()
        print("   ✅ Employees table created")
    
    # Get NGI Capital LLC entity ID
    cursor.execute("SELECT id FROM entities WHERE legal_name LIKE '%NGI Capital%' AND entity_type LIKE '%LLC%' LIMIT 1")
    ngi_llc_row = cursor.fetchone()
    ngi_llc_entity_id = ngi_llc_row[0] if ngi_llc_row else 1
    
    # Create employee records for partners if they don't exist
    print(f"   Creating/updating employee records for partners (entity_id={ngi_llc_entity_id})...")
    cursor.execute("SELECT id, email, name FROM partners WHERE is_active = 1")
    partners = cursor.fetchall()
    
    for partner_id, email, name in partners:
        # Check if employee exists
        cursor.execute("SELECT id FROM employees WHERE email = ?", (email,))
        existing = cursor.fetchone()
        
        if not existing:
            # Determine title based on name
            if 'Landon' in name or 'Whitworth' in name:
                title = 'CEO & Co-Founder'
            elif 'Andre' in name or 'Nurmamade' in name:
                title = 'Co-Founder, CFO & COO'
            else:
                title = 'Partner'
            
            cursor.execute("""
                INSERT INTO employees (entity_id, name, email, title, role, classification, status, employment_type, start_date)
                VALUES (?, ?, ?, ?, 'Executive', 'full_time', 'active', 'full_time', date('now'))
            """, (ngi_llc_entity_id, name, email, title))
            print(f"      ✅ Created employee: {name} ({email})")
        else:
            print(f"      ℹ️  Employee already exists: {name}")
    
    conn.commit()
    
    # Step 5: Verify advisory_projects table
    print("\n[5/6] Checking advisory_projects table...")
    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='advisory_projects'")
    has_advisory = cursor.fetchone()[0] > 0
    
    if has_advisory:
        cursor.execute("SELECT COUNT(*) FROM advisory_projects")
        count = cursor.fetchone()[0]
        print(f"   Found {count} advisory projects")
        
        if count > 0:
            cursor.execute("SELECT id, project_name, status FROM advisory_projects LIMIT 5")
            projects = cursor.fetchall()
            for proj_id, proj_name, status in projects:
                print(f"      - {proj_name} ({status})")
    else:
        print("   ⚠️  advisory_projects table doesn't exist yet")
    
    # Step 6: Summary and recommendations
    print("\n[6/6] Database Alignment Summary")
    print("="*80)
    
    # Count records
    cursor.execute("SELECT COUNT(*) FROM partners WHERE is_active = 1")
    partner_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM entities WHERE is_active = 1")
    entity_count = cursor.fetchone()[0]
    
    if has_employees:
        cursor.execute("SELECT COUNT(*) FROM employees WHERE is_deleted = 0")
        employee_count = cursor.fetchone()[0]
    else:
        employee_count = 0
    
    if has_advisory:
        cursor.execute("SELECT COUNT(*) FROM advisory_projects")
        advisory_count = cursor.fetchone()[0]
    else:
        advisory_count = 0
    
    print(f"\n✅ Active Partners: {partner_count}")
    print(f"✅ Active Entities: {entity_count}")
    print(f"✅ Employees: {employee_count}")
    print(f"✅ Advisory Projects: {advisory_count}")
    
    print("\n📋 Next Steps:")
    print("   1. Restart Docker containers to pick up database changes")
    print("   2. Update API endpoints to use aligned data")
    print("   3. Update Entity UI to fetch dynamic org charts")
    print("   4. Run comprehensive test suite")
    
    conn.close()
    print("\n✅ Database alignment complete!")

if __name__ == "__main__":
    try:
        fix_database_alignment()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)








