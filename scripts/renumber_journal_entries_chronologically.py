"""
Renumber Journal Entries Chronologically

This script renumbers all journal entries for an entity based on chronological transaction date order.
US GAAP Best Practice: Journal entries should be numbered sequentially by date.

Usage:
    python scripts/renumber_journal_entries_chronologically.py --entity-id 1

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
from sqlalchemy import select
from services.api.database_async import async_session_maker
from services.api.models_accounting import JournalEntry, JournalEntryAuditLog
from services.api.utils.datetime_utils import get_pst_now


async def renumber_journal_entries_chronologically(
    db: AsyncSession,
    entity_id: int,
    dry_run: bool = False
) -> dict:
    """
    Renumber all journal entries for an entity in chronological order by transaction date.

    Args:
        db: Database session
        entity_id: Entity ID to renumber JEs for
        dry_run: If True, show what would change without modifying database

    Returns:
        Dictionary with results summary
    """
    print(f"\n{'='*80}")
    print(f"Renumbering Journal Entries for Entity {entity_id}")
    print(f"Mode: {'DRY RUN (no changes will be made)' if dry_run else 'LIVE (will update database)'}")
    print(f"{'='*80}\n")

    # Fetch all journal entries for this entity, ordered chronologically
    result = await db.execute(
        select(JournalEntry)
        .where(JournalEntry.entity_id == entity_id)
        .order_by(
            JournalEntry.entry_date.asc(),  # Primary: transaction date ascending
            JournalEntry.created_at.asc()   # Secondary: creation date ascending (for same-day entries)
        )
    )
    entries = result.scalars().all()

    if not entries:
        print(f"No journal entries found for entity {entity_id}")
        return {"entity_id": entity_id, "total_entries": 0, "renumbered": 0}

    print(f"Found {len(entries)} journal entries to process\n")

    changes_made = []
    fiscal_year_counters = {}  # Track sequence numbers per fiscal year

    for entry in entries:
        fiscal_year = entry.fiscal_year

        # Initialize counter for this fiscal year if not exists
        if fiscal_year not in fiscal_year_counters:
            fiscal_year_counters[fiscal_year] = 1
        else:
            fiscal_year_counters[fiscal_year] += 1

        # Generate new entry number
        new_entry_number = f"JE-{fiscal_year}-{fiscal_year_counters[fiscal_year]:06d}"
        old_entry_number = entry.entry_number

        # Check if change is needed
        if old_entry_number != new_entry_number:
            changes_made.append({
                "id": entry.id,
                "old_number": old_entry_number,
                "new_number": new_entry_number,
                "entry_date": entry.entry_date,
                "memo": entry.memo[:60] + "..." if len(entry.memo) > 60 else entry.memo
            })

            print(f"  {old_entry_number:20s} -> {new_entry_number:20s}  |  {entry.entry_date}  |  {entry.memo[:50]}")

            if not dry_run:
                # Update entry number
                entry.entry_number = new_entry_number

                # Create audit log for the renumbering
                audit_log = JournalEntryAuditLog(
                    journal_entry_id=entry.id,
                    action="renumbered",
                    performed_by_id=1,  # System user
                    performed_at=get_pst_now(),
                    comment=f"Renumbered chronologically: {old_entry_number} -> {new_entry_number}",
                    old_value={"entry_number": old_entry_number},
                    new_value={"entry_number": new_entry_number}
                )
                db.add(audit_log)

    # Commit changes if not dry run
    if not dry_run and changes_made:
        await db.commit()
        print(f"\n✅ Successfully renumbered {len(changes_made)} journal entries")
    elif dry_run and changes_made:
        print(f"\n⚠️  DRY RUN: Would renumber {len(changes_made)} journal entries")
        print("   Run with --no-dry-run to apply changes")
    else:
        print("\n✅ All journal entries are already numbered chronologically")

    return {
        "entity_id": entity_id,
        "total_entries": len(entries),
        "renumbered": len(changes_made),
        "changes": changes_made,
        "dry_run": dry_run
    }


async def main():
    parser = argparse.ArgumentParser(
        description="Renumber journal entries chronologically by transaction date"
    )
    parser.add_argument(
        "--entity-id",
        type=int,
        required=True,
        help="Entity ID to renumber journal entries for"
    )
    parser.add_argument(
        "--no-dry-run",
        action="store_true",
        help="Actually apply changes (default is dry run mode)"
    )

    args = parser.parse_args()

    async with async_session_maker() as db:
        try:
            result = await renumber_journal_entries_chronologically(
                db=db,
                entity_id=args.entity_id,
                dry_run=not args.no_dry_run
            )

            print(f"\n{'='*80}")
            print("Summary:")
            print(f"  Entity ID: {result['entity_id']}")
            print(f"  Total Entries: {result['total_entries']}")
            print(f"  Renumbered: {result['renumbered']}")
            print(f"  Mode: {'DRY RUN' if result['dry_run'] else 'LIVE'}")
            print(f"{'='*80}\n")

        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
