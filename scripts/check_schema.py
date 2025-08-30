"""Check existing schema"""
import sqlite3

conn = sqlite3.connect('ngi_capital.db')
cursor = conn.cursor()

cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='partners';")
result = cursor.fetchone()
if result:
    print("Partners table schema:")
    print(result[0])
else:
    print("Partners table does not exist")

conn.close()