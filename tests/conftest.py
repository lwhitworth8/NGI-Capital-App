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
from sqlalchemy.ext.asyncio import AsyncSession
from dotenv import load_dotenv

# Load environment variables for tests (Mercury, etc.)
load_dotenv()

# Set test environment variables BEFORE importing the app
os.environ["DISABLE_ACCOUNTING_GUARD"] = "1"
os.environ["OPEN_NON_ACCOUNTING"] = "1"

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


async def _seed_async_database():
    """Seed the async database with the same data as sync database"""
    from src.api.database_async import get_async_db
    from src.api.models_accounting import AccountingEntity, ChartOfAccounts
    from decimal import Decimal
    from datetime import date
    
    async_db_gen = get_async_db()
    async_db = await async_db_gen.__anext__()
    try:
        # Check if entities already exist
        from sqlalchemy import select
        result = await async_db.execute(select(AccountingEntity).where(AccountingEntity.id == 1))
        existing_entity = result.scalar_one_or_none()
        
        if not existing_entity:
            # Create test entities
            entity1 = AccountingEntity(
                id=1,
                entity_name="NGI Capital LLC",
                entity_type="LLC",
                ein="12-3456789",
                formation_date=date(2024, 7, 1),
                formation_state="Delaware",
                entity_status="Active",
                is_available=True,
                parent_entity_id=None,
                ownership_percentage=Decimal("100.00"),
                converted_from_entity_id=None,
                conversion_date=None,
                conversion_type=None
            )
            entity2 = AccountingEntity(
                id=2,
                entity_name="NGI Capital Advisory LLC",
                entity_type="LLC",
                ein="98-7654321",
                formation_date=date(2024, 7, 1),
                formation_state="Delaware",
                entity_status="Active",
                is_available=True,
                parent_entity_id=None,
                ownership_percentage=Decimal("100.00"),
                converted_from_entity_id=None,
                conversion_date=None,
                conversion_type=None
            )
            async_db.add(entity1)
            async_db.add(entity2)
            await async_db.commit()
        
        # Check if chart of accounts already exist
        result = await async_db.execute(select(ChartOfAccounts).where(ChartOfAccounts.entity_id == 1))
        existing_accounts = result.scalars().all()
        
        if not existing_accounts:
            # Use the proper COA seeder to create 150+ accounts
            from src.api.services.coa_seeder import seed_chart_of_accounts
            await seed_chart_of_accounts(async_db, 1)
    finally:
        await async_db.close()


@pytest.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Sync client fixture for basic tests"""
    # Point to a per-test DB and override DATABASE_URL for async routes
    os.environ["DATABASE_PATH"] = TEST_DB_PATH
    os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
    _prepare_clean_db_file()
    sync_init_db()
    
    # Ensure async database uses the same file
    from src.api.database_async import get_async_engine
    # Reset the async engine to pick up the new DATABASE_URL
    import src.api.database_async
    src.api.database_async.async_engine = None
    src.api.database_async.AsyncSessionLocal = None
    
    # Create async database tables
    from src.api.database_async import get_async_engine
    from src.api.models_accounting import Base as AccountingBase
    from src.api.models_accounting_part2 import Base as AccountingPart2Base
    from src.api.models_accounting_part3 import Base as AccountingPart3Base
    from src.api.models_learning import Base as LearningBase
    
    async_engine = get_async_engine()
    async with async_engine.begin() as conn:
        # Create all async tables
        await conn.run_sync(AccountingBase.metadata.create_all)
        await conn.run_sync(AccountingPart2Base.metadata.create_all)
        await conn.run_sync(AccountingPart3Base.metadata.create_all)
        await conn.run_sync(LearningBase.metadata.create_all)
    
    # Seed async database with the same data as sync database
    await _seed_async_database()

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
async def async_db() -> AsyncGenerator[AsyncSession, None]:
    """Async database session fixture for complete tests"""
    from src.api.database_async import get_async_db
    
    async_db_gen = get_async_db()
    async_db = await async_db_gen.__anext__()
    try:
        yield async_db
    finally:
        await async_db.close()


@pytest.fixture(scope="function")
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Async client fixture for complete tests - same as client"""
    # Point to a per-test DB and override DATABASE_URL for async routes
    os.environ["DATABASE_PATH"] = TEST_DB_PATH
    os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
    _prepare_clean_db_file()
    sync_init_db()
    
    # Ensure async database uses the same file
    from src.api.database_async import get_async_engine
    # Reset the async engine to pick up the new DATABASE_URL
    import src.api.database_async
    src.api.database_async.async_engine = None
    src.api.database_async.AsyncSessionLocal = None
    
    # Create async database tables
    from src.api.database_async import get_async_engine
    from src.api.models_accounting import Base as AccountingBase
    from src.api.models_accounting_part2 import Base as AccountingPart2Base
    from src.api.models_accounting_part3 import Base as AccountingPart3Base
    from src.api.models_learning import Base as LearningBase
    
    async_engine = get_async_engine()
    async with async_engine.begin() as conn:
        # Create all async tables
        await conn.run_sync(AccountingBase.metadata.create_all)
        await conn.run_sync(AccountingPart2Base.metadata.create_all)
        await conn.run_sync(AccountingPart3Base.metadata.create_all)
        await conn.run_sync(LearningBase.metadata.create_all)
    
    # Seed async database with the same data as sync database
    await _seed_async_database()

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
    from sqlalchemy import select

    with next(sync_get_db()) as db:
        # Check if accounts already exist
        result = db.execute(select(ChartOfAccounts).where(ChartOfAccounts.entity_id == 1))
        existing_accounts = result.scalars().all()
        
        if existing_accounts:
            return existing_accounts

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
