import sqlite3

conn = sqlite3.connect('data/ngi_capital.db')
cursor = conn.cursor()
cursor.execute('SELECT sql FROM sqlite_master WHERE type="table" AND name="journal_entries"')
result = cursor.fetchone()
if result:
    print('Table schema:')
    print(result[0])
else:
    print('Table not found')
conn.close()


