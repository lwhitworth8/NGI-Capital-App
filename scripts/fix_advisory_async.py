#!/usr/bin/env python3
"""
Fix all missing await statements in advisory.py
"""

import re

with open('src/api/routes/advisory.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix db.execute( -> await db.execute(
content = re.sub(r'(\s+)db\.execute\(', r'\1await db.execute(', content)

# Fix db.commit() -> await db.commit()
content = re.sub(r'(\s+)db\.commit\(\)', r'\1await db.commit()', content)

with open('src/api/routes/advisory.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed all async/await issues in advisory.py")
print("Added 'await' to all db.execute() and db.commit() calls")
"""
Fix all missing await statements in advisory.py
"""

import re

with open('src/api/routes/advisory.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix db.execute( -> await db.execute(
content = re.sub(r'(\s+)db\.execute\(', r'\1await db.execute(', content)

# Fix db.commit() -> await db.commit()
content = re.sub(r'(\s+)db\.commit\(\)', r'\1await db.commit()', content)

with open('src/api/routes/advisory.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed all async/await issues in advisory.py")
print("Added 'await' to all db.execute() and db.commit() calls")








