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
    try:
        yield db
    finally:
        db.close()


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
