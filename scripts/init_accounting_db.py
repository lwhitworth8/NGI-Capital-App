"""
Initialize accounting database from scratch
"""
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from services.api.database import Base
from services.api import models
from services.api import models_accounting
from services.api import models_accounting_part2
from services.api import models_accounting_part3

# Remove old database if exists
if os.path.exists('ngi_capital.db'):
    os.remove('ngi_capital.db')
    print("[OK] Removed old database")

# Create new database
engine = create_engine('sqlite:///./ngi_capital.db', echo=True)
Base.metadata.create_all(engine)

print("[OK] Created all accounting tables")
print(f"Total tables: {len(Base.metadata.tables)}")
print("Tables created:")
for table in Base.metadata.tables:
    print(f"  - {table}")

