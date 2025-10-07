"""
Simple Financial Reporting Tests - Uses actual database
"""
import pytest
from httpx import AsyncClient, ASGITransport
from src.api.main import app


@pytest.fixture(scope="function")
async def async_client():
    """Create async client for testing"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


class TestFinancialReportingSimple:
    """Simple financial reporting tests using actual database"""
    
    async def test_income_statement_generation(self, async_client: AsyncClient):
        """Test income statement generation"""
        response = await async_client.get(
            "/api/financial-reporting/income-statement",
            params={"entity_id": 1, "start_date": "2025-10-01", "end_date": "2025-10-31", "period": "2025-10"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "revenue_lines" in data
        assert "expense_lines" in data
        assert "net_income" in data
        assert "total_revenue" in data
        assert "total_expenses" in data
    
    async def test_balance_sheet_generation(self, async_client: AsyncClient):
        """Test balance sheet generation"""
        response = await async_client.get(
            "/api/financial-reporting/balance-sheet",
            params={"entity_id": 1, "as_of_date": "2025-10-31"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "asset_lines" in data
        assert "liability_lines" in data
        assert "equity_lines" in data
        assert "total_assets" in data
        assert "total_liabilities" in data
        assert "total_equity" in data
    
    async def test_cash_flow_statement(self, async_client: AsyncClient):
        """Test cash flow statement generation"""
        response = await async_client.get(
            "/api/financial-reporting/cash-flow",
            params={"entity_id": 1, "period": "2025-10"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "cash_lines" in data
        assert "net_change_in_cash" in data
        assert "entity_id" in data
    
    async def test_equity_statement(self, async_client: AsyncClient):
        """Test equity statement generation"""
        response = await async_client.get(
            "/api/financial-reporting/equity-statement",
            params={"entity_id": "1", "period": "Q4", "fiscal_year": 2025}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "beginning_balance" in data["data"]
        assert "ending_balance" in data["data"]
    
    async def test_consolidated_report(self, async_client: AsyncClient):
        """Test consolidated report generation"""
        response = await async_client.get(
            "/api/financial-reporting/consolidated-report",
            params={"entity_id": "1", "period": "Q4", "fiscal_year": 2025}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "consolidated_totals" in data
        assert "eliminations" in data
    
    async def test_excel_export(self, async_client: AsyncClient):
        """Test Excel export functionality"""
        response = await async_client.post(
            "/api/financial-reporting/export/excel",
            params={"entity_id": 1, "start_date": "2025-10-01", "end_date": "2025-10-31", "period": "2025-10"}
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        assert len(response.content) > 0
    
    async def test_pdf_export(self, async_client: AsyncClient):
        """Test PDF export functionality"""
        response = await async_client.post(
            "/api/financial-reporting/export/pdf",
            params={"entity_id": 1, "period": "2025-10", "fiscal_year": 2025}
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert len(response.content) > 0
    
    async def test_chart_of_accounts(self, async_client: AsyncClient):
        """Test chart of accounts retrieval"""
        response = await async_client.get(
            "/api/financial-reporting/chart-of-accounts",
            params={"entity_id": 1}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "accounts" in data
        assert len(data["accounts"]) > 0
    
    async def test_trial_balance(self, async_client: AsyncClient):
        """Test trial balance generation"""
        response = await async_client.post(
            "/api/financial-reporting/generate-trial-balance",
            params={"entity_id": "1", "as_of_date": "2025-10-31"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "accounts" in data
        assert "totals" in data
        assert "entity_id" in data
