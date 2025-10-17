"""
Fix Team Memberships
Ensure Landon and Andre are properly assigned to Board and Executive teams
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text as sa_text
from services.api.database import get_db

def fix_team_memberships():
    """Fix team memberships for Landon and Andre"""
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
        
        # Get Landon and Andre
        landon_emp = db.execute(
            sa_text("SELECT id, name FROM employees WHERE email LIKE '%lwhitworth%'")
        ).fetchone()
        andre_emp = db.execute(
            sa_text("SELECT id, name FROM employees WHERE email LIKE '%anurmamade%'")
        ).fetchone()
        
        if not landon_emp or not andre_emp:
            print("[ERROR] Landon or Andre not found in employees table")
            return
        
        landon_id, landon_name = landon_emp
        andre_id, andre_name = andre_emp
        print(f"[OK] Found employees: {landon_name} (ID: {landon_id}), {andre_name} (ID: {andre_id})")
        
        # Ensure teams exist
        db.execute(sa_text("""
            INSERT OR IGNORE INTO teams (entity_id, name, description, type, active, created_at, updated_at)
            VALUES (:eid, 'Board', 'Board of Directors', 'governance', 1, datetime('now'), datetime('now'))
        """), {"eid": entity_id})
        
        db.execute(sa_text("""
            INSERT OR IGNORE INTO teams (entity_id, name, description, type, active, created_at, updated_at)
            VALUES (:eid, 'Executive', 'Executive Leadership Team', 'leadership', 1, datetime('now'), datetime('now'))
        """), {"eid": entity_id})
        
        # Get team IDs
        board_team = db.execute(
            sa_text("SELECT id FROM teams WHERE entity_id = :eid AND LOWER(name) = 'board'"),
            {"eid": entity_id}
        ).fetchone()
        
        exec_team = db.execute(
            sa_text("SELECT id FROM teams WHERE entity_id = :eid AND LOWER(name) = 'executive'"),
            {"eid": entity_id}
        ).fetchone()
        
        if not board_team or not exec_team:
            print("[ERROR] Could not find or create Board/Executive teams")
            return
        
        board_id = board_team[0]
        exec_id = exec_team[0]
        print(f"[OK] Board team ID: {board_id}, Executive team ID: {exec_id}")
        
        # Add to Board team
        print(f"\n[BOARD TEAM] Adding members...")
        for emp_id, emp_name in [(landon_id, landon_name), (andre_id, andre_name)]:
            existing = db.execute(
                sa_text("SELECT role_on_team FROM team_memberships WHERE team_id = :tid AND employee_id = :eid"),
                {"tid": board_id, "eid": emp_id}
            ).fetchone()
            
            if existing:
                print(f"  {emp_name}: Already a member (role: {existing[0]})")
            else:
                db.execute(sa_text("""
                    INSERT INTO team_memberships (team_id, employee_id, role_on_team, start_date, allocation_pct)
                    VALUES (:tid, :eid, 'Board Member', date('now'), 100)
                """), {"tid": board_id, "eid": emp_id})
                print(f"  {emp_name}: Added as Board Member")
        
        # Add to Executive team
        print(f"\n[EXECUTIVE TEAM] Adding members...")
        for emp_id, emp_name in [(landon_id, landon_name), (andre_id, andre_name)]:
            existing = db.execute(
                sa_text("SELECT role_on_team FROM team_memberships WHERE team_id = :tid AND employee_id = :eid"),
                {"tid": exec_id, "eid": emp_id}
            ).fetchone()
            
            if existing:
                print(f"  {emp_name}: Already a member (role: {existing[0]})")
            else:
                db.execute(sa_text("""
                    INSERT INTO team_memberships (team_id, employee_id, role_on_team, start_date, allocation_pct)
                    VALUES (:tid, :eid, 'Executive', date('now'), 100)
                """), {"tid": exec_id, "eid": emp_id})
                print(f"  {emp_name}: Added as Executive")
        
        db.commit()
        print(f"\n[SUCCESS] Team memberships fixed!")
        
    except Exception as e:
        print(f"[ERROR] Failed to fix team memberships: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_team_memberships()

