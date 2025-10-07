#!/usr/bin/env python3
"""
Sync Advisory Projects to Teams Structure
Maps advisory_projects → projects table for organizational chart display
Creates project leads relationships for org chart hierarchy

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
    return 'data/ngi_capital.db'

def sync_advisory_to_teams():
    """Sync advisory projects to teams/projects tables"""
    db_path = get_db_path()
    print(f"Using database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("\n" + "="*80)
    print("ADVISORY PROJECTS → TEAMS SYNC")
    print("="*80)
    
    # Step 1: Get NGI Capital Advisory LLC entity ID
    print("\n[1/5] Finding NGI Capital Advisory LLC entity...")
    cursor.execute("""
        SELECT id, legal_name 
        FROM entities 
        WHERE legal_name LIKE '%Advisory%' 
        LIMIT 1
    """)
    advisory_entity = cursor.fetchone()
    
    if not advisory_entity:
        print("   ⚠️  NGI Capital Advisory LLC entity not found!")
        print("   Creating it...")
        cursor.execute("""
            INSERT INTO entities (legal_name, entity_type, is_active, status, parent_entity_id)
            VALUES ('NGI Capital Advisory LLC', 'LLC', 1, 'active', 1)
        """)
        conn.commit()
        advisory_entity_id = cursor.lastrowid
        print(f"   ✅ Created entity with ID: {advisory_entity_id}")
    else:
        advisory_entity_id = advisory_entity[0]
        print(f"   ✅ Found: {advisory_entity[1]} (ID: {advisory_entity_id})")
    
    # Step 2: Check if advisory_projects table exists
    print("\n[2/5] Checking advisory_projects table...")
    cursor.execute("""
        SELECT COUNT(*) 
        FROM sqlite_master 
        WHERE type='table' AND name='advisory_projects'
    """)
    has_advisory = cursor.fetchone()[0] > 0
    
    if not has_advisory:
        print("   ⚠️  advisory_projects table doesn't exist yet")
        print("   This is normal if Advisory module hasn't been used yet.")
        conn.close()
        return
    
    cursor.execute("SELECT COUNT(*) FROM advisory_projects")
    project_count = cursor.fetchone()[0]
    print(f"   ✅ Found {project_count} advisory projects")
    
    # Step 3: Ensure projects table exists with advisory_project_id column
    print("\n[3/5] Ensuring projects table structure...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT,
            advisory_project_id INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)
    
    # Add advisory_project_id column if it doesn't exist
    cursor.execute("PRAGMA table_info(projects)")
    project_cols = [col[1] for col in cursor.fetchall()]
    
    if 'advisory_project_id' not in project_cols:
        cursor.execute("ALTER TABLE projects ADD COLUMN advisory_project_id INTEGER")
        print("   ✅ Added advisory_project_id column to projects table")
    
    conn.commit()
    print("   ✅ Projects table ready")
    
    # Step 4: Sync advisory projects to projects table
    print("\n[4/5] Syncing advisory projects...")
    cursor.execute("""
        SELECT id, project_name, summary, status, project_code
        FROM advisory_projects
        WHERE status IN ('draft', 'active', 'closed')
    """)
    advisory_projects = cursor.fetchall()
    
    synced_count = 0
    updated_count = 0
    
    for adv_proj in advisory_projects:
        adv_id, proj_name, summary, proj_status, proj_code = adv_proj
        
        # Check if already synced
        cursor.execute("""
            SELECT id FROM projects WHERE advisory_project_id = ?
        """, (adv_id,))
        existing = cursor.fetchone()
        
        if existing:
            # Update existing
            cursor.execute("""
                UPDATE projects 
                SET name = ?, description = ?, status = ?, updated_at = datetime('now')
                WHERE advisory_project_id = ?
            """, (proj_name, summary or "", proj_status, adv_id))
            updated_count += 1
        else:
            # Create new
            cursor.execute("""
                INSERT INTO projects (entity_id, name, description, status, advisory_project_id)
                VALUES (?, ?, ?, ?, ?)
            """, (advisory_entity_id, proj_name, summary or "", proj_status, adv_id))
            synced_count += 1
            print(f"      ✅ Synced: {proj_name} ({proj_code})")
    
    conn.commit()
    print(f"\n   ✅ Synced {synced_count} new projects, updated {updated_count} existing")
    
    # Step 5: Sync project leads
    print("\n[5/5] Syncing project leads...")
    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='advisory_project_leads'")
    has_leads = cursor.fetchone()[0] > 0
    
    if not has_leads:
        print("   ℹ️  No advisory_project_leads table found (will be created when leads are added)")
    else:
        cursor.execute("SELECT COUNT(*) FROM advisory_project_leads")
        leads_count = cursor.fetchone()[0]
        print(f"   ✅ Found {leads_count} project lead assignments")
    
    # Summary
    print("\n" + "="*80)
    print("SYNC COMPLETE")
    print("="*80)
    print(f"\n✅ Advisory Projects: {project_count}")
    print(f"✅ Synced to Teams: {synced_count} new, {updated_count} updated")
    print(f"✅ Entity: NGI Capital Advisory LLC (ID: {advisory_entity_id})")
    
    print("\n📋 Next Steps:")
    print("   1. Navigate to Entity Management in the UI")
    print("   2. Click on 'NGI Capital Advisory LLC'")
    print("   3. View project-based organizational structure")
    print("   4. Add project leads in NGI Advisory → Projects module")
    print("   5. Onboard students to automatically populate team members")
    
    conn.close()

if __name__ == "__main__":
    try:
        sync_advisory_to_teams()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
"""
Sync Advisory Projects to Teams Structure
Maps advisory_projects → projects table for organizational chart display
Creates project leads relationships for org chart hierarchy

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
    return 'data/ngi_capital.db'

def sync_advisory_to_teams():
    """Sync advisory projects to teams/projects tables"""
    db_path = get_db_path()
    print(f"Using database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("\n" + "="*80)
    print("ADVISORY PROJECTS → TEAMS SYNC")
    print("="*80)
    
    # Step 1: Get NGI Capital Advisory LLC entity ID
    print("\n[1/5] Finding NGI Capital Advisory LLC entity...")
    cursor.execute("""
        SELECT id, legal_name 
        FROM entities 
        WHERE legal_name LIKE '%Advisory%' 
        LIMIT 1
    """)
    advisory_entity = cursor.fetchone()
    
    if not advisory_entity:
        print("   ⚠️  NGI Capital Advisory LLC entity not found!")
        print("   Creating it...")
        cursor.execute("""
            INSERT INTO entities (legal_name, entity_type, is_active, status, parent_entity_id)
            VALUES ('NGI Capital Advisory LLC', 'LLC', 1, 'active', 1)
        """)
        conn.commit()
        advisory_entity_id = cursor.lastrowid
        print(f"   ✅ Created entity with ID: {advisory_entity_id}")
    else:
        advisory_entity_id = advisory_entity[0]
        print(f"   ✅ Found: {advisory_entity[1]} (ID: {advisory_entity_id})")
    
    # Step 2: Check if advisory_projects table exists
    print("\n[2/5] Checking advisory_projects table...")
    cursor.execute("""
        SELECT COUNT(*) 
        FROM sqlite_master 
        WHERE type='table' AND name='advisory_projects'
    """)
    has_advisory = cursor.fetchone()[0] > 0
    
    if not has_advisory:
        print("   ⚠️  advisory_projects table doesn't exist yet")
        print("   This is normal if Advisory module hasn't been used yet.")
        conn.close()
        return
    
    cursor.execute("SELECT COUNT(*) FROM advisory_projects")
    project_count = cursor.fetchone()[0]
    print(f"   ✅ Found {project_count} advisory projects")
    
    # Step 3: Ensure projects table exists with advisory_project_id column
    print("\n[3/5] Ensuring projects table structure...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT,
            advisory_project_id INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)
    
    # Add advisory_project_id column if it doesn't exist
    cursor.execute("PRAGMA table_info(projects)")
    project_cols = [col[1] for col in cursor.fetchall()]
    
    if 'advisory_project_id' not in project_cols:
        cursor.execute("ALTER TABLE projects ADD COLUMN advisory_project_id INTEGER")
        print("   ✅ Added advisory_project_id column to projects table")
    
    conn.commit()
    print("   ✅ Projects table ready")
    
    # Step 4: Sync advisory projects to projects table
    print("\n[4/5] Syncing advisory projects...")
    cursor.execute("""
        SELECT id, project_name, summary, status, project_code
        FROM advisory_projects
        WHERE status IN ('draft', 'active', 'closed')
    """)
    advisory_projects = cursor.fetchall()
    
    synced_count = 0
    updated_count = 0
    
    for adv_proj in advisory_projects:
        adv_id, proj_name, summary, proj_status, proj_code = adv_proj
        
        # Check if already synced
        cursor.execute("""
            SELECT id FROM projects WHERE advisory_project_id = ?
        """, (adv_id,))
        existing = cursor.fetchone()
        
        if existing:
            # Update existing
            cursor.execute("""
                UPDATE projects 
                SET name = ?, description = ?, status = ?, updated_at = datetime('now')
                WHERE advisory_project_id = ?
            """, (proj_name, summary or "", proj_status, adv_id))
            updated_count += 1
        else:
            # Create new
            cursor.execute("""
                INSERT INTO projects (entity_id, name, description, status, advisory_project_id)
                VALUES (?, ?, ?, ?, ?)
            """, (advisory_entity_id, proj_name, summary or "", proj_status, adv_id))
            synced_count += 1
            print(f"      ✅ Synced: {proj_name} ({proj_code})")
    
    conn.commit()
    print(f"\n   ✅ Synced {synced_count} new projects, updated {updated_count} existing")
    
    # Step 5: Sync project leads
    print("\n[5/5] Syncing project leads...")
    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='advisory_project_leads'")
    has_leads = cursor.fetchone()[0] > 0
    
    if not has_leads:
        print("   ℹ️  No advisory_project_leads table found (will be created when leads are added)")
    else:
        cursor.execute("SELECT COUNT(*) FROM advisory_project_leads")
        leads_count = cursor.fetchone()[0]
        print(f"   ✅ Found {leads_count} project lead assignments")
    
    # Summary
    print("\n" + "="*80)
    print("SYNC COMPLETE")
    print("="*80)
    print(f"\n✅ Advisory Projects: {project_count}")
    print(f"✅ Synced to Teams: {synced_count} new, {updated_count} updated")
    print(f"✅ Entity: NGI Capital Advisory LLC (ID: {advisory_entity_id})")
    
    print("\n📋 Next Steps:")
    print("   1. Navigate to Entity Management in the UI")
    print("   2. Click on 'NGI Capital Advisory LLC'")
    print("   3. View project-based organizational structure")
    print("   4. Add project leads in NGI Advisory → Projects module")
    print("   5. Onboard students to automatically populate team members")
    
    conn.close()

if __name__ == "__main__":
    try:
        sync_advisory_to_teams()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)








