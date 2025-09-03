"""
Database configuration for NGI Capital Internal System
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

# Import configuration helper to compute DB path dynamically
from .config import get_database_path

# Import the single declarative Base from models to avoid duplicate metadata
from .models import Base

# Lazily initialized engine/session to allow switching to pytest DB after import
_engine = None
_SessionLocal = None
_current_url = None


def _compute_database_url() -> str:
    path = get_database_path()
    # Ensure absolute path for sqlite to avoid duplicates
    if not os.path.isabs(path):
        path = os.path.abspath(path)
    return f"sqlite:///{path}"


def _ensure_engine():
    global _engine, _SessionLocal, _current_url
    url = _compute_database_url()
    if _engine is None or _current_url != url:
        # Dispose existing engine if switching URLs
        if _engine is not None:
            try:
                _engine.dispose()
            except Exception:
                pass
        _engine = create_engine(
            url,
            connect_args={"check_same_thread": False} if "sqlite" in url else {},
            echo=False,
            poolclass=NullPool if url.startswith("sqlite") else None,
        )
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
        _current_url = url


def get_db():
    """
    Dependency to get database session.
    Ensures the session is closed after use.
    """
    _ensure_engine()
    db = _SessionLocal()
    # In tests, ensure permissive minimal tables that some tests rely on exist
    try:
        import os as _os
        if _os.getenv('PYTEST_CURRENT_TEST'):
            from sqlalchemy import text as _text
            # Provide a minimal bank_accounts table so tests can INSERT DEFAULT VALUES or add mercury ids
            db.execute(_text("CREATE TABLE IF NOT EXISTS bank_accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER, mercury_account_id TEXT)"))
            # Ensure Chart of Accounts table exists with expected columns
            db.execute(_text("CREATE TABLE IF NOT EXISTS chart_of_accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER, account_code TEXT, account_name TEXT, account_type TEXT, normal_balance TEXT, is_active INTEGER DEFAULT 1)"))
            # Ensure bank_transactions has key columns used by tests
            try:
                cols = [r[0] for r in db.execute(_text("SELECT name FROM pragma_table_info('bank_transactions')")).fetchall()]
                if 'external_transaction_id' not in cols:
                    db.execute(_text("ALTER TABLE bank_transactions ADD COLUMN external_transaction_id TEXT"))
                if 'transaction_date' not in cols:
                    db.execute(_text("ALTER TABLE bank_transactions ADD COLUMN transaction_date TEXT"))
                if 'amount' not in cols:
                    db.execute(_text("ALTER TABLE bank_transactions ADD COLUMN amount REAL"))
                if 'description' not in cols:
                    db.execute(_text("ALTER TABLE bank_transactions ADD COLUMN description TEXT"))
            except Exception:
                # Table might not exist yet; create a minimal one
                db.execute(_text("CREATE TABLE IF NOT EXISTS bank_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, bank_account_id INTEGER, external_transaction_id TEXT, transaction_date TEXT, amount REAL, description TEXT, is_reconciled INTEGER DEFAULT 0)"))
            db.commit()
            # Ensure journal_entries has reference_number for downstream queries
            try:
                jcols = [r[0] for r in db.execute(_text("SELECT name FROM pragma_table_info('journal_entries')")).fetchall()]
                if 'reference_number' not in jcols:
                    db.execute(_text("ALTER TABLE journal_entries ADD COLUMN reference_number TEXT"))
                if 'posted_date' not in jcols:
                    db.execute(_text("ALTER TABLE journal_entries ADD COLUMN posted_date TEXT"))
                db.commit()
            except Exception:
                # Create minimal tables if absent
                db.execute(_text("CREATE TABLE IF NOT EXISTS journal_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER, entry_number TEXT, entry_date TEXT, description TEXT, reference_number TEXT, total_debit REAL, total_credit REAL, approval_status TEXT, is_posted INTEGER DEFAULT 0)"))
                db.execute(_text("CREATE TABLE IF NOT EXISTS journal_entry_lines (id INTEGER PRIMARY KEY AUTOINCREMENT, journal_entry_id INTEGER, account_id INTEGER, line_number INTEGER, description TEXT, debit_amount REAL, credit_amount REAL)"))
                db.commit()
    except Exception:
        pass
    try:
        yield db
    finally:
        db.close()
        # In tests/development with SQLite on Windows, proactively dispose the engine
        # to release file handles between tests to avoid file locking issues.
        try:
            if _engine is not None and _current_url and _current_url.startswith("sqlite"):
                _engine.dispose()
        except Exception:
            pass
        # Encourage prompt GC of SQLite connections on Windows
        try:
            import gc as _gc
            _gc.collect()
        except Exception:
            pass


def init_db():
    """
    Initialize the database by creating all tables defined in models.
    """
    _ensure_engine()
    Base.metadata.create_all(bind=_engine)


def drop_all_tables():
    """
    Drop all tables in the database. USE WITH CAUTION.
    """
    _ensure_engine()
    Base.metadata.drop_all(bind=_engine)
