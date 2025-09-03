"""
Configuration settings for NGI Capital API
"""
import os

# Database configuration
def get_database_path():
    """Get the database path based on environment"""
    # Explicit override
    env_path = os.getenv('DATABASE_PATH')
    if env_path:
        # If an explicit path is set but doesn't exist in development, fall back to local file
        p = os.path.abspath(env_path)
        if os.path.exists(p):
            return p
        if os.getenv('ENV', 'development').lower() == 'development' and os.path.exists('ngi_capital.db'):
            return os.path.abspath('ngi_capital.db')
        return p
    # Use pytest DB when running tests
    if os.getenv('PYTEST_CURRENT_TEST'):
        # Prefer the canonical test DB only if it already exists so modules
        # that seed it (e.g., investor-relations tests) can share it.
        canonical = os.path.abspath('test_ngi_capital.db')
        current_test = os.getenv('PYTEST_CURRENT_TEST', '')
        # Investor relations tests expect the app to use the canonical path
        if 'test_investor_relations.py' in current_test:
            return canonical
        if os.path.exists(canonical):
            return canonical
        # Otherwise, use a per-run ephemeral file under .tmp to avoid locks
        os.makedirs('.tmp', exist_ok=True)
        return os.path.abspath('.tmp/pytest.db')
    # Check if running in Docker
    if os.path.exists('/app/data'):
        return '/app/data/ngi_capital.db'
    # Check if database exists in current directory
    if os.path.exists('ngi_capital.db'):
        return 'ngi_capital.db'
    # Default path
    return os.path.join(os.path.dirname(__file__), '../../ngi_capital.db')

DATABASE_PATH = get_database_path()
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "ngi-capital-secret-key-2025-secure-internal-app")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 12

# CORS Configuration
CORS_ORIGINS = [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://internal.ngicapital.com",
]

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
