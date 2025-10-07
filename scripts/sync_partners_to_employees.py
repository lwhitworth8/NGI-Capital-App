"""
Sync Partners to Employees Table
Ensures Landon and Andre are in employees table with proper compensation
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text as sa_text
from src.api.database import get_db

def sync_partners_to_employees():
    """Create employee records for Landon and Andre if they don't exist"""
    db = next(get_db())
    
    try:
        # Get NGI Capital LLC entity ID
        entity_row = db.execute(
            sa_text("SELECT id FROM entities WHERE legal_name LIKE '%NGI Capital LLC%' LIMIT 1")
        ).fetchone()
        
        if not entity_row:
            print("[ERROR] NGI Capital LLC entity not found")
            return
        
        entity_id = entity_row[0]
        print(f"[OK] Found NGI Capital LLC entity (ID: {entity_id})")
        
        # Ensure employees table exists
        db.execute(sa_text("""
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                title TEXT,
                role TEXT,
                classification TEXT,
                status TEXT,
                employment_type TEXT,
                start_date TEXT,
                end_date TEXT,
                team_id INTEGER,
                manager_id INTEGER,
                hourly_rate REAL,
                annual_salary REAL,
                compensation_type TEXT,
                is_deleted INTEGER DEFAULT 0
            )
        """))
        
        # Landon Whitworth
        existing_landon = db.execute(
            sa_text("SELECT id FROM employees WHERE email LIKE '%lwhitworth%'")
        ).fetchone()
        
        if not existing_landon:
            db.execute(
                sa_text("""
                    INSERT INTO employees (entity_id, name, email, title, role, classification, status, 
                                         employment_type, start_date, compensation_type, created_at, updated_at)
                    VALUES (:e, :n, :em, :ti, :ro, :cl, :st, :et, :sd, :ct, datetime('now'), datetime('now'))
                """),
                {
                    "e": entity_id,
                    "n": "Landon Whitworth",
                    "em": "lwhitworth@ngicapital.com",
                    "ti": "CEO & Co-Founder",
                    "ro": "Chief Executive Officer",
                    "cl": "executive",
                    "st": "active",
                    "et": "full_time",
                    "sd": "2024-07-16",  # Formation date
                    "ct": "salary"
                }
            )
            landon_id = db.execute(sa_text("SELECT last_insert_rowid()")).scalar()
            print(f"[OK] Created Landon Whitworth as employee (ID: {landon_id})")
        else:
            print("[INFO] Landon already exists in employees table")
        
        # Andre Nurmamade
        existing_andre = db.execute(
            sa_text("SELECT id FROM employees WHERE email LIKE '%anurmamade%'")
        ).fetchone()
        
        if not existing_andre:
            db.execute(
                sa_text("""
                    INSERT INTO employees (entity_id, name, email, title, role, classification, status, 
                                         employment_type, start_date, compensation_type, created_at, updated_at)
                    VALUES (:e, :n, :em, :ti, :ro, :cl, :st, :et, :sd, :ct, datetime('now'), datetime('now'))
                """),
                {
                    "e": entity_id,
                    "n": "Andre Nurmamade",
                    "em": "anurmamade@ngicapital.com",
                    "ti": "CFO & COO, Co-Founder",
                    "ro": "Chief Financial & Operating Officer",
                    "cl": "executive",
                    "st": "active",
                    "et": "full_time",
                    "sd": "2024-07-16",  # Formation date
                    "ct": "salary"
                }
            )
            andre_id = db.execute(sa_text("SELECT last_insert_rowid()")).scalar()
            print(f"[OK] Created Andre Nurmamade as employee (ID: {andre_id})")
        else:
            print("[INFO] Andre already exists in employees table")
        
        # Get Executive and Board teams
        exec_team = db.execute(
            sa_text("SELECT id FROM teams WHERE entity_id = :e AND lower(name) = 'executive'"),
            {"e": entity_id}
        ).fetchone()
        
        board_team = db.execute(
            sa_text("SELECT id FROM teams WHERE entity_id = :e AND lower(name) = 'board'"),
            {"e": entity_id}
        ).fetchone()
        
        if exec_team or board_team:
            # Get employee IDs
            landon_emp = db.execute(sa_text("SELECT id FROM employees WHERE email LIKE '%lwhitworth%'")).fetchone()
            andre_emp = db.execute(sa_text("SELECT id FROM employees WHERE email LIKE '%anurmamade%'")).fetchone()
            
            if landon_emp and andre_emp:
                landon_id = landon_emp[0]
                andre_id = andre_emp[0]
                
                # Add to Executive team
                if exec_team:
                    exec_id = exec_team[0]
                    db.execute(sa_text("""
                        INSERT OR IGNORE INTO team_memberships (team_id, employee_id, role_on_team, start_date, allocation_pct)
                        VALUES (:tid, :eid, 'Executive', date('now'), 100)
                    """), {"tid": exec_id, "eid": landon_id})
                    db.execute(sa_text("""
                        INSERT OR IGNORE INTO team_memberships (team_id, employee_id, role_on_team, start_date, allocation_pct)
                        VALUES (:tid, :eid, 'Executive', date('now'), 100)
                    """), {"tid": exec_id, "eid": andre_id})
                    print(f"[OK] Added Landon and Andre to Executive team")
                
                # Add to Board team
                if board_team:
                    board_id = board_team[0]
                    db.execute(sa_text("""
                        INSERT OR IGNORE INTO team_memberships (team_id, employee_id, role_on_team, start_date, allocation_pct)
                        VALUES (:tid, :eid, 'Board Member', date('now'), 100)
                    """), {"tid": board_id, "eid": landon_id})
                    db.execute(sa_text("""
                        INSERT OR IGNORE INTO team_memberships (team_id, employee_id, role_on_team, start_date, allocation_pct)
                        VALUES (:tid, :eid, 'Board Member', date('now'), 100)
                    """), {"tid": board_id, "eid": andre_id})
                    print(f"[OK] Added Landon and Andre to Board team")
        
        db.commit()
        print("\n[SUCCESS] Partners synced to employees successfully!")
        
    except Exception as e:
        print(f"[ERROR] Failed to sync: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    sync_partners_to_employees()
