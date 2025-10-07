import sqlite3
conn = sqlite3.connect('ngi_capital.db')
tables = [row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("Tables:", tables)
conn.close()

