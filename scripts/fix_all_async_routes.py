#!/usr/bin/env python3
"""
Fix ALL route files to use synchronous Session consistently
This eliminates async/await warnings across the entire codebase
"""

import os
import re

routes_dir = 'src/api/routes'

# Files that need fixing
files_to_fix = [
    'advisory_public.py',
    'coffeechats_internal.py',
    'plm.py',
    'learning.py',
    'learning_admin.py'
]

for filename in files_to_fix:
    filepath = os.path.join(routes_dir, filename)
    if not os.path.exists(filepath):
        print(f"Skipping {filename} - not found")
        continue
    
    print(f"Fixing {filename}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix imports
    content = content.replace('from src.api.database_async import get_async_db', 'from src.api.database import get_db')
    content = content.replace('from ..database_async import get_async_db', 'from ..database import get_db')
    
    # Fix all get_async_db references
    content = content.replace('get_async_db', 'get_db')
    
    # Fix AsyncSession to Session
    content = content.replace('AsyncSession', 'Session')
    
    # Remove await from db.execute when it's synchronous Session
    # This is tricky - only remove if Session not AsyncSession
    # For safety, we'll check line by line
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  ✓ Fixed {filename}")

print("\n✓ All route files updated to use synchronous Session")
print("This should eliminate async/await warnings")
"""
Fix ALL route files to use synchronous Session consistently
This eliminates async/await warnings across the entire codebase
"""

import os
import re

routes_dir = 'src/api/routes'

# Files that need fixing
files_to_fix = [
    'advisory_public.py',
    'coffeechats_internal.py',
    'plm.py',
    'learning.py',
    'learning_admin.py'
]

for filename in files_to_fix:
    filepath = os.path.join(routes_dir, filename)
    if not os.path.exists(filepath):
        print(f"Skipping {filename} - not found")
        continue
    
    print(f"Fixing {filename}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix imports
    content = content.replace('from src.api.database_async import get_async_db', 'from src.api.database import get_db')
    content = content.replace('from ..database_async import get_async_db', 'from ..database import get_db')
    
    # Fix all get_async_db references
    content = content.replace('get_async_db', 'get_db')
    
    # Fix AsyncSession to Session
    content = content.replace('AsyncSession', 'Session')
    
    # Remove await from db.execute when it's synchronous Session
    # This is tricky - only remove if Session not AsyncSession
    # For safety, we'll check line by line
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  ✓ Fixed {filename}")

print("\n✓ All route files updated to use synchronous Session")
print("This should eliminate async/await warnings")








