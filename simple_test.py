import asyncio
import pytest
from httpx import AsyncClient
from src.api.main import app

async def test_simple_income_statement():
    """Simple test that just checks if the API endpoint responds"""
    from httpx import ASGITransport
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/financial-reporting/income-statement",
            params={"entity_id": 1, "period": "MTD", "fiscal_year": 2026}
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code

if __name__ == "__main__":
    result = asyncio.run(test_simple_income_statement())
    print(f"Test result: {result}")
