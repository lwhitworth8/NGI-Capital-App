"""
Test fixtures for accounting document tests
"""
import os
import sys
import io
import pytest
import pytest_asyncio
import httpx
from decimal import Decimal
from datetime import datetime, date
from httpx import AsyncClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

# Add parent directories to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../')))

from services.api.main import app
from services.api.models_accounting import Base, AccountingEntity, ChartOfAccounts
from services.api.models_accounting_part2 import (
    AccountingDocument,
    AccountingDocumentCategory,
    BankAccount,
    BankTransaction
)
from services.api.models import Partners
from services.api.database_async import get_async_db


# Test database URL
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "sqlite+aiosqlite:///./test_accounting.db"
)


@pytest.fixture(scope="function", autouse=True)
def _pytest_env_safety(monkeypatch: pytest.MonkeyPatch):
    # Ensure backend sees that pytest is running to disable dev-only bypasses
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "1")
    # Disable accounting guard for tests
    monkeypatch.setenv("DISABLE_ACCOUNTING_GUARD", "1")
    # Use local SQLite test DB if available
    if not os.getenv("DATABASE_PATH") and os.path.exists("test_ngi_capital.db"):
        monkeypatch.setenv("DATABASE_PATH", os.path.abspath("test_ngi_capital.db"))
    
    # Debug: print environment variables
    print(f"DISABLE_ACCOUNTING_GUARD: {os.getenv('DISABLE_ACCOUNTING_GUARD')}")
    print(f"PYTEST_CURRENT_TEST: {os.getenv('PYTEST_CURRENT_TEST')}")


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture(scope="function")
async def test_db():
    """Create a test database and session"""
    # Create async engine
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False} if "sqlite" in TEST_DATABASE_URL else {}
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        yield session

    # Cleanup
    await engine.dispose()


@pytest_asyncio.fixture
async def client(test_db):
    """HTTP client for testing API endpoints"""

    # Override the dependency
    async def override_get_db():
        yield test_db

    # Override authentication dependencies for testing
    async def mock_auth_user():
        return {"email": "test@ngicapitaladvisory.com", "sub": "test_user_id"}

    app.dependency_overrides[get_async_db] = override_get_db
    
    # Override auth dependencies if they exist
    try:
        from services.api.auth_deps import require_admin, require_clerk_user
        app.dependency_overrides[require_admin] = mock_auth_user
        app.dependency_overrides[require_clerk_user] = mock_auth_user
    except ImportError:
        pass

    async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as ac:
        yield ac

    # Cleanup
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_entity(test_db):
    """Create a test accounting entity"""
    entity = AccountingEntity(
        entity_name="Test Entity LLC",
        entity_type="LLC",
        formation_state="DE",
        formation_date=date(2024, 1, 1),
        ein="12-3456789",
        entity_status="active"
    )
    test_db.add(entity)
    await test_db.commit()
    await test_db.refresh(entity)
    return entity


@pytest_asyncio.fixture
async def test_partner(test_db):
    """Create a test partner/user"""
    partner = Partners(
        email="test@ngicapital.com",
        full_name="Test Partner",
        role="admin",
        status="active",
        clerk_user_id="test_clerk_id"
    )
    test_db.add(partner)
    await test_db.commit()
    await test_db.refresh(partner)
    return partner


@pytest_asyncio.fixture
async def test_chart_of_accounts(test_db, test_entity):
    """Create test chart of accounts"""
    accounts = [
        ChartOfAccounts(
            entity_id=test_entity.id,
            account_number="10100",
            account_name="Cash - Operating",
            account_type="Asset",
            normal_balance="Debit",
            is_active=True
        ),
        ChartOfAccounts(
            entity_id=test_entity.id,
            account_number="10310",
            account_name="Accounts Receivable",
            account_type="Asset",
            normal_balance="Debit",
            is_active=True
        ),
        ChartOfAccounts(
            entity_id=test_entity.id,
            account_number="62100",
            account_name="Software Expenses",
            account_type="Expense",
            normal_balance="Debit",
            is_active=True
        ),
        ChartOfAccounts(
            entity_id=test_entity.id,
            account_number="20100",
            account_name="Accounts Payable",
            account_type="Liability",
            normal_balance="Credit",
            is_active=True
        ),
        ChartOfAccounts(
            entity_id=test_entity.id,
            account_number="40100",
            account_name="Service Revenue",
            account_type="Revenue",
            normal_balance="Credit",
            is_active=True
        )
    ]

    for account in accounts:
        test_db.add(account)

    await test_db.commit()

    # Refresh to get IDs
    for account in accounts:
        await test_db.refresh(account)

    return accounts


@pytest_asyncio.fixture
async def test_bank_account(test_db, test_entity, test_chart_of_accounts):
    """Create a test bank account"""
    bank_account = BankAccount(
        entity_id=test_entity.id,
        bank_name="Test Bank",
        account_name="Operating Account",
        account_number="1234567890",
        account_number_masked="****7890",
        account_type="checking",
        currency="USD",
        current_balance=Decimal("10000.00"),
        available_balance=Decimal("10000.00"),
        is_primary=True,
        gl_account_id=test_chart_of_accounts[0].id,
        is_active=True
    )
    test_db.add(bank_account)
    await test_db.commit()
    await test_db.refresh(bank_account)
    return bank_account


@pytest_asyncio.fixture
async def document_categories(test_db):
    """Create document categories"""
    categories = [
        AccountingDocumentCategory(
            category_name="formation",
            display_name="Formation Documents",
            icon_name="file-text",
            color_class="blue",
            description="Certificate of Formation, Articles of Incorporation",
            required_for_entity=True,
            sort_order=1
        ),
        AccountingDocumentCategory(
            category_name="ein",
            display_name="EIN Documents",
            icon_name="hash",
            color_class="green",
            description="IRS CP575, Federal Tax ID",
            required_for_entity=True,
            sort_order=2
        ),
        AccountingDocumentCategory(
            category_name="invoices",
            display_name="Invoices",
            icon_name="receipt",
            color_class="orange",
            description="Vendor invoices and bills",
            required_for_entity=False,
            sort_order=3
        ),
        AccountingDocumentCategory(
            category_name="receipts",
            display_name="Receipts",
            icon_name="shopping-cart",
            color_class="purple",
            description="Payment receipts",
            required_for_entity=False,
            sort_order=4
        ),
        AccountingDocumentCategory(
            category_name="other",
            display_name="Other",
            icon_name="file",
            color_class="gray",
            description="Other documents",
            required_for_entity=False,
            sort_order=99
        )
    ]

    for category in categories:
        test_db.add(category)

    await test_db.commit()
    return categories


@pytest.fixture
def sample_pdf_invoice():
    """Create a sample PDF file for testing"""
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)

    # Write invoice content
    c.drawString(100, 750, "ACME Software Inc")
    c.drawString(100, 730, "Invoice #12345")
    c.drawString(100, 710, "Date: January 15, 2024")
    c.drawString(100, 690, "")
    c.drawString(100, 670, "Bill To:")
    c.drawString(100, 650, "Test Entity LLC")
    c.drawString(100, 630, "")
    c.drawString(100, 610, "Description: Software License")
    c.drawString(100, 590, "Amount: $500.00")
    c.drawString(100, 570, "")
    c.drawString(100, 550, "Total: $500.00")
    c.drawString(100, 530, "Due Date: February 15, 2024")

    c.save()
    buffer.seek(0)
    return buffer.getvalue()


@pytest.fixture
def sample_pdf_formation():
    """Create a sample formation document PDF"""
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)

    c.drawString(100, 750, "STATE OF DELAWARE")
    c.drawString(100, 730, "CERTIFICATE OF FORMATION")
    c.drawString(100, 710, "")
    c.drawString(100, 690, "Test Entity LLC")
    c.drawString(100, 670, "")
    c.drawString(100, 650, "This entity was formed under the laws of Delaware")
    c.drawString(100, 630, "on January 1, 2024")
    c.drawString(100, 610, "")
    c.drawString(100, 590, "EIN: 12-3456789")

    c.save()
    buffer.seek(0)
    return buffer.getvalue()


@pytest.fixture
def sample_image_receipt():
    """Create a sample receipt image for testing"""
    from PIL import Image, ImageDraw, ImageFont

    # Create a simple image
    img = Image.new('RGB', (400, 600), color='white')
    draw = ImageDraw.Draw(img)

    # Draw receipt text
    draw.text((20, 20), "Best Buy", fill='black')
    draw.text((20, 50), "Receipt #9876", fill='black')
    draw.text((20, 80), "Date: 01/20/2024", fill='black')
    draw.text((20, 110), "", fill='black')
    draw.text((20, 140), "USB Cable", fill='black')
    draw.text((20, 170), "Amount: $19.99", fill='black')
    draw.text((20, 200), "", fill='black')
    draw.text((20, 230), "Total: $19.99", fill='black')

    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer.getvalue()


@pytest_asyncio.fixture
async def sample_bank_transactions(test_db, test_entity, test_bank_account):
    """Create sample bank transactions for matching tests"""
    transactions = [
        BankTransaction(
            entity_id=test_entity.id,
            bank_account_id=test_bank_account.id,
            transaction_date=date(2024, 1, 15),
            description="ACME Software Inc",
            amount=Decimal("-500.00"),
            transaction_type="debit",
            merchant_name="ACME Software",
            status="unmatched",
            needs_review=True
        ),
        BankTransaction(
            entity_id=test_entity.id,
            bank_account_id=test_bank_account.id,
            transaction_date=date(2024, 1, 20),
            description="Best Buy Purchase",
            amount=Decimal("-19.99"),
            transaction_type="debit",
            merchant_name="Best Buy",
            status="unmatched",
            needs_review=True
        )
    ]

    for txn in transactions:
        test_db.add(txn)

    await test_db.commit()

    for txn in transactions:
        await test_db.refresh(txn)

    return transactions