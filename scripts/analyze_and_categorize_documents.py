#!/usr/bin/env python3
"""
Analyze uploaded NGI Capital LLC documents
Categorize properly, identify duplicates, extract business intelligence
"""

import sqlite3
import os
from pathlib import Path

def analyze_documents():
    conn = sqlite3.connect('data/ngi_capital.db')
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, filename, file_size_bytes, category, processing_status, file_path
        FROM accounting_documents 
        WHERE is_archived = 0 
        ORDER BY id
    """)
    docs = cursor.fetchall()
    
    print("=" * 120)
    print("NGI CAPITAL LLC - DOCUMENT ANALYSIS")
    print("=" * 120)
    print()
    
    # Categorize documents
    formation_docs = []
    legal_docs = []
    banking_docs = []
    internal_controls = []
    invoices = []
    tax_docs = []
    accounting_policies = []
    
    duplicates = {}
    
    for doc_id, filename, size, category, status, filepath in docs:
        print(f"ID {doc_id}: {filename}")
        print(f"  Size: {size:,} bytes ({size/1024:.1f} KB)")
        print(f"  Current Category: {category}")
        print(f"  Status: {status}")
        
        # Categorize based on filename
        fname_lower = filename.lower()
        suggested_category = category
        doc_type = "General"
        
        if 'internal_control' in fname_lower or 'internal control' in fname_lower:
            suggested_category = 'internal_controls'
            doc_type = "Internal Controls"
            internal_controls.append((doc_id, filename))
        elif 'accounting_polic' in fname_lower or 'accounting polic' in fname_lower:
            suggested_category = 'accounting_policies'
            doc_type = "Accounting Policies"
            accounting_policies.append((doc_id, filename))
        elif 'operating_agreement' in fname_lower or 'operating agreement' in fname_lower:
            suggested_category = 'formation'
            doc_type = "Formation - Operating Agreement"
            formation_docs.append((doc_id, filename))
        elif 'formation' in fname_lower or 'articles' in fname_lower:
            suggested_category = 'formation'
            doc_type = "Formation Document"
            formation_docs.append((doc_id, filename))
        elif 'ein' in fname_lower:
            suggested_category = 'tax'
            doc_type = "Tax - EIN"
            tax_docs.append((doc_id, filename))
        elif 'bank' in fname_lower or 'resolution' in fname_lower:
            suggested_category = 'banking'
            doc_type = "Banking Document"
            banking_docs.append((doc_id, filename))
        elif 'invoice' in fname_lower:
            suggested_category = 'receipts'
            doc_type = "Invoice/Receipt"
            invoices.append((doc_id, filename))
        elif 'domain' in fname_lower:
            suggested_category = 'legal'
            doc_type = "Legal - Domain"
            legal_docs.append((doc_id, filename))
        
        print(f"  Suggested: {suggested_category} ({doc_type})")
        
        # Check for duplicates
        base_name = filename.replace('NGI_Capital_LLC_Internal_Controls_Manual.xps.pdf', 'INTERNAL_CONTROLS')
        if base_name in duplicates:
            duplicates[base_name].append(doc_id)
            print(f"  >>> DUPLICATE DETECTED (IDs: {duplicates[base_name]})")
        else:
            duplicates[base_name] = [doc_id]
        
        print()
    
    print("=" * 120)
    print("SUMMARY BY CATEGORY")
    print("=" * 120)
    print(f"Formation Documents: {len(formation_docs)}")
    for doc_id, fname in formation_docs:
        print(f"  - ID {doc_id}: {fname}")
    
    print(f"\nInternal Controls: {len(internal_controls)}")
    for doc_id, fname in internal_controls:
        print(f"  - ID {doc_id}: {fname}")
    
    print(f"\nAccounting Policies: {len(accounting_policies)}")
    for doc_id, fname in accounting_policies:
        print(f"  - ID {doc_id}: {fname}")
    
    print(f"\nBanking Documents: {len(banking_docs)}")
    for doc_id, fname in banking_docs:
        print(f"  - ID {doc_id}: {fname}")
    
    print(f"\nTax Documents: {len(tax_docs)}")
    for doc_id, fname in tax_docs:
        print(f"  - ID {doc_id}: {fname}")
    
    print(f"\nInvoices/Receipts: {len(invoices)}")
    for doc_id, fname in invoices:
        print(f"  - ID {doc_id}: {fname}")
    
    print(f"\nLegal Documents: {len(legal_docs)}")
    for doc_id, fname in legal_docs:
        print(f"  - ID {doc_id}: {fname}")
    
    print()
    print("=" * 120)
    print("DUPLICATES FOUND")
    print("=" * 120)
    for base, ids in duplicates.items():
        if len(ids) > 1:
            print(f"{base}: Document IDs {ids} - KEEP NEWEST, DELETE OTHERS")
    
    print()
    print("=" * 120)
    print("RECOMMENDED ACTIONS")
    print("=" * 120)
    print("1. Delete duplicate internal controls document")
    print("2. Update categories for all documents")
    print("3. Use this data to create test fixtures")
    print("4. Build comprehensive tests based on actual workflows")
    
    conn.close()

if __name__ == "__main__":
    analyze_documents()
"""
Analyze uploaded NGI Capital LLC documents
Categorize properly, identify duplicates, extract business intelligence
"""

import sqlite3
import os
from pathlib import Path

def analyze_documents():
    conn = sqlite3.connect('data/ngi_capital.db')
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, filename, file_size_bytes, category, processing_status, file_path
        FROM accounting_documents 
        WHERE is_archived = 0 
        ORDER BY id
    """)
    docs = cursor.fetchall()
    
    print("=" * 120)
    print("NGI CAPITAL LLC - DOCUMENT ANALYSIS")
    print("=" * 120)
    print()
    
    # Categorize documents
    formation_docs = []
    legal_docs = []
    banking_docs = []
    internal_controls = []
    invoices = []
    tax_docs = []
    accounting_policies = []
    
    duplicates = {}
    
    for doc_id, filename, size, category, status, filepath in docs:
        print(f"ID {doc_id}: {filename}")
        print(f"  Size: {size:,} bytes ({size/1024:.1f} KB)")
        print(f"  Current Category: {category}")
        print(f"  Status: {status}")
        
        # Categorize based on filename
        fname_lower = filename.lower()
        suggested_category = category
        doc_type = "General"
        
        if 'internal_control' in fname_lower or 'internal control' in fname_lower:
            suggested_category = 'internal_controls'
            doc_type = "Internal Controls"
            internal_controls.append((doc_id, filename))
        elif 'accounting_polic' in fname_lower or 'accounting polic' in fname_lower:
            suggested_category = 'accounting_policies'
            doc_type = "Accounting Policies"
            accounting_policies.append((doc_id, filename))
        elif 'operating_agreement' in fname_lower or 'operating agreement' in fname_lower:
            suggested_category = 'formation'
            doc_type = "Formation - Operating Agreement"
            formation_docs.append((doc_id, filename))
        elif 'formation' in fname_lower or 'articles' in fname_lower:
            suggested_category = 'formation'
            doc_type = "Formation Document"
            formation_docs.append((doc_id, filename))
        elif 'ein' in fname_lower:
            suggested_category = 'tax'
            doc_type = "Tax - EIN"
            tax_docs.append((doc_id, filename))
        elif 'bank' in fname_lower or 'resolution' in fname_lower:
            suggested_category = 'banking'
            doc_type = "Banking Document"
            banking_docs.append((doc_id, filename))
        elif 'invoice' in fname_lower:
            suggested_category = 'receipts'
            doc_type = "Invoice/Receipt"
            invoices.append((doc_id, filename))
        elif 'domain' in fname_lower:
            suggested_category = 'legal'
            doc_type = "Legal - Domain"
            legal_docs.append((doc_id, filename))
        
        print(f"  Suggested: {suggested_category} ({doc_type})")
        
        # Check for duplicates
        base_name = filename.replace('NGI_Capital_LLC_Internal_Controls_Manual.xps.pdf', 'INTERNAL_CONTROLS')
        if base_name in duplicates:
            duplicates[base_name].append(doc_id)
            print(f"  >>> DUPLICATE DETECTED (IDs: {duplicates[base_name]})")
        else:
            duplicates[base_name] = [doc_id]
        
        print()
    
    print("=" * 120)
    print("SUMMARY BY CATEGORY")
    print("=" * 120)
    print(f"Formation Documents: {len(formation_docs)}")
    for doc_id, fname in formation_docs:
        print(f"  - ID {doc_id}: {fname}")
    
    print(f"\nInternal Controls: {len(internal_controls)}")
    for doc_id, fname in internal_controls:
        print(f"  - ID {doc_id}: {fname}")
    
    print(f"\nAccounting Policies: {len(accounting_policies)}")
    for doc_id, fname in accounting_policies:
        print(f"  - ID {doc_id}: {fname}")
    
    print(f"\nBanking Documents: {len(banking_docs)}")
    for doc_id, fname in banking_docs:
        print(f"  - ID {doc_id}: {fname}")
    
    print(f"\nTax Documents: {len(tax_docs)}")
    for doc_id, fname in tax_docs:
        print(f"  - ID {doc_id}: {fname}")
    
    print(f"\nInvoices/Receipts: {len(invoices)}")
    for doc_id, fname in invoices:
        print(f"  - ID {doc_id}: {fname}")
    
    print(f"\nLegal Documents: {len(legal_docs)}")
    for doc_id, fname in legal_docs:
        print(f"  - ID {doc_id}: {fname}")
    
    print()
    print("=" * 120)
    print("DUPLICATES FOUND")
    print("=" * 120)
    for base, ids in duplicates.items():
        if len(ids) > 1:
            print(f"{base}: Document IDs {ids} - KEEP NEWEST, DELETE OTHERS")
    
    print()
    print("=" * 120)
    print("RECOMMENDED ACTIONS")
    print("=" * 120)
    print("1. Delete duplicate internal controls document")
    print("2. Update categories for all documents")
    print("3. Use this data to create test fixtures")
    print("4. Build comprehensive tests based on actual workflows")
    
    conn.close()

if __name__ == "__main__":
    analyze_documents()








