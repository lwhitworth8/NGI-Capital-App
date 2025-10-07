#!/usr/bin/env python3
"""
Seed Chart of Accounts for all entities
"""
import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from src.api.database import get_db
from src.api.models_accounting import AccountingEntity, ChartOfAccounts
from datetime import datetime

# US GAAP Chart of Accounts template
GAAP_ACCOUNTS = [
    # Assets (10000-19999)
    {"account_number": "10000", "account_name": "ASSETS", "account_type": "Asset", "normal_balance": "Debit", "allow_posting": False, "level": 1},
    {"account_number": "10100", "account_name": "Current Assets", "account_type": "Asset", "normal_balance": "Debit", "allow_posting": False, "level": 2},
    {"account_number": "10110", "account_name": "Cash and Cash Equivalents", "account_type": "Asset", "normal_balance": "Debit", "allow_posting": True, "level": 3},
    {"account_number": "10120", "account_name": "Accounts Receivable", "account_type": "Asset", "normal_balance": "Debit", "allow_posting": True, "level": 3},
    {"account_number": "10130", "account_name": "Allowance for Doubtful Accounts", "account_type": "Asset", "normal_balance": "Credit", "allow_posting": True, "level": 3},
    
    # Liabilities (20000-29999)
    {"account_number": "20000", "account_name": "LIABILITIES", "account_type": "Liability", "normal_balance": "Credit", "allow_posting": False, "level": 1},
    {"account_number": "20100", "account_name": "Current Liabilities", "account_type": "Liability", "normal_balance": "Credit", "allow_posting": False, "level": 2},
    {"account_number": "20110", "account_name": "Accounts Payable", "account_type": "Liability", "normal_balance": "Credit", "allow_posting": True, "level": 3},
    {"account_number": "20120", "account_name": "Accrued Expenses", "account_type": "Liability", "normal_balance": "Credit", "allow_posting": True, "level": 3},
    
    # Equity (30000-39999)
    {"account_number": "30000", "account_name": "EQUITY", "account_type": "Equity", "normal_balance": "Credit", "allow_posting": False, "level": 1},
    {"account_number": "30100", "account_name": "Capital Stock", "account_type": "Equity", "normal_balance": "Credit", "allow_posting": True, "level": 2},
    {"account_number": "30200", "account_name": "Retained Earnings", "account_type": "Equity", "normal_balance": "Credit", "allow_posting": True, "level": 2},
    
    # Revenue (40000-49999)
    {"account_number": "40000", "account_name": "REVENUE", "account_type": "Revenue", "normal_balance": "Credit", "allow_posting": False, "level": 1},
    {"account_number": "40100", "account_name": "Service Revenue", "account_type": "Revenue", "normal_balance": "Credit", "allow_posting": True, "level": 2},
    
    # Expenses (50000-59999)
    {"account_number": "50000", "account_name": "EXPENSES", "account_type": "Expense", "normal_balance": "Debit", "allow_posting": False, "level": 1},
    {"account_number": "50100", "account_name": "Operating Expenses", "account_type": "Expense", "normal_balance": "Debit", "allow_posting": False, "level": 2},
    {"account_number": "50110", "account_name": "Salaries and Wages", "account_type": "Expense", "normal_balance": "Debit", "allow_posting": True, "level": 3},
    {"account_number": "50120", "account_name": "Rent Expense", "account_type": "Expense", "normal_balance": "Debit", "allow_posting": True, "level": 3},
    {"account_number": "50130", "account_name": "Office Supplies", "account_type": "Expense", "normal_balance": "Debit", "allow_posting": True, "level": 3},
]

def seed_coa_for_entity(db, entity_id: int):
    """Seed COA for a specific entity"""
    # Check if already exists
    existing = db.query(ChartOfAccounts).filter(ChartOfAccounts.entity_id == entity_id).count()
    if existing > 0:
        print(f"  Entity {entity_id} already has {existing} accounts - skipping")
        return existing
    
    print(f"  Creating {len(GAAP_ACCOUNTS)} accounts for entity {entity_id}...")
    for acc in GAAP_ACCOUNTS:
        account = ChartOfAccounts(
            entity_id=entity_id,
            account_number=acc["account_number"],
            account_name=acc["account_name"],
            account_type=acc["account_type"],
            normal_balance=acc["normal_balance"],
            allow_posting=acc["allow_posting"],
            is_active=True,
            gaap_reference="ASC 205",
            current_balance=0.00,
            ytd_activity=0.00
        )
        db.add(account)
    
    db.commit()
    print(f"  ✅ Created {len(GAAP_ACCOUNTS)} accounts for entity {entity_id}")
    return len(GAAP_ACCOUNTS)

def main():
    db = next(get_db())
    
    try:
        # Get all active entities
        entities = db.query(AccountingEntity).filter(AccountingEntity.entity_status == "active").all()
        
        if not entities:
            print("❌ No active entities found! Run seed_entities_simple.py first")
            return
        
        print(f"Found {len(entities)} active entities")
        print("="*60)
        
        total_created = 0
        for entity in entities:
            print(f"\n{entity.entity_name} (ID: {entity.id})")
            count = seed_coa_for_entity(db, entity.id)
            total_created += count
        
        print("\n" + "="*60)
        print(f"✅ COMPLETE! Seeded COA for {len(entities)} entities")
        print(f"Total accounts created: {total_created}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()




