import sqlite3
from fastapi.testclient import TestClient
from src.api.main import app
from src.api.config import get_database_path

client = TestClient(app)

def _ensure_partner(email: str, name: str = 'User'):
    db = sqlite3.connect(get_database_path())
    c = db.cursor()
    # ensure minimal partners table
    c.execute("CREATE TABLE IF NOT EXISTS partners (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, name TEXT, password_hash TEXT, ownership_percentage REAL DEFAULT 50, is_active INTEGER DEFAULT 1)")
    # set password to TempPassword123!
    import bcrypt
    pw = bcrypt.hashpw(b'TempPassword123!', bcrypt.gensalt()).decode('utf-8')
    c.execute("INSERT OR IGNORE INTO partners (email, name, password_hash, ownership_percentage, is_active) VALUES (?,?,?,?,1)", (email, name, pw, 50.0))
    db.commit(); db.close()

def test_password_reset_flow():
    email = 'reset_test@ngicapitaladvisory.com'
    _ensure_partner(email)
    # request reset
    r = client.post('/api/auth/request-password-reset', json={'email': email})
    assert r.status_code == 200
    # extract token from outbox by querying DB
    db = sqlite3.connect(get_database_path())
    c = db.cursor()
    c.execute("CREATE TABLE IF NOT EXISTS password_resets (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, token TEXT, expires_at TEXT, used INTEGER DEFAULT 0, created_at TEXT)")
    c.execute("SELECT token FROM password_resets WHERE email = ? ORDER BY id DESC LIMIT 1", (email,))
    row = c.fetchone(); db.close()
    assert row is not None
    token = row[0]
    # reset using token
    r2 = client.post('/api/auth/reset-password', json={'token': token, 'new_password': 'NewPassw0rd!'})
    assert r2.status_code == 200
    # login with new password
    r3 = client.post('/api/auth/login', json={'email': email, 'password': 'NewPassw0rd!'})
    assert r3.status_code == 200

def test_change_password_and_preferences():
    email = 'prefs_test@ngicapitaladvisory.com'
    _ensure_partner(email, 'Prefs User')
    # login
    r = client.post('/api/auth/login', json={'email': email, 'password': 'TempPassword123!'})
    assert r.status_code == 200
    token = r.json()['access_token']
    # change password
    r2 = client.post('/api/auth/change-password', json={'current_password':'TempPassword123!','new_password':'AnotherPassw0rd!'}, headers={'Authorization': f'Bearer {token}'})
    assert r2.status_code == 200
    # login with new
    r3 = client.post('/api/auth/login', json={'email': email, 'password': 'AnotherPassw0rd!'});
    assert r3.status_code == 200
    token2 = r3.json()['access_token']
    # preferences get default
    r4 = client.get('/api/preferences', headers={'Authorization': f'Bearer {token2}'})
    assert r4.status_code == 200
    assert r4.json()['theme'] in ('system','light','dark')
    # set theme
    r5 = client.post('/api/preferences', json={'theme': 'dark'}, headers={'Authorization': f'Bearer {token2}'})
    assert r5.status_code == 200
    r6 = client.get('/api/preferences', headers={'Authorization': f'Bearer {token2}'})
    assert r6.json()['theme'] == 'dark'

