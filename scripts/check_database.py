"""
Check current database contents
"""
import sqlite3

conn = sqlite3.connect('ngi_capital.db')
cursor = conn.cursor()

print("=== CURRENT DATABASE CONTENTS ===\n")

# Check tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

for table in tables:
    table_name = table[0]
    print(f"\n{table_name.upper()} TABLE:")
    print("-" * 40)
    
    # Get column names
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    col_names = [col[1] for col in columns]
    
    # Get data
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    
    if rows:
        # Print column headers
        print(" | ".join(col_names))
        print("-" * 40)
        
        # Print data
        for row in rows:
            print(" | ".join(str(val) if val is not None else "NULL" for val in row))
    else:
        print("No data in this table")

conn.close()
print("\n" + "=" * 40)