"""
Test the org chart function with sync database
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.api.database import get_db
from services.api.routes.entities import get_org_chart

def test_org_chart_sync():
    """Test the org chart function with sync database"""
    try:
        db = next(get_db())
        result = get_org_chart(1, db)
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
        
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_org_chart_sync()

