#!/usr/bin/env python3
"""
Database Initialization Script for NGI Capital Internal Accounting System
Creates tables, indexes, views, and populates initial data
"""

import os
import sys
from datetime import datetime, date
from decimal import Decimal
from pathlib import Path
import logging

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

from src.api.models import (
    Base, Partners, Entities, ChartOfAccounts, JournalEntries, 
    JournalEntryLines, Transactions, ExpenseReports, ExpenseItems,
    Documents, AuditLog, RevenueRecognition, RevenueRecognitionEntries,
    BankAccounts, BankTransactions, ApprovalStatus, TransactionType,
    AccountType, EntityType, ExpenseStatus, DocumentType
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('init_database.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class DatabaseInitializer:
    """Initialize NGI Capital accounting database with initial data"""
    
    def __init__(self, database_url: str = "sqlite:///ngi_capital.db"):
        self.database_url = database_url
        self.engine = create_engine(database_url, echo=False)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
    def initialize_database(self):
        """Complete database initialization"""
        logger.info("Starting NGI Capital database initialization...")
        
        try:
            # Create all tables
            self.create_tables()
            
            # Create database views
            self.create_views()
            
            # Create indexes for performance
            self.create_indexes()
            
            # Insert initial data
            self.populate_initial_data()
            
            logger.info("Database initialization completed successfully!")
            
        except Exception as e:
            logger.error(f"Database initialization failed: {str(e)}")
            raise
    
    def create_tables(self):
        """Create all database tables"""
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=self.engine)
        logger.info("All tables created successfully")
    
    def create_views(self):
        """Create database views for reporting"""
        logger.info("Creating database views...")
        
        with self.engine.connect() as conn:
            # General Ledger View
            general_ledger_view = """
            CREATE VIEW IF NOT EXISTS general_ledger_view AS
            SELECT 
                jel.id,
                coa.entity_id,
                coa.account_code,
                coa.account_name,
                coa.account_type,
                je.entry_date as transaction_date,
                je.description,
                je.entry_number,
                jel.debit_amount,
                jel.credit_amount,
                SUM(jel.debit_amount - jel.credit_amount) OVER (
                    PARTITION BY coa.account_code 
                    ORDER BY je.entry_date, je.id
                    ROWS UNBOUNDED PRECEDING
                ) as running_balance
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE je.approval_status = 'approved'
            ORDER BY coa.account_code, je.entry_date, je.id;
            """
            conn.execute(text(general_ledger_view))
            
            # Trial Balance View
            trial_balance_view = """
            CREATE VIEW IF NOT EXISTS trial_balance_view AS
            SELECT 
                coa.entity_id,
                coa.account_code,
                coa.account_name,
                coa.account_type,
                coa.normal_balance,
                COALESCE(SUM(jel.debit_amount), 0) as total_debits,
                COALESCE(SUM(jel.credit_amount), 0) as total_credits,
                CASE 
                    WHEN coa.normal_balance = 'debit' THEN 
                        COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0)
                    ELSE 
                        COALESCE(SUM(jel.credit_amount), 0) - COALESCE(SUM(jel.debit_amount), 0)
                END as balance
            FROM chart_of_accounts coa
            LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
            LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
            WHERE coa.is_active = true 
                AND (je.approval_status = 'approved' OR je.approval_status IS NULL)
            GROUP BY coa.id, coa.entity_id, coa.account_code, coa.account_name, 
                     coa.account_type, coa.normal_balance
            ORDER BY coa.account_code;
            """
            conn.execute(text(trial_balance_view))
            
            # Account Balances View
            account_balances_view = """
            CREATE VIEW IF NOT EXISTS account_balances_view AS
            SELECT 
                coa.id as account_id,
                coa.entity_id,
                coa.account_code,
                coa.account_name,
                coa.account_type,
                COALESCE(
                    CASE 
                        WHEN coa.normal_balance = 'debit' THEN 
                            SUM(jel.debit_amount - jel.credit_amount)
                        ELSE 
                            SUM(jel.credit_amount - jel.debit_amount)
                    END, 
                    0
                ) as current_balance,
                MAX(je.entry_date) as last_transaction_date
            FROM chart_of_accounts coa
            LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
            LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
                AND je.approval_status = 'approved'
            WHERE coa.is_active = true
            GROUP BY coa.id, coa.entity_id, coa.account_code, coa.account_name, 
                     coa.account_type, coa.normal_balance;
            """
            conn.execute(text(account_balances_view))
            
            conn.commit()
        
        logger.info("Database views created successfully")
    
    def create_indexes(self):
        """Create performance indexes"""
        logger.info("Creating database indexes...")
        
        indexes = [
            # Partner indexes
            "CREATE INDEX IF NOT EXISTS idx_partners_email ON partners(email);",
            "CREATE INDEX IF NOT EXISTS idx_partners_active ON partners(is_active);",
            
            # Chart of Accounts indexes
            "CREATE INDEX IF NOT EXISTS idx_coa_entity_code ON chart_of_accounts(entity_id, account_code);",
            "CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(account_type);",
            "CREATE INDEX IF NOT EXISTS idx_coa_active ON chart_of_accounts(is_active);",
            
            # Journal Entries indexes
            "CREATE INDEX IF NOT EXISTS idx_journal_entity_date ON journal_entries(entity_id, entry_date);",
            "CREATE INDEX IF NOT EXISTS idx_journal_status ON journal_entries(approval_status);",
            "CREATE INDEX IF NOT EXISTS idx_journal_created_by ON journal_entries(created_by_id);",
            "CREATE INDEX IF NOT EXISTS idx_journal_approved_by ON journal_entries(approved_by_id);",
            
            # Journal Entry Lines indexes
            "CREATE INDEX IF NOT EXISTS idx_jel_entry_id ON journal_entry_lines(journal_entry_id);",
            "CREATE INDEX IF NOT EXISTS idx_jel_account_id ON journal_entry_lines(account_id);",
            
            # Transactions indexes
            "CREATE INDEX IF NOT EXISTS idx_transactions_entity_date ON transactions(entity_id, transaction_date);",
            "CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(approval_status);",
            "CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount);",
            
            # Audit Log indexes
            "CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);",
            "CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_log(table_name, record_id);",
            
            # Bank Transactions indexes
            "CREATE INDEX IF NOT EXISTS idx_bank_trans_account_date ON bank_transactions(bank_account_id, transaction_date);",
            "CREATE INDEX IF NOT EXISTS idx_bank_trans_external_id ON bank_transactions(external_transaction_id);",
            "CREATE INDEX IF NOT EXISTS idx_bank_trans_reconciled ON bank_transactions(is_reconciled);",
        ]
        
        with self.engine.connect() as conn:
            for index_sql in indexes:
                try:
                    conn.execute(text(index_sql))
                except Exception as e:
                    logger.warning(f"Failed to create index: {index_sql}, Error: {e}")
            conn.commit()
        
        logger.info("Database indexes created successfully")
    
    def populate_initial_data(self):
        """Populate database with initial data"""
        logger.info("Populating initial data...")
        
        with self.SessionLocal() as db:
            try:
                # Create partners
                self.create_partners(db)
                
                # Create entities
                self.create_entities(db)
                
                # Create chart of accounts
                self.create_chart_of_accounts(db)
                
                # Create sample journal entries
                self.create_sample_journal_entries(db)
                
                # Create audit log entries
                self.create_initial_audit_logs(db)
                
                db.commit()
                logger.info("Initial data populated successfully")
                
            except Exception as e:
                db.rollback()
                logger.error(f"Failed to populate initial data: {str(e)}")
                raise
    
    def create_partners(self, db):
        """Create NGI Capital partners"""
        logger.info("Creating partners...")
        
        partners_data = [
            {
                "email": "anurmamade@ngicapital.com",
                "name": "Andre Nurmamade",
                "ownership_percentage": Decimal("50.00"),
                "capital_account_balance": Decimal("1055000.00"),  # Initial capital
                "password": "TempPassword123!"  # Should be changed on first login
            },
            {
                "email": "lwhitworth@ngicapital.com", 
                "name": "Landon Whitworth",
                "ownership_percentage": Decimal("50.00"),
                "capital_account_balance": Decimal("1055000.00"),  # Initial capital
                "password": "TempPassword123!"  # Should be changed on first login
            }
        ]
        
        for partner_data in partners_data:
            # Check if partner already exists
            existing = db.query(Partners).filter(Partners.email == partner_data["email"]).first()
            if existing:
                logger.info(f"Partner {partner_data['email']} already exists, skipping...")
                continue
            
            # Hash password
            hashed_password = pwd_context.hash(partner_data["password"])
            
            partner = Partners(
                email=partner_data["email"],
                name=partner_data["name"],
                password_hash=hashed_password,
                ownership_percentage=partner_data["ownership_percentage"],
                capital_account_balance=partner_data["capital_account_balance"],
                is_active=True
            )
            db.add(partner)
            logger.info(f"Created partner: {partner_data['name']}")
        
        db.flush()
    
    def create_entities(self, db):
        """Create legal entities"""
        logger.info("Creating entities...")
        
        entities_data = [
            {
                "legal_name": "NGI Capital Advisory LLC",
                "entity_type": EntityType.LLC,
                "ein": "88-1234567",
                "formation_date": date(2023, 1, 15),
                "formation_state": "Delaware",
                "address_line1": "1001 Avenue of the Americas",
                "address_line2": "Suite 1200",
                "city": "New York",
                "state": "NY",
                "postal_code": "10018",
                "phone": "+1-212-555-0123"
            },
            {
                "legal_name": "NGI Capital LLC", 
                "entity_type": EntityType.LLC,
                "ein": "88-7654321",
                "formation_date": date(2024, 1, 1),
                "formation_state": "Delaware",
                "parent_entity_id": 1,  # Will be set after first entity is created
                "address_line1": "1001 Avenue of the Americas",
                "address_line2": "Suite 1200", 
                "city": "New York",
                "state": "NY",
                "postal_code": "10018",
                "phone": "+1-212-555-0123"
            }
        ]
        
        created_entities = []
        for i, entity_data in enumerate(entities_data):
            # Check if entity already exists
            existing = db.query(Entities).filter(Entities.legal_name == entity_data["legal_name"]).first()
            if existing:
                logger.info(f"Entity {entity_data['legal_name']} already exists, skipping...")
                created_entities.append(existing)
                continue
            
            # Set parent entity for child entities
            if i > 0 and "parent_entity_id" in entity_data:
                entity_data["parent_entity_id"] = created_entities[0].id
            
            entity = Entities(**entity_data)
            db.add(entity)
            db.flush()
            created_entities.append(entity)
            logger.info(f"Created entity: {entity_data['legal_name']}")
        
        db.flush()
    
    def create_chart_of_accounts(self, db):
        """Create standard chart of accounts"""
        logger.info("Creating chart of accounts...")
        
        # Get the main entity
        main_entity = db.query(Entities).filter(Entities.legal_name == "NGI Capital Advisory LLC").first()
        if not main_entity:
            raise ValueError("Main entity not found")
        
        # Standard chart of accounts for professional services LLC
        accounts_data = [
            # Assets (1xxxx)
            {"code": "11000", "name": "Cash - Operating Account", "type": AccountType.ASSET, "normal": TransactionType.DEBIT},
            {"code": "11100", "name": "Cash - Savings Account", "type": AccountType.ASSET, "normal": TransactionType.DEBIT},
            {"code": "12000", "name": "Accounts Receivable", "type": AccountType.ASSET, "normal": TransactionType.DEBIT},
            {"code": "12100", "name": "Allowance for Doubtful Accounts", "type": AccountType.ASSET, "normal": TransactionType.CREDIT},
            {"code": "13000", "name": "Prepaid Expenses", "type": AccountType.ASSET, "normal": TransactionType.DEBIT},
            {"code": "14000", "name": "Security Deposits", "type": AccountType.ASSET, "normal": TransactionType.DEBIT},
            {"code": "15000", "name": "Equipment", "type": AccountType.ASSET, "normal": TransactionType.DEBIT},
            {"code": "15100", "name": "Accumulated Depreciation - Equipment", "type": AccountType.ASSET, "normal": TransactionType.CREDIT},
            {"code": "16000", "name": "Software & Technology", "type": AccountType.ASSET, "normal": TransactionType.DEBIT},
            {"code": "16100", "name": "Accumulated Amortization - Software", "type": AccountType.ASSET, "normal": TransactionType.CREDIT},
            
            # Liabilities (2xxxx)
            {"code": "21000", "name": "Accounts Payable", "type": AccountType.LIABILITY, "normal": TransactionType.CREDIT},
            {"code": "22000", "name": "Accrued Expenses", "type": AccountType.LIABILITY, "normal": TransactionType.CREDIT},
            {"code": "23000", "name": "Payroll Liabilities", "type": AccountType.LIABILITY, "normal": TransactionType.CREDIT},
            {"code": "24000", "name": "Sales Tax Payable", "type": AccountType.LIABILITY, "normal": TransactionType.CREDIT},
            {"code": "25000", "name": "Notes Payable - Short Term", "type": AccountType.LIABILITY, "normal": TransactionType.CREDIT},
            {"code": "26000", "name": "Notes Payable - Long Term", "type": AccountType.LIABILITY, "normal": TransactionType.CREDIT},
            {"code": "27000", "name": "Deferred Revenue", "type": AccountType.LIABILITY, "normal": TransactionType.CREDIT},
            
            # Equity (3xxxx)
            {"code": "31000", "name": "Member Capital - Andre Nurmamade", "type": AccountType.EQUITY, "normal": TransactionType.CREDIT},
            {"code": "31100", "name": "Member Capital - Landon Whitworth", "type": AccountType.EQUITY, "normal": TransactionType.CREDIT},
            {"code": "32000", "name": "Member Distributions - Andre Nurmamade", "type": AccountType.EQUITY, "normal": TransactionType.DEBIT},
            {"code": "32100", "name": "Member Distributions - Landon Whitworth", "type": AccountType.EQUITY, "normal": TransactionType.DEBIT},
            {"code": "33000", "name": "Retained Earnings", "type": AccountType.EQUITY, "normal": TransactionType.CREDIT},
            
            # Revenue (4xxxx)
            {"code": "41000", "name": "Professional Service Revenue", "type": AccountType.REVENUE, "normal": TransactionType.CREDIT},
            {"code": "41100", "name": "Consulting Revenue", "type": AccountType.REVENUE, "normal": TransactionType.CREDIT},
            {"code": "41200", "name": "Advisory Revenue", "type": AccountType.REVENUE, "normal": TransactionType.CREDIT},
            {"code": "42000", "name": "Investment Income", "type": AccountType.REVENUE, "normal": TransactionType.CREDIT},
            {"code": "43000", "name": "Interest Income", "type": AccountType.REVENUE, "normal": TransactionType.CREDIT},
            {"code": "44000", "name": "Other Revenue", "type": AccountType.REVENUE, "normal": TransactionType.CREDIT},
            
            # Expenses (5xxxx)
            {"code": "51000", "name": "Office Rent", "type": AccountType.EXPENSE, "normal": TransactionType.DEBIT},
            {"code": "51100", "name": "Utilities", "type": AccountType.EXPENSE, "normal": TransactionType.DEBIT},
            {"code": "51200", "name": "Depreciation Expense", "type": AccountType.EXPENSE, "normal": TransactionType.DEBIT},
            {"code": "51300", "name": "Amortization Expense", "type": AccountType.EXPENSE, "normal": TransactionType.DEBIT},
            {"code": "52000", "name": "Professional Services", "type": AccountType.EXPENSE, "normal": TransactionType.DEBIT},
            {"code": "52100", "name": "Legal & Professional", "type": AccountType.EXPENSE, "normal": TransactionType.DEBIT},
            {"code": "52200", "name": "Accounting & Tax Prep", "type": AccountType.EXPENSE, "normal": TransactionType.DEBIT},
            {"code": "53000", "name": "Travel & Entertainment", "type": AccountType.EXPENSE, "normal": TransactionType.DEBIT},
            {"code": "53100", "name": "Meals & Entertainment", "type": AccountType.EXPENSE, "normal": TransactionType.DEBIT},
            {"code": "54000", "name": "Marketing & Advertising", "type": AccountType.EXPENSE, "normal": TransactionType.DEBIT},
            {"code": "55000", "name": "Insurance", "type": AccountType.EXPENSE, "normal": TransactionType.DEBIT},
            {"code": "56000", "name": "Technology & Software", "type": AccountType.EXPENSE, "normal": TransactionType.DEBIT},
            {"code": "57000", "name": "Office Supplies", "type": AccountType.EXPENSE, "normal": TransactionType.DEBIT},
            {"code": "58000", "name": "Interest Expense", "type": AccountType.EXPENSE, "normal": TransactionType.DEBIT},
            {"code": "59000", "name": "Other Operating Expenses", "type": AccountType.EXPENSE, "normal": TransactionType.DEBIT},
        ]
        
        for account_data in accounts_data:
            # Check if account already exists
            existing = db.query(ChartOfAccounts).filter(
                ChartOfAccounts.entity_id == main_entity.id,
                ChartOfAccounts.account_code == account_data["code"]
            ).first()
            
            if existing:
                logger.info(f"Account {account_data['code']} already exists, skipping...")
                continue
            
            account = ChartOfAccounts(
                entity_id=main_entity.id,
                account_code=account_data["code"],
                account_name=account_data["name"],
                account_type=account_data["type"],
                normal_balance=account_data["normal"],
                is_active=True,
                description=f"Standard {account_data['type'].value} account"
            )
            db.add(account)
        
        db.flush()
        logger.info("Chart of accounts created successfully")
    
    def create_sample_journal_entries(self, db):
        """Create sample journal entries for initial setup"""
        logger.info("Creating sample journal entries...")
        
        # Get required data
        main_entity = db.query(Entities).filter(Entities.legal_name == "NGI Capital Advisory LLC").first()
        andre = db.query(Partners).filter(Partners.email == "anurmamade@ngicapital.com").first()
        landon = db.query(Partners).filter(Partners.email == "lwhitworth@ngicapital.com").first()
        
        if not all([main_entity, andre, landon]):
            logger.warning("Required data not found for sample journal entries")
            return
        
        # Get accounts
        cash_account = db.query(ChartOfAccounts).filter(
            ChartOfAccounts.entity_id == main_entity.id,
            ChartOfAccounts.account_code == "11000"
        ).first()
        
        andre_capital = db.query(ChartOfAccounts).filter(
            ChartOfAccounts.entity_id == main_entity.id,
            ChartOfAccounts.account_code == "31000"
        ).first()
        
        landon_capital = db.query(ChartOfAccounts).filter(
            ChartOfAccounts.entity_id == main_entity.id,
            ChartOfAccounts.account_code == "31100"
        ).first()
        
        if not all([cash_account, andre_capital, landon_capital]):
            logger.warning("Required accounts not found for sample journal entries")
            return
        
        # Initial capital contribution entry
        entry = JournalEntries(
            entity_id=main_entity.id,
            entry_number="JE-001-000001",
            entry_date=date(2024, 1, 1),
            description="Initial capital contributions from members",
            reference_number="INITIAL-CAP",
            total_debit=Decimal("2110000.00"),
            total_credit=Decimal("2110000.00"),
            created_by_id=andre.id,
            approved_by_id=landon.id,
            approval_status=ApprovalStatus.APPROVED,
            approval_date=datetime(2024, 1, 1, 12, 0, 0)
        )
        db.add(entry)
        db.flush()
        
        # Entry lines
        lines = [
            JournalEntryLines(
                journal_entry_id=entry.id,
                account_id=cash_account.id,
                line_number=1,
                description="Initial cash contribution",
                debit_amount=Decimal("2110000.00"),
                credit_amount=Decimal("0.00")
            ),
            JournalEntryLines(
                journal_entry_id=entry.id,
                account_id=andre_capital.id,
                line_number=2,
                description="Andre Nurmamade initial capital",
                debit_amount=Decimal("0.00"),
                credit_amount=Decimal("1055000.00")
            ),
            JournalEntryLines(
                journal_entry_id=entry.id,
                account_id=landon_capital.id,
                line_number=3,
                description="Landon Whitworth initial capital",
                debit_amount=Decimal("0.00"),
                credit_amount=Decimal("1055000.00")
            )
        ]
        
        for line in lines:
            db.add(line)
        
        db.flush()
        logger.info("Sample journal entries created successfully")
    
    def create_initial_audit_logs(self, db):
        """Create initial audit log entries"""
        logger.info("Creating initial audit logs...")
        
        andre = db.query(Partners).filter(Partners.email == "anurmamade@ngicapital.com").first()
        
        if not andre:
            logger.warning("Andre partner not found for audit logs")
            return
        
        # System initialization audit log
        audit_entry = AuditLog(
            user_id=andre.id,
            action="SYSTEM_INIT",
            table_name="system",
            record_id=1,
            new_values='{"action": "Database initialized with initial data", "version": "1.0.0"}',
            ip_address="127.0.0.1",
            user_agent="NGI Capital Database Initializer",
            timestamp=datetime.utcnow()
        )
        db.add(audit_entry)
        
        db.flush()
        logger.info("Initial audit logs created successfully")
    
    def create_bank_accounts(self, db):
        """Create initial bank accounts (optional)"""
        logger.info("Creating bank accounts...")
        
        main_entity = db.query(Entities).filter(Entities.legal_name == "NGI Capital Advisory LLC").first()
        if not main_entity:
            return
        
        # Mercury Bank operating account
        bank_account = BankAccounts(
            entity_id=main_entity.id,
            bank_name="Mercury Bank",
            account_name="NGI Capital Operating Account",
            account_number_masked="****1234",
            routing_number="021000021",
            account_type="checking",
            is_primary=True,
            is_active=True,
            current_balance=Decimal("2110000.00")  # Initial balance
        )
        db.add(bank_account)
        
        db.flush()
        logger.info("Bank accounts created successfully")


def main():
    """Main initialization function"""
    print("NGI Capital Database Initialization")
    print("=" * 50)
    
    # Database URL configuration
    database_url = os.getenv("DATABASE_URL", "sqlite:///ngi_capital.db")
    
    print(f"Database URL: {database_url}")
    print("Starting initialization...\n")
    
    try:
        initializer = DatabaseInitializer(database_url)
        initializer.initialize_database()
        
        print("\n" + "=" * 50)
        print("SUCCESS: Database initialization completed!")
        print("\nNext steps:")
        print("1. Start the FastAPI server: uvicorn src.api.main:app --reload")
        print("2. Start the Next.js frontend: cd apps/desktop && npm run dev")
        print("3. Login with:")
        print("   - Email: anurmamade@ngicapital.com")
        print("   - Email: lwhitworth@ngicapital.com")
        print("   - Password: TempPassword123!")
        print("4. Change passwords on first login")
        
    except Exception as e:
        print(f"\nERROR: Database initialization failed!")
        print(f"Error: {str(e)}")
        logger.error(f"Database initialization failed: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()