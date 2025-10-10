#!/usr/bin/env python3
"""
Check extraction data from documents
"""

import sqlite3
import json

def check_extraction_data():
    conn = sqlite3.connect('data/ngi_capital.db')
    cursor = conn.cursor()

    print('=== CHECKING FOR DOCUMENT 13 ===')
    cursor.execute('SELECT id, filename, processing_status, extracted_data FROM accounting_documents WHERE id = 13')
    doc = cursor.fetchone()
    if doc:
        print(f'ID: {doc[0]}, File: {doc[1]}, Status: {doc[2]}')
        if doc[3]:
            print(f'Extracted data: {doc[3][:200]}...')
        else:
            print('No extracted data')
    else:
        print('Document 13 not found')

    print('\n=== SAMPLE EXTRACTED DATA FROM DOCUMENT 1 ===')
    cursor.execute('SELECT extracted_data FROM accounting_documents WHERE id = 1')
    result = cursor.fetchone()
    if result and result[0]:
        try:
            data = json.loads(result[0])
            print(f'Document type: {data.get("document_type", "Unknown")}')
            print(f'Vendor name: {data.get("vendor_name", "Unknown")}')
            print(f'Amounts: {data.get("amounts", "None")}')
            print(f'Confidence: {data.get("confidence", "Unknown")}')
            print(f'Error: {data.get("error", "None")}')
        except:
            print(f'Raw data: {result[0][:200]}...')
    else:
        print('No extracted data found')

    print('\n=== ALL DOCUMENT IDS ===')
    cursor.execute('SELECT id, filename FROM accounting_documents ORDER BY id')
    docs = cursor.fetchall()
    for doc in docs:
        print(f'ID: {doc[0]}, File: {doc[1]}')

    conn.close()

if __name__ == "__main__":
    check_extraction_data()
