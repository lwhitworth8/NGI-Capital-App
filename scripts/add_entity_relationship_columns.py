"""
Add parent-child relationship columns to accounting_entities table
SQLite migration script (since Alembic can be complex with SQLite)
"""

import sqlite3
from pathlib import Path


def add_columns():
    """
    Add is_available, parent_entity_id, ownership_percentage columns
    """
    db_path = Path("data/ngi_capital.db")
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(accounting_entities)")
        existing_columns = [col[1] for col in cursor.fetchall()]
        
        columns_to_add = []
        
        if 'is_available' not in existing_columns:
            columns_to_add.append(('is_available', 'BOOLEAN DEFAULT 1'))
        
        if 'parent_entity_id' not in existing_columns:
            columns_to_add.append(('parent_entity_id', 'INTEGER'))
        
        if 'ownership_percentage' not in existing_columns:
            columns_to_add.append(('ownership_percentage', 'NUMERIC(5, 2)'))
        
        if not columns_to_add:
            print("All columns already exist!")
            return
        
        # Add columns
        for col_name, col_type in columns_to_add:
            sql = f"ALTER TABLE accounting_entities ADD COLUMN {col_name} {col_type}"
            print(f"Adding column: {col_name}")
            cursor.execute(sql)
        
        conn.commit()
        print(f"\nSuccessfully added {len(columns_to_add)} column(s) to accounting_entities table!")
        
        # Show updated schema
        cursor.execute("PRAGMA table_info(accounting_entities)")
        print("\nUpdated table schema:")
        for col in cursor.fetchall():
            print(f"  - {col[1]}: {col[2]}")
        
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    add_columns()


