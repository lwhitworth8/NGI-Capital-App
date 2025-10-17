import sqlite3

conn = sqlite3.connect('ngi_capital.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print("Tables:", tables)

if 'accounting_entities' in tables:
    cursor.execute("PRAGMA table_info(accounting_entities)")
    columns = cursor.fetchall()
    print("accounting_entities columns:", columns)
else:
    print("accounting_entities table not found")

conn.close()
