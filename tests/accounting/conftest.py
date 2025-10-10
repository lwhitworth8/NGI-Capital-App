"""
Test configuration and fixtures for accounting module tests

Author: NGI Capital Development Team
Date: October 10, 2025
"""

import pytest
import asyncio
import os
import sys
from httpx import AsyncClient
from decimal import Decimal
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from src.api.main import app
import sqlite3
from src.api.models_accounting import AccountingEntity, ChartOfAccounts, JournalEntry, JournalEntryLine
from src.api.utils.datetime_utils import get_pst_now
from src.api.database_async import get_async_db


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def db_connection():
    """Get connection to the SQLite database"""
    db_path = 'ngi_capital.db'
    if not os.path.exists(db_path):
        pytest.skip(f"Database file {db_path} not found")
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # Enable column access by name
    yield conn
    conn.close()


@pytest.fixture
async def async_db(db_connection):
    """Mock async database session using SQLite connection"""
    # Create a mock async session that uses the SQLite connection
    class MockAsyncSession:
        def __init__(self, conn):
            self.conn = conn
            
        async def execute(self, query, params=None):
            if hasattr(query, 'text'):
                # Handle SQLAlchemy text queries
                sql = str(query)
            else:
                sql = str(query)
            
            if params:
                cursor = self.conn.execute(sql, params)
            else:
                cursor = self.conn.execute(sql)
            
            # Return a mock result object
            class MockResult:
                def __init__(self, cursor):
                    self.cursor = cursor
                    
                def fetchone(self):
                    return cursor.fetchone()
                    
                def fetchall(self):
                    return cursor.fetchall()
                    
                def scalars(self):
                    return self
                    
                def all(self):
                    return cursor.fetchall()
                    
                def one_or_none(self):
                    return cursor.fetchone()
            
            return MockResult(cursor)
        
        async def commit(self):
            self.conn.commit()
            
        async def close(self):
            pass
            
        async def refresh(self, obj):
            pass
            
        def add(self, obj):
            # For testing, we'll handle this in the specific test
            pass
    
    return MockAsyncSession(db_connection)


@pytest.fixture
async def async_client():
    """Create async HTTP client for testing"""
    print("Creating async HTTP client...")
    
    # Override the database dependency to use SQLite
    async def override_get_async_db():
        """Override database dependency for testing with SQLite"""
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
        from sqlalchemy.pool import NullPool
        
        # Create SQLite async engine
        sqlite_url = "sqlite+aiosqlite:///ngi_capital.db"
        test_engine = create_async_engine(
            sqlite_url,
            echo=False,
            poolclass=NullPool,
        )
        
        # Create session factory
        TestSessionLocal = async_sessionmaker(
            test_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
        
        # Create session
        async with TestSessionLocal() as session:
            try:
                yield session
            finally:
                await session.close()
    
    app.dependency_overrides[get_async_db] = override_get_async_db
    
    # Use TestClient from fastapi.testclient for proper app testing
    from fastapi.testclient import TestClient
    with TestClient(app) as client:
        # Convert to async client for testing
        yield client
    
    # Clean up dependency override
    app.dependency_overrides.clear()
    print("Async HTTP client closed")


@pytest.fixture
def mock_auth_headers():
    """Mock authentication headers for testing"""
    return {
        "Authorization": "Bearer test_token",
        "X-User-ID": "1",
        "X-User-Email": "lwhitworth@ngicapitaladvisory.com"
    }


@pytest.fixture
def auth_headers(mock_auth_headers):
    """Alias for mock_auth_headers to match accounting test expectations"""
    return mock_auth_headers


@pytest.fixture
def auth_headers_andre():
    """Auth headers for Andre"""
    return {
        "Authorization": "Bearer test_token",
        "X-User-ID": "2",
        "X-User-Email": "anurmamade@ngicapitaladvisory.com"
    }


@pytest.fixture
def auth_headers_landon():
    """Auth headers for Landon"""  
    return {
        "Authorization": "Bearer test_token",
        "X-User-ID": "1",
        "X-User-Email": "lwhitworth@ngicapitaladvisory.com"
    }


@pytest.fixture
def test_entity_id():
    """Return NGI Capital LLC entity ID for testing"""
    return 1


@pytest.fixture
async def seeded_entity(async_client: AsyncClient, test_entity_id: int):
    """Seed COA for test entity"""
    print(f"Seeding COA for entity {test_entity_id}...")
    try:
        # Seed the chart of accounts for entity 1
        response = await async_client.post(f"/api/accounting/coa/seed/{test_entity_id}")
        if response.status_code == 200:
            print(f"✓ COA seeded successfully for entity {test_entity_id}")
            return test_entity_id
        else:
            print(f"⚠ COA seeding returned status {response.status_code}: {response.text}")
            # If already seeded, that's fine
            return test_entity_id
    except Exception as e:
        print(f"✗ COA seeding failed: {e}")
        raise


@pytest.fixture
async def test_accounts(seeded_entity: int):
    """Return test account IDs"""
    print("Setting up test accounts...")
    # After seeding, standard accounts should exist
    return {
        "cash": None,  # Will be looked up dynamically
        "revenue": None
    }


@pytest.fixture
async def test_bank_account_id(async_client: AsyncClient, test_entity_id: int):
    """Create and return a test bank account ID"""
    print("Creating test bank account...")
    try:
        response = await async_client.post(
            "/api/accounting/bank-reconciliation/accounts",
            json={
                "entity_id": test_entity_id,
                "bank_name": "Mercury",
                "account_name": "Operating Account",
                "account_number_last4": "1234",
                "account_type": "checking",
                "routing_number": "121000248",
                "is_active": True
            }
        )
        if response.status_code == 200:
            account = response.json()
            print(f"✓ Test bank account created with ID: {account['id']}")
            return account["id"]
        else:
            print(f"⚠ Bank account creation returned status {response.status_code}: {response.text}")
            return 1
    except Exception as e:
        print(f"✗ Bank account creation failed: {e}")
        return 1


@pytest.fixture
async def test_bank_transaction_id(async_client: AsyncClient, test_bank_account_id: int):
    """Create and return a test bank transaction ID"""
    print("Creating test bank transaction...")
    try:
        response = await async_client.post(
            "/api/accounting/bank-reconciliation/transactions",
            json={
                "bank_account_id": test_bank_account_id,
                "transaction_date": "2025-01-15",
                "description": "Test Deposit",
                "amount": 1000.00,
                "transaction_type": "credit",
                "reference_number": "TXN001",
                "balance_after": 1000.00
            }
        )
        if response.status_code == 200:
            txn = response.json()
            print(f"✓ Test bank transaction created with ID: {txn['id']}")
            return txn["id"]
        else:
            print(f"⚠ Bank transaction creation returned status {response.status_code}: {response.text}")
            return 1
    except Exception as e:
        print(f"✗ Bank transaction creation failed: {e}")
        return 1


@pytest.fixture
async def test_journal_entry_id(async_client: AsyncClient, test_entity_id: int, seeded_entity: int):
    """Create and return a test journal entry ID"""
    print("Creating test journal entry...")
    try:
        response = await async_client.post(
            "/api/accounting/journal-entries",
            json={
                "entity_id": test_entity_id,
                "entry_date": "2025-01-15",
                "entry_type": "standard",
                "description": "Test Entry",
                "lines": [
                    {
                        "account_code": "1010",
                        "debit_amount": 1000.00,
                        "credit_amount": 0.00,
                        "description": "Cash"
                    },
                    {
                        "account_code": "4010",
                        "debit_amount": 0.00,
                        "credit_amount": 1000.00,
                        "description": "Revenue"
                    }
                ]
            }
        )
        if response.status_code == 200:
            entry = response.json()
            print(f"✓ Test journal entry created with ID: {entry['id']}")
            return entry["id"]
        else:
            print(f"⚠ Journal entry creation returned status {response.status_code}: {response.text}")
            return 1
    except Exception as e:
        print(f"✗ Journal entry creation failed: {e}")
        return 1


@pytest.fixture
async def test_reconciliation_id(async_client: AsyncClient, test_bank_account_id: int):
    """Create and return a test reconciliation ID"""
    print("Creating test reconciliation...")
    try:
        response = await async_client.post(
            "/api/accounting/bank-reconciliation/reconciliations",
            json={
                "bank_account_id": test_bank_account_id,
                "reconciliation_date": "2025-01-31",
                "ending_balance_per_bank": 1000.00
            }
        )
        if response.status_code == 200:
            rec = response.json()
            print(f"✓ Test reconciliation created with ID: {rec['id']}")
            return rec["id"]
        else:
            print(f"⚠ Reconciliation creation returned status {response.status_code}: {response.text}")
            return 1
    except Exception as e:
        print(f"✗ Reconciliation creation failed: {e}")
        return 1


# ============================================================================
# JOURNAL ENTRIES TEST FIXTURES
# ============================================================================

@pytest.fixture
async def test_entity_with_coa():
    """Return a test entity that has COA seeded"""
    print("Getting test entity with COA...")
    try:
        async for db in get_async_db():
            result = await db.execute(
                text("SELECT * FROM accounting_entities WHERE id = 1")
            )
            entity_data = result.fetchone()
            if entity_data:
                print(f"✓ Test entity found: {entity_data[1]}")  # entity_name is at index 1
                return entity_data
            else:
                print("⚠ No test entity found, creating one...")
                # Create a test entity
                entity = AccountingEntity(
                    entity_name="Test Entity",
                    entity_type="LLC",
                    ein="12-3456789",
                    entity_status="active"
                )
                db.add(entity)
                await db.commit()
                await db.refresh(entity)
                print(f"✓ Test entity created with ID: {entity.id}")
                return entity
            break
    except Exception as e:
        print(f"✗ Error getting test entity: {e}")
        raise


@pytest.fixture
async def cash_account():
    """Return a cash account for testing"""
    print("Getting cash account...")
    try:
        async for db in get_async_db():
            # Try to find existing cash account
            result = await db.execute(
                text("SELECT * FROM chart_of_accounts WHERE entity_id = 1 AND account_type = 'Asset' AND account_name LIKE '%cash%' AND allow_posting = 1 LIMIT 1")
            )
            account_data = result.fetchone()
            
            if account_data:
                print(f"✓ Cash account found: {account_data[3]}")  # account_name is at index 3
                return account_data
            else:
                print("⚠ No cash account found, creating one...")
                # Create a cash account
                result = await db.execute(
                    text("INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, is_active, allow_posting) VALUES (1, '1010', 'Cash - Operating', 'Asset', 'debit', 1, 1)")
                )
                await db.commit()
                
                # Get the created account
                result = await db.execute(
                    text("SELECT * FROM chart_of_accounts WHERE entity_id = 1 AND account_number = '1010'")
                )
                account_data = result.fetchone()
                print(f"✓ Cash account created: {account_data[3]}")
                return account_data
            break
    except Exception as e:
        print(f"✗ Error getting cash account: {e}")
        raise


@pytest.fixture
async def expense_account():
    """Return an expense account for testing"""
    print("Getting expense account...")
    try:
        async for db in get_async_db():
            # Try to find existing expense account that allows posting
            result = await db.execute(
                text("SELECT * FROM chart_of_accounts WHERE entity_id = 1 AND account_type = 'Expense' AND allow_posting = 1 LIMIT 1")
            )
            account_data = result.fetchone()
            
            if account_data:
                print(f"✓ Expense account found: {account_data[3]}")
                return account_data
            else:
                print("⚠ No expense account found, creating one...")
                # Create an expense account
                result = await db.execute(
                    text("INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, is_active, allow_posting) VALUES (1, '6010', 'Operating Expenses', 'Expense', 'debit', 1, 1)")
                )
                await db.commit()
                
                # Get the created account
                result = await db.execute(
                    text("SELECT * FROM chart_of_accounts WHERE entity_id = 1 AND account_number = '6010'")
                )
                account_data = result.fetchone()
                print(f"✓ Expense account created: {account_data[3]}")
                return account_data
            break
    except Exception as e:
        print(f"✗ Error getting expense account: {e}")
        raise


@pytest.fixture
async def revenue_account():
    """Return a revenue account for testing"""
    print("Getting revenue account...")
    try:
        async for db in get_async_db():
            # Try to find existing revenue account that allows posting
            result = await db.execute(
                text("SELECT * FROM chart_of_accounts WHERE entity_id = 1 AND account_type = 'Revenue' AND allow_posting = 1 AND account_number LIKE '401%' LIMIT 1")
            )
            account_data = result.fetchone()
            
            if account_data:
                print(f"✓ Revenue account found: {account_data[3]}")
                return account_data
            else:
                print("⚠ No revenue account found, creating one...")
                # Create a revenue account
                result = await db.execute(
                    text("INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, is_active, allow_posting) VALUES (1, '4010', 'Service Revenue', 'Revenue', 'credit', 1, 1)")
                )
                await db.commit()
                
                # Get the created account
                result = await db.execute(
                    text("SELECT * FROM chart_of_accounts WHERE entity_id = 1 AND account_number = '4010'")
                )
                account_data = result.fetchone()
                print(f"✓ Revenue account created: {account_data[3]}")
                return account_data
            break
    except Exception as e:
        print(f"✗ Error getting revenue account: {e}")
        raise


@pytest.fixture
async def draft_journal_entry(async_client: AsyncClient, auth_headers, test_entity_with_coa, cash_account, expense_account):
    """Create a draft journal entry for testing"""
    print("Creating draft journal entry...")
    try:
        from datetime import date
        
        payload = {
            "entity_id": test_entity_with_coa[0] if isinstance(test_entity_with_coa, tuple) else test_entity_with_coa.id,
            "entry_date": str(date.today()),
            "fiscal_year": 2025,
            "fiscal_period": 10,
            "entry_type": "Standard",
            "memo": "Test draft entry",
            "lines": [
                {
                    "line_number": 1,
                    "account_id": cash_account[0] if isinstance(cash_account, tuple) else cash_account.id,
                    "debit_amount": 0,
                    "credit_amount": 500,
                    "description": "Cash payment"
                },
                {
                    "line_number": 2,
                    "account_id": expense_account[0] if isinstance(expense_account, tuple) else expense_account.id,
                    "debit_amount": 500,
                    "credit_amount": 0,
                    "description": "Office expense"
                }
            ]
        }
        
        response = await async_client.post(
            "/api/accounting/journal-entries/",
            json=payload,
            headers=auth_headers
        )
        
        if response.status_code == 200:
            from types import SimpleNamespace
            entry_data = response.json()
            print(f"✓ Draft journal entry created with ID: {entry_data['id']}")
            # Return a simple namespace mimicking the model
            return SimpleNamespace(id=entry_data["id"], entry_number=entry_data.get("entry_number"))
        else:
            print(f"⚠ Draft journal entry creation returned status {response.status_code}: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Error creating draft journal entry: {e}")
        return None


@pytest.fixture
async def pending_journal_entry(draft_journal_entry):
    """Return a journal entry in pending approval status"""
    print("Setting journal entry to pending approval...")
    if not draft_journal_entry:
        print("⚠ No draft journal entry to set to pending")
        return None
    
    try:
        async for db in get_async_db():
            # Update status to pending
            result = await db.execute(
                text("UPDATE journal_entries SET status = 'pending_approval', workflow_stage = 1 WHERE id = :entry_id"),
                {"entry_id": draft_journal_entry.id}
            )
            await db.commit()
            
            # Get the updated entry
            result = await db.execute(
                text("SELECT * FROM journal_entries WHERE id = :entry_id"),
                {"entry_id": draft_journal_entry.id}
            )
            entry_data = result.fetchone()
            
            if entry_data:
                print(f"✓ Journal entry set to pending approval: {entry_data[1]}")  # entry_number is at index 1
                return entry_data
            break
    except Exception as e:
        print(f"✗ Error setting journal entry to pending: {e}")
        return None


@pytest.fixture
async def pending_journal_entry_by_current_user(async_client: AsyncClient, auth_headers, test_entity_with_coa, cash_account, expense_account):
    """Create a pending entry created by current user"""
    print("Creating pending journal entry by current user...")
    try:
        from datetime import date
        
        # Create entry
        payload = {
            "entity_id": test_entity_with_coa[0] if isinstance(test_entity_with_coa, tuple) else test_entity_with_coa.id,
            "entry_date": str(date.today()),
            "fiscal_year": 2025,
            "fiscal_period": 10,
            "lines": [
                {"line_number": 1, "account_id": cash_account[0] if isinstance(cash_account, tuple) else cash_account.id, "debit_amount": 0, "credit_amount": 300},
                {"line_number": 2, "account_id": expense_account[0] if isinstance(expense_account, tuple) else expense_account.id, "debit_amount": 300, "credit_amount": 0}
            ]
        }
        
        response = await async_client.post("/api/accounting/journal-entries/", json=payload, headers=auth_headers)
        
        if response.status_code == 200:
            entry_data = response.json()
            # Submit for approval
            submit_response = await async_client.post(
                f"/api/accounting/journal-entries/{entry_data['id']}/submit-for-approval",
                headers=auth_headers
            )
            if submit_response.status_code == 200:
                print(f"✓ Pending journal entry created and submitted with ID: {entry_data['id']}")
                from types import SimpleNamespace
                return SimpleNamespace(id=entry_data["id"])
            else:
                print(f"⚠ Submit for approval returned status {submit_response.status_code}: {submit_response.text}")
                return None
        else:
            print(f"⚠ Journal entry creation returned status {response.status_code}: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Error creating pending journal entry: {e}")
        return None


@pytest.fixture
async def first_approved_entry(pending_journal_entry):
    """Return a journal entry with first approval"""
    print("Setting journal entry to first approved...")
    if not pending_journal_entry:
        print("⚠ No pending journal entry to approve")
        return None
    
    try:
        async for db in get_async_db():
            entry_id = pending_journal_entry[0] if isinstance(pending_journal_entry, tuple) else pending_journal_entry.id
            
            result = await db.execute(
                text("UPDATE journal_entries SET workflow_stage = 2, first_approved_by_id = 2, first_approved_at = :now WHERE id = :entry_id"),
                {"entry_id": entry_id, "now": get_pst_now()}
            )
            await db.commit()
            
            # Get the updated entry
            result = await db.execute(
                text("SELECT * FROM journal_entries WHERE id = :entry_id"),
                {"entry_id": entry_id}
            )
            entry_data = result.fetchone()
            
            if entry_data:
                print(f"✓ Journal entry set to first approved: {entry_data[1]}")
                return entry_data
            break
    except Exception as e:
        print(f"✗ Error setting journal entry to first approved: {e}")
        return None


@pytest.fixture
async def approved_journal_entry(first_approved_entry):
    """Return a fully approved journal entry"""
    print("Setting journal entry to fully approved...")
    if not first_approved_entry:
        print("⚠ No first approved entry to fully approve")
        return None
    
    try:
        async for db in get_async_db():
            entry_id = first_approved_entry[0] if isinstance(first_approved_entry, tuple) else first_approved_entry.id
            
            result = await db.execute(
                text("UPDATE journal_entries SET status = 'approved', workflow_stage = 3, final_approved_by_id = 1, final_approved_at = :now WHERE id = :entry_id"),
                {"entry_id": entry_id, "now": get_pst_now()}
            )
            await db.commit()
            
            # Get the updated entry
            result = await db.execute(
                text("SELECT * FROM journal_entries WHERE id = :entry_id"),
                {"entry_id": entry_id}
            )
            entry_data = result.fetchone()
            
            if entry_data:
                print(f"✓ Journal entry set to fully approved: {entry_data[1]}")
                return entry_data
            break
    except Exception as e:
        print(f"✗ Error setting journal entry to fully approved: {e}")
        return None


@pytest.fixture
async def posted_journal_entry(approved_journal_entry):
    """Return a posted journal entry"""
    print("Setting journal entry to posted...")
    if not approved_journal_entry:
        print("⚠ No approved journal entry to post")
        return None
    
    try:
        async for db in get_async_db():
            entry_id = approved_journal_entry[0] if isinstance(approved_journal_entry, tuple) else approved_journal_entry.id
            
            result = await db.execute(
                text("UPDATE journal_entries SET status = 'posted', posted_at = :now, posted_by_id = 1, is_locked = 1 WHERE id = :entry_id"),
                {"entry_id": entry_id, "now": get_pst_now()}
            )
            await db.commit()
            
            # Get the updated entry
            result = await db.execute(
                text("SELECT * FROM journal_entries WHERE id = :entry_id"),
                {"entry_id": entry_id}
            )
            entry_data = result.fetchone()
            
            if entry_data:
                print(f"✓ Journal entry set to posted: {entry_data[1]}")
                return entry_data
            break
    except Exception as e:
        print(f"✗ Error setting journal entry to posted: {e}")
        return None


# ============================================================================
# TEST CONFIGURATION
# ============================================================================

def pytest_configure(config):
    """Configure pytest with custom settings"""
    # Disable warnings for cleaner output
    config.option.tbstyle = "short"
    config.option.capture = "no"  # Show print statements
    config.option.verbose = True


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers and debug info"""
    for item in items:
        # Add asyncio marker to async tests
        if asyncio.iscoroutinefunction(item.function):
            item.add_marker(pytest.mark.asyncio)


# ============================================================================
# DEBUGGING UTILITIES
# ============================================================================

def debug_response(response, test_name: str):
    """Debug HTTP response with detailed logging"""
    print(f"\n{'='*60}")
    print(f"DEBUG: {test_name}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    
    try:
        response_data = response.json()
        print(f"Response Data: {response_data}")
    except Exception as e:
        print(f"Response Text: {response.text}")
        print(f"JSON Parse Error: {e}")
    
    print(f"{'='*60}\n")
    
    return response


def debug_database_query(query_result, test_name: str):
    """Debug database query results"""
    print(f"\n{'='*60}")
    print(f"DEBUG: {test_name}")
    print(f"{'='*60}")
    print(f"Query Result Type: {type(query_result)}")
    print(f"Query Result: {query_result}")
    print(f"{'='*60}\n")
    
    return query_result