"""
Reset Journal Entries for Development

This script deletes all journal entries, lines, and audit logs for specified entities
to allow testing with fresh data after refactoring the JE system.

CAUTION: This is a destructive operation. Only use in development.

Usage:
    # Reset for specific entity
    python scripts/reset_journal_entries.py --entity-id 1

    # Reset for all entities (requires confirmation)
    python scripts/reset_journal_entries.py --all

Author: NGI Capital Development Team
Date: October 2025
"""

import asyncio
import argparse
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from services.api.database_async import async_session_maker
from services.api.models_accounting import (
    JournalEntry, JournalEntryLine, JournalEntryAuditLog, AccountingEntity
)


async def reset_journal_entries(
    db: AsyncSession,
    entity_id: int = None,
    reset_all: bool = False,
    dry_run: bool = False
) -> dict:
    """
    Delete all journal entries for specified entity or all entities.

    Args:
        db: Database session
        entity_id: Specific entity ID to reset (optional)
        reset_all: Reset all entities (requires confirmation)
        dry_run: Show what would be deleted without actually deleting

    Returns:
        Dictionary with results summary
    """
    print(f"\n{'='*80}")
    print(f"Journal Entry Reset")
    print(f"Mode: {'DRY RUN (no changes)' if dry_run else 'LIVE (will delete data)'}")
    print(f"Scope: {'ALL ENTITIES' if reset_all else f'Entity {entity_id}'}")
    print(f"{'='*80}\n")

    if reset_all and not dry_run:
        print("⚠️  WARNING: You are about to delete ALL journal entries for ALL entities!")
        confirmation = input("Type 'DELETE ALL' to confirm: ")
        if confirmation != "DELETE ALL":
            print("Aborted.")
            return {"aborted": True}

    # Build query filters
    if entity_id:
        entities = [entity_id]
        entity_filter = JournalEntry.entity_id == entity_id
    else:
        # Get all entity IDs
        result = await db.execute(select(AccountingEntity.id))
        entities = [row[0] for row in result.fetchall()]
        entity_filter = JournalEntry.entity_id.in_(entities)

    # Count what will be deleted
    je_count_result = await db.execute(
        select(func.count(JournalEntry.id)).where(entity_filter)
    )
    je_count = je_count_result.scalar()

    jel_count_result = await db.execute(
        select(func.count(JournalEntryLine.id)).where(
            JournalEntryLine.journal_entry_id.in_(
                select(JournalEntry.id).where(entity_filter)
            )
        )
    )
    jel_count = jel_count_result.scalar()

    audit_count_result = await db.execute(
        select(func.count(JournalEntryAuditLog.id)).where(
            JournalEntryAuditLog.journal_entry_id.in_(
                select(JournalEntry.id).where(entity_filter)
            )
        )
    )
    audit_count = audit_count_result.scalar()

    print(f"📊 Records to be deleted:")
    print(f"   - Journal Entries: {je_count}")
    print(f"   - Journal Entry Lines: {jel_count}")
    print(f"   - Audit Log Entries: {audit_count}")
    print(f"   - Total Records: {je_count + jel_count + audit_count}\n")

    if je_count == 0:
        print("✅ No journal entries found. Nothing to delete.")
        return {
            "entity_ids": entities,
            "journal_entries_deleted": 0,
            "lines_deleted": 0,
            "audit_logs_deleted": 0,
            "dry_run": dry_run
        }

    if dry_run:
        print("⚠️  DRY RUN: No data will be deleted. Run with --no-dry-run to execute.")
        return {
            "entity_ids": entities,
            "journal_entries_deleted": je_count,
            "lines_deleted": jel_count,
            "audit_logs_deleted": audit_count,
            "dry_run": True
        }

    # Execute deletions in correct order (due to foreign keys)
    print("🗑️  Deleting records...")

    # 1. Delete audit logs first
    await db.execute(
        delete(JournalEntryAuditLog).where(
            JournalEntryAuditLog.journal_entry_id.in_(
                select(JournalEntry.id).where(entity_filter)
            )
        )
    )
    print(f"   ✓ Deleted {audit_count} audit log entries")

    # 2. Delete journal entry lines
    await db.execute(
        delete(JournalEntryLine).where(
            JournalEntryLine.journal_entry_id.in_(
                select(JournalEntry.id).where(entity_filter)
            )
        )
    )
    print(f"   ✓ Deleted {jel_count} journal entry lines")

    # 3. Delete journal entries
    await db.execute(delete(JournalEntry).where(entity_filter))
    print(f"   ✓ Deleted {je_count} journal entries")

    # Commit the transaction
    await db.commit()
    print("\n✅ Database reset complete!\n")

    return {
        "entity_ids": entities,
        "journal_entries_deleted": je_count,
        "lines_deleted": jel_count,
        "audit_logs_deleted": audit_count,
        "dry_run": False
    }


async def main():
    parser = argparse.ArgumentParser(
        description="Reset journal entries for development testing"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--entity-id",
        type=int,
        help="Entity ID to reset journal entries for"
    )
    group.add_argument(
        "--all",
        action="store_true",
        help="Reset journal entries for ALL entities (requires confirmation)"
    )
    parser.add_argument(
        "--no-dry-run",
        action="store_true",
        help="Actually perform the deletion (default is dry run)"
    )

    args = parser.parse_args()

    async with async_session_maker() as db:
        try:
            result = await reset_journal_entries(
                db=db,
                entity_id=args.entity_id,
                reset_all=args.all,
                dry_run=not args.no_dry_run
            )

            if result.get("aborted"):
                sys.exit(1)

            print(f"{'='*80}")
            print("Summary:")
            if args.entity_id:
                print(f"  Entity ID: {args.entity_id}")
            else:
                print(f"  Entities: {len(result['entity_ids'])} entities")
            print(f"  Journal Entries: {result['journal_entries_deleted']}")
            print(f"  Lines: {result['lines_deleted']}")
            print(f"  Audit Logs: {result['audit_logs_deleted']}")
            print(f"  Mode: {'DRY RUN' if result['dry_run'] else 'LIVE'}")
            print(f"{'='*80}\n")

            if result['dry_run']:
                print("💡 Tip: Run with --no-dry-run to actually delete the data")

        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    # Import func for count queries
    from sqlalchemy import func
    asyncio.run(main())
