"""
Initialize all accounting tables in the database
Creates tables from SQLAlchemy models
"""

from src.api.database import engine
from src.api.models_accounting import Base
from src.api.models import Base as MainBase


def init_tables():
    """
    Create all accounting tables
    """
    try:
        print("Creating accounting tables...")
        
        # Create all tables defined in both Base classes
        MainBase.metadata.create_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        
        print("\nSuccessfully created all accounting tables!")
        print("\nTables created:")
        
        # List all accounting tables
        accounting_tables = [
            "accounting_entities",
            "entity_relationships",
            "chart_of_accounts",
            "journal_entries",
            "journal_entry_lines",
            "accounting_documents",
            "bank_accounts",
            "bank_transactions",
            "bank_reconciliations",
            "approval_workflows",
            "approval_actions",
            "entity_conversions",
            "period_close_checklists",
            "period_close_validations",
        ]
        
        for table in accounting_tables:
            print(f"  ✅ {table}")
        
        print("\nNow run: python scripts/seed_accounting_entities.py")
        
    except Exception as e:
        print(f"Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    init_tables()


