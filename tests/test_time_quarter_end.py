from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)


def test_quarter_end_basic():
    r = client.get('/api/time/quarter-end', params={'tz': 'UTC'})
    assert r.status_code == 200
    data = r.json()
    assert 'quarter_end' in data and 'days' in data and isinstance(data['days'], int)

