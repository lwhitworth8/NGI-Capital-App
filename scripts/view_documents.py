"""Script to view uploaded NGI Capital documents"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.api.database_async import get_async_session_factory
from services.api.models_accounting_part2 import AccountingDocument
from sqlalchemy import select


async def view_documents():
    """View all uploaded documents"""
    session_factory = get_async_session_factory()
    async with session_factory() as db:
        result = await db.execute(
            select(AccountingDocument).limit(20)
        )
        docs = result.scalars().all()

        print(f"\n{'='*80}")
        print(f"Found {len(docs)} documents in database:")
        print(f"{'='*80}\n")

        for i, doc in enumerate(docs, 1):
            print(f"{i}. Document ID: {doc.id}")
            print(f"   Filename: {doc.filename}")
            print(f"   Category: {doc.category}")
            print(f"   Document Type: {doc.document_type}")
            print(f"   File Path: {doc.file_path}")
            print(f"   File Size: {doc.file_size_bytes} bytes")
            print(f"   Entity ID: {doc.entity_id}")
            print(f"   Processing Status: {doc.processing_status}")
            print(f"   Uploaded: {doc.created_at}")

            # Check if file exists
            if os.path.exists(doc.file_path):
                print(f"   ✓ File exists on disk")
            else:
                # Try alternative paths
                alt_path = doc.file_path.replace('./', '')
                if os.path.exists(alt_path):
                    print(f"   ✓ File exists at: {alt_path}")
                else:
                    print(f"   ✗ File not found")

            print()


if __name__ == "__main__":
    asyncio.run(view_documents())
