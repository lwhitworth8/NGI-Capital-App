"""
Test the org chart API
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import requests
import json

def test_org_chart_api():
    """Test the org chart API"""
    try:
        # Test the org chart API
        response = requests.get('http://localhost:8001/entities/1/org-chart')
        if response.status_code == 200:
            data = response.json()
            print('Org Chart API Response:')
            print(f'Entity: {data["entity"]["entity_name"]}')
            print(f'Board members: {len(data["board"])}')
            for member in data['board']:
                print(f'  - {member["name"]} ({member["role"]})')
            print(f'Executive members: {len(data["executives"])}')
            for member in data['executives']:
                print(f'  - {member["name"]} ({member["role"]})')
            print(f'Teams: {len(data["teams"])}')
            for team in data['teams']:
                print(f'  - {team["name"]} ({team["member_count"]} members)')
        else:
            print(f'API Error: {response.status_code} - {response.text}')
    except Exception as e:
        print(f'Error: {e}')

if __name__ == "__main__":
    test_org_chart_api()

