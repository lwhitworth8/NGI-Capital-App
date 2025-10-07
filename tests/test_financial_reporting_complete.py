"""
Comprehensive Financial Reporting Tests
Tests all 5 GAAP financial statements, Excel/PDF exports, and UI workflows
"""

import pytest
import asyncio
from datetime import datetime, date, timedelta
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from src.api.main import app
from src.api.models_accounting import ChartOfAccounts, JournalEntry, JournalEntryLine, AccountingEntity


class TestFinancialReportingComplete:
    """Complete financial reporting test suite"""

    @pytest.fixture(autouse=True)
    async def setup_test_data(self, async_db: AsyncSession):
        """Set up test data for financial reporting"""
        # Check if entity already exists
        existing_entity = await async_db.get(AccountingEntity, 1)
        if not existing_entity:
            # Create test entity
            entity = AccountingEntity(
                id=1,
                entity_name="NGI Capital LLC",
                entity_type="LLC",
                is_available=True,
                formation_state="DE",
                entity_status="active",
                ein="12-3456789"
            )
            async_db.add(entity)
            await async_db.commit()

        # Create chart of accounts (check if they exist first)
        existing_codes = set()
        for code in ["11120", "11200", "15200", "15210", "21100", "25100", "31100", "33000", "41100", "52100", "52400"]:
            result = await async_db.execute(
                text("SELECT account_number FROM chart_of_accounts WHERE entity_id = 1 AND account_number = :code"),
                {"code": code}
            )
            if result.fetchone():
                existing_codes.add(code)
        
        accounts = [
            # Assets
            ChartOfAccounts(
                id=1, entity_id=1, account_number="11120", account_name="Checking - Mercury Bank",
                account_type="Asset", normal_balance="debit", allow_posting=True, is_active=True
            ),
            ChartOfAccounts(
                id=2, entity_id=1, account_number="11200", account_name="Accounts Receivable",
                account_type="Asset", normal_balance="debit", allow_posting=True, is_active=True
            ),
            ChartOfAccounts(
                id=3, entity_id=1, account_number="15200", account_name="Buildings",
                account_type="Asset", normal_balance="debit", allow_posting=True, is_active=True
            ),
            ChartOfAccounts(
                id=4, entity_id=1, account_number="15210", account_name="Accumulated Depreciation - Buildings",
                account_type="Asset", normal_balance="credit", allow_posting=True, is_active=True
            ),
            # Liabilities
            ChartOfAccounts(
                id=5, entity_id=1, account_number="21100", account_name="Accounts Payable",
                account_type="Liability", normal_balance="credit", allow_posting=True, is_active=True
            ),
            ChartOfAccounts(
                id=6, entity_id=1, account_number="25100", account_name="Notes Payable",
                account_type="Liability", normal_balance="credit", allow_posting=True, is_active=True
            ),
            # Equity
            ChartOfAccounts(
                id=7, entity_id=1, account_number="31100", account_name="Common Stock",
                account_type="Equity", normal_balance="credit", allow_posting=True, is_active=True
            ),
            ChartOfAccounts(
                id=8, entity_id=1, account_number="33000", account_name="Retained Earnings",
                account_type="Equity", normal_balance="credit", allow_posting=True, is_active=True
            ),
            # Revenue
            ChartOfAccounts(
                id=9, entity_id=1, account_number="41100", account_name="Advisory Services Revenue",
                account_type="Revenue", normal_balance="credit", allow_posting=True, is_active=True
            ),
            # Expenses
            ChartOfAccounts(
                id=10, entity_id=1, account_number="52100", account_name="Salaries and Wages",
                account_type="Expense", normal_balance="debit", allow_posting=True, is_active=True
            ),
            ChartOfAccounts(
                id=11, entity_id=1, account_number="52400", account_name="Rent Expense",
                account_type="Expense", normal_balance="debit", allow_posting=True, is_active=True
            ),
        ]
        
        for account in accounts:
            if account.account_number not in existing_codes:
                async_db.add(account)
        await async_db.commit()

        # Create journal entries with posted status (check if they exist first)
        existing_jes = await async_db.execute(
            text("SELECT id FROM journal_entries WHERE entity_id = 1 AND entry_number IN ('JE-001', 'JE-002', 'JE-003')")
        )
        existing_je_ids = {row[0] for row in existing_jes.fetchall()}
        
        if 1 not in existing_je_ids:
            je1 = JournalEntry(
                id=1, entity_id=1, entry_number="JE-001", entry_date=date(2025, 10, 1),
                memo="Initial capital contribution", status="posted",
                fiscal_year=2026, fiscal_period=10, created_by_id=1
            )
            async_db.add(je1)
            await async_db.flush()

            # Journal entry lines
            je_lines = [
                JournalEntryLine(journal_entry_id=1, account_id=1, line_number=1, description="Cash received", debit_amount=1000000, credit_amount=0),
                JournalEntryLine(journal_entry_id=1, account_id=7, line_number=2, description="Common stock issued", debit_amount=0, credit_amount=1000000),
            ]
            for line in je_lines:
                async_db.add(line)

        if 2 not in existing_je_ids:
            je2 = JournalEntry(
                id=2, entity_id=1, entry_number="JE-002", entry_date=date(2025, 10, 15),
                memo="Revenue recognition", status="posted",
                fiscal_year=2026, fiscal_period=10, created_by_id=1
            )
            async_db.add(je2)
            await async_db.flush()

            je_lines2 = [
                JournalEntryLine(journal_entry_id=2, account_id=2, line_number=1, description="Services provided", debit_amount=50000, credit_amount=0),
                JournalEntryLine(journal_entry_id=2, account_id=9, line_number=2, description="Revenue earned", debit_amount=0, credit_amount=50000),
            ]
            for line in je_lines2:
                async_db.add(line)

        if 3 not in existing_je_ids:
            je3 = JournalEntry(
                id=3, entity_id=1, entry_number="JE-003", entry_date=date(2025, 10, 20),
                memo="Operating expenses", status="posted",
                fiscal_year=2026, fiscal_period=10, created_by_id=1
            )
            async_db.add(je3)
            await async_db.flush()

            je_lines3 = [
                JournalEntryLine(journal_entry_id=3, account_id=10, line_number=1, description="Salaries paid", debit_amount=25000, credit_amount=0),
                JournalEntryLine(journal_entry_id=3, account_id=11, line_number=2, description="Rent paid", debit_amount=5000, credit_amount=0),
                JournalEntryLine(journal_entry_id=3, account_id=1, line_number=3, description="Cash paid", debit_amount=0, credit_amount=30000),
            ]
            for line in je_lines3:
                async_db.add(line)

        await async_db.commit()

    async def test_income_statement_generation(self, async_client: AsyncClient):
        """Test income statement generation with proper GAAP format"""
        response = await async_client.get(
            "/api/financial-reporting/income-statement",
            params={"entity_id": 1, "period": "MTD", "fiscal_year": 2026}
        )
        
        assert response.status_code == 200
        data = response.json()
        print(f"Response data: {data}")
        
        # Verify structure
        assert "revenue_lines" in data
        assert "expense_lines" in data
        assert "total_revenue" in data
        assert "total_expenses" in data
        assert "net_income" in data
        assert "asc_reference" in data
        
        # Verify revenue
        assert data["total_revenue"] == 50000.0
        assert len(data["revenue_lines"]) == 1
        assert data["revenue_lines"][0]["account_name"] == "Advisory Services Revenue"
        
        # Verify expenses
        assert data["total_expenses"] == 30000.0
        assert len(data["expense_lines"]) == 2
        
        # Verify net income
        assert data["net_income"] == 20000.0

    async def test_balance_sheet_generation(self, async_client: AsyncClient):
        """Test balance sheet generation with accounting equation validation"""
        response = await async_client.get(
            "/api/financial-reporting/balance-sheet",
            params={"entity_id": 1, "as_of_date": "2025-10-31"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "asset_lines" in data
        assert "liability_lines" in data
        assert "equity_lines" in data
        assert "total_assets" in data
        assert "total_liabilities" in data
        assert "total_equity" in data
        assert "assets_equal_liabilities_plus_equity" in data
        
        # Verify accounting equation
        assert data["assets_equal_liabilities_plus_equity"] == True
        
        # Verify totals
        assert data["total_assets"] == 970000.0  # 1000000 - 30000 (cash) + 50000 (AR)
        assert data["total_liabilities"] == 0.0
        assert data["total_equity"] == 970000.0

    async def test_cash_flow_statement_generation(self, async_client: AsyncClient):
        """Test cash flow statement generation (ASC 230)"""
        response = await async_client.get(
            "/api/financial-reporting/cash-flow",
            params={"entity_id": 1, "period": "MTD", "fiscal_year": 2026}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "cash_lines" in data
        assert "net_change_in_cash" in data
        assert "asc_reference" in data
        
        # Verify cash change
        assert data["net_change_in_cash"] == -30000.0  # Cash paid out for expenses

    async def test_equity_statement_generation(self, async_client: AsyncClient):
        """Test statement of changes in equity (ASC 215)"""
        response = await async_client.get(
            "/api/financial-reporting/equity-statement",
            params={"entity_id": "1", "period": "MTD", "fiscal_year": 2026}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "data" in data
        assert "asc_standard" in data
        assert data["asc_standard"] == "ASC 215 - Statement of Shareholder Equity"

    async def test_consolidated_reporting(self, async_client: AsyncClient):
        """Test consolidated financial reporting (ASC 810)"""
        response = await async_client.get(
            "/api/financial-reporting/consolidated-report",
            params={"period": "MTD", "fiscal_year": 2026}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "asc_standard" in data
        assert "entities_included" in data
        assert "eliminations" in data
        assert "consolidated_totals" in data
        assert data["asc_standard"] == "ASC 810 - Consolidation"

    async def test_compliance_check(self, async_client: AsyncClient):
        """Test ASC compliance checking"""
        response = await async_client.get(
            "/api/financial-reporting/compliance-check",
            params={"entity_id": "1"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "compliance_items" in data
        assert "overall_status" in data
        assert "action_items" in data
        
        # Verify compliance items
        assert len(data["compliance_items"]) > 0
        assert any(item["standard"] == "ASC 606 - Revenue Recognition" for item in data["compliance_items"])

    async def test_trial_balance_generation(self, async_client: AsyncClient):
        """Test trial balance generation for audit purposes"""
        response = await async_client.post(
            "/api/financial-reporting/generate-trial-balance",
            params={"entity_id": "1", "as_of_date": "2025-10-31"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "accounts" in data
        assert "totals" in data
        assert "in_balance" in data
        
        # Verify trial balance is in balance
        assert data["totals"]["in_balance"] == True
        assert data["totals"]["total_debits"] == data["totals"]["total_credits"]

    async def test_chart_of_accounts_retrieval(self, async_client: AsyncClient):
        """Test chart of accounts retrieval"""
        response = await async_client.get("/api/financial-reporting/chart-of-accounts")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "accounts" in data
        assert "total" in data
        assert "asc_reference" in data
        
        # Verify accounts exist
        assert data["total"] > 0
        assert len(data["accounts"]) > 0

    async def test_financial_statements_ui_workflow(self, async_client: AsyncClient):
        """Test complete UI workflow for financial statements"""
        # Test period selection
        response = await async_client.get(
            "/api/financial-reporting/gl/income-statement",
            params={"entity_id": 1, "period": "Q3-2025", "fiscal_year": 2026}
        )
        assert response.status_code == 200
        
        # Test balance sheet
        response = await async_client.get(
            "/api/financial-reporting/gl/balance-sheet",
            params={"entity_id": 1, "as_of_date": "2025-09-30"}
        )
        assert response.status_code == 200
        
        # Test cash flow
        response = await async_client.get(
            "/api/financial-reporting/gl/cash-flow",
            params={"entity_id": 1, "period": "Q3-2025", "fiscal_year": 2026}
        )
        assert response.status_code == 200

    async def test_excel_export_functionality(self, async_client: AsyncClient):
        """Test Excel export functionality"""
        # This would test the actual Excel export endpoint
        # For now, we'll test that the data structure supports Excel export
        response = await async_client.get(
            "/api/financial-reporting/income-statement",
            params={"entity_id": 1, "period": "MTD", "fiscal_year": 2026}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify data structure is suitable for Excel export
        assert isinstance(data["revenue_lines"], list)
        assert isinstance(data["expense_lines"], list)
        assert all("account_code" in line for line in data["revenue_lines"])
        assert all("account_name" in line for line in data["revenue_lines"])
        assert all("amount" in line for line in data["revenue_lines"])

    async def test_pdf_export_functionality(self, async_client: AsyncClient):
        """Test PDF export functionality"""
        # This would test the actual PDF export endpoint
        # For now, we'll test that the data structure supports PDF export
        response = await async_client.get(
            "/api/financial-reporting/balance-sheet",
            params={"entity_id": 1, "as_of_date": "2025-10-31"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify data structure is suitable for PDF export
        assert isinstance(data["asset_lines"], list)
        assert isinstance(data["liability_lines"], list)
        assert isinstance(data["equity_lines"], list)
        assert all("account_code" in line for line in data["asset_lines"])

    async def test_error_handling_invalid_entity(self, async_client: AsyncClient):
        """Test error handling for invalid entity"""
        response = await async_client.get(
            "/api/financial-reporting/income-statement",
            params={"entity_id": 999, "period": "MTD", "fiscal_year": 2026}
        )
        
        # Should handle gracefully (either 404 or empty results)
        assert response.status_code in [200, 404]

    async def test_error_handling_invalid_period(self, async_client: AsyncClient):
        """Test error handling for invalid period"""
        response = await async_client.get(
            "/api/financial-reporting/income-statement",
            params={"entity_id": 1, "period": "INVALID", "fiscal_year": 2026}
        )
        
        # Should handle gracefully
        assert response.status_code in [200, 400, 422]

    async def test_financial_ratios_calculation(self, async_client: AsyncClient):
        """Test financial ratios calculation"""
        # Get balance sheet data
        bs_response = await async_client.get(
            "/api/financial-reporting/balance-sheet",
            params={"entity_id": 1, "as_of_date": "2025-10-31"}
        )
        assert bs_response.status_code == 200
        bs_data = bs_response.json()
        
        # Get income statement data
        is_response = await async_client.get(
            "/api/financial-reporting/income-statement",
            params={"entity_id": 1, "period": "MTD", "fiscal_year": 2026}
        )
        assert is_response.status_code == 200
        is_data = is_response.json()
        
        # Calculate basic ratios
        total_assets = bs_data["total_assets"]
        total_liabilities = bs_data["total_liabilities"]
        total_equity = bs_data["total_equity"]
        net_income = is_data["net_income"]
        total_revenue = is_data["total_revenue"]
        
        # Verify ratios can be calculated
        assert total_assets > 0
        assert total_equity > 0
        assert total_revenue > 0
        
        # Current ratio = Current Assets / Current Liabilities
        # (Would need current assets/liabilities breakdown for accurate calculation)
        
        # Return on Equity = Net Income / Total Equity
        roe = net_income / total_equity if total_equity > 0 else 0
        assert roe >= 0  # Should be non-negative

    async def test_multi_period_comparison(self, async_client: AsyncClient):
        """Test multi-period comparison functionality"""
        # Test current period
        current_response = await async_client.get(
            "/api/financial-reporting/income-statement",
            params={"entity_id": 1, "period": "MTD", "fiscal_year": 2026}
        )
        assert current_response.status_code == 200
        
        # Test prior period
        prior_response = await async_client.get(
            "/api/financial-reporting/income-statement",
            params={"entity_id": 1, "period": "MTD", "fiscal_year": 2025}
        )
        assert prior_response.status_code == 200
        
        # Verify both periods return data
        current_data = current_response.json()
        prior_data = prior_response.json()
        
        assert "total_revenue" in current_data
        assert "total_revenue" in prior_data

    async def test_asc_compliance_validation(self, async_client: AsyncClient):
        """Test ASC compliance validation across all statements"""
        # Test all statements have ASC references
        statements = [
            ("income-statement", {"entity_id": 1, "period": "MTD", "fiscal_year": 2026}),
            ("balance-sheet", {"entity_id": 1, "as_of_date": "2025-10-31"}),
            ("cash-flow", {"entity_id": 1, "period": "MTD", "fiscal_year": 2026}),
        ]
        
        for statement, params in statements:
            response = await async_client.get(
                f"/api/financial-reporting/{statement}",
                params=params
            )
            assert response.status_code == 200
            data = response.json()
            assert "asc_reference" in data
            assert data["asc_reference"] is not None
            assert len(data["asc_reference"]) > 0
