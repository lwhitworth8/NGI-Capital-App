#!/usr/bin/env python3
"""
Fix advisory_public.py to use synchronous Session
"""

with open('src/api/routes/advisory_public.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Change imports
content = content.replace('from src.api.database_async import get_async_db', 'from src.api.database import get_db')

# Change all get_async_db to get_db
content = content.replace('get_async_db', 'get_db')

# Change AsyncSession to Session
content = content.replace('AsyncSession', 'Session')

with open('src/api/routes/advisory_public.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed advisory_public.py to use synchronous Session")
"""
Fix advisory_public.py to use synchronous Session
"""

with open('src/api/routes/advisory_public.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Change imports
content = content.replace('from src.api.database_async import get_async_db', 'from src.api.database import get_db')

# Change all get_async_db to get_db
content = content.replace('get_async_db', 'get_db')

# Change AsyncSession to Session
content = content.replace('AsyncSession', 'Session')

with open('src/api/routes/advisory_public.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed advisory_public.py to use synchronous Session")








