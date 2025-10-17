"""
Re-categorize all documents using content-based categorization
This script uses the extracted text and data to intelligently categorize documents
instead of relying on filename patterns.
"""
import asyncio
import sys
import os
sys.path.insert(0, '/app')

from sqlalchemy import select
from services.api.database_async import get_async_session_factory
from services.api.models_accounting_part2 import AccountingDocument
from services.api.routes.accounting_documents import categorize_from_content, generate_file_path
import shutil
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def recategorize_all_documents():
    """
    Re-categorize all documents using content-based categorization

    This script:
    1. Fetches all documents with extracted_data
    2. Uses categorize_from_content() to determine correct category
    3. Updates document category in database
    4. Moves files to correct directory structure
    """
    session_factory = get_async_session_factory()

    async with session_factory() as db:
        # Get all documents that have been extracted
        result = await db.execute(
            select(AccountingDocument)
            .where(AccountingDocument.processing_status == "extracted")
            .order_by(AccountingDocument.id)
        )
        documents = result.scalars().all()

        print(f"\n{'='*100}")
        print(f"Found {len(documents)} extracted documents to recategorize")
        print(f"{'='*100}\n")

        updated_count = 0
        unchanged_count = 0
        error_count = 0

        category_changes = {}  # Track old -> new category changes

        for doc in documents:
            try:
                # Get extracted data
                full_text = doc.searchable_text or ""
                extracted_data = doc.extracted_data or {}

                if not full_text:
                    logger.warning(f"Document {doc.id} has no extracted text, skipping")
                    continue

                # Determine correct category from content
                new_category = categorize_from_content(
                    full_text=full_text,
                    extracted_data=extracted_data,
                    filename=doc.filename
                )

                old_category = doc.category

                if new_category != old_category:
                    print(f"\n📝 ID {doc.id}: {doc.filename[:60]}")
                    print(f"   OLD: {old_category} -> NEW: {new_category}")

                    # Update category
                    doc.category = new_category
                    doc.document_type = new_category

                    # Track changes
                    change_key = f"{old_category} -> {new_category}"
                    category_changes[change_key] = category_changes.get(change_key, 0) + 1

                    # Move file to correct location
                    old_file_path = doc.file_path
                    new_file_path = generate_file_path(doc.entity_id, new_category, doc.filename)

                    # Create new directory
                    new_dir = os.path.dirname(new_file_path)
                    os.makedirs(new_dir, exist_ok=True)

                    # Move file if it exists and paths are different
                    if old_file_path != new_file_path:
                        if os.path.exists(old_file_path):
                            try:
                                shutil.move(old_file_path, new_file_path)
                                doc.file_path = new_file_path
                                print(f"   ✓ Moved file to: {new_file_path}")
                            except Exception as move_error:
                                logger.error(f"   ✗ Error moving file: {move_error}")
                                # Still update category even if file move fails
                        else:
                            logger.warning(f"   ⚠ Old file not found: {old_file_path}")
                            doc.file_path = new_file_path

                    updated_count += 1
                else:
                    unchanged_count += 1

            except Exception as e:
                logger.error(f"Error processing document {doc.id}: {e}")
                error_count += 1
                continue

        # Commit all changes
        if updated_count > 0:
            await db.commit()
            print(f"\n{'='*100}")
            print(f"✅ Successfully updated {updated_count} documents")
            print(f"✓ {unchanged_count} documents already have correct categories")
            if error_count > 0:
                print(f"✗ {error_count} documents had errors")
            print(f"{'='*100}\n")

            # Show category change summary
            print("\nCategory Changes Summary:")
            print(f"{'='*100}")
            for change, count in sorted(category_changes.items(), key=lambda x: x[1], reverse=True):
                print(f"  {change}: {count} documents")
            print(f"{'='*100}\n")

        else:
            print(f"\n✓ All {unchanged_count} documents already have correct categories\n")

        # Show final category breakdown
        result = await db.execute(
            select(AccountingDocument.category)
            .where(AccountingDocument.processing_status == "extracted")
        )
        all_docs = result.scalars().all()

        from collections import Counter
        category_counts = Counter(all_docs)

        print("\nFinal Category Breakdown:")
        print(f"{'='*100}")
        for category, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"  {category}: {count}")
        print(f"{'='*100}\n")


async def show_categorization_preview():
    """
    Show what changes would be made without actually making them
    """
    session_factory = get_async_session_factory()

    async with session_factory() as db:
        # Get all documents
        result = await db.execute(
            select(AccountingDocument)
            .where(AccountingDocument.processing_status == "extracted")
            .order_by(AccountingDocument.id)
        )
        documents = result.scalars().all()

        print(f"\n{'='*100}")
        print(f"PREVIEW: Checking {len(documents)} documents")
        print(f"{'='*100}\n")

        changes = []

        for doc in documents:
            full_text = doc.searchable_text or ""
            extracted_data = doc.extracted_data or {}

            if not full_text:
                continue

            new_category = categorize_from_content(
                full_text=full_text,
                extracted_data=extracted_data,
                filename=doc.filename
            )

            if new_category != doc.category:
                changes.append({
                    "id": doc.id,
                    "filename": doc.filename,
                    "old": doc.category,
                    "new": new_category
                })

        if changes:
            print(f"Found {len(changes)} documents that would be recategorized:\n")
            for change in changes[:20]:  # Show first 20
                print(f"ID {change['id']}: {change['filename'][:50]}")
                print(f"  {change['old']} -> {change['new']}\n")

            if len(changes) > 20:
                print(f"... and {len(changes) - 20} more\n")

            print(f"Total changes: {len(changes)}")
        else:
            print("No documents need recategorization")

        print(f"\n{'='*100}\n")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Re-categorize documents using content analysis")
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Preview changes without applying them"
    )
    args = parser.parse_args()

    if args.preview:
        print("\n🔍 PREVIEW MODE - No changes will be made\n")
        asyncio.run(show_categorization_preview())
    else:
        print("\n🚀 RUNNING RECATEGORIZATION\n")
        asyncio.run(recategorize_all_documents())
