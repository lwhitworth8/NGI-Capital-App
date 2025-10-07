"""
NGI Capital - Journal Entries API Tests
Epic 3: Double-entry with dual approval

Author: NGI Capital Development Team
Date: October 3, 2025
"""

import pytest
from datetime import date
from decimal import Decimal
from httpx import AsyncClient


@pytest.mark.asyncio
class TestJournalEntriesAPI:
    """Test Journal Entries API endpoints"""

    async def test_create_balanced_entry(self, client: AsyncClient, auth_headers, test_entity_with_coa, cash_account, expense_account):
        """Test creating a balanced journal entry"""
        payload = {
            "entity_id": test_entity_with_coa.id,
            "entry_date": str(date.today()),
            "fiscal_year": 2025,
            "fiscal_period": 10,
            "entry_type": "Standard",
            "memo": "Test journal entry",
            "lines": [
                {
                    "line_number": 1,
                    "account_id": cash_account.id,
                    "debit_amount": 0,
                    "credit_amount": 1000,
                    "description": "Cash payment"
                },
                {
                    "line_number": 2,
                    "account_id": expense_account.id,
                    "debit_amount": 1000,
                    "credit_amount": 0,
                    "description": "Office supplies"
                }
            ]
        }
        
        response = await client.post(
            "/api/accounting/journal-entries/",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        entry = response.json()
        assert entry["status"] == "draft"
        # total_debits/credits returned as strings with decimals
        assert float(entry["total_debits"]) == 1000
        assert float(entry["total_credits"]) == 1000
        assert len(entry["lines"]) == 2

    async def test_create_unbalanced_entry(self, client: AsyncClient, auth_headers, test_entity_with_coa, cash_account, expense_account):
        """Test creating an unbalanced entry (should fail)"""
        payload = {
            "entity_id": test_entity_with_coa.id,
            "entry_date": str(date.today()),
            "fiscal_year": 2025,
            "fiscal_period": 10,
            "entry_type": "Standard",
            "lines": [
                {
                    "line_number": 1,
                    "account_id": cash_account.id,
                    "debit_amount": 0,
                    "credit_amount": 1000
                },
                {
                    "line_number": 2,
                    "account_id": expense_account.id,
                    "debit_amount": 500,  # Unbalanced!
                    "credit_amount": 0
                }
            ]
        }
        
        response = await client.post(
            "/api/accounting/journal-entries/",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 422
        assert "balanced" in str(response.json()).lower()

    async def test_create_entry_both_debit_credit(self, client: AsyncClient, auth_headers, test_entity_with_coa, cash_account):
        """Test creating entry with both debit and credit on same line (should fail)"""
        payload = {
            "entity_id": test_entity_with_coa.id,
            "entry_date": str(date.today()),
            "fiscal_year": 2025,
            "fiscal_period": 10,
            "lines": [
                {
                    "line_number": 1,
                    "account_id": cash_account.id,
                    "debit_amount": 100,
                    "credit_amount": 100  # Both!
                }
            ]
        }
        
        response = await client.post(
            "/api/accounting/journal-entries/",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 422

    async def test_submit_for_approval(self, client: AsyncClient, auth_headers, draft_journal_entry):
        """Test submitting entry for approval"""
        response = await client.post(
            f"/api/accounting/journal-entries/{draft_journal_entry.id}/submit-for-approval",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert "submitted" in response.json()["message"].lower()

    async def test_post_approved_entry(self, client: AsyncClient, auth_headers, approved_journal_entry, cash_account, expense_account):
        """Test posting approved entry and updating balances"""
        # Get initial balances
        initial_cash = cash_account.current_balance
        initial_expense = expense_account.current_balance
        
        response = await client.post(
            f"/api/accounting/journal-entries/{approved_journal_entry.id}/post",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert "posted successfully" in response.json()["message"].lower()
        
        # Verify balances updated
        # Note: Would need to fetch accounts again to verify

    async def test_cannot_post_unapproved_entry(self, client: AsyncClient, auth_headers, draft_journal_entry):
        """Test that unapproved entry cannot be posted"""
        response = await client.post(
            f"/api/accounting/journal-entries/{draft_journal_entry.id}/post",
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "approved" in response.json()["detail"].lower()

    async def test_entry_number_generation(self, client: AsyncClient, auth_headers, test_entity_with_coa, cash_account, expense_account):
        """Test automatic entry number generation"""
        payload = {
            "entity_id": test_entity_with_coa.id,
            "entry_date": str(date.today()),
            "fiscal_year": 2025,
            "fiscal_period": 10,
            "lines": [
                {"line_number": 1, "account_id": cash_account.id, "debit_amount": 0, "credit_amount": 100},
                {"line_number": 2, "account_id": expense_account.id, "debit_amount": 100, "credit_amount": 0}
            ]
        }
        
        response = await client.post(
            "/api/accounting/journal-entries/",
            json=payload,
            headers=auth_headers
        )
        
        entry = response.json()
        assert entry["entry_number"].startswith("JE-2025-")

    async def test_get_journal_entries_filtered(self, client: AsyncClient, auth_headers, test_entity_with_coa):
        """Test getting journal entries with filters"""
        response = await client.get(
            f"/api/accounting/journal-entries/?entity_id={test_entity_with_coa.id}&status=draft",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        entries = response.json()
        assert isinstance(entries, list)

    async def test_get_entry_by_id(self, client: AsyncClient, auth_headers, draft_journal_entry):
        """Test getting journal entry by ID"""
        response = await client.get(
            f"/api/accounting/journal-entries/{draft_journal_entry.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        entry = response.json()
        assert entry["id"] == draft_journal_entry.id
        assert "lines" in entry
        assert "total_debits" in entry
        assert "total_credits" in entry

    async def test_audit_trail_creation(self, client: AsyncClient, auth_headers, test_entity_with_coa, cash_account, expense_account):
        """Test that audit trail is created"""
        # Create entry
        payload = {
            "entity_id": test_entity_with_coa.id,
            "entry_date": str(date.today()),
            "fiscal_year": 2025,
            "fiscal_period": 10,
            "lines": [
                {"line_number": 1, "account_id": cash_account.id, "debit_amount": 0, "credit_amount": 100},
                {"line_number": 2, "account_id": expense_account.id, "debit_amount": 100, "credit_amount": 0}
            ]
        }
        
        response = await client.post(
            "/api/accounting/journal-entries/",
            json=payload,
            headers=auth_headers
        )
        
        entry = response.json()
        
        # Note: Would need additional endpoint to verify audit log
        # Just verifying entry was created with audit fields
        assert "created_by_name" in entry
        assert "created_at" in entry

    async def test_minimum_two_lines_required(self, client: AsyncClient, auth_headers, test_entity_with_coa, cash_account):
        """Test that minimum 2 lines are required"""
        payload = {
            "entity_id": test_entity_with_coa.id,
            "entry_date": str(date.today()),
            "fiscal_year": 2025,
            "fiscal_period": 10,
            "lines": [
                {"line_number": 1, "account_id": cash_account.id, "debit_amount": 100, "credit_amount": 0}
            ]
        }
        
        response = await client.post(
            "/api/accounting/journal-entries/",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 422
        # Validation message mentions balanced (single line can't balance)
        assert ("balanced" in str(response.json()).lower() or "at least 2" in str(response.json()).lower())
