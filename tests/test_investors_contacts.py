from datetime import datetime
from fastapi.testclient import TestClient
from jose import jwt
from src.api.main import app
from src.api.config import SECRET_KEY, ALGORITHM

client = TestClient(app)


def auth(email: str = "lwhitworth@ngicapitaladvisory.com"):
    payload = {"sub": email, "iat": datetime.utcnow().timestamp()}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {"Authorization": f"Bearer {token}"}


def test_contacts_create_and_list():
    # Ensure investor and relationship
    inv = client.post('/api/investors', json={'legal_name': 'Contact Test Co', 'email': 'contact@test.co'}, headers=auth()).json()['id']
    client.post('/api/investors/link', json={'entityId': 1, 'investorId': inv, 'stage': 'Not Started'}, headers=auth())
    # Create contact
    cr = client.post('/api/investors/contacts', json={'entityId': 1, 'investorId': inv, 'channel': 'Email', 'subject': 'Intro', 'notes': 'Hello', 'occurred_at': '2025-01-01'}, headers=auth())
    assert cr.status_code == 200
    # List
    lr = client.get('/api/investors/contacts', params={'entity_id': 1, 'investor': inv}, headers=auth())
    assert lr.status_code == 200
    assert any(c['subject'] == 'Intro' for c in lr.json())
