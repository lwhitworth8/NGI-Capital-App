"""
Initialize clean production database - partners only
"""
import sqlite3
import bcrypt

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def init_clean_database():
    """Initialize clean database with only partner accounts"""
    conn = sqlite3.connect('ngi_capital.db')
    cursor = conn.cursor()
    
    print("Dropping all existing tables...")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    for table in tables:
        if table[0] != 'sqlite_sequence':
            cursor.execute(f"DROP TABLE IF EXISTS {table[0]}")
            print(f"  Dropped {table[0]}")
    
    print("\nCreating clean tables...")
    
    # Partners table only - for login
    cursor.execute("""
        CREATE TABLE partners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(100) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            ownership_percentage DECIMAL(5,2) NOT NULL CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
            capital_account_balance DECIMAL(15,2) DEFAULT 0.00,
            is_active BOOLEAN DEFAULT 1,
            last_login TIMESTAMP NULL,
            failed_login_attempts INTEGER DEFAULT 0,
            account_locked_until TIMESTAMP NULL,
            password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            CONSTRAINT valid_email CHECK (email LIKE '%@ngicapitaladvisory.com'),
            CONSTRAINT valid_ownership CHECK (ownership_percentage BETWEEN 0 AND 100)
        )
    """)
    
    # Add ONLY the partner accounts
    print("Adding partner accounts...")
    cursor.execute("""
        INSERT INTO partners (email, name, password_hash, ownership_percentage) VALUES
        (?, ?, ?, 50),
        (?, ?, ?, 50)
    """, (
        'lwhitworth@ngicapitaladvisory.com',
        'Landon Whitworth',
        get_password_hash('NGICapital2025!'),
        'anurmamade@ngicapitaladvisory.com',
        'Andre Nurmamade',
        get_password_hash('NGICapital2025!')
    ))
    
    conn.commit()
    conn.close()
    
    print("\nClean database initialized successfully!")
    print("\nLogin Credentials:")
    print("  Landon: lwhitworth@ngicapitaladvisory.com / NGICapital2025!")
    print("  Andre: anurmamade@ngicapitaladvisory.com / NGICapital2025!")
    print("\nDatabase is clean - all company data will be added through the application.")

if __name__ == "__main__":
    init_clean_database()