"""
Production Database Initialization Script
=========================================
Sets up the NGI Capital database with all required tables and initial data.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import from our production API
from src.api.models import Base, Partners, Entities, ChartOfAccounts, BankAccounts
from src.api.auth import get_password_hash

# Database setup
DATABASE_URL = "sqlite:///ngi_capital.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_database():
    """Initialize the database with tables and initial data"""
    
    print("Initializing NGI Capital Production Database...")
    print("=" * 50)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("[OK] Database tables created")
    
    # Create a session
    db = SessionLocal()
    
    try:
        # Initialize partners
        partners = [
            {
                "email": "anurmamade@ngicapitaladvisory.com",
                "name": "Andre Nurmamade",
                "password": "TempPassword123!",
                "ownership_percentage": 50.0,
                "capital_account_balance": 0.0
            },
            {
                "email": "lwhitworth@ngicapitaladvisory.com",
                "name": "Landon Whitworth",
                "password": "TempPassword123!",
                "ownership_percentage": 50.0,
                "capital_account_balance": 0.0
            }
        ]
        
        for partner_data in partners:
            existing = db.query(Partners).filter(Partners.email == partner_data["email"]).first()
            if not existing:
                partner = Partners(
                    email=partner_data["email"],
                    name=partner_data["name"],
                    password_hash=get_password_hash(partner_data["password"]),
                    ownership_percentage=partner_data["ownership_percentage"],
                    capital_account_balance=partner_data["capital_account_balance"],
                    is_active=True,
                    created_at=datetime.utcnow()
                )
                db.add(partner)
                print(f"[OK] Created partner: {partner_data['name']}")
            else:
                print(f"  Partner already exists: {partner_data['name']}")
        
        db.commit()
        
        # Initialize entities
        ngi_llc = db.query(Entities).filter(Entities.legal_name == "NGI Capital LLC").first()
        if not ngi_llc:
            ngi_llc = Entities(
                legal_name="NGI Capital LLC",
                entity_type="LLC",
                ein="88-3957014",
                formation_date=datetime(2024, 7, 16),
                state="Delaware",
                file_number="7816542",
                registered_agent="Corporate Service Company",
                registered_address="251 Little Falls Drive, Wilmington, DE 19808",
                status="active",
                is_active=True
            )
            db.add(ngi_llc)
            db.commit()
            db.refresh(ngi_llc)
            print("[OK] Created NGI Capital LLC entity")
        else:
            print("  NGI Capital LLC already exists")
        
        # Create subsidiary entities
        subsidiaries = [
            {
                "legal_name": "NGI Capital, Inc.",
                "entity_type": "C-Corp",
                "state": "Delaware",
                "parent_entity_id": ngi_llc.id,
                "status": "converting"
            },
            {
                "legal_name": "The Creator Terminal, Inc.",
                "entity_type": "C-Corp",
                "state": "Delaware",
                "parent_entity_id": ngi_llc.id,
                "status": "pre-formation"
            },
            {
                "legal_name": "NGI Capital Advisory LLC",
                "entity_type": "LLC",
                "state": "Delaware",
                "parent_entity_id": ngi_llc.id,
                "status": "pre-formation"
            }
        ]
        
        for sub_data in subsidiaries:
            existing = db.query(Entities).filter(Entities.legal_name == sub_data["legal_name"]).first()
            if not existing:
                entity = Entities(**sub_data, is_active=True)
                db.add(entity)
                print(f"[OK] Created entity: {sub_data['legal_name']}")
            else:
                print(f"  Entity already exists: {sub_data['legal_name']}")
        
        db.commit()
        
        # Initialize basic chart of accounts
        accounts = [
            # Assets (10000-19999)
            {"account_number": "10100", "account_name": "Cash - Operating", "account_type": "Asset", "account_category": "Current Asset"},
            {"account_number": "10200", "account_name": "Cash - Savings", "account_type": "Asset", "account_category": "Current Asset"},
            {"account_number": "10300", "account_name": "Accounts Receivable", "account_type": "Asset", "account_category": "Current Asset"},
            {"account_number": "10400", "account_name": "Prepaid Expenses", "account_type": "Asset", "account_category": "Current Asset"},
            {"account_number": "15000", "account_name": "Equipment", "account_type": "Asset", "account_category": "Fixed Asset"},
            {"account_number": "15100", "account_name": "Accumulated Depreciation", "account_type": "Asset", "account_category": "Contra Asset"},
            {"account_number": "16000", "account_name": "Intangible Assets", "account_type": "Asset", "account_category": "Intangible Asset"},
            
            # Liabilities (20000-29999)
            {"account_number": "20100", "account_name": "Accounts Payable", "account_type": "Liability", "account_category": "Current Liability"},
            {"account_number": "20200", "account_name": "Credit Card Payable", "account_type": "Liability", "account_category": "Current Liability"},
            {"account_number": "20300", "account_name": "Accrued Expenses", "account_type": "Liability", "account_category": "Current Liability"},
            {"account_number": "20400", "account_name": "Deferred Revenue", "account_type": "Liability", "account_category": "Current Liability"},
            {"account_number": "25000", "account_name": "Notes Payable", "account_type": "Liability", "account_category": "Long-term Liability"},
            
            # Equity (30000-39999)
            {"account_number": "30100", "account_name": "Partner Capital - Andre", "account_type": "Equity", "account_category": "Partner Capital"},
            {"account_number": "30200", "account_name": "Partner Capital - Landon", "account_type": "Equity", "account_category": "Partner Capital"},
            {"account_number": "30300", "account_name": "Partner Draws - Andre", "account_type": "Equity", "account_category": "Partner Draws"},
            {"account_number": "30400", "account_name": "Partner Draws - Landon", "account_type": "Equity", "account_category": "Partner Draws"},
            {"account_number": "39000", "account_name": "Retained Earnings", "account_type": "Equity", "account_category": "Retained Earnings"},
            
            # Revenue (40000-49999)
            {"account_number": "40100", "account_name": "Advisory Fee Revenue", "account_type": "Revenue", "account_category": "Operating Revenue"},
            {"account_number": "40200", "account_name": "Consulting Revenue", "account_type": "Revenue", "account_category": "Operating Revenue"},
            {"account_number": "40300", "account_name": "Product Revenue", "account_type": "Revenue", "account_category": "Operating Revenue"},
            {"account_number": "40400", "account_name": "Investment Income", "account_type": "Revenue", "account_category": "Other Revenue"},
            {"account_number": "40500", "account_name": "Interest Income", "account_type": "Revenue", "account_category": "Other Revenue"},
            
            # Expenses (50000-59999)
            {"account_number": "50100", "account_name": "Salaries & Wages", "account_type": "Expense", "account_category": "Operating Expense"},
            {"account_number": "50200", "account_name": "Rent Expense", "account_type": "Expense", "account_category": "Operating Expense"},
            {"account_number": "50300", "account_name": "Utilities", "account_type": "Expense", "account_category": "Operating Expense"},
            {"account_number": "50400", "account_name": "Insurance", "account_type": "Expense", "account_category": "Operating Expense"},
            {"account_number": "50500", "account_name": "Professional Fees", "account_type": "Expense", "account_category": "Operating Expense"},
            {"account_number": "50600", "account_name": "Office Supplies", "account_type": "Expense", "account_category": "Operating Expense"},
            {"account_number": "50700", "account_name": "Travel & Entertainment", "account_type": "Expense", "account_category": "Operating Expense"},
            {"account_number": "50800", "account_name": "Marketing & Advertising", "account_type": "Expense", "account_category": "Operating Expense"},
            {"account_number": "50900", "account_name": "Technology & Software", "account_type": "Expense", "account_category": "Operating Expense"},
            {"account_number": "51000", "account_name": "Telephone & Internet", "account_type": "Expense", "account_category": "Operating Expense"},
            {"account_number": "51100", "account_name": "Legal Fees", "account_type": "Expense", "account_category": "Operating Expense"},
            {"account_number": "51200", "account_name": "Accounting Fees", "account_type": "Expense", "account_category": "Operating Expense"},
            {"account_number": "59000", "account_name": "Depreciation Expense", "account_type": "Expense", "account_category": "Non-cash Expense"},
            {"account_number": "59100", "account_name": "Amortization Expense", "account_type": "Expense", "account_category": "Non-cash Expense"}
        ]
        
        for account_data in accounts:
            existing = db.query(ChartOfAccounts).filter(
                ChartOfAccounts.account_code == account_data["account_number"]
            ).first()
            if not existing:
                account = ChartOfAccounts(
                    entity_id=ngi_llc.id,
                    account_code=account_data["account_number"],
                    account_name=account_data["account_name"],
                    account_type=account_data["account_type"],
                    description=account_data["account_category"],
                    is_active=True
                )
                db.add(account)
        
        db.commit()
        print("[OK] Chart of accounts initialized")
        
        # Initialize bank accounts
        bank_accounts = [
            {
                "entity_id": ngi_llc.id,
                "bank_name": "Mercury Bank",
                "account_name": "NGI Capital Operating Account",
                "account_type": "checking",
                "account_number_last4": "1234",
                "routing_number": "021000021",
                "current_balance": 0.0,
                "is_primary": True
            },
            {
                "entity_id": ngi_llc.id,
                "bank_name": "Mercury Bank",
                "account_name": "NGI Capital Savings Account",
                "account_type": "savings",
                "account_number_last4": "5678",
                "routing_number": "021000021",
                "current_balance": 0.0,
                "is_primary": False
            }
        ]
        
        for account_data in bank_accounts:
            existing = db.query(BankAccounts).filter(
                BankAccounts.entity_id == account_data["entity_id"],
                BankAccounts.account_name == account_data["account_name"]
            ).first()
            if not existing:
                bank_account = BankAccounts(**account_data, is_active=True)
                db.add(bank_account)
                print(f"[OK] Created bank account: {account_data['account_name']}")
            else:
                print(f"  Bank account already exists: {account_data['account_name']}")
        
        db.commit()
        
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
        
    except Exception as e:
        print(f"\n[ERROR] Error during initialization: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_database()