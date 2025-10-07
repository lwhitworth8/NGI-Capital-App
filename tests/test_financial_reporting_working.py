"""
Working Financial Reporting Tests - Uses actual database directly
"""
import pytest
from httpx import AsyncClient, ASGITransport
from src.api.main import app


@pytest.fixture(scope="function")
async def async_client():
    """Create async client for testing"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


class TestFinancialReportingWorking:
    """Working financial reporting tests using actual database"""
    
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
        assert data["entity_id"] == 1
    
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
        assert data["entity_id"] == 1
    
    async def test_excel_export(self, async_client: AsyncClient):
        """Test Excel export functionality"""
        response = await async_client.post(
            "/api/financial-reporting/export/excel",
            params={"entity_id": 1, "start_date": "2025-10-01", "end_date": "2025-10-31", "period": "2025-10"}
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
        assert "total" in data
        assert len(data["accounts"]) > 0
        assert data["total"] > 0
