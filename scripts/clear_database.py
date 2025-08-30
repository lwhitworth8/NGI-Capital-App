"""
Clear database and prepare for production use
"""
import sqlite3
import os
import bcrypt

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def clear_and_setup_database():
    """Clear all test data but keep partner accounts"""
    conn = sqlite3.connect('ngi_capital.db')
    cursor = conn.cursor()
    
    print("Current tables in database:")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    for table in tables:
        print(f"  - {table[0]}")
        cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
        count = cursor.fetchone()[0]
        print(f"    Records: {count}")
    
    response = input("\nDo you want to:\n1. Keep partner accounts but clear all financial data\n2. Wipe everything completely\n3. Cancel\n\nChoice (1/2/3): ")
    
    if response == "1":
        # Clear financial data but keep partners
        tables_to_clear = ['transactions', 'journal_entries', 'accounts', 'audit_logs']
        for table in tables_to_clear:
            try:
                cursor.execute(f"DELETE FROM {table}")
                print(f"Cleared {table}")
            except:
                print(f"Table {table} doesn't exist or already empty")
        
        # Reset entities to just the three main companies
        cursor.execute("DELETE FROM entities")
        cursor.execute("""
            INSERT INTO entities (id, name, type, status, description) VALUES
            (1, 'NGI Capital', 'C-Corporation', 'Active', 'Delaware C-Corp - Parent Company'),
            (2, 'NGI Capital Advisory LLC', 'LLC', 'Active', 'Investment Advisory Subsidiary'),
            (3, 'Creator Terminal', 'SaaS', 'Active', 'Financial Technology Platform')
        """)
        print("Reset entities to three main companies")
        
    elif response == "2":
        # Complete wipe
        for table in tables:
            cursor.execute(f"DROP TABLE IF EXISTS {table[0]}")
            print(f"Dropped table {table[0]}")
        
        # Recreate essential tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS partners (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                ownership_percentage REAL NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS entities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                status TEXT DEFAULT 'Active',
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Add the partners back
        cursor.execute("""
            INSERT INTO partners (email, full_name, password_hash, ownership_percentage) VALUES
            (?, ?, ?, 50),
            (?, ?, ?, 50)
        """, (
            'anurmamade@ngicapitaladvisory.com',
            'Andre Nurmamade',
            get_password_hash('TempPassword123!'),
            'lwhitworth@ngicapitaladvisory.com',
            'Landon Whitworth', 
            get_password_hash('TempPassword123!')
        ))
        
        # Add the three entities
        cursor.execute("""
            INSERT INTO entities (name, type, status, description) VALUES
            ('NGI Capital', 'C-Corporation', 'Active', 'Delaware C-Corp - Parent Company'),
            ('NGI Capital Advisory LLC', 'LLC', 'Active', 'Investment Advisory Subsidiary'),
            ('Creator Terminal', 'SaaS', 'Active', 'Financial Technology Platform')
        """)
        
        print("Database wiped and reset with partners and entities")
        
    else:
        print("Operation cancelled")
        return
    
    conn.commit()
    conn.close()
    print("\nDatabase preparation complete!")

if __name__ == "__main__":
    clear_and_setup_database()