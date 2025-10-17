"""
Check database structure
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text as sa_text
from services.api.database import get_db

def check_database():
    """Check database structure"""
    db = next(get_db())
    
    try:
        # List all tables
        tables = db.execute(sa_text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")).fetchall()
        print('Available tables:')
        for table in tables:
            print(f'  - {table[0]}')
        
        # Check if there's an entity-like table
        entity_tables = [t[0] for t in tables if 'entit' in t[0].lower()]
        print(f'\nEntity-related tables: {entity_tables}')
        
        # Check what's in the first entity table
        if entity_tables:
            first_entity_table = entity_tables[0]
            print(f'\nChecking {first_entity_table}:')
            columns = db.execute(sa_text(f'PRAGMA table_info({first_entity_table})')).fetchall()
            for col in columns:
                print(f'  - {col[1]} ({col[2]})')
            
            # Get a sample record
            sample = db.execute(sa_text(f'SELECT * FROM {first_entity_table} LIMIT 1')).fetchone()
            if sample:
                print(f'\nSample record: {sample}')
        
        # Check teams and employees
        print(f'\nTeams table:')
        try:
            teams = db.execute(sa_text('SELECT id, name, entity_id FROM teams')).fetchall()
            for team in teams:
                print(f'  - {team[1]} (ID: {team[0]}, Entity: {team[2]})')
        except Exception as e:
            print(f'  Error: {e}')
        
        print(f'\nEmployees table:')
        try:
            employees = db.execute(sa_text('SELECT id, name, email, entity_id FROM employees')).fetchall()
            for emp in employees:
                print(f'  - {emp[1]} ({emp[2]}) (ID: {emp[0]}, Entity: {emp[3]})')
        except Exception as e:
            print(f'  Error: {e}')
    
    except Exception as e:
        print(f'Error: {e}')
    finally:
        db.close()

if __name__ == "__main__":
    check_database()