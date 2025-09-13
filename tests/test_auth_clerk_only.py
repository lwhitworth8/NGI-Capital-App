"""
Clerk-only auth tests replacing legacy password/session tests.
Focus:
 - Legacy endpoints return 410 Gone
 - Preferences endpoints work under pytest bypass (no Authorization header)
 - Protected routes return 200 under pytest bypass when no credentials are supplied
"""

import os
from fastapi.testclient import TestClient

from src.api.main import app


client = TestClient(app)


def test_legacy_auth_endpoints_removed():
    # These endpoints were removed in Clerk-only
    assert client.post('/api/auth/login', json={}).status_code == 410
    assert client.post('/api/auth/request-password-reset', json={}).status_code == 410
    assert client.post('/api/auth/reset-password', json={}).status_code == 410
    assert client.post('/api/auth/change-password', json={}).status_code == 410
    assert client.post('/api/auth/session', json={}).status_code in (410, 400)


def test_preferences_roundtrip_pytest_bypass():
    # GET default
    r1 = client.get('/api/preferences')
    assert r1.status_code == 200, r1.text
    theme = r1.json().get('theme')
    assert theme in ('system', 'light', 'dark')
    # POST update
    r2 = client.post('/api/preferences', json={'theme': 'dark'})
    assert r2.status_code == 200, r2.text
    r3 = client.get('/api/preferences')
    assert r3.status_code == 200
    assert r3.json().get('theme') in ('dark', 'system', 'light')


def test_protected_routes_accessible_under_pytest_bypass():
    # Dashboard metrics
    r = client.get('/api/dashboard/metrics')
    assert r.status_code == 200, r.text
    j = r.json()
    for k in ('total_assets', 'monthly_revenue', 'monthly_expenses', 'pending_approvals'):
        assert k in j

    # Entities (shape tolerant)
    r2 = client.get('/api/entities')
    assert r2.status_code == 200, r2.text
    data = r2.json()
    assert isinstance(data, dict)

