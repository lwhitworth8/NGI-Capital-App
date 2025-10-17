"""
Legacy: Production Database Initialization Script (archived)
Preserved from scripts/init_production_db.py during deprecated cleanup.
"""

import os
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from services.api.models import (
    Base,
    Partners,
    Entities,
    ChartOfAccounts,
    BankAccounts,
    AccountType,
    EntityType,
    TransactionType,
)
from services.api.auth import get_password_hash


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
    try:
        os.makedirs("/app/data", exist_ok=True)
        return "sqlite:////app/data/ngi_capital.db"
    except Exception:
        return "sqlite:///ngi_capital.db"


DATABASE_URL = _resolve_database_url()
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def main():
    print("[legacy] init_production_db archived; no-op")


if __name__ == "__main__":
    main()

