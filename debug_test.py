import asyncio
import pytest
from tests.conftest import async_db, async_client
from src.api.models_accounting import ChartOfAccounts, JournalEntry, JournalEntryLine
from datetime import date

async def test_debug():
    async for db in async_db():
        # Check if data exists
        accounts = await db.execute('SELECT COUNT(*) FROM chart_of_accounts WHERE entity_id = 1')
        print(f'Chart of accounts count: {accounts.scalar()}')
        
        entries = await db.execute('SELECT COUNT(*) FROM journal_entries WHERE entity_id = 1')
        print(f'Journal entries count: {entries.scalar()}')
        
        lines = await db.execute('SELECT COUNT(*) FROM journal_entry_lines')
        print(f'Journal entry lines count: {lines.scalar()}')
        break

if __name__ == "__main__":
    asyncio.run(test_debug())


