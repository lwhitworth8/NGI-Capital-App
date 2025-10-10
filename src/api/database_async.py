"""
NGI Capital - Async Database Configuration
Provides async SQLAlchemy engine and sessions for accounting module
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
import os

# Import all models to ensure they are registered with SQLAlchemy
from . import models_accounting
from . import models_accounting_part2
from . import models_accounting_part3
from . import models_learning

# Lazy initialization of async engine and session factory
async_engine = None
AsyncSessionLocal = None

def get_async_database_url():
    """Get the async database URL, reading from environment each time"""
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/ngi_capital.db")
    
    # Convert sync URL to async URL
    if DATABASE_URL.startswith("sqlite:///"):
        return DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///")
    elif DATABASE_URL.startswith("postgresql://"):
        return DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    elif DATABASE_URL.startswith("postgresql+psycopg2://"):
        return DATABASE_URL.replace("postgresql+psycopg2://", "postgresql+asyncpg://")
    else:
        return DATABASE_URL

def get_async_engine():
    """Get or create the async engine"""
    global async_engine
    if async_engine is None:
        ASYNC_DATABASE_URL = get_async_database_url()
        async_engine = create_async_engine(
            ASYNC_DATABASE_URL,
            echo=False,
            poolclass=NullPool if "sqlite" in ASYNC_DATABASE_URL else None,
        )
    return async_engine

def get_async_session_factory():
    """Get or create the async session factory"""
    global AsyncSessionLocal
    if AsyncSessionLocal is None:
        engine = get_async_engine()
        AsyncSessionLocal = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return AsyncSessionLocal


async def get_async_db():
    """
    Async dependency to get database session.
    Ensures the session is closed after use.
    """
    session_factory = get_async_session_factory()
    async with session_factory() as session:
        try:
            yield session
        finally:
            await session.close()




