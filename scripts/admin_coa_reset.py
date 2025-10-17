"""
Admin utility: purge COAs for specified entities and reseed a lean GAAP COA.

Usage examples:
  - List entities:           python scripts/admin_coa_reset.py --list-entities
  - Purge COAs for IDs:      python scripts/admin_coa_reset.py --purge-entities 2,3
  - Reseed COA for ID 1:     python scripts/admin_coa_reset.py --seed-entity 1
  - Purge then seed:         python scripts/admin_coa_reset.py --purge-entities 2,3,4 --seed-entity 1

This uses the same async DB stack as the API. Make sure env vars (DATABASE_URL)
or the app config point to your dev DB (e.g., Docker dev DB).
"""

import argparse
import asyncio
from typing import List
from sqlalchemy import select, delete

from services.api.database_async import get_async_session_factory
from services.api.models_accounting import AccountingEntity, ChartOfAccounts
from services.api.services.coa_seeder import seed_chart_of_accounts


async def list_entities() -> None:
    session_factory = get_async_session_factory()
    async with session_factory() as session:
        res = await session.execute(select(AccountingEntity))
        rows = res.scalars().all()
        print("Entities:")
        for e in rows:
            print(f"  {e.id}: {getattr(e, 'entity_name', '')}")


async def purge_coas(entity_ids: List[int]) -> int:
    if not entity_ids:
        return 0
    session_factory = get_async_session_factory()
    async with session_factory() as session:
        stmt = delete(ChartOfAccounts).where(ChartOfAccounts.entity_id.in_(entity_ids))
        result = await session.execute(stmt)
        await session.commit()
        return result.rowcount or 0


async def seed_coa(entity_id: int) -> int:
    session_factory = get_async_session_factory()
    async with session_factory() as session:
        created = await seed_chart_of_accounts(session, entity_id)
        return created


def parse_ids(csv: str) -> List[int]:
    return [int(x.strip()) for x in csv.split(',') if x.strip()]


async def main():
    parser = argparse.ArgumentParser(description="Purge and reseed COAs")
    parser.add_argument("--list-entities", action="store_true", help="List entities and exit")
    parser.add_argument("--purge-entities", type=str, default="", help="CSV of entity IDs to purge COAs for")
    parser.add_argument("--seed-entity", type=int, default=0, help="Entity ID to seed COA for")
    args = parser.parse_args()

    if args.list_entities:
        await list_entities()
        return

    total_deleted = 0
    if args.purge_entities:
        ids = parse_ids(args.purge_entities)
        total_deleted = await purge_coas(ids)
        print(f"Deleted {total_deleted} COA rows for entities: {ids}")

    if args.seed_entity:
        created = await seed_coa(args.seed_entity)
        print(f"Seeded {created} COA accounts for entity {args.seed_entity}")


if __name__ == "__main__":
    asyncio.run(main())

