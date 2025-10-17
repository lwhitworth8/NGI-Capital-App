"""
Fix document categories for documents that were uploaded before the categorization fix
"""
import asyncio
import sys
sys.path.insert(0, '/app')

from sqlalchemy import select, update
from services.api.database_async import get_async_session_factory
from services.api.models_accounting_part2 import AccountingDocument
from services.api.routes.accounting_documents import auto_detect_category


async def fix_categories():
    """Re-categorize all documents using the updated categorization logic"""
    session_factory = get_async_session_factory()

    async with session_factory() as db:
        # Get all documents
        result = await db.execute(
            select(AccountingDocument).order_by(AccountingDocument.id)
        )
        documents = result.scalars().all()

        print(f"\nFound {len(documents)} documents to check")
        print("="*100)

        updated_count = 0

        for doc in documents:
            # Re-categorize based on filename
            new_category = auto_detect_category(doc.filename)

            if new_category != doc.category:
                print(f"\n📝 ID {doc.id}: {doc.filename[:60]}")
                print(f"   OLD: {doc.category} -> NEW: {new_category}")

                # Update the document
                doc.category = new_category
                doc.document_type = new_category
                updated_count += 1

        if updated_count > 0:
            await db.commit()
            print(f"\n✅ Updated {updated_count} documents")
        else:
            print(f"\n✓ All documents already have correct categories")

        # Show final category breakdown
        result = await db.execute(
            select(AccountingDocument.category).order_by(AccountingDocument.id)
        )
        all_docs = result.scalars().all()

        from collections import Counter
        category_counts = Counter(all_docs)

        print("\n\nFinal Category Breakdown:")
        print("="*100)
        for category, count in sorted(category_counts.items()):
            print(f"  {category}: {count}")


if __name__ == "__main__":
    asyncio.run(fix_categories())
