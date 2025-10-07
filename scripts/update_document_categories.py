#!/usr/bin/env python3
"""
Update document categories based on analysis
"""

import sqlite3

def update_categories():
    conn = sqlite3.connect('data/ngi_capital.db')
    cursor = conn.cursor()
    
    # Category mappings based on analysis
    updates = [
        (2, 'internal_controls', 'Internal Controls Manual'),
        (3, 'formation', 'Operating Agreement'),
        (4, 'bank_statements', 'Bank Account Resolution'),
        (5, 'other', 'Accounting Policies Manual'),  # Keep as other, specialized
        (6, 'other', 'Documented Accounting Policies'),  # Keep as other
        (7, 'formation', 'Delaware Formation Document'),
        (8, 'receipts', 'Invoice'),
        (9, 'receipts', 'Invoice'),
        (10, 'tax', 'EIN Document'),
        (11, 'other', 'Domain Registration'),  # Keep as other
        (12, 'receipts', 'Invoice'),
        (13, 'receipts', 'Invoice'),
        (14, 'receipts', 'Invoice'),
    ]
    
    print("Updating document categories...")
    for doc_id, category, doc_type in updates:
        cursor.execute(
            "UPDATE accounting_documents SET category = ?, document_type = ? WHERE id = ?",
            (category, doc_type, doc_id)
        )
        print(f"  ID {doc_id}: {category} ({doc_type})")
    
    conn.commit()
    print(f"\nUpdated {len(updates)} documents")
    
    # Verify
    cursor.execute("""
        SELECT category, COUNT(*) 
        FROM accounting_documents 
        WHERE is_archived = 0 
        GROUP BY category
    """)
    
    print("\nDocument count by category:")
    for cat, count in cursor.fetchall():
        print(f"  {cat}: {count}")
    
    conn.close()

if __name__ == "__main__":
    update_categories()
"""
Update document categories based on analysis
"""

import sqlite3

def update_categories():
    conn = sqlite3.connect('data/ngi_capital.db')
    cursor = conn.cursor()
    
    # Category mappings based on analysis
    updates = [
        (2, 'internal_controls', 'Internal Controls Manual'),
        (3, 'formation', 'Operating Agreement'),
        (4, 'bank_statements', 'Bank Account Resolution'),
        (5, 'other', 'Accounting Policies Manual'),  # Keep as other, specialized
        (6, 'other', 'Documented Accounting Policies'),  # Keep as other
        (7, 'formation', 'Delaware Formation Document'),
        (8, 'receipts', 'Invoice'),
        (9, 'receipts', 'Invoice'),
        (10, 'tax', 'EIN Document'),
        (11, 'other', 'Domain Registration'),  # Keep as other
        (12, 'receipts', 'Invoice'),
        (13, 'receipts', 'Invoice'),
        (14, 'receipts', 'Invoice'),
    ]
    
    print("Updating document categories...")
    for doc_id, category, doc_type in updates:
        cursor.execute(
            "UPDATE accounting_documents SET category = ?, document_type = ? WHERE id = ?",
            (category, doc_type, doc_id)
        )
        print(f"  ID {doc_id}: {category} ({doc_type})")
    
    conn.commit()
    print(f"\nUpdated {len(updates)} documents")
    
    # Verify
    cursor.execute("""
        SELECT category, COUNT(*) 
        FROM accounting_documents 
        WHERE is_archived = 0 
        GROUP BY category
    """)
    
    print("\nDocument count by category:")
    for cat, count in cursor.fetchall():
        print(f"  {cat}: {count}")
    
    conn.close()

if __name__ == "__main__":
    update_categories()








