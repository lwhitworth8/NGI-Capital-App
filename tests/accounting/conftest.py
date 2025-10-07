"""
Test-specific fixtures for accounting tests

Author: NGI Capital Development Team  
Date: October 4, 2025
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal
from datetime import datetime, date


@pytest.fixture
def auth_headers(mock_auth_headers: dict) -> dict:
    """Alias for mock_auth_headers to match accounting test expectations"""
    return mock_auth_headers


@pytest.fixture
async def test_entity_id() -> int:
    """Return NGI Capital LLC entity ID for testing"""
    return 1


@pytest.fixture
async def seeded_entity(client: AsyncClient, test_entity_id: int):
    """Seed COA for test entity"""
    # Seed the chart of accounts for entity 1
    response = await client.post(f"/api/accounting/coa/seed/{test_entity_id}")
    if response.status_code == 200:
        return test_entity_id
    # If already seeded, that's fine
    return test_entity_id


@pytest.fixture
async def test_accounts(seeded_entity: int) -> dict:
    """Return test account IDs"""
    # After seeding, standard accounts should exist
    return {
        "cash": None,  # Will be looked up dynamically
        "revenue": None
    }


@pytest.fixture
async def test_bank_account_id(client: AsyncClient, test_entity_id: int) -> int:
    """Create and return a test bank account ID"""
    response = await client.post(
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
        return account["id"]
    return 1


@pytest.fixture
async def test_bank_transaction_id(client: AsyncClient, test_bank_account_id: int) -> int:
    """Create and return a test bank transaction ID"""
    response = await client.post(
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
        return txn["id"]
    return 1


@pytest.fixture
async def test_journal_entry_id(client: AsyncClient, test_entity_id: int, seeded_entity: int) -> int:
    """Create and return a test journal entry ID"""
    response = await client.post(
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
        return entry["id"]
    return 1


@pytest.fixture
async def test_reconciliation_id(client: AsyncClient, test_bank_account_id: int) -> int:
    """Create and return a test reconciliation ID"""
    response = await client.post(
        "/api/accounting/bank-reconciliation/reconciliations",
        json={
            "bank_account_id": test_bank_account_id,
            "reconciliation_date": "2025-01-31",
            "ending_balance_per_bank": 1000.00
        }
    )
    if response.status_code == 200:
        rec = response.json()
        return rec["id"]
    return 1


# ============================================================================
# JOURNAL ENTRIES TEST FIXTURES
# ============================================================================

@pytest.fixture
async def test_entity_with_coa(async_db: AsyncSession, seed_test_entities, seed_test_coa):
    """Return a test entity that has COA seeded"""
    from src.api.models_accounting import AccountingEntity
    from sqlalchemy import select
    
    result = await async_db.execute(select(AccountingEntity).where(AccountingEntity.id == 1))
    entity = result.scalar_one_or_none()
    return entity


@pytest.fixture
async def cash_account(async_db: AsyncSession, seed_test_coa):
    """Return a cash account for testing"""
    from src.api.models_accounting import ChartOfAccounts
    from sqlalchemy import select
    
    # Try to find existing cash account
    result = await async_db.execute(
        select(ChartOfAccounts).where(
            ChartOfAccounts.entity_id == 1,
            ChartOfAccounts.account_type == "asset"
        )
    )
    accounts = result.scalars().all()
    
    # Find cash account
    for acc in accounts:
        if "cash" in acc.account_name.lower():
            return acc
    
    # If not found, create one
    cash_acc = ChartOfAccounts(
        entity_id=1,
        account_number="10100",
        account_name="Cash - Operating",
        account_type="asset",
        normal_balance="debit",
        is_active=True,
        allow_posting=True
    )
    async_db.add(cash_acc)
    await async_db.commit()
    await async_db.refresh(cash_acc)
    return cash_acc


@pytest.fixture
async def expense_account(async_db: AsyncSession, seed_test_coa):
    """Return an expense account for testing"""
    from src.api.models_accounting import ChartOfAccounts
    from sqlalchemy import select
    
    # Try to find existing expense account
    result = await async_db.execute(
        select(ChartOfAccounts).where(
            ChartOfAccounts.entity_id == 1,
            ChartOfAccounts.account_type == "expense"
        ).limit(1)
    )
    account = result.scalar_one_or_none()
    
    # If not found, create one
    if not account:
        account = ChartOfAccounts(
            entity_id=1,
            account_number="60100",
            account_name="Office Expenses",
            account_type="expense",
            normal_balance="debit",
            is_active=True,
            allow_posting=True
        )
        async_db.add(account)
        await async_db.commit()
        await async_db.refresh(account)
    
    return account


@pytest.fixture
async def revenue_account(async_db: AsyncSession, seed_test_coa):
    """Return a revenue account for testing"""
    from src.api.models_accounting import ChartOfAccounts
    from sqlalchemy import select
    
    result = await async_db.execute(
        select(ChartOfAccounts).where(
            ChartOfAccounts.entity_id == 1,
            ChartOfAccounts.account_type == "revenue"
        ).limit(1)
    )
    account = result.scalar_one_or_none()
    return account


@pytest.fixture
async def draft_journal_entry(client: AsyncClient, auth_headers, test_entity_with_coa, cash_account, expense_account):
    """Create a draft journal entry for testing"""
    from datetime import date
    
    payload = {
        "entity_id": test_entity_with_coa.id,
        "entry_date": str(date.today()),
        "fiscal_year": 2025,
        "fiscal_period": 10,
        "entry_type": "Standard",
        "memo": "Test draft entry",
        "lines": [
            {
                "line_number": 1,
                "account_id": cash_account.id,
                "debit_amount": 0,
                "credit_amount": 500,
                "description": "Cash payment"
            },
            {
                "line_number": 2,
                "account_id": expense_account.id,
                "debit_amount": 500,
                "credit_amount": 0,
                "description": "Office expense"
            }
        ]
    }
    
    response = await client.post(
        "/api/accounting/journal-entries/",
        json=payload,
        headers=auth_headers
    )
    
    if response.status_code == 200:
        from src.api.models_accounting import JournalEntry
        from types import SimpleNamespace
        entry_data = response.json()
        # Return a simple namespace mimicking the model
        return SimpleNamespace(id=entry_data["id"], entry_number=entry_data.get("entry_number"))
    return None


@pytest.fixture
async def pending_journal_entry(async_db: AsyncSession, draft_journal_entry):
    """Return a journal entry in pending approval status"""
    from src.api.models_accounting import JournalEntry
    from sqlalchemy import select
    
    if not draft_journal_entry:
        return None
    
    # Update status to pending
    result = await async_db.execute(
        select(JournalEntry).where(JournalEntry.id == draft_journal_entry.id)
    )
    entry = result.scalar_one_or_none()
    
    if entry:
        entry.status = "pending_approval"
        entry.workflow_stage = 1
        await async_db.commit()
    
    return entry


@pytest.fixture
def auth_headers_andre(mock_auth_headers):
    """Auth headers for Andre"""
    return {
        "Authorization": "Bearer test_token",
        "X-User-ID": "2",
        "X-User-Email": "anurmamade@ngicapitaladvisory.com"
    }


@pytest.fixture
def auth_headers_landon(mock_auth_headers):
    """Auth headers for Landon"""  
    return {
        "Authorization": "Bearer test_token",
        "X-User-ID": "1",
        "X-User-Email": "lwhitworth@ngicapitaladvisory.com"
    }


@pytest.fixture
async def pending_journal_entry_by_current_user(client: AsyncClient, auth_headers, test_entity_with_coa, cash_account, expense_account):
    """Create a pending entry created by current user"""
    from datetime import date
    
    # Create entry
    payload = {
        "entity_id": test_entity_with_coa.id,
        "entry_date": str(date.today()),
        "fiscal_year": 2025,
        "fiscal_period": 10,
        "lines": [
            {"line_number": 1, "account_id": cash_account.id, "debit_amount": 0, "credit_amount": 300},
            {"line_number": 2, "account_id": expense_account.id, "debit_amount": 300, "credit_amount": 0}
        ]
    }
    
    response = await client.post("/api/accounting/journal-entries/", json=payload, headers=auth_headers)
    
    if response.status_code == 200:
        entry_data = response.json()
        # Submit for approval
        await client.post(
            f"/api/accounting/journal-entries/{entry_data['id']}/submit-for-approval",
            headers=auth_headers
        )
        from types import SimpleNamespace
        return SimpleNamespace(id=entry_data["id"])
    return None


@pytest.fixture
async def first_approved_entry(async_db: AsyncSession, pending_journal_entry):
    """Return a journal entry with first approval"""
    from src.api.models_accounting import JournalEntry
    from sqlalchemy import select
    
    if not pending_journal_entry:
        return None
    
    result = await async_db.execute(
        select(JournalEntry).where(JournalEntry.id == pending_journal_entry.id)
    )
    entry = result.scalar_one_or_none()
    
    if entry:
        entry.workflow_stage = 2
        entry.first_approved_by_id = 2  # Andre
        entry.first_approved_at = datetime.now()
        await async_db.commit()
    
    return entry


@pytest.fixture
async def first_approved_entry_by_andre(async_db: AsyncSession, pending_journal_entry):
    """Return entry with first approval by Andre"""
    from src.api.models_accounting import JournalEntry
    from sqlalchemy import select
    from datetime import datetime
    
    if not pending_journal_entry:
        return None
    
    result = await async_db.execute(
        select(JournalEntry).where(JournalEntry.id == pending_journal_entry.id)
    )
    entry = result.scalar_one_or_none()
    
    if entry:
        entry.workflow_stage = 2
        entry.first_approved_by_id = 2
        entry.first_approved_at = datetime.now()
        await async_db.commit()
    
    return entry


@pytest.fixture
async def approved_journal_entry(async_db: AsyncSession, first_approved_entry):
    """Return a fully approved journal entry"""
    from src.api.models_accounting import JournalEntry
    from sqlalchemy import select
    from datetime import datetime
    
    if not first_approved_entry:
        return None
    
    result = await async_db.execute(
        select(JournalEntry).where(JournalEntry.id == first_approved_entry.id)
    )
    entry = result.scalar_one_or_none()
    
    if entry:
        entry.status = "approved"
        entry.workflow_stage = 3
        entry.final_approved_by_id = 1  # Landon
        entry.final_approved_at = datetime.now()
        await async_db.commit()
    
    return entry


@pytest.fixture
async def posted_journal_entry(async_db: AsyncSession, approved_journal_entry):
    """Return a posted journal entry"""
    from src.api.models_accounting import JournalEntry
    from sqlalchemy import select
    from datetime import datetime
    
    if not approved_journal_entry:
        return None
    
    result = await async_db.execute(
        select(JournalEntry).where(JournalEntry.id == approved_journal_entry.id)
    )
    entry = result.scalar_one_or_none()
    
    if entry:
        entry.status = "posted"
        entry.posted_at = datetime.now()
        entry.posted_by_id = 1
        await async_db.commit()
    
    return entry



# ============================================================================
# JOURNAL ENTRIES TEST FIXTURES
# ============================================================================

@pytest.fixture
async def test_entity_with_coa(async_db: AsyncSession, seed_test_entities, seed_test_coa):
    """Return a test entity that has COA seeded"""
    from src.api.models_accounting import AccountingEntity
    from sqlalchemy import select
    
    result = await async_db.execute(select(AccountingEntity).where(AccountingEntity.id == 1))
    entity = result.scalar_one_or_none()
    return entity


@pytest.fixture
async def cash_account(async_db: AsyncSession, seed_test_coa):
    """Return a cash account for testing"""
    from src.api.models_accounting import ChartOfAccounts
    from sqlalchemy import select
    
    # Try to find existing cash account
    result = await async_db.execute(
        select(ChartOfAccounts).where(
            ChartOfAccounts.entity_id == 1,
            ChartOfAccounts.account_type == "asset"
        )
    )
    accounts = result.scalars().all()
    
    # Find cash account
    for acc in accounts:
        if "cash" in acc.account_name.lower():
            return acc
    
    # If not found, create one
    cash_acc = ChartOfAccounts(
        entity_id=1,
        account_number="10100",
        account_name="Cash - Operating",
        account_type="asset",
        normal_balance="debit",
        is_active=True,
        allow_posting=True
    )
    async_db.add(cash_acc)
    await async_db.commit()
    await async_db.refresh(cash_acc)
    return cash_acc


@pytest.fixture
async def expense_account(async_db: AsyncSession, seed_test_coa):
    """Return an expense account for testing"""
    from src.api.models_accounting import ChartOfAccounts
    from sqlalchemy import select
    
    # Try to find existing expense account
    result = await async_db.execute(
        select(ChartOfAccounts).where(
            ChartOfAccounts.entity_id == 1,
            ChartOfAccounts.account_type == "expense"
        ).limit(1)
    )
    account = result.scalar_one_or_none()
    
    # If not found, create one
    if not account:
        account = ChartOfAccounts(
            entity_id=1,
            account_number="60100",
            account_name="Office Expenses",
            account_type="expense",
            normal_balance="debit",
            is_active=True,
            allow_posting=True
        )
        async_db.add(account)
        await async_db.commit()
        await async_db.refresh(account)
    
    return account


@pytest.fixture
async def revenue_account(async_db: AsyncSession, seed_test_coa):
    """Return a revenue account for testing"""
    from src.api.models_accounting import ChartOfAccounts
    from sqlalchemy import select
    
    result = await async_db.execute(
        select(ChartOfAccounts).where(
            ChartOfAccounts.entity_id == 1,
            ChartOfAccounts.account_type == "revenue"
        ).limit(1)
    )
    account = result.scalar_one_or_none()
    return account


@pytest.fixture
async def draft_journal_entry(client: AsyncClient, auth_headers, test_entity_with_coa, cash_account, expense_account):
    """Create a draft journal entry for testing"""
    from datetime import date
    
    payload = {
        "entity_id": test_entity_with_coa.id,
        "entry_date": str(date.today()),
        "fiscal_year": 2025,
        "fiscal_period": 10,
        "entry_type": "Standard",
        "memo": "Test draft entry",
        "lines": [
            {
                "line_number": 1,
                "account_id": cash_account.id,
                "debit_amount": 0,
                "credit_amount": 500,
                "description": "Cash payment"
            },
            {
                "line_number": 2,
                "account_id": expense_account.id,
                "debit_amount": 500,
                "credit_amount": 0,
                "description": "Office expense"
            }
        ]
    }
    
    response = await client.post(
        "/api/accounting/journal-entries/",
        json=payload,
        headers=auth_headers
    )
    
    if response.status_code == 200:
        from src.api.models_accounting import JournalEntry
        from types import SimpleNamespace
        entry_data = response.json()
        # Return a simple namespace mimicking the model
        return SimpleNamespace(id=entry_data["id"], entry_number=entry_data.get("entry_number"))
    return None


@pytest.fixture
async def pending_journal_entry(async_db: AsyncSession, draft_journal_entry):
    """Return a journal entry in pending approval status"""
    from src.api.models_accounting import JournalEntry
    from sqlalchemy import select
    
    if not draft_journal_entry:
        return None
    
    # Update status to pending
    result = await async_db.execute(
        select(JournalEntry).where(JournalEntry.id == draft_journal_entry.id)
    )
    entry = result.scalar_one_or_none()
    
    if entry:
        entry.status = "pending_approval"
        entry.workflow_stage = 1
        await async_db.commit()
    
    return entry


@pytest.fixture
def auth_headers_andre(mock_auth_headers):
    """Auth headers for Andre"""
    return {
        "Authorization": "Bearer test_token",
        "X-User-ID": "2",
        "X-User-Email": "anurmamade@ngicapitaladvisory.com"
    }


@pytest.fixture
def auth_headers_landon(mock_auth_headers):
    """Auth headers for Landon"""  
    return {
        "Authorization": "Bearer test_token",
        "X-User-ID": "1",
        "X-User-Email": "lwhitworth@ngicapitaladvisory.com"
    }


@pytest.fixture
async def pending_journal_entry_by_current_user(client: AsyncClient, auth_headers, test_entity_with_coa, cash_account, expense_account):
    """Create a pending entry created by current user"""
    from datetime import date
    
    # Create entry
    payload = {
        "entity_id": test_entity_with_coa.id,
        "entry_date": str(date.today()),
        "fiscal_year": 2025,
        "fiscal_period": 10,
        "lines": [
            {"line_number": 1, "account_id": cash_account.id, "debit_amount": 0, "credit_amount": 300},
            {"line_number": 2, "account_id": expense_account.id, "debit_amount": 300, "credit_amount": 0}
        ]
    }
    
    response = await client.post("/api/accounting/journal-entries/", json=payload, headers=auth_headers)
    
    if response.status_code == 200:
        entry_data = response.json()
        # Submit for approval
        await client.post(
            f"/api/accounting/journal-entries/{entry_data['id']}/submit-for-approval",
            headers=auth_headers
        )
        from types import SimpleNamespace
        return SimpleNamespace(id=entry_data["id"])
    return None


@pytest.fixture
async def first_approved_entry(async_db: AsyncSession, pending_journal_entry):
    """Return a journal entry with first approval"""
    from src.api.models_accounting import JournalEntry
    from sqlalchemy import select
    
    if not pending_journal_entry:
        return None
    
    result = await async_db.execute(
        select(JournalEntry).where(JournalEntry.id == pending_journal_entry.id)
    )
    entry = result.scalar_one_or_none()
    
    if entry:
        entry.workflow_stage = 2
        entry.first_approved_by_id = 2  # Andre
        entry.first_approved_at = datetime.now()
        await async_db.commit()
    
    return entry


@pytest.fixture
async def first_approved_entry_by_andre(async_db: AsyncSession, pending_journal_entry):
    """Return entry with first approval by Andre"""
    from src.api.models_accounting import JournalEntry
    from sqlalchemy import select
    from datetime import datetime
    
    if not pending_journal_entry:
        return None
    
    result = await async_db.execute(
        select(JournalEntry).where(JournalEntry.id == pending_journal_entry.id)
    )
    entry = result.scalar_one_or_none()
    
    if entry:
        entry.workflow_stage = 2
        entry.first_approved_by_id = 2
        entry.first_approved_at = datetime.now()
        await async_db.commit()
    
    return entry


@pytest.fixture
async def approved_journal_entry(async_db: AsyncSession, first_approved_entry):
    """Return a fully approved journal entry"""
    from src.api.models_accounting import JournalEntry
    from sqlalchemy import select
    from datetime import datetime
    
    if not first_approved_entry:
        return None
    
    result = await async_db.execute(
        select(JournalEntry).where(JournalEntry.id == first_approved_entry.id)
    )
    entry = result.scalar_one_or_none()
    
    if entry:
        entry.status = "approved"
        entry.workflow_stage = 3
        entry.final_approved_by_id = 1  # Landon
        entry.final_approved_at = datetime.now()
        await async_db.commit()
    
    return entry


@pytest.fixture
async def posted_journal_entry(async_db: AsyncSession, approved_journal_entry):
    """Return a posted journal entry"""
    from src.api.models_accounting import JournalEntry
    from sqlalchemy import select
    from datetime import datetime
    
    if not approved_journal_entry:
        return None
    
    result = await async_db.execute(
        select(JournalEntry).where(JournalEntry.id == approved_journal_entry.id)
    )
    entry = result.scalar_one_or_none()
    
    if entry:
        entry.status = "posted"
        entry.posted_at = datetime.now()
        entry.posted_by_id = 1
        await async_db.commit()
    
    return entry
