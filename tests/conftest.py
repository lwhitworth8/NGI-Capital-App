"""
Shared pytest fixtures and configuration for NGI Capital test suite

Author: NGI Capital Development Team
Date: October 4, 2025
"""

import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from dotenv import load_dotenv

# Load environment variables from .env file for Mercury API tests
load_dotenv()

from src.api.database_async import get_async_db
from src.api.models import Base
from src.api.main import app


# Test database URL (in-memory SQLite)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="function")
async def async_db() -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session"""
    # Create async engine with in-memory SQLite
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False
    )
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    async_session = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
    
    # Drop all tables after test
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture(scope="function")
async def async_client(async_db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create an async HTTP client for testing"""
    from httpx import ASGITransport
    
    # Override the get_async_db dependency
    async def override_get_async_db():
        yield async_db
    
    app.dependency_overrides[get_async_db] = override_get_async_db
    
    # Create async client with ASGI transport
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    
    # Clear overrides
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def client(async_client: AsyncClient) -> AsyncClient:
    """Alias for async_client to match test expectations"""
    return async_client


@pytest.fixture(scope="function")
def mock_auth_headers() -> dict:
    """Create mock authentication headers for testing"""
    return {
        "Authorization": "Bearer test_token",
        "X-User-ID": "1",
        "X-User-Email": "lwhitworth@ngicapitaladvisory.com"
    }


# Database seed fixtures
@pytest.fixture(scope="function", autouse=True)
async def seed_test_entities(async_db: AsyncSession):
    """Seed test entities into database - runs automatically"""
    from src.api.models_accounting import AccountingEntity
    from decimal import Decimal
    
    # Check if entities already exist
    from sqlalchemy import select
    result = await async_db.execute(select(AccountingEntity).where(AccountingEntity.id == 1))
    existing = result.scalar_one_or_none()
    
    if not existing:
        entities = [
            AccountingEntity(
                id=1,
                entity_name="NGI Capital LLC",
                entity_type="LLC",
                is_available=True,
                parent_entity_id=None,
                ownership_percentage=None,
                formation_state="DE",
                entity_status="active",
                ein="12-3456789"
            ),
            AccountingEntity(
                id=2,
                entity_name="NGI Capital Advisory LLC",
                entity_type="LLC",
                is_available=False,
                parent_entity_id=1,
                ownership_percentage=Decimal("100.00"),
                formation_state="DE",
                entity_status="active"
            ),
            AccountingEntity(
                id=3,
                entity_name="The Creator Terminal Inc.",
                entity_type="C-Corp",
                is_available=False,
                parent_entity_id=1,
                ownership_percentage=Decimal("100.00"),
                formation_state="DE",
                entity_status="active"
            )
        ]
        
        for entity in entities:
            async_db.add(entity)
        
        await async_db.commit()
    
    return True


@pytest.fixture(scope="function")
async def seed_test_partners(async_db: AsyncSession):
    """Seed test partners/employees into database"""
    from src.api.models import Partners
    import bcrypt
    
    # Generate test password hash
    test_password_hash = bcrypt.hashpw("TestPassword123!".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    partners = [
        Partners(
            id=1,
            email="lwhitworth@ngicapitaladvisory.com",
            name="Landon Whitworth (CEO & Co-Founder)",
            password_hash=test_password_hash,
            ownership_percentage=50.0,
            is_active=True
        ),
        Partners(
            id=2,
            email="anurmamade@ngicapitaladvisory.com",
            name="Andre Nurmamade (Co-Founder, CFO & COO)",
            password_hash=test_password_hash,
            ownership_percentage=50.0,
            is_active=True
        )
    ]
    
    for partner in partners:
        async_db.add(partner)
    
    await async_db.commit()
    return partners


@pytest.fixture(scope="function")
async def seed_test_coa(async_db: AsyncSession, seed_test_entities):
    """Seed test chart of accounts"""
    from src.api.models_accounting import ChartOfAccounts
    
    accounts = [
        # Assets
        ChartOfAccounts(
            id=1,
            entity_id=1,
            account_number="1010",
            account_name="Cash - Operating",
            account_type="Asset",
            normal_balance="debit",
            allow_posting=True,
            is_active=True
        ),
        ChartOfAccounts(
            id=2,
            entity_id=1,
            account_number="1020",
            account_name="Accounts Receivable",
            account_type="Asset",
            normal_balance="debit",
            allow_posting=True,
            is_active=True
        ),
        # Liabilities
        ChartOfAccounts(
            id=3,
            entity_id=1,
            account_number="2010",
            account_name="Accounts Payable",
            account_type="Liability",
            normal_balance="credit",
            allow_posting=True,
            is_active=True
        ),
        # Equity
        ChartOfAccounts(
            id=4,
            entity_id=1,
            account_number="3010",
            account_name="Member Capital",
            account_type="Equity",
            normal_balance="credit",
            allow_posting=True,
            is_active=True
        ),
        # Revenue
        ChartOfAccounts(
            id=5,
            entity_id=1,
            account_number="4010",
            account_name="Service Revenue",
            account_type="Revenue",
            normal_balance="credit",
            allow_posting=True,
            is_active=True
        ),
        # Expenses
        ChartOfAccounts(
            id=6,
            entity_id=1,
            account_number="6010",
            account_name="Operating Expenses",
            account_type="Expense",
            normal_balance="debit",
            allow_posting=True,
            is_active=True
        )
    ]
    
    for account in accounts:
        async_db.add(account)
    
    await async_db.commit()
    return accounts


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "e2e: marks tests as end-to-end tests"
    )
    config.addinivalue_line(
        "markers", "mercury: marks tests that use real Mercury API"
    )
"""
Shared pytest fixtures and configuration for NGI Capital test suite.

This setup uses a file-backed SQLite DB via the sync Session dependency
to align with the FastAPI app and avoid async/sync mismatches.
"""

import os
import shutil
import pytest
from typing import AsyncGenerator
from httpx import AsyncClient
from dotenv import load_dotenv

# Load environment variables for tests (Mercury, etc.)
load_dotenv()

from src.api.main import app
from src.api.database import get_db as sync_get_db, init_db as sync_init_db

TEST_DB_PATH = os.path.abspath(os.path.join("data", "test_ngi_capital.db"))


def _prepare_clean_db_file():
    os.makedirs(os.path.dirname(TEST_DB_PATH), exist_ok=True)
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            try:
                shutil.move(TEST_DB_PATH, TEST_DB_PATH + ".old")
            except Exception:
                pass


@pytest.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    # Point to a per-test DB
    os.environ["DATABASE_PATH"] = TEST_DB_PATH
    _prepare_clean_db_file()
    sync_init_db()

    from httpx import ASGITransport
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

    # Cleanup file after test
    try:
        if os.path.exists(TEST_DB_PATH):
            os.remove(TEST_DB_PATH)
    except Exception:
        pass


@pytest.fixture(scope="function")
def mock_auth_headers() -> dict:
    """Create mock authentication headers for testing"""
    return {
        "Authorization": "Bearer test_token",
        "X-User-ID": "1",
        "X-User-Email": "lwhitworth@ngicapitaladvisory.com",
    }


# Database seed fixtures
@pytest.fixture(scope="function", autouse=True)
def seed_test_entities():
    """Seed test entities into database - runs automatically"""
    from sqlalchemy import select
    from decimal import Decimal
    from src.api.models_accounting import AccountingEntity
    with next(sync_get_db()) as db:
        existing = db.execute(select(AccountingEntity).where(AccountingEntity.id == 1)).scalar_one_or_none()
        if not existing:
            entities = [
                AccountingEntity(
                    id=1,
                    entity_name="NGI Capital LLC",
                    entity_type="LLC",
                    is_available=True,
                    parent_entity_id=None,
                    ownership_percentage=None,
                    formation_state="DE",
                    entity_status="active",
                    ein="12-3456789",
                ),
                AccountingEntity(
                    id=2,
                    entity_name="NGI Capital Advisory LLC",
                    entity_type="LLC",
                    is_available=False,
                    parent_entity_id=1,
                    ownership_percentage=Decimal("100.00"),
                    formation_state="DE",
                    entity_status="active",
                ),
                AccountingEntity(
                    id=3,
                    entity_name="The Creator Terminal Inc.",
                    entity_type="C-Corp",
                    is_available=False,
                    parent_entity_id=1,
                    ownership_percentage=Decimal("100.00"),
                    formation_state="DE",
                    entity_status="active",
                ),
            ]
            for e in entities:
                db.add(e)
            db.commit()
    return True


@pytest.fixture(scope="function")
def seed_test_partners():
    """Seed test partners/employees into database"""
    from src.api.models import Partners
    import bcrypt

    test_password_hash = bcrypt.hashpw("TestPassword123!".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    partners = [
        Partners(
            id=1,
            email="lwhitworth@ngicapitaladvisory.com",
            name="Landon Whitworth (CEO & Co-Founder)",
            password_hash=test_password_hash,
            ownership_percentage=50.0,
            is_active=True,
        ),
        Partners(
            id=2,
            email="anurmamade@ngicapitaladvisory.com",
            name="Andre Nurmamade (Co-Founder, CFO & COO)",
            password_hash=test_password_hash,
            ownership_percentage=50.0,
            is_active=True,
        ),
    ]

    with next(sync_get_db()) as db:
        for partner in partners:
            db.add(partner)
        db.commit()
    return partners


@pytest.fixture(scope="function")
def seed_test_coa(seed_test_entities):
    """Seed test chart of accounts"""
    from src.api.models_accounting import ChartOfAccounts

    accounts = [
        # Assets
        ChartOfAccounts(
            id=1,
            entity_id=1,
            account_number="1010",
            account_name="Cash - Operating",
            account_type="Asset",
            normal_balance="debit",
            allow_posting=True,
            is_active=True,
        ),
        ChartOfAccounts(
            id=2,
            entity_id=1,
            account_number="1020",
            account_name="Accounts Receivable",
            account_type="Asset",
            normal_balance="debit",
            allow_posting=True,
            is_active=True,
        ),
        # Liabilities
        ChartOfAccounts(
            id=3,
            entity_id=1,
            account_number="2010",
            account_name="Accounts Payable",
            account_type="Liability",
            normal_balance="credit",
            allow_posting=True,
            is_active=True,
        ),
        # Equity
        ChartOfAccounts(
            id=4,
            entity_id=1,
            account_number="3010",
            account_name="Member Capital",
            account_type="Equity",
            normal_balance="credit",
            allow_posting=True,
            is_active=True,
        ),
        # Revenue
        ChartOfAccounts(
            id=5,
            entity_id=1,
            account_number="4010",
            account_name="Service Revenue",
            account_type="Revenue",
            normal_balance="credit",
            allow_posting=True,
            is_active=True,
        ),
        # Expenses
        ChartOfAccounts(
            id=6,
            entity_id=1,
            account_number="6010",
            account_name="Operating Expenses",
            account_type="Expense",
            normal_balance="debit",
            allow_posting=True,
            is_active=True,
        ),
    ]

    with next(sync_get_db()) as db:
        for account in accounts:
            db.add(account)
        db.commit()
    return accounts


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line("markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')")
    config.addinivalue_line("markers", "integration: marks tests as integration tests")
    config.addinivalue_line("markers", "e2e: marks tests as end-to-end tests")
    config.addinivalue_line("markers", "mercury: marks tests that use real Mercury API")
