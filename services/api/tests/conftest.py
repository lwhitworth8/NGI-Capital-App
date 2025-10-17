import os
import sys
import pytest
from httpx import AsyncClient

# Add parent directory to path to enable services.api imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from services.api.main import app


@pytest.fixture(scope="function", autouse=True)
def _pytest_env_safety(monkeypatch: pytest.MonkeyPatch):
    # Ensure backend sees that pytest is running to disable dev-only bypasses
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "1")
    # Use local SQLite test DB if available
    if not os.getenv("DATABASE_PATH") and os.path.exists("test_ngi_capital.db"):
        monkeypatch.setenv("DATABASE_PATH", os.path.abspath("test_ngi_capital.db"))


@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://testserver") as ac:
        yield ac

