#!/usr/bin/env python3
"""
Initialize NGI Capital database with partner accounts
"""
import sqlite3
import bcrypt
from datetime import datetime

def init_database():
    """Initialize database with partners"""
    conn = sqlite3.connect('ngi_capital.db')
    cursor = conn.cursor()
    
    # Create partners table if it doesn't exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS partners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            ownership_percentage REAL NOT NULL,
            capital_account_balance REAL DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    """)
    
    # Create entities table if it doesn't exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS entities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            legal_name TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            ein TEXT,
            formation_date DATE,
            state TEXT,
            file_number TEXT,
            registered_agent TEXT,
            registered_address TEXT,
            parent_entity_id INTEGER,
            status TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_entity_id) REFERENCES entities(id)
        )
    """)
    
    # Clear existing partners
    cursor.execute("DELETE FROM partners")
    
    # Hash the password
    password = "TempPassword123!"
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Insert partners
    partners = [
        ('anurmamade@ngicapitaladvisory.com', 'Andre Nurmamade', password_hash, 50.0),
        ('lwhitworth@ngicapitaladvisory.com', 'Landon Whitworth', password_hash, 50.0)
    ]
    
    for email, name, pwd_hash, ownership in partners:
        cursor.execute("""
            INSERT INTO partners (email, name, password_hash, ownership_percentage, is_active)
            VALUES (?, ?, ?, ?, 1)
        """, (email, name, pwd_hash, ownership))
        print(f"[OK] Added partner: {name} ({email})")
    
    # Clear and add entities
    cursor.execute("DELETE FROM entities")
    
    entities = [
        ('NGI Capital LLC', 'LLC', '88-3957014', '2024-07-16', 'Delaware', '7816542', 
         'Corporate Service Company', '251 Little Falls Drive, Wilmington, DE 19808', None, 'active'),
        ('NGI Capital, Inc.', 'C-Corp', None, None, 'Delaware', None, 
         'Corporate Service Company', '251 Little Falls Drive, Wilmington, DE 19808', None, 'converting'),
        ('The Creator Terminal, Inc.', 'C-Corp', None, None, 'Delaware', None,
         None, None, 2, 'pre-formation'),
        ('NGI Capital Advisory LLC', 'LLC', None, None, 'Delaware', None,
         None, None, 2, 'pre-formation')
    ]
    
    for entity_data in entities:
        cursor.execute("""
            INSERT INTO entities (legal_name, entity_type, ein, formation_date, state, 
                                 file_number, registered_agent, registered_address, 
                                 parent_entity_id, status, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, entity_data)
        print(f"[OK] Added entity: {entity_data[0]}")
    
    # Commit changes
    conn.commit()
    
    # Verify partners
    cursor.execute("SELECT email, name FROM partners")
    partners = cursor.fetchall()
    
    print("\n[SUCCESS] Database initialized successfully!")
    print(f"Total partners: {len(partners)}")
    print("\nYou can now login with:")
    for email, name in partners:
        print(f"  - {email} / TempPassword123!")
    
    conn.close()

if __name__ == "__main__":
    init_database()