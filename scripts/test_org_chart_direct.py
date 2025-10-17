"""
Test the org chart function directly
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from services.api.routes.entities import get_org_chart

async def test_org_chart():
    """Test the org chart function directly"""
    try:
        # Create async session
        engine = create_async_engine('sqlite+aiosqlite:///./ngi.db')
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        async with async_session() as session:
            result = await get_org_chart(1, session)
            print('Org Chart Result:')
            print(f'Entity: {result["entity"]["entity_name"]}')
            print(f'Board members: {len(result["board"])}')
            for member in result['board']:
                print(f'  - {member["name"]} ({member["role"]})')
            print(f'Executive members: {len(result["executives"])}')
            for member in result['executives']:
                print(f'  - {member["name"]} ({member["role"]})')
            print(f'Teams: {len(result["teams"])}')
            for team in result['teams']:
                print(f'  - {team["name"]} ({team["member_count"]} members)')
        
        await engine.dispose()
        
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_org_chart())

