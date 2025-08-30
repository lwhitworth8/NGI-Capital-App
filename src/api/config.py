"""
Configuration settings for NGI Capital API
"""
import os

# Database configuration
def get_database_path():
    """Get the database path based on environment"""
    # Use pytest test DB when running tests (create-on-use)
    if os.getenv('PYTEST_CURRENT_TEST'):
        # Always use absolute path to ensure all connections hit the same file
        return os.path.abspath('test_ngi_capital.db')
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
SECRET_KEY = os.getenv("SECRET_KEY", "ngi-capital-secret-key-2024-secure-internal-app")
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
