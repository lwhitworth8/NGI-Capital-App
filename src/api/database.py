"""
Database configuration for NGI Capital Internal System
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Use centralized config that selects the pytest DB when tests run
from .config import DATABASE_URL

# Import the single declarative Base from models to avoid duplicate metadata
from .models import Base

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False,
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """
    Dependency to get database session.
    Ensures the session is closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize the database by creating all tables defined in models.
    """
    Base.metadata.create_all(bind=engine)


def drop_all_tables():
    """
    Drop all tables in the database. USE WITH CAUTION.
    """
    Base.metadata.drop_all(bind=engine)
