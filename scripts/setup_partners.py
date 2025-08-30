#!/usr/bin/env python3
"""
NGI Capital Partner Setup Script
===============================

This script sets up additional partner configurations including:
- Partner-specific settings and preferences
- Initial capital account balances
- Security configurations
- Notification preferences
- Access permissions

Usage: python scripts/setup_partners.py
"""

import os
import sys
import getpass
from datetime import datetime, date
from pathlib import Path

# Add src directory to path for imports
sys.path.append(str(Path(__file__).parent.parent / "src"))

try:
    from passlib.context import CryptContext
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
except ImportError as e:
    print(f"Error: Required packages not installed. Please run: pip install {str(e).split()[-1]}")
    print("Required packages: sqlalchemy passlib bcrypt")
    sys.exit(1)

# Configuration
DATABASE_PATH = "ngi_capital.db"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_database():
    """Verify database exists and has required tables"""
    if not os.path.exists(DATABASE_PATH):
        print(f"❌ Database not found: {DATABASE_PATH}")
        print("Please run 'python scripts/init_database.py' first")
        return False
    
    try:
        engine = create_engine(f"sqlite:///{DATABASE_PATH}")
        with engine.connect() as conn:
            # Check if partners table exists and has data
            result = conn.execute(text("SELECT COUNT(*) FROM partners")).fetchone()
            if result[0] == 0:
                print("❌ No partners found in database")
                print("Please run 'python scripts/init_database.py' first")
                return False
            print(f"✓ Found {result[0]} partner(s) in database")
            return True
    except Exception as e:
        print(f"❌ Database verification failed: {str(e)}")
        return False

def list_partners():
    """List all partners in the system"""
    engine = create_engine(f"sqlite:///{DATABASE_PATH}")
    with engine.connect() as conn:
        partners = conn.execute(text("""
            SELECT id, email, name, ownership_percentage, capital_account_balance, is_active
            FROM partners 
            ORDER BY name
        """)).fetchall()
        
        print("\nCurrent Partners:")
        print("=" * 80)
        print(f"{'ID':<3} {'Name':<20} {'Email':<30} {'Ownership':<12} {'Capital':<15} {'Active'}")
        print("-" * 80)
        
        for partner in partners:
            status = "✓" if partner[5] else "✗"
            print(f"{partner[0]:<3} {partner[2]:<20} {partner[1]:<30} {partner[3]:<11}% ${partner[4]:<14,.2f} {status}")
        
        return partners

def setup_partner_passwords():
    """Allow partners to set secure passwords"""
    print("\n" + "=" * 60)
    print("PARTNER PASSWORD SETUP")
    print("=" * 60)
    
    engine = create_engine(f"sqlite:///{DATABASE_PATH}")
    partners = list_partners()
    
    print("\nWould you like to set up secure passwords for partners? (y/N): ", end="")
    if input().lower() != 'y':
        return
    
    for partner in partners:
        partner_id, email, name = partner[0], partner[1], partner[2]
        print(f"\nSetting up password for {name} ({email})")
        print("-" * 50)
        
        change_password = input(f"Change password for {name}? (y/N): ")
        if change_password.lower() == 'y':
            while True:
                new_password = getpass.getpass("Enter new password (min 12 characters): ")
                if len(new_password) < 12:
                    print("❌ Password must be at least 12 characters long")
                    continue
                
                confirm_password = getpass.getpass("Confirm new password: ")
                if new_password != confirm_password:
                    print("❌ Passwords do not match")
                    continue
                
                # Hash and update password
                password_hash = pwd_context.hash(new_password)
                with engine.connect() as conn:
                    conn.execute(text("""
                        UPDATE partners 
                        SET password_hash = :hash, updated_at = CURRENT_TIMESTAMP
                        WHERE id = :id
                    """), {"hash": password_hash, "id": partner_id})
                    conn.commit()
                
                print(f"✓ Password updated for {name}")
                break

def setup_capital_accounts():
    """Set up initial capital account balances"""
    print("\n" + "=" * 60)
    print("CAPITAL ACCOUNT SETUP")
    print("=" * 60)
    
    engine = create_engine(f"sqlite:///{DATABASE_PATH}")
    partners = list_partners()
    
    print("\nWould you like to set initial capital account balances? (y/N): ", end="")
    if input().lower() != 'y':
        return
    
    for partner in partners:
        partner_id, email, name, ownership, current_capital = partner[0], partner[1], partner[2], partner[3], partner[4]
        
        print(f"\nCapital Account for {name}")
        print(f"Current balance: ${current_capital:,.2f}")
        print(f"Ownership percentage: {ownership}%")
        
        update_capital = input("Update capital account balance? (y/N): ")
        if update_capital.lower() == 'y':
            while True:
                try:
                    new_balance = float(input("Enter new capital balance: $"))
                    break
                except ValueError:
                    print("❌ Please enter a valid number")
            
            with engine.connect() as conn:
                conn.execute(text("""
                    UPDATE partners 
                    SET capital_account_balance = :balance, updated_at = CURRENT_TIMESTAMP
                    WHERE id = :id
                """), {"balance": new_balance, "id": partner_id})
                conn.commit()
            
            print(f"✓ Capital account balance updated to ${new_balance:,.2f}")
            
            # Create journal entries for capital contribution if balance > 0
            if new_balance > current_capital:
                contribution = new_balance - current_capital
                create_capital_contribution_entry(engine, partner_id, name, contribution)

def create_capital_contribution_entry(engine, partner_id, partner_name, amount):
    """Create journal entries for capital contributions"""
    print(f"Creating journal entries for capital contribution of ${amount:,.2f}...")
    
    try:
        with engine.connect() as conn:
            # Get entity ID
            entity_result = conn.execute(text("SELECT id FROM entities LIMIT 1")).fetchone()
            if not entity_result:
                print("❌ No entity found - cannot create journal entries")
                return
            entity_id = entity_result[0]
            
            # Create transaction record
            trans_result = conn.execute(text("""
                INSERT INTO transactions (
                    entity_id, transaction_date, amount, transaction_type, 
                    description, created_by, approval_status
                ) VALUES (
                    :entity_id, :date, :amount, 'CAPITAL_CONTRIBUTION',
                    :description, :created_by, 'approved'
                ) RETURNING id
            """), {
                "entity_id": entity_id,
                "date": date.today(),
                "amount": amount,
                "description": f"Capital contribution by {partner_name}",
                "created_by": "system@ngicapital.com"
            })
            
            transaction_id = trans_result.fetchone()[0]
            
            # Get account IDs
            cash_account = conn.execute(text("""
                SELECT id FROM accounts WHERE account_code = '11101'
            """)).fetchone()
            
            capital_account = conn.execute(text(f"""
                SELECT id FROM accounts WHERE account_name LIKE '%{partner_name.split()[0]}%Capital%'
            """)).fetchone()
            
            if cash_account and capital_account:
                # Debit Cash
                conn.execute(text("""
                    INSERT INTO journal_entries (transaction_id, account_id, debit_amount, description)
                    VALUES (:trans_id, :account_id, :amount, :description)
                """), {
                    "trans_id": transaction_id,
                    "account_id": cash_account[0],
                    "amount": amount,
                    "description": f"Capital contribution by {partner_name}"
                })
                
                # Credit Capital Account
                conn.execute(text("""
                    INSERT INTO journal_entries (transaction_id, account_id, credit_amount, description)
                    VALUES (:trans_id, :account_id, :amount, :description)
                """), {
                    "trans_id": transaction_id,
                    "account_id": capital_account[0],
                    "amount": amount,
                    "description": f"Capital contribution by {partner_name}"
                })
                
                conn.commit()
                print(f"✓ Journal entries created for capital contribution")
            else:
                print("❌ Could not find required accounts for journal entries")
                
    except Exception as e:
        print(f"❌ Failed to create journal entries: {str(e)}")

def setup_security_settings():
    """Configure security settings for partners"""
    print("\n" + "=" * 60)
    print("SECURITY CONFIGURATION")
    print("=" * 60)
    
    print("\nSecurity Settings:")
    print("✓ Dual approval required for transactions > $500")
    print("✓ Partners cannot approve their own transactions")
    print("✓ Password minimum length: 12 characters")
    print("✓ Session timeout: 30 minutes of inactivity")
    print("✓ Audit logging enabled for all actions")
    
    print("\nRecommended additional security measures:")
    print("- Enable two-factor authentication (2FA)")
    print("- Regular password rotation (every 90 days)")
    print("- IP whitelisting for production access")
    print("- Regular security audits")
    
    print("\nThese settings are configured in the application code.")
    print("Additional security configuration should be done in production deployment.")

def verify_setup():
    """Verify the partner setup is complete"""
    print("\n" + "=" * 60)
    print("SETUP VERIFICATION")
    print("=" * 60)
    
    engine = create_engine(f"sqlite:///{DATABASE_PATH}")
    
    with engine.connect() as conn:
        # Check partner data
        partners = conn.execute(text("""
            SELECT name, email, ownership_percentage, capital_account_balance 
            FROM partners WHERE is_active = 1
        """)).fetchall()
        
        print("\nPartner Verification:")
        total_ownership = 0
        total_capital = 0
        
        for partner in partners:
            name, email, ownership, capital = partner
            total_ownership += ownership
            total_capital += capital
            print(f"✓ {name} ({email}) - {ownership}% ownership, ${capital:,.2f} capital")
        
        print(f"\nTotals:")
        print(f"Total ownership: {total_ownership}%")
        print(f"Total capital: ${total_capital:,.2f}")
        
        if abs(total_ownership - 100.0) < 0.01:
            print("✓ Ownership percentages sum to 100%")
        else:
            print("❌ Warning: Ownership percentages do not sum to 100%")
        
        # Check accounts
        account_count = conn.execute(text("SELECT COUNT(*) FROM accounts")).fetchone()[0]
        print(f"✓ Chart of accounts: {account_count} accounts configured")
        
        # Check entities
        entity_count = conn.execute(text("SELECT COUNT(*) FROM entities")).fetchone()[0]
        print(f"✓ Business entities: {entity_count} entities configured")

def main():
    """Main setup function"""
    print("=" * 60)
    print("NGI Capital Partner Setup")
    print("=" * 60)
    print()
    
    # Verify database exists
    if not verify_database():
        return
    
    try:
        # Show current partners
        list_partners()
        
        # Setup options
        print("\nSetup Options:")
        print("1. Set up partner passwords")
        print("2. Configure capital accounts")
        print("3. Review security settings")
        print("4. Verify setup")
        print("5. Run all setup steps")
        
        choice = input("\nSelect option (1-5): ").strip()
        
        if choice == "1":
            setup_partner_passwords()
        elif choice == "2":
            setup_capital_accounts()
        elif choice == "3":
            setup_security_settings()
        elif choice == "4":
            verify_setup()
        elif choice == "5":
            setup_partner_passwords()
            setup_capital_accounts()
            setup_security_settings()
            verify_setup()
        else:
            print("Invalid choice. Exiting.")
            return
        
        print("\n" + "=" * 60)
        print("PARTNER SETUP COMPLETE")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Run 'scripts/start_app.bat' to start the application")
        print("2. Login with partner credentials")
        print("3. Test dual approval workflow")
        print("4. Review financial reports")
        
    except Exception as e:
        print(f"❌ Partner setup failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()