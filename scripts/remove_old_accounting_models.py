"""
Remove old accounting models from models.py
"""
import re

# Read the models.py file
with open('src/api/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Classes to remove (these conflict with new accounting module)
classes_to_remove = [
    'ChartOfAccounts',
    'JournalEntries',
    'JournalEntryLines',
    'BankAccounts',
    'BankTransactions'
]

# For each class, find and remove it
for class_name in classes_to_remove:
    # Pattern to match the class definition and all its content until the next class or end
    pattern = rf'class {class_name}\(Base\):.*?(?=\n\nclass |\nclass |\Z)'
    
    # Replace with a deprecation comment
    replacement = f'# DEPRECATED: {class_name} - Use models_accounting.py instead\n'
    
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write the updated content back
with open('src/api/models.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully removed old accounting models from models.py")
for class_name in classes_to_remove:
    print(f"  - {class_name}")


