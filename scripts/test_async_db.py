"""
Test async database connection
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text as sa_text

async def test_async_db():
    """Test async database connection"""
    try:
        # Create async session
        engine = create_async_engine('sqlite+aiosqlite:///./ngi.db')
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        async with async_session() as session:
            # Check teams
            print('Checking teams in async DB:')
            teams = await session.execute(sa_text('SELECT id, name, entity_id FROM teams'))
            team_rows = teams.fetchall()
            for team in team_rows:
                print(f'  - {team[1]} (ID: {team[0]}, Entity: {team[2]})')
            
            # Check employees
            print('\nChecking employees in async DB:')
            employees = await session.execute(sa_text('SELECT id, name, email, entity_id FROM employees'))
            emp_rows = employees.fetchall()
            for emp in emp_rows:
                print(f'  - {emp[1]} ({emp[2]}) (ID: {emp[0]}, Entity: {emp[3]})')
            
            # Check team memberships
            print('\nChecking team memberships in async DB:')
            memberships = await session.execute(sa_text('''
                SELECT t.name, e.name, tm.role_on_team
                FROM team_memberships tm
                JOIN teams t ON tm.team_id = t.id
                JOIN employees e ON tm.employee_id = e.id
                ORDER BY t.name, e.name
            '''))
            membership_rows = memberships.fetchall()
            for membership in membership_rows:
                print(f'  - {membership[1]} in {membership[0]} as {membership[2]}')
        
        await engine.dispose()
        
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_async_db())

