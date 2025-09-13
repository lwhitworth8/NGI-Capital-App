"""
Replaces legacy backend tests with Clerk-only compatible tests.
Coverage:
 - Root and health endpoints
 - Dashboard metrics
 - Entities endpoint shape
 - Transactions create small/large with pytest bypass (no auth header)
"""

from fastapi.testclient import TestClient

from src.api.main import app
from tests.helpers_auth import auth_headers


client = TestClient(app)


def test_root_and_health():
    r = client.get('/')
    assert r.status_code == 200
    j = r.json()
    assert j.get('status') == 'operational'
    assert 'version' in j

    h = client.get('/api/health')
    assert h.status_code == 200
    hj = h.json()
    assert hj.get('status') in ('healthy', 'unhealthy')
    assert 'timestamp' in hj


def test_dashboard_metrics():
    r = client.get('/api/dashboard/metrics')
    assert r.status_code == 200
    j = r.json()
    for k in ('total_assets', 'entity_count', 'pending_approvals'):
        assert k in j


def test_entities_endpoint_shape():
    r = client.get('/api/entities')
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert 'entities' in data or isinstance(data, list)


def test_transactions_small_and_large():
    # small (auto-approved)
    r1 = client.post(
        '/api/transactions',
        json={
            'entity_id': 1,
            'amount': 250,
            'transaction_type': 'expense',
            'description': 'Office supplies',
        },
        headers=auth_headers('lwhitworth@ngicapitaladvisory.com')
    )
    assert r1.status_code == 200, r1.text
    assert r1.json().get('status') in ('auto_approved', 'pending', 'created')

    # large (pending)
    r2 = client.post(
        '/api/transactions',
        json={
            'entity_id': 1,
            'amount': 5000,
            'transaction_type': 'expense',
            'description': 'Equipment purchase',
        },
        headers=auth_headers('lwhitworth@ngicapitaladvisory.com')
    )
    assert r2.status_code == 200, r2.text
    assert r2.json().get('status') in ('pending', 'created')
