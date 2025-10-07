import sqlite3
from src.api.database import get_db
from src.api.models_accounting import JournalEntry

# Test direct database connection
conn = sqlite3.connect('data/ngi_capital.db')
cursor = conn.cursor()
cursor.execute('PRAGMA table_info(journal_entries)')
columns = [row[1] for row in cursor.fetchall()]
print("Direct DB columns:", columns)
conn.close()

# Test SQLAlchemy connection
db = next(get_db())
try:
    # Try to query the table
    result = db.query(JournalEntry).first()
    print("SQLAlchemy query successful")
except Exception as e:
    print(f"SQLAlchemy error: {e}")
finally:
    db.close()


