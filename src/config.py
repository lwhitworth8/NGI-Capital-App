"""
Configuration settings for NGI Capital Internal App 
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 720  # 12 hours

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/ngi_capital.db")

# Mercury Bank API Configuration
MERCURY_API_KEY = os.getenv("MERCURY_API_KEY", "")
MERCURY_API_SECRET = os.getenv("MERCURY_API_SECRET", "")
MERCURY_WEBHOOK_SECRET = os.getenv("MERCURY_WEBHOOK_SECRET", "")
MERCURY_API_BASE_URL = os.getenv("MERCURY_API_BASE_URL", "https://api.mercury.com/api/v1")
MERCURY_ENVIRONMENT = os.getenv("MERCURY_ENVIRONMENT", "sandbox")  # sandbox or production

# Email Configuration (for notifications)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@ngicapital.com")

# Partner emails
PARTNER_EMAILS = [
    "anurmamade@ngicapitaladvisory.com",
    "lwhitworth@ngicapitaladvisory.com"
]

# Approval thresholds
DUAL_APPROVAL_THRESHOLD = 500.00  # Transactions over this amount require dual approval
ACH_AUTO_APPROVAL_LIMIT = 10000.00  # ACH transfers under this amount are auto-approved

# File upload settings
UPLOAD_DIR = BASE_DIR / "uploads"
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx", ".xls", ".xlsx"}

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = BASE_DIR / "logs" / "ngi_capital.log"

# CORS settings
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://internal.ngicapital.com"
]

# Session settings
SESSION_TIMEOUT_MINUTES = 30  # Auto-logout after 30 minutes of inactivity

# Backup settings
BACKUP_DIR = BASE_DIR / "backups"
BACKUP_RETENTION_DAYS = 30

# Create necessary directories
for directory in [UPLOAD_DIR, LOG_FILE.parent, BACKUP_DIR]:
    directory.mkdir(parents=True, exist_ok=True)