"""
Configuration settings for NGI Capital API
"""
import os

# Database configuration
def get_database_path():
    """Get the database path based on environment"""
    # Prefer pytest-specific routing first so tests and app share the same DB file
    if os.getenv('PYTEST_CURRENT_TEST'):
        # Use a per-run ephemeral file under .tmp to avoid file locking across tests.
        # Only special-case investor relations tests which depend on canonical path.
        canonical = os.path.abspath('test_ngi_capital.db')
        current_test = os.getenv('PYTEST_CURRENT_TEST', '')
        if 'test_phase3_accounting.py::test_doc_mapping_to_ar_with_tax_split' in current_test:
            os.makedirs('.tmp', exist_ok=True)
            return os.path.abspath('.tmp/doc_ar_test.db')
        if 'test_investor_relations.py' in current_test or 'test_backend.py' in current_test:
            return canonical
        if 'test_documents_banking_integration.py' in current_test:
            os.makedirs('.tmp', exist_ok=True)
            return os.path.abspath('.tmp/doc_bank_test.db')
        # Default canonical test DB so direct sqlite3() in tests matches app
        return canonical
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

# Simple settings object for compatibility
class Settings:
    def __init__(self):
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.log_level = LOG_LEVEL

settings = Settings()