"""
Seed minimal accounting data for testing
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from datetime import date, datetime
from decimal import Decimal

from src.api.models import Partners, Entities
from src.api.models_accounting import ChartOfAccounts
from src.api import models_accounting_part2
from src.api import models_accounting_part3

engine = create_engine('sqlite:///./ngi_capital.db')

def seed_data(session):
    # Partners
    partners = [
        Partners(
            id=1,
            email="landon@ngicapital.com",
            name="Landon Whitworth",
            password_hash="hashed",
            ownership_percentage=Decimal("50.00"),
            capital_account_balance=Decimal("100000.00"),
            is_active=True,
            created_at=datetime.now()
        ),
        Partners(
            id=2,
            email="andre@ngicapital.com",
            name="Andre Nurmamade",
            password_hash="hashed",
            ownership_percentage=Decimal("50.00"),
            capital_account_balance=Decimal("100000.00"),
            is_active=True,
            created_at=datetime.now()
        )
    ]
    session.add_all(partners)
    print("[OK] Created 2 partners")
    
    # Entities
    entities = [
        Entities(
            id=1,
            legal_name="NGI Capital Inc.",
            entity_type="CORPORATION",
            ein="87-1234567",
            formation_date=date(2024, 1, 1),
            formation_state="Delaware",
            is_active=True,
            created_at=datetime.now()
        ),
        Entities(
            id=2,
            legal_name="NGI Capital Advisory LLC",
            entity_type="LLC",
            ein="87-7654321",
            formation_date=date(2023, 1, 1),
            formation_state="Delaware",
            parent_entity_id=1,
            is_active=True,
            created_at=datetime.now()
        )
    ]
    session.add_all(entities)
    print("[OK] Created 2 entities")
    
    # Minimal COA - just key accounts
    accounts = [
        (1, "10000", "Cash and Cash Equivalents", "Asset", None),
        (2, "10100", "Operating Cash", "Asset", 1),
        (3, "11000", "Accounts Receivable", "Asset", None),
        (4, "14000", "Property Plant Equipment", "Asset", None),
        (5, "20000", "Accounts Payable", "Liability", None),
        (6, "21000", "Accrued Liabilities", "Liability", None),
        (7, "30000", "Stockholders Equity", "Equity", None),
        (8, "31000", "Common Stock", "Equity", 7),
        (9, "33000", "Retained Earnings", "Equity", 7),
        (10, "40000", "Revenue", "Revenue", None),
        (11, "41000", "Service Revenue", "Revenue", 10),
        (12, "50000", "Cost of Services", "Expense", None),
        (13, "60000", "Operating Expenses", "Expense", None),
        (14, "61000", "Salaries and Wages", "Expense", 13),
        (15, "69000", "Income Tax Expense", "Expense", 13),
    ]
    
    for id, number, name, acc_type, parent_id in accounts:
        account = ChartOfAccounts(
            id=id,
            entity_id=1,
            account_number=number,
            account_name=name,
            account_type=acc_type,
            parent_account_id=parent_id,
            normal_balance="Debit" if acc_type in ["Asset", "Expense"] else "Credit",
            is_active=True,
            allow_posting=parent_id is not None,
            current_balance=Decimal("0.00"),
            created_by_id=1,
            created_at=datetime.now()
        )
        session.add(account)
    
    print(f"[OK] Created {len(accounts)} accounts")

with Session(engine) as session:
    try:
        seed_data(session)
        session.commit()
        print("\n[SUCCESS] Database seeded!")
    except Exception as e:
        session.rollback()
        print(f"\n[ERROR] {e}")
        raise

