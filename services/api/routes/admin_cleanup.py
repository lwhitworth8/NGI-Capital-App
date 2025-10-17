"""
Admin Cleanup Endpoints
FOR INTERNAL USE ONLY - Maintenance and cleanup operations
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from typing import Dict
import logging

from ..database_async import get_async_db
from ..models_accounting_part2 import AccountingDocument
# Removed intelligent JE imports pending redesign

router = APIRouter(prefix="/api/admin/cleanup", tags=["Admin - Cleanup"])
logger = logging.getLogger(__name__)


@router.post("/delete-all-journal-entries")
async def delete_all_journal_entries(
    confirm: str,
    db: AsyncSession = Depends(get_async_db)
) -> Dict:
    """
    âš ï¸  DANGER: Delete ALL journal entries from the system

    This is used to clean up old entries before deploying the refactored system.
    Requires confirmation string "DELETE_ALL_JES" to execute.
    """

    if confirm != "DELETE_ALL_JES":
        raise HTTPException(
            status_code=400,
            detail="Confirmation required. Pass confirm='DELETE_ALL_JES' to execute."
        )

    try:
        # Count before deletion
        je_count_result = await db.execute(text("SELECT COUNT(*) FROM journal_entries"))
        je_count = je_count_result.scalar()

        jel_count_result = await db.execute(text("SELECT COUNT(*) FROM journal_entry_lines"))
        jel_count = jel_count_result.scalar()

        logger.info(f"Deleting {je_count} journal entries and {jel_count} lines")

        # Delete in correct order due to foreign keys
        # 1. Agent validations
        try:
            await db.execute(text("DELETE FROM agent_validations"))
            logger.info("Deleted agent_validations")
        except Exception as e:
            logger.info(f"No agent_validations table: {e}")

        # 2. Audit log
        await db.execute(text("DELETE FROM journal_entry_audit_log"))
        logger.info("Deleted journal_entry_audit_log")

        # 3. Journal entry lines
        await db.execute(text("DELETE FROM journal_entry_lines"))
        logger.info("Deleted journal_entry_lines")

        # 4. Bank transaction matches
        try:
            await db.execute(text("DELETE FROM bank_transaction_matches"))
            logger.info("Deleted bank_transaction_matches")
        except Exception as e:
            logger.info(f"No bank_transaction_matches: {e}")

        # 5. Journal entries
        await db.execute(text("DELETE FROM journal_entries"))
        logger.info("Deleted journal_entries")

        # 6. Reset document processing status
        await db.execute(text("""
            UPDATE accounting_documents
            SET processing_status = 'extracted',
                workflow_status = 'pending'
            WHERE processing_status IN ('journal_entries_created', 'journal_creation_failed', 'journal_entry_created')
        """))
        logger.info("Reset document processing status")

        await db.commit()

        # Verify cleanup
        je_count_after_result = await db.execute(text("SELECT COUNT(*) FROM journal_entries"))
        je_count_after = je_count_after_result.scalar()

        jel_count_after_result = await db.execute(text("SELECT COUNT(*) FROM journal_entry_lines"))
        jel_count_after = jel_count_after_result.scalar()

        return {
            "success": True,
            "message": "All journal entries deleted successfully",
            "deleted": {
                "journal_entries": je_count,
                "journal_entry_lines": jel_count
            },
            "remaining": {
                "journal_entries": je_count_after,
                "journal_entry_lines": jel_count_after
            }
        }

    except Exception as e:
        logger.error(f"Error deleting journal entries: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/reprocess-documents-for-jes")
async def reprocess_documents_for_jes(
    entity_id: int,
    db: AsyncSession = Depends(get_async_db)
) -> Dict:
    """
    Reprocess all extracted documents for an entity to create journal entries

    This will:
    1. Find all documents with extracted data
    2. Run them through the intelligent JE service
    3. Create draft journal entries where applicable
    4. Skip documents that don't need JEs (EIN, formation, etc.)
    """

    try:
        # Get all extracted documents for the entity
        result = await db.execute(
            select(AccountingDocument).where(
                AccountingDocument.entity_id == entity_id,
                AccountingDocument.processing_status == "extracted",
                AccountingDocument.extracted_data != None
            )
        )
        documents = result.scalars().all()

        logger.info(f"Found {len(documents)} extracted documents for entity {entity_id}")

        created_count = 0
        skipped_count = 0
        error_count = 0
        errors = []

        for doc in documents:
            try:
                logger.info(f"Processing document {doc.id} ({doc.category})")

                # Create JE from document
                je = await create_je_from_document(db, doc, doc.extracted_data)

                if je:
                    created_count += 1
                    logger.info(f"Created JE {je.entry_number} for document {doc.id}")
                else:
                    skipped_count += 1
                    logger.info(f"No JE needed for document {doc.id} ({doc.category})")

            except Exception as e:
                error_count += 1
                error_msg = f"Document {doc.id} ({doc.filename}): {str(e)}"
                errors.append(error_msg)
                logger.error(f"Error processing document {doc.id}: {e}")

        return {
            "success": True,
            "message": f"Processed {len(documents)} documents",
            "entity_id": entity_id,
            "total_documents": len(documents),
            "journal_entries_created": created_count,
            "skipped": skipped_count,
            "errors": error_count,
            "error_details": errors if errors else None
        }

    except Exception as e:
        logger.error(f"Error reprocessing documents: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/stats")
async def get_cleanup_stats(db: AsyncSession = Depends(get_async_db)) -> Dict:
    """Get current system stats for cleanup planning"""

    try:
        # Count journal entries
        je_result = await db.execute(text("SELECT COUNT(*) FROM journal_entries"))
        je_count = je_result.scalar()

        # Count journal entry lines
        jel_result = await db.execute(text("SELECT COUNT(*) FROM journal_entry_lines"))
        jel_count = jel_result.scalar()

        # Count documents
        doc_result = await db.execute(text("SELECT COUNT(*) FROM accounting_documents"))
        doc_count = doc_result.scalar()

        # Count documents with extracted data
        extracted_result = await db.execute(text(
            "SELECT COUNT(*) FROM accounting_documents WHERE extracted_data IS NOT NULL"
        ))
        extracted_count = extracted_result.scalar()

        return {
            "journal_entries": je_count,
            "journal_entry_lines": jel_count,
            "total_documents": doc_count,
            "extracted_documents": extracted_count,
            "documents_ready_for_je": extracted_count
        }

    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
