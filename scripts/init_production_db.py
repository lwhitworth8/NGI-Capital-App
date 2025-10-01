"""
Production Database Initialization Script (clean, idempotent)
Initializes core tables and seed data aligned with current models.py.
"""

import os
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.api.models import (
    Base,
    Partners,
    Entities,
    ChartOfAccounts,
    BankAccounts,
    AccountType,
    EntityType,
    TransactionType,
)
from src.api.auth import get_password_hash


def _resolve_database_url() -> str:
    env_url = (os.getenv("DATABASE_URL") or "").strip()
    if env_url:
        return env_url
    env_path = (os.getenv("DATABASE_PATH") or "").strip()
    if env_path:
        try:
            os.makedirs(os.path.dirname(env_path), exist_ok=True)
        except Exception:
            pass
        return env_path if env_path.startswith("sqlite:") else f"sqlite:///{env_path}"
    # Default: container volume path
    try:
        os.makedirs("/app/data", exist_ok=True)
        return "sqlite:////app/data/ngi_capital.db"
    except Exception:
        return "sqlite:///ngi_capital.db"


DATABASE_URL = _resolve_database_url()
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def ensure_partners(db):
    seeds = [
        (
            "anurmamade@ngicapitaladvisory.com",
            "Andre Nurmamade",
            "TempPassword123!",
            Decimal("50.0"),
        ),
        (
            "lwhitworth@ngicapitaladvisory.com",
            "Landon Whitworth",
            "TempPassword123!",
            Decimal("50.0"),
        ),
    ]
    for email, name, pw, pct in seeds:
        ex = db.query(Partners).filter(Partners.email == email).first()
        if not ex:
            db.add(
                Partners(
                    email=email,
                    name=name,
                    password_hash=get_password_hash(pw),
                    ownership_percentage=pct,
                    capital_account_balance=Decimal("0"),
                    is_active=True,
                    created_at=datetime.utcnow(),
                )
            )
            print(f"[OK] Created partner: {name}")
        else:
            print(f"  Partner already exists: {name}")
    db.commit()


def ensure_entities(db):
    ngi = db.query(Entities).filter(Entities.legal_name == "NGI Capital LLC").first()
    if not ngi:
        ngi = Entities(
            legal_name="NGI Capital LLC",
            entity_type=EntityType.LLC,
            ein="88-3957014",
            formation_date=date(2024, 7, 16),
            is_active=True,
        )
        db.add(ngi)
        db.commit()
        db.refresh(ngi)
        print("[OK] Created NGI Capital LLC entity")
    else:
        print("  NGI Capital LLC already exists")

    subs = [
        ("NGI Capital, Inc.", EntityType.CORPORATION),
        ("The Creator Terminal, Inc.", EntityType.CORPORATION),
        ("NGI Capital Advisory LLC", EntityType.LLC),
    ]
    for name, etype in subs:
        ex = db.query(Entities).filter(Entities.legal_name == name).first()
        if not ex:
            db.add(
                Entities(
                    legal_name=name,
                    entity_type=etype,
                    parent_entity_id=ngi.id,
                    is_active=True,
                )
            )
            print(f"[OK] Created entity: {name}")
        else:
            print(f"  Entity already exists: {name}")
    db.commit()
    return ngi


def ensure_coa(db, entity_id: int):
    accounts = [
        # code, name, type, normal_balance
        ("10100", "Cash - Operating", AccountType.ASSET, TransactionType.DEBIT),
        ("10200", "Cash - Savings", AccountType.ASSET, TransactionType.DEBIT),
        ("10300", "Accounts Receivable", AccountType.ASSET, TransactionType.DEBIT),
        ("10400", "Prepaid Expenses", AccountType.ASSET, TransactionType.DEBIT),
        ("15000", "Equipment", AccountType.ASSET, TransactionType.DEBIT),
        ("15100", "Accumulated Depreciation", AccountType.ASSET, TransactionType.CREDIT),
        ("16000", "Intangible Assets", AccountType.ASSET, TransactionType.DEBIT),
        ("20100", "Accounts Payable", AccountType.LIABILITY, TransactionType.CREDIT),
        ("20200", "Credit Card Payable", AccountType.LIABILITY, TransactionType.CREDIT),
        ("20300", "Accrued Expenses", AccountType.LIABILITY, TransactionType.CREDIT),
        ("20400", "Deferred Revenue", AccountType.LIABILITY, TransactionType.CREDIT),
        ("25000", "Notes Payable", AccountType.LIABILITY, TransactionType.CREDIT),
        ("30100", "Partner Capital - Andre", AccountType.EQUITY, TransactionType.CREDIT),
        ("30200", "Partner Capital - Landon", AccountType.EQUITY, TransactionType.CREDIT),
        ("30300", "Partner Draws - Andre", AccountType.EQUITY, TransactionType.DEBIT),
        ("30400", "Partner Draws - Landon", AccountType.EQUITY, TransactionType.DEBIT),
        ("39000", "Retained Earnings", AccountType.EQUITY, TransactionType.CREDIT),
        ("40100", "Advisory Fee Revenue", AccountType.REVENUE, TransactionType.CREDIT),
        ("40200", "Consulting Revenue", AccountType.REVENUE, TransactionType.CREDIT),
        ("40300", "Product Revenue", AccountType.REVENUE, TransactionType.CREDIT),
        ("40400", "Investment Income", AccountType.REVENUE, TransactionType.CREDIT),
        ("40500", "Interest Income", AccountType.REVENUE, TransactionType.CREDIT),
        ("50100", "Salaries & Wages", AccountType.EXPENSE, TransactionType.DEBIT),
        ("50200", "Rent Expense", AccountType.EXPENSE, TransactionType.DEBIT),
        ("50300", "Utilities", AccountType.EXPENSE, TransactionType.DEBIT),
        ("50400", "Insurance", AccountType.EXPENSE, TransactionType.DEBIT),
        ("50500", "Professional Fees", AccountType.EXPENSE, TransactionType.DEBIT),
        ("50600", "Office Supplies", AccountType.EXPENSE, TransactionType.DEBIT),
        ("50700", "Travel & Entertainment", AccountType.EXPENSE, TransactionType.DEBIT),
        ("50800", "Marketing & Advertising", AccountType.EXPENSE, TransactionType.DEBIT),
        ("50900", "Technology & Software", AccountType.EXPENSE, TransactionType.DEBIT),
        ("51000", "Telephone & Internet", AccountType.EXPENSE, TransactionType.DEBIT),
        ("51100", "Legal Fees", AccountType.EXPENSE, TransactionType.DEBIT),
        ("51200", "Accounting Fees", AccountType.EXPENSE, TransactionType.DEBIT),
        ("59000", "Depreciation Expense", AccountType.EXPENSE, TransactionType.DEBIT),
        ("59100", "Amortization Expense", AccountType.EXPENSE, TransactionType.DEBIT),
    ]
    created = 0
    for code, name, atype, normal in accounts:
        ex = (
            db.query(ChartOfAccounts)
            .filter(
                ChartOfAccounts.entity_id == entity_id,
                ChartOfAccounts.account_code == code,
            )
            .first()
        )
        if not ex:
            db.add(
                ChartOfAccounts(
                    entity_id=entity_id,
                    account_code=code,
                    account_name=name,
                    account_type=atype,
                    normal_balance=normal,
                )
            )
            created += 1
    db.commit()
    print(f"[OK] Chart of accounts ensured (created {created} accounts)")


def ensure_bank_accounts(db, entity_id: int):
    defs = [
        ("NGI Capital Operating Account", "checking", "1234", True),
        ("NGI Capital Savings Account", "savings", "5678", False),
    ]
    for name, acct_type, last4, is_primary in defs:
        ex = (
            db.query(BankAccounts)
            .filter(BankAccounts.entity_id == entity_id, BankAccounts.account_name == name)
            .first()
        )
        if not ex:
            db.add(
                BankAccounts(
                    entity_id=entity_id,
                    bank_name="Mercury Bank",
                    account_name=name,
                    account_type=acct_type,
                    account_number_masked=last4,
                    routing_number="021000021",
                    current_balance=Decimal("0"),
                    is_primary=is_primary,
                )
            )
            print(f"[OK] Created bank account: {name}")
        else:
            print(f"  Bank account already exists: {name}")
    db.commit()


def main():
    print("Initializing NGI Capital Production Database...")
    print("=" * 50)
    Base.metadata.create_all(bind=engine)
    print("[OK] Database tables created/verified")
    db = SessionLocal()
    try:
        ensure_partners(db)
        ngi = ensure_entities(db)
        ensure_coa(db, ngi.id)
        ensure_bank_accounts(db, ngi.id)
        print("\n[OK] Initialization complete")
    except Exception as e:
        print(f"[ERROR] Initialization failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
