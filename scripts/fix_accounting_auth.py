"""
Quick script to remove auth dependencies from all accounting routes for dev mode
"""
import re
from pathlib import Path

accounting_routes = Path("src/api/routes")

files_to_fix = [
    "accounting_coa.py",
    "accounting_documents.py",
    "accounting_journal_entries.py",
    "accounting_bank_reconciliation.py",
    "accounting_financial_reporting.py",
    "accounting_internal_controls.py",
    "accounting_entity_conversion.py",
    "accounting_consolidated_reporting.py",
    "accounting_period_close.py",
]

for filename in files_to_fix:
    filepath = accounting_routes / filename
    if not filepath.exists():
        continue
    
    content = filepath.read_text()
    
    # Remove import of get_current_partner
    content = re.sub(r'from \.\.auth import.*get_current_partner.*\n', '', content)
    content = re.sub(r'from \.\.models import Partners as Partner\n', '', content)
    
    # Remove current_user parameter from all async def functions
    content = re.sub(
        r',\s*current_user:\s*Partner\s*=\s*Depends\(get_current_partner\)',
        '',
        content
    )
    content = re.sub(
        r',\s*current_user:\s*dict\s*=\s*Depends\(get_current_user\)',
        '',
        content
    )
    
    # Write back
    filepath.write_text(content)
    print(f"Fixed {filename}")

print("\nAll accounting routes updated - auth removed for dev mode")




