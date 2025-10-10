#!/usr/bin/env python3
"""
Check the status of the latest uploaded document
"""

import sqlite3

def check_document_status():
    conn = sqlite3.connect('data/ngi_capital.db')
    cursor = conn.cursor()

    print('=== LATEST DOCUMENT ===')
    cursor.execute('SELECT id, filename, category, document_type, processing_status, extracted_data FROM accounting_documents WHERE id = 14')
    doc = cursor.fetchone()
    if doc:
        print(f'ID: {doc[0]}, File: {doc[1]}, Category: {doc[2]}, Type: {doc[3]}, Status: {doc[4]}')
        extracted_data = doc[5][:500] if doc[5] else 'None'
        print(f'Extracted data: {extracted_data}...')

    print('\n=== LATEST JOURNAL ENTRIES ===')
    cursor.execute('SELECT id, entry_number, status, memo, source_id FROM journal_entries WHERE source_id = "14" ORDER BY id DESC LIMIT 5')
    jes = cursor.fetchall()
    for je in jes:
        print(f'ID: {je[0]}, Entry: {je[1]}, Status: {je[2]}, Memo: {je[3]}, Source: {je[4]}')

    print('\n=== ALL DOCUMENTS STATUS ===')
    cursor.execute('SELECT id, filename, processing_status FROM accounting_documents ORDER BY id DESC LIMIT 10')
    docs = cursor.fetchall()
    for doc in docs:
        print(f'ID: {doc[0]}, File: {doc[1]}, Status: {doc[2]}')

    conn.close()

if __name__ == "__main__":
    check_document_status()
