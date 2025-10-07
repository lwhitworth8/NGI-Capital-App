"""
Complete System Initialization for NGI Capital
- Creates entities
- Creates teams (Board, Executive)  
- Creates Landon & Andre as employees
- Links them to teams
- Ready for timesheets and accounting
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text as sa_text
from src.api.database import get_db
from datetime import date

def init_complete_system():
    """Initialize complete NGI Capital system"""
    db = next(get_db())
    
    try:
        print("=" * 70)
        print("NGI CAPITAL - COMPLETE SYSTEM INITIALIZATION")
        print("=" * 70)
        
        # Step 1: Create Entities
        print("\n[STEP 1] Creating Entities...")
        
        entities_data = [
            {
                "name": "NGI Capital LLC",
                "type": "LLC",
                "ein": "88-3957014",
                "formation_date": "2024-07-16",
                "state": "Delaware",
                "status": "active",
                "is_available": 1
            },
            {
                "name": "NGI Capital, Inc.",
                "type": "C-Corp",
                "ein": None,
                "formation_date": None,
                "state": "Delaware",
                "status": "converting",
                "is_available": 0
            },
            {
                "name": "The Creator Terminal, Inc.",
                "type": "C-Corp",
                "ein": None,
                "formation_date": None,
                "state": "Delaware",
                "status": "pre-formation",
                "is_available": 0
            },
            {
                "name": "NGI Capital Advisory LLC",
                "type": "LLC",
                "ein": None,
                "formation_date": None,
                "state": "Delaware",
                "status": "pre-formation",
                "is_available": 0
            }
        ]
        
        for entity_data in entities_data:
            # Check if exists
            existing = db.execute(
                sa_text("SELECT id FROM entities WHERE legal_name = :name"),
                {"name": entity_data["name"]}
            ).fetchone()
            
            if not existing:
                db.execute(
                    sa_text("""
                        INSERT INTO entities (legal_name, entity_type, ein, formation_date, 
                                            formation_state, is_active, created_at, updated_at)
                        VALUES (:name, :type, :ein, :form_date, :state, :avail, datetime('now'), datetime('now'))
                    """),
                    {
                        "name": entity_data["name"],
                        "type": entity_data["type"],
                        "ein": entity_data["ein"],
                        "form_date": entity_data["formation_date"],
                        "state": entity_data["state"],
                        "avail": entity_data["is_available"]
                    }
                )
                entity_id = db.execute(sa_text("SELECT last_insert_rowid()")).scalar()
                print(f"  ✓ Created: {entity_data['name']} (ID: {entity_id})")
            else:
                print(f"  → Exists: {entity_data['name']}")
        
        # Get NGI Capital LLC ID
        ngi_llc = db.execute(
            sa_text("SELECT id FROM entities WHERE legal_name LIKE '%NGI Capital LLC%' LIMIT 1")
        ).fetchone()
        
        if not ngi_llc:
            print("[ERROR] Could not find NGI Capital LLC")
            return
        
        ngi_llc_id = ngi_llc[0]
        
        # Step 2: Create Teams
        print("\n[STEP 2] Creating Teams...")
        
        teams_data = [
            {"name": "Board", "description": "Board of Directors", "type": "governance"},
            {"name": "Executive", "description": "Executive Leadership Team", "type": "leadership"}
        ]
        
        for team_data in teams_data:
            existing = db.execute(
                sa_text("SELECT id FROM teams WHERE entity_id = :eid AND name = :name"),
                {"eid": ngi_llc_id, "name": team_data["name"]}
            ).fetchone()
            
            if not existing:
                db.execute(
                    sa_text("""
                        INSERT INTO teams (entity_id, name, description, type, active, created_at)
                        VALUES (:eid, :name, :desc, :type, 1, datetime('now'))
                    """),
                    {
                        "eid": ngi_llc_id,
                        "name": team_data["name"],
                        "desc": team_data["description"],
                        "type": team_data["type"]
                    }
                )
                team_id = db.execute(sa_text("SELECT last_insert_rowid()")).scalar()
                print(f"  ✓ Created Team: {team_data['name']} (ID: {team_id})")
            else:
                print(f"  → Exists: {team_data['name']}")
        
        # Step 2.5: Ensure employees table has all columns
        print("\n[STEP 2.5] Ensuring employee table columns...")
        
        # Add compensation columns if missing
        try:
            db.execute(sa_text("ALTER TABLE employees ADD COLUMN compensation_type TEXT"))
            print("  ✓ Added compensation_type column")
        except:
            pass
        
        try:
            db.execute(sa_text("ALTER TABLE employees ADD COLUMN hourly_rate REAL"))
            print("  ✓ Added hourly_rate column")
        except:
            pass
        
        try:
            db.execute(sa_text("ALTER TABLE employees ADD COLUMN annual_salary REAL"))
            print("  ✓ Added annual_salary column")
        except:
            pass
        
        # Step 3: Create Employees (Landon & Andre)
        print("\n[STEP 3] Creating Employees (Landon & Andre)...")
        
        employees_data = [
            {
                "name": "Landon Whitworth",
                "email": "lwhitworth@ngicapital.com",
                "title": "CEO & Co-Founder",
                "role": "Chief Executive Officer",
                "classification": "executive",
                "compensation_type": "salary"
            },
            {
                "name": "Andre Nurmamade",
                "email": "anurmamade@ngicapital.com",
                "title": "CFO & COO, Co-Founder",
                "role": "Chief Financial & Operating Officer",
                "classification": "executive",
                "compensation_type": "salary"
            }
        ]
        
        employee_ids = []
        
        for emp_data in employees_data:
            existing = db.execute(
                sa_text("SELECT id FROM employees WHERE email = :email"),
                {"email": emp_data["email"]}
            ).fetchone()
            
            if not existing:
                db.execute(
                    sa_text("""
                        INSERT INTO employees (entity_id, name, email, title, role, classification, 
                                             status, employment_type, start_date, compensation_type, 
                                             created_at, updated_at)
                        VALUES (:eid, :name, :email, :title, :role, :class, 'active', 'full_time', 
                                :start, :comp_type, datetime('now'), datetime('now'))
                    """),
                    {
                        "eid": ngi_llc_id,
                        "name": emp_data["name"],
                        "email": emp_data["email"],
                        "title": emp_data["title"],
                        "role": emp_data["role"],
                        "class": emp_data["classification"],
                        "start": "2024-07-16",
                        "comp_type": emp_data["compensation_type"]
                    }
                )
                emp_id = db.execute(sa_text("SELECT last_insert_rowid()")).scalar()
                employee_ids.append(emp_id)
                print(f"  ✓ Created Employee: {emp_data['name']} (ID: {emp_id})")
            else:
                employee_ids.append(existing[0])
                print(f"  → Exists: {emp_data['name']}")
        
        # Step 4: Add to Teams
        print("\n[STEP 4] Adding Employees to Teams...")
        
        board_team = db.execute(
            sa_text("SELECT id FROM teams WHERE entity_id = :eid AND name = 'Board'"),
            {"eid": ngi_llc_id}
        ).fetchone()
        
        exec_team = db.execute(
            sa_text("SELECT id FROM teams WHERE entity_id = :eid AND name = 'Executive'"),
            {"eid": ngi_llc_id}
        ).fetchone()
        
        if board_team and len(employee_ids) == 2:
            board_id = board_team[0]
            for emp_id in employee_ids:
                db.execute(
                    sa_text("""
                        INSERT OR IGNORE INTO team_memberships (team_id, employee_id, role_on_team, 
                                                               start_date, allocation_pct)
                        VALUES (:tid, :eid, 'Board Member', date('now'), 100)
                    """),
                    {"tid": board_id, "eid": emp_id}
                )
            print(f"  ✓ Added both to Board of Directors")
        
        if exec_team and len(employee_ids) == 2:
            exec_id = exec_team[0]
            for emp_id in employee_ids:
                db.execute(
                    sa_text("""
                        INSERT OR IGNORE INTO team_memberships (team_id, employee_id, role_on_team, 
                                                               start_date, allocation_pct)
                        VALUES (:tid, :eid, 'Executive', date('now'), 100)
                    """),
                    {"tid": exec_id, "eid": emp_id}
                )
            print(f"  ✓ Added both to Executive Team")
        
        db.commit()
        
        # Verification
        print("\n[VERIFICATION]")
        entity_count = db.execute(sa_text("SELECT COUNT(*) FROM entities")).scalar()
        employee_count = db.execute(sa_text("SELECT COUNT(*) FROM employees")).scalar()
        team_count = db.execute(sa_text("SELECT COUNT(*) FROM teams")).scalar()
        membership_count = db.execute(sa_text("SELECT COUNT(*) FROM team_memberships")).scalar()
        
        print(f"  Entities: {entity_count}")
        print(f"  Employees: {employee_count}")
        print(f"  Teams: {team_count}")
        print(f"  Team Memberships: {membership_count}")
        
        print("\n" + "=" * 70)
        print("✓ SYSTEM INITIALIZED SUCCESSFULLY!")
        print("=" * 70)
        print("\nYou can now:")
        print("  1. View entities in Entity Management")
        print("  2. See Landon & Andre in Employee Directory")
        print("  3. Create timesheets for each other")
        print("  4. Approve each other's timesheets")
        print("  5. Start accounting operations")
        
    except Exception as e:
        print(f"\n[ERROR] Initialization failed: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_complete_system()
