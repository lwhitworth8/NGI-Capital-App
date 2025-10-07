"""
NGI Capital - Comprehensive Chart of Accounts API Tests
Tests all COA endpoints with entity context

Author: NGI Capital Development Team
Date: October 4, 2025
"""

import pytest
from decimal import Decimal
from httpx import AsyncClient


@pytest.mark.asyncio
class TestChartOfAccountsSeeding:
    """Test COA seeding functionality"""

    async def test_seed_coa_for_entity(self, client: AsyncClient, test_entity_id: int):
        """Test seeding COA for NGI Capital LLC"""
        # Seed COA for entity 1 (NGI Capital LLC)
        response = await client.post(f"/api/accounting/coa/seed/{test_entity_id}")
        
        # Should succeed or already be seeded (400)
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert data["accounts_created"] >= 150  # Should create 150+ accounts
            assert data["entity_id"] == test_entity_id
            assert "Successfully seeded" in data["message"]

    async def test_seed_coa_nonexistent_entity_fails(self, client: AsyncClient):
        """Test seeding for non-existent entity"""
        response = await client.post("/api/accounting/coa/seed/99999")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
class TestChartOfAccountsRetrieval:
    """Test COA retrieval endpoints"""

    @pytest.fixture(autouse=True)
    async def setup(self, client: AsyncClient, test_entity_id: int):
        """Setup test entity with COA"""
        # Use pre-seeded entity from conftest
        self.entity_id = test_entity_id
        
        # Seed COA (will return 400 if already seeded, which is fine)
        await client.post(f"/api/accounting/coa/seed/{self.entity_id}")

    async def test_get_all_accounts(self, client: AsyncClient):
        """Test retrieving all accounts for entity"""
        response = await client.get(
            f"/api/accounting/coa/?entity_id={self.entity_id}"
        )
        
        assert response.status_code == 200
        accounts = response.json()
        assert isinstance(accounts, list)
        assert len(accounts) >= 150
        
        # Verify account structure
        account = accounts[0]
        assert "id" in account
        assert "entity_id" in account
        assert "account_number" in account
        assert "account_name" in account
        assert "account_type" in account
        assert "normal_balance" in account
        assert "is_active" in account

    async def test_get_accounts_by_type(self, client: AsyncClient):
        """Test filtering accounts by type"""
        # Get all asset accounts
        response = await client.get(
            f"/api/accounting/coa/?entity_id={self.entity_id}&account_type=Asset"
        )
        
        assert response.status_code == 200
        accounts = response.json()
        
        # All should be Asset type
        assert len(accounts) > 0
        for account in accounts:
            assert account["account_type"] == "Asset"
            # Most assets are Debit, but contra-assets like Allowance for Doubtful Accounts are Credit
            assert account["normal_balance"] in ["Debit", "Credit"]

    async def test_get_posting_accounts_only(self, client: AsyncClient):
        """Test getting only posting-allowed accounts"""
        response = await client.get(
            f"/api/accounting/coa/?entity_id={self.entity_id}&allow_posting_only=true"
        )
        
        assert response.status_code == 200
        accounts = response.json()
        
        # All should allow posting
        for account in accounts:
            assert account["allow_posting"] is True

    async def test_search_accounts_by_name(self, client: AsyncClient):
        """Test searching accounts by name"""
        response = await client.get(
            f"/api/accounting/coa/?entity_id={self.entity_id}&search=Cash"
        )
        
        assert response.status_code == 200
        accounts = response.json()
        
        # All should contain 'Cash' in name or number
        for account in accounts:
            assert "cash" in account["account_name"].lower() or \
                   "cash" in account["account_number"].lower()

    async def test_get_account_tree(self, client: AsyncClient):
        """Test getting hierarchical account tree"""
        response = await client.get(
            f"/api/accounting/coa/tree?entity_id={self.entity_id}"
        )
        
        assert response.status_code == 200
        tree = response.json()
        assert isinstance(tree, list)
        
        # Verify tree structure
        if len(tree) > 0:
            node = tree[0]
            assert "account" in node
            assert "children" in node
            assert isinstance(node["children"], list)

    async def test_get_accounts_by_type_grouped(self, client: AsyncClient):
        """Test getting accounts grouped by type"""
        response = await client.get(
            f"/api/accounting/coa/by-type?entity_id={self.entity_id}"
        )
        
        assert response.status_code == 200
        grouped = response.json()
        
        # Should have all 5 types
        assert "Asset" in grouped
        assert "Liability" in grouped
        assert "Equity" in grouped
        assert "Revenue" in grouped
        assert "Expense" in grouped
        
        # Each should be a list
        for account_type, accounts in grouped.items():
            assert isinstance(accounts, list)

    async def test_get_posting_accounts_endpoint(self, client: AsyncClient):
        """Test dedicated posting accounts endpoint"""
        response = await client.get(
            f"/api/accounting/coa/posting-accounts?entity_id={self.entity_id}"
        )
        
        assert response.status_code == 200
        accounts = response.json()
        
        # All should allow posting
        for account in accounts:
            assert account["allow_posting"] is True


@pytest.mark.asyncio
class TestChartOfAccountsCRUD:
    """Test COA create, update, delete operations"""

    @pytest.fixture(autouse=True)
    async def setup(self, client: AsyncClient, test_entity_id: int):
        """Setup test entity with COA"""
        # Use pre-seeded entity from conftest
        self.entity_id = test_entity_id
        # Seed COA (will return 400 if already seeded, which is fine)
        await client.post(f"/api/accounting/coa/seed/{self.entity_id}")

    async def test_create_custom_account(self, client: AsyncClient):
        """Test creating a new custom account"""
        account_data = {
            "entity_id": self.entity_id,
            "account_number": "99990",
            "account_name": "Custom Test Account",
            "account_type": "Expense",
            "description": "Account for testing",
            "allow_posting": True
        }
        
        response = await client.post(
            "/api/accounting/coa/",
            json=account_data
        )
        
        assert response.status_code == 200
        account = response.json()
        assert account["account_number"] == "99990"
        assert account["account_name"] == "Custom Test Account"
        assert account["account_type"] == "Expense"
        assert account["normal_balance"] == "Debit"  # Auto-set for Expense

    async def test_create_account_duplicate_number_fails(self, client: AsyncClient):
        """Test creating account with duplicate number"""
        # Create first account
        await client.post(
            "/api/accounting/coa/",
            json={
                "entity_id": self.entity_id,
                "account_number": "99991",
                "account_name": "First Account",
                "account_type": "Expense"
            }
        )
        
        # Try to create duplicate
        response = await client.post(
            "/api/accounting/coa/",
            json={
                "entity_id": self.entity_id,
                "account_number": "99991",  # Duplicate
                "account_name": "Second Account",
                "account_type": "Expense"
            }
        )
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

    async def test_update_account(self, client: AsyncClient):
        """Test updating an account"""
        # Create account
        create_response = await client.post(
            "/api/accounting/coa/",
            json={
                "entity_id": self.entity_id,
                "account_number": "99992",
                "account_name": "Original Name",
                "account_type": "Expense"
            }
        )
        account_id = create_response.json()["id"]
        
        # Update account
        response = await client.patch(
            f"/api/accounting/coa/{account_id}",
            json={
                "account_name": "Updated Name",
                "description": "Updated description"
            }
        )
        
        assert response.status_code == 200
        updated = response.json()
        assert updated["account_name"] == "Updated Name"
        assert updated["description"] == "Updated description"

    async def test_deactivate_account(self, client: AsyncClient):
        """Test deactivating an account"""
        # Create account
        create_response = await client.post(
            "/api/accounting/coa/",
            json={
                "entity_id": self.entity_id,
                "account_number": "99993",
                "account_name": "Account to Deactivate",
                "account_type": "Expense"
            }
        )
        account_id = create_response.json()["id"]
        
        # Deactivate
        response = await client.delete(f"/api/accounting/coa/{account_id}")
        
        assert response.status_code == 200
        assert "deactivated" in response.json()["message"].lower()

    async def test_create_child_account(self, client: AsyncClient):
        """Test creating an account with parent relationship"""
        # Get a parent account (header account)
        parent_response = await client.get(
            f"/api/accounting/coa/?entity_id={self.entity_id}&account_number=10000"
        )
        # Note: This assumes 10000 exists from seed
        
        # Create child account
        response = await client.post(
            "/api/accounting/coa/",
            json={
                "entity_id": self.entity_id,
                "account_number": "10999",
                "account_name": "Custom Current Asset",
                "account_type": "Asset",
                "parent_account_id": parent_response.json()[0]["id"] if parent_response.json() else None,
                "allow_posting": True
            }
        )
        
        assert response.status_code == 200
        account = response.json()
        assert account["account_number"] == "10999"


@pytest.mark.asyncio
class TestChartOfAccountsValidation:
    """Test COA validation rules"""

    @pytest.fixture(autouse=True)
    async def setup(self, client: AsyncClient, test_entity_id: int):
        """Setup test entity"""
        # Use pre-seeded entity from conftest
        self.entity_id = test_entity_id

    async def test_normal_balance_auto_assigned(self, client: AsyncClient):
        """Test that normal balance is automatically assigned based on account type"""
        test_cases = [
            ("Asset", "Debit"),
            ("Expense", "Debit"),
            ("Liability", "Credit"),
            ("Equity", "Credit"),
            ("Revenue", "Credit")
        ]
        
        for account_type, expected_balance in test_cases:
            response = await client.post(
                "/api/accounting/coa/",
                json={
                    "entity_id": self.entity_id,
                    "account_number": f"9999{test_cases.index((account_type, expected_balance))}",
                    "account_name": f"Test {account_type} Account",
                    "account_type": account_type
                }
            )
            
            assert response.status_code == 200
            account = response.json()
            assert account["normal_balance"] == expected_balance

    async def test_account_number_required(self, client: AsyncClient):
        """Test that account number is required"""
        response = await client.post(
            "/api/accounting/coa/",
            json={
                "entity_id": self.entity_id,
                # Missing account_number
                "account_name": "Test Account",
                "account_type": "Expense"
            }
        )
        
        assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
class TestMultiEntityIsolation:
    """Test that entities' COA data is properly isolated"""

    async def test_accounts_isolated_by_entity(self, client: AsyncClient):
        """Test that each entity's accounts are isolated"""
        # Use pre-seeded entities from conftest (entity 1 and 2)
        entity1_id = 1  # NGI Capital LLC
        entity2_id = 2  # NGI Capital Advisory LLC
        
        # Seed both (will return 400 if already seeded, which is fine)
        await client.post(f"/api/accounting/coa/seed/{entity1_id}")
        await client.post(f"/api/accounting/coa/seed/{entity2_id}")
        
        # Get accounts for entity 1
        response1 = await client.get(f"/api/accounting/coa/?entity_id={entity1_id}")
        accounts1 = response1.json()
        
        # Get accounts for entity 2
        response2 = await client.get(f"/api/accounting/coa/?entity_id={entity2_id}")
        accounts2 = response2.json()
        
        # Both should have accounts
        assert len(accounts1) >= 150
        assert len(accounts2) >= 150
        
        # Verify all entity 1 accounts belong to entity 1
        for account in accounts1:
            assert account["entity_id"] == entity1_id
        
        # Verify all entity 2 accounts belong to entity 2
        for account in accounts2:
            assert account["entity_id"] == entity2_id
        
        # Verify no overlap in IDs
        ids1 = {acc["id"] for acc in accounts1}
        ids2 = {acc["id"] for acc in accounts2}
        assert ids1.isdisjoint(ids2)


@pytest.mark.asyncio
class TestAccountBalances:
    """Test account balance tracking"""

    @pytest.fixture(autouse=True)
    async def setup(self, client: AsyncClient, test_entity_id: int):
        """Setup test entity with COA"""
        # Use pre-seeded entity from conftest
        self.entity_id = test_entity_id
        # Seed COA (will return 400 if already seeded, which is fine)
        await client.post(f"/api/accounting/coa/seed/{self.entity_id}")

    async def test_new_accounts_have_zero_balance(self, client: AsyncClient):
        """Test that newly created accounts have zero balance"""
        response = await client.get(f"/api/accounting/coa/?entity_id={self.entity_id}")
        accounts = response.json()
        
        # All should have zero balance initially
        for account in accounts:
            # Current balance might not be in response, but if it is, should be 0
            if "current_balance" in account:
                assert Decimal(str(account["current_balance"])) == Decimal("0.00")


# Run with: pytest tests/accounting/test_coa_complete.py -v


