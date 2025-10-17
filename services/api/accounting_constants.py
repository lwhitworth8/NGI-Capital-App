"""
Hardcoded Accounting Settings for NGI Capital v1
All entities use these standardized settings for consistency and compliance
"""

from decimal import Decimal
from datetime import date

# FISCAL YEAR SETTINGS
# All entities use calendar year (01-01 to 12-31)
FISCAL_YEAR_START_MONTH = 1
FISCAL_YEAR_START_DAY = 1
FISCAL_YEAR_END_MONTH = 12
FISCAL_YEAR_END_DAY = 31

# ACCOUNTING BASIS
# Always accrual basis for GAAP compliance
ACCOUNTING_BASIS = "accrual"  # vs "cash"

# APPROVAL WORKFLOWS
# Dual approval required for all journal entries and transactions
DUAL_APPROVAL_ENABLED = True
DUAL_APPROVAL_THRESHOLD = Decimal("0.00")  # All entries require dual approval

# Approval roles
APPROVAL_ROLES = {
    "maker": ["Partner", "CFO"],  # Can create entries
    "checker": ["CFO", "Co-Founder"],  # Can approve entries
}

# Self-approval prevention
SELF_APPROVAL_ALLOWED = False

# BANK INTEGRATION
# Mercury Bank integration enabled for automatic transaction sync
BANK_SYNC_ENABLED = True
BANK_SYNC_FREQUENCY = "daily"  # daily, weekly, manual
BANK_AUTO_IMPORT = True

# PERIOD CLOSE SETTINGS
# Manual lock for closed periods (CFO or Co-Founder only)
PERIOD_LOCK_TYPE = "manual"  # vs "automatic"
PERIOD_LOCK_ROLES = ["CFO", "Co-Founder"]

# Prevent posting to locked periods
ALLOW_POSTING_TO_LOCKED_PERIODS = False

# MULTI-CURRENCY (Future)
# Disabled for v1 - USD only
MULTI_CURRENCY_ENABLED = False
BASE_CURRENCY = "USD"

# REVENUE RECOGNITION
# ASC 606 compliance enabled
REVENUE_RECOGNITION_METHOD = "asc_606"  # vs "cash", "completed_contract"

# INVENTORY COSTING (Future)
# N/A for services company in v1
INVENTORY_COSTING_METHOD = None  # FIFO, LIFO, Weighted Average

# DEPRECIATION
# Straight-line method for all fixed assets
DEPRECIATION_METHOD = "straight_line"

# AUDIT TRAIL
# Full audit trail enabled for Big 4 auditor requirements
AUDIT_TRAIL_ENABLED = True
IMMUTABLE_POSTED_ENTRIES = True  # Posted entries cannot be edited, only reversed

# DOCUMENT RETENTION
# 7 years for all accounting documents (IRS requirement)
DOCUMENT_RETENTION_YEARS = 7

# REPORTING PERIODS
# Monthly, Quarterly, Annual
REPORTING_PERIODS = ["monthly", "quarterly", "annual"]
DEFAULT_REPORTING_PERIOD = "monthly"


def get_fiscal_year_start(year: int) -> date:
    """Get fiscal year start date for a given year"""
    return date(year, FISCAL_YEAR_START_MONTH, FISCAL_YEAR_START_DAY)


def get_fiscal_year_end(year: int) -> date:
    """Get fiscal year end date for a given year"""
    return date(year, FISCAL_YEAR_END_MONTH, FISCAL_YEAR_END_DAY)


def requires_dual_approval(amount: Decimal) -> bool:
    """Check if transaction requires dual approval"""
    return DUAL_APPROVAL_ENABLED and abs(amount) >= DUAL_APPROVAL_THRESHOLD


def can_post_to_period(period_locked: bool, user_role: str) -> bool:
    """Check if user can post to a period"""
    if not period_locked:
        return True
    
    if ALLOW_POSTING_TO_LOCKED_PERIODS and user_role in PERIOD_LOCK_ROLES:
        return True
    
    return False


