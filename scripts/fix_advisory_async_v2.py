#!/usr/bin/env python3
"""
Fix all missing await statements in advisory.py - careful version
"""

import re

with open('src/api/routes/advisory.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

fixed_lines = []
for line in lines:
    # Only add await if not already there
    if 'db.execute(' in line and 'await' not in line and 'await db.execute' not in line:
        line = line.replace('db.execute(', 'await db.execute(')
    if 'db.commit()' in line and 'await' not in line and 'await db.commit' not in line:
        line = line.replace('db.commit()', 'await db.commit()')
    fixed_lines.append(line)

with open('src/api/routes/advisory.py', 'w', encoding='utf-8') as f:
    f.writelines(fixed_lines)

print("Fixed async/await in advisory.py (careful version)")
"""
Fix all missing await statements in advisory.py - careful version
"""

import re

with open('src/api/routes/advisory.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

fixed_lines = []
for line in lines:
    # Only add await if not already there
    if 'db.execute(' in line and 'await' not in line and 'await db.execute' not in line:
        line = line.replace('db.execute(', 'await db.execute(')
    if 'db.commit()' in line and 'await' not in line and 'await db.commit' not in line:
        line = line.replace('db.commit()', 'await db.commit()')
    fixed_lines.append(line)

with open('src/api/routes/advisory.py', 'w', encoding='utf-8') as f:
    f.writelines(fixed_lines)

print("Fixed async/await in advisory.py (careful version)")








