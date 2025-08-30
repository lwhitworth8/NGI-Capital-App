"""
Simple Database Initialization Script
=====================================
Sets up the NGI Capital database with basic tables and initial data.
"""

import sqlite3
from datetime import datetime
import bcrypt

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def init_database():
    """Initialize the database with tables and initial data"""
    
    print("Initializing NGI Capital Database...")
    print("=" * 50)
    
    # Connect to database
    conn = sqlite3.connect('ngi_capital.db')
    cursor = conn.cursor()
    
    # Create partners table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS partners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            ownership_percentage REAL NOT NULL,
            capital_account_balance REAL DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            last_login TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("[OK] Partners table created")
    
    # Create entities table
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
            status TEXT DEFAULT 'active',
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_entity_id) REFERENCES entities(id)
        )
    """)
    
    # Add missing columns if they don't exist
    try:
        cursor.execute("ALTER TABLE entities ADD COLUMN file_number TEXT")
    except:
        pass
    try:
        cursor.execute("ALTER TABLE entities ADD COLUMN registered_agent TEXT")
    except:
        pass
    try:
        cursor.execute("ALTER TABLE entities ADD COLUMN registered_address TEXT")
    except:
        pass
    try:
        cursor.execute("ALTER TABLE entities ADD COLUMN parent_entity_id INTEGER")
    except:
        pass
    try:
        cursor.execute("ALTER TABLE entities ADD COLUMN status TEXT DEFAULT 'active'")
    except:
        pass
    
    print("[OK] Entities table created/updated")
    
    # Create transactions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER NOT NULL,
            transaction_date DATE NOT NULL,
            amount REAL NOT NULL,
            transaction_type TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT,
            vendor TEXT,
            created_by TEXT NOT NULL,
            approved_by TEXT,
            approved_at TIMESTAMP,
            approval_status TEXT DEFAULT 'pending',
            approval_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (entity_id) REFERENCES entities(id)
        )
    """)
    print("[OK] Transactions table created")
    
    # Create chart_of_accounts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chart_of_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_number TEXT UNIQUE NOT NULL,
            account_name TEXT NOT NULL,
            account_type TEXT NOT NULL,
            account_category TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("[OK] Chart of accounts table created")
    
    # Create bank_accounts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bank_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER NOT NULL,
            bank_name TEXT NOT NULL,
            account_name TEXT NOT NULL,
            account_type TEXT NOT NULL,
            account_number_last4 TEXT,
            routing_number TEXT,
            current_balance REAL DEFAULT 0,
            is_primary BOOLEAN DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (entity_id) REFERENCES entities(id)
        )
    """)
    print("[OK] Bank accounts table created")
    
    # Create documents table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id TEXT NOT NULL,
            document_type_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_path TEXT,
            file_size INTEGER,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            uploaded_by TEXT,
            status TEXT DEFAULT 'uploaded',
            extracted_data TEXT
        )
    """)
    print("[OK] Documents table created")
    
    # Create audit_log table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            partner_id INTEGER,
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id INTEGER,
            details TEXT,
            ip_address TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (partner_id) REFERENCES partners(id)
        )
    """)
    print("[OK] Audit log table created")
    
    # Insert partners
    partners = [
        ("anurmamade@ngicapitaladvisory.com", "Andre Nurmamade", "TempPassword123!", 50.0),
        ("lwhitworth@ngicapitaladvisory.com", "Landon Whitworth", "TempPassword123!", 50.0)
    ]
    
    for email, name, password, ownership in partners:
        # Check if partner exists
        cursor.execute("SELECT id FROM partners WHERE email = ?", (email,))
        if not cursor.fetchone():
            password_hash = get_password_hash(password)
            cursor.execute("""
                INSERT INTO partners (email, name, password_hash, ownership_percentage, capital_account_balance, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (email, name, password_hash, ownership, 0.0, 1))
            print(f"[OK] Created partner: {name}")
        else:
            print(f"    Partner already exists: {name}")
    
    # Insert entities
    # Check if NGI Capital LLC exists
    cursor.execute("SELECT id FROM entities WHERE legal_name = 'NGI Capital LLC'")
    result = cursor.fetchone()
    if not result:
        cursor.execute("""
            INSERT INTO entities (legal_name, entity_type, ein, formation_date, state, file_number, 
                                registered_agent, registered_address, status, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("NGI Capital LLC", "LLC", "88-3957014", "2024-07-16", "Delaware", "7816542",
              "Corporate Service Company", "251 Little Falls Drive, Wilmington, DE 19808", "active", 1))
        print("[OK] Created NGI Capital LLC entity")
    else:
        print("    NGI Capital LLC already exists")
    
    # Get NGI LLC id
    cursor.execute("SELECT id FROM entities WHERE legal_name = 'NGI Capital LLC'")
    result = cursor.fetchone()
    if result:
        ngi_llc_id = result[0]
    else:
        print("[ERROR] Failed to get NGI Capital LLC id")
        return
    
    # Insert subsidiary entities
    subsidiaries = [
        ("NGI Capital, Inc.", "C-Corp", "Delaware", "converting"),
        ("The Creator Terminal, Inc.", "C-Corp", "Delaware", "pre-formation"),
        ("NGI Capital Advisory LLC", "LLC", "Delaware", "pre-formation")
    ]
    
    for legal_name, entity_type, state, status in subsidiaries:
        cursor.execute("SELECT id FROM entities WHERE legal_name = ?", (legal_name,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO entities (legal_name, entity_type, state, parent_entity_id, status, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (legal_name, entity_type, state, ngi_llc_id, status, 1))
            print(f"[OK] Created entity: {legal_name}")
        else:
            print(f"    Entity already exists: {legal_name}")
    
    # Insert chart of accounts
    accounts = [
        # Assets
        ("10100", "Cash - Operating", "Asset", "Current Asset"),
        ("10200", "Cash - Savings", "Asset", "Current Asset"),
        ("10300", "Accounts Receivable", "Asset", "Current Asset"),
        ("15000", "Equipment", "Asset", "Fixed Asset"),
        # Liabilities
        ("20100", "Accounts Payable", "Liability", "Current Liability"),
        ("20200", "Credit Card Payable", "Liability", "Current Liability"),
        ("25000", "Notes Payable", "Liability", "Long-term Liability"),
        # Equity
        ("30100", "Partner Capital - Andre", "Equity", "Partner Capital"),
        ("30200", "Partner Capital - Landon", "Equity", "Partner Capital"),
        ("39000", "Retained Earnings", "Equity", "Retained Earnings"),
        # Revenue
        ("40100", "Advisory Fee Revenue", "Revenue", "Operating Revenue"),
        ("40200", "Consulting Revenue", "Revenue", "Operating Revenue"),
        # Expenses
        ("50100", "Salaries & Wages", "Expense", "Operating Expense"),
        ("50200", "Rent Expense", "Expense", "Operating Expense"),
        ("50300", "Utilities", "Expense", "Operating Expense"),
        ("50500", "Professional Fees", "Expense", "Operating Expense"),
        ("50700", "Travel & Entertainment", "Expense", "Operating Expense")
    ]
    
    for account_number, account_name, account_type, account_category in accounts:
        # Get the first entity ID for the chart of accounts
        cursor.execute("SELECT id FROM entities WHERE legal_name = 'NGI Capital LLC'")
        entity_result = cursor.fetchone()
        if entity_result:
            entity_id = entity_result[0]
            cursor.execute("""
                INSERT OR IGNORE INTO chart_of_accounts (entity_id, account_code, account_name, account_type, description, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (entity_id, account_number, account_name, account_type, account_category, 1))
    
    print("[OK] Chart of accounts initialized")
    
    # Insert bank accounts
    cursor.execute("""
        INSERT OR IGNORE INTO bank_accounts (entity_id, bank_name, account_name, account_type, 
                                            account_number_masked, routing_number, current_balance, is_primary, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (ngi_llc_id, "Mercury Bank", "NGI Capital Operating Account", "checking", 
          "****1234", "021000021", 0.0, 1, 1))
    
    cursor.execute("""
        INSERT OR IGNORE INTO bank_accounts (entity_id, bank_name, account_name, account_type, 
                                            account_number_masked, routing_number, current_balance, is_primary, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (ngi_llc_id, "Mercury Bank", "NGI Capital Savings Account", "savings", 
          "****5678", "021000021", 0.0, 0, 1))
    
    print("[OK] Bank accounts created")
    
    # Commit all changes
    conn.commit()
    conn.close()
    
    print("\n" + "=" * 50)
    print("[SUCCESS] Database initialization complete!")
    print("\nPartner login credentials:")
    print("  Andre: anurmamade@ngicapitaladvisory.com / TempPassword123!")
    print("  Landon: lwhitworth@ngicapitaladvisory.com / TempPassword123!")
    print("\nEntities created:")
    print("  - NGI Capital LLC (Active)")
    print("  - NGI Capital, Inc. (Converting)")
    print("  - The Creator Terminal, Inc. (Pre-formation)")
    print("  - NGI Capital Advisory LLC (Pre-formation)")

if __name__ == "__main__":
    init_database()