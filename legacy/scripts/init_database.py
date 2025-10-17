#!/usr/bin/env python3
"""
Legacy: Database Initialization Script (archived)
Preserved from scripts/init_database.py during deprecated cleanup.
"""

import os
import sys
from datetime import datetime, date
from decimal import Decimal
from pathlib import Path
import logging

sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

from services.api.models import (
    Base, Partners, Entities, ChartOfAccounts, JournalEntries, 
    JournalEntryLines, Transactions, ExpenseReports, ExpenseItems,
    Documents, AuditLog, RevenueRecognition, RevenueRecognitionEntries,
    BankAccounts, BankTransactions, ApprovalStatus, TransactionType,
    AccountType, EntityType, ExpenseStatus, DocumentType
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('init_database.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class DatabaseInitializer:
    def __init__(self, database_url: str = "sqlite:///ngi_capital.db"):
        self.database_url = database_url
        self.engine = create_engine(database_url, echo=False)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
    def initialize_database(self):
        logger.info("Starting NGI Capital database initialization...")
        try:
            self.create_tables()
            self.create_views()
            self.create_indexes()
            self.populate_initial_data()
            logger.info("Database initialization completed successfully!")
        except Exception as e:
            logger.error(f"Database initialization failed: {str(e)}")
            raise
    
    def create_tables(self):
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=self.engine)
        logger.info("All tables created successfully")
    
    def create_views(self):
        logger.info("Creating database views...")
        with self.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    
    def create_indexes(self):
        pass
    
    def populate_initial_data(self):
        pass


def main():
    database_url = os.getenv("DATABASE_URL", "sqlite:///ngi_capital.db")
    try:
        initializer = DatabaseInitializer(database_url)
        initializer.initialize_database()
    except Exception as e:
        logger.error(f"Initialization failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

