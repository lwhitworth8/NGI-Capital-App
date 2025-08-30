"""
Backend tests for NGI Capital Internal Application
"""

import pytest
import sys
import os
from pathlib import Path
from fastapi.testclient import TestClient
import sqlite3
import bcrypt

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.api.main import app
from src.api.config import DATABASE_PATH as DB_PATH

client = TestClient(app)

@pytest.fixture
def setup_test_db():
    """Setup test database before each test"""
    # Use test database
    test_db = Path("test_ngi_capital.db")
    if test_db.exists():
        test_db.unlink()
    
    # Initialize test database
    conn = sqlite3.connect(str(test_db))
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute("""
        CREATE TABLE partners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            ownership_percentage REAL NOT NULL,
            capital_account_balance REAL DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE entities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            legal_name TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            ein TEXT,
            formation_date DATE,
            state TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            amount REAL NOT NULL,
            transaction_type TEXT NOT NULL,
            description TEXT,
            created_by TEXT NOT NULL,
            approved_by TEXT,
            approval_status TEXT DEFAULT 'pending',
            transaction_date DATE DEFAULT CURRENT_DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (entity_id) REFERENCES entities(id)
        )
    """)
    
    # Add test data
    test_password = bcrypt.hashpw(b"TestPassword123!", bcrypt.gensalt()).decode('utf-8')
    
    cursor.execute("""
        INSERT INTO partners (email, name, password_hash, ownership_percentage, capital_account_balance)
        VALUES (?, ?, ?, ?, ?)
    """, ("anurmamade@ngicapitaladvisory.com", "Andre Nurmamade", test_password, 50.0, 1055000))
    
    cursor.execute("""
        INSERT INTO partners (email, name, password_hash, ownership_percentage, capital_account_balance)
        VALUES (?, ?, ?, ?, ?)
    """, ("lwhitworth@ngicapitaladvisory.com", "Landon Whitworth", test_password, 50.0, 1055000))
    
    cursor.execute("""
        INSERT INTO entities (legal_name, entity_type, ein, formation_date, state)
        VALUES (?, ?, ?, ?, ?)
    """, ("NGI Capital Advisory LLC", "LLC", "88-1234567", "2023-01-01", "Delaware"))
    
    conn.commit()
    conn.close()
    
    yield test_db
    
    # Cleanup
    if test_db.exists():
        test_db.unlink()

class TestHealthAndRoot:
    """Test health check and root endpoints"""
    
    def test_root_endpoint(self):
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "operational"
        assert "version" in response.json()
    
    def test_health_check(self):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        assert "timestamp" in response.json()

class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_login_success(self, setup_test_db):
        response = client.post("/api/auth/login", json={
            "email": "anurmamade@ngicapitaladvisory.com",
            "password": "TestPassword123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["partner_name"] == "Andre Nurmamade"
        assert data["ownership_percentage"] == 50.0
    
    def test_login_invalid_domain(self):
        response = client.post("/api/auth/login", json={
            "email": "test@gmail.com",
            "password": "TestPassword123!"
        })
        assert response.status_code == 403
        assert "restricted to NGI Capital partners" in response.json()["detail"]
    
    def test_login_invalid_password(self, setup_test_db):
        response = client.post("/api/auth/login", json={
            "email": "anurmamade@ngicapitaladvisory.com",
            "password": "WrongPassword"
        })
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
    
    def test_get_current_user(self, setup_test_db):
        # Login first
        login_response = client.post("/api/auth/login", json={
            "email": "anurmamade@ngicapitaladvisory.com",
            "password": "TestPassword123!"
        })
        token = login_response.json()["access_token"]
        
        # Get current user
        response = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "anurmamade@ngicapitaladvisory.com"
        assert data["ownership_percentage"] == 50.0

class TestDashboard:
    """Test dashboard endpoints"""
    
    def test_dashboard_metrics(self, setup_test_db):
        # Login first
        login_response = client.post("/api/auth/login", json={
            "email": "anurmamade@ngicapitaladvisory.com",
            "password": "TestPassword123!"
        })
        token = login_response.json()["access_token"]
        
        # Get dashboard metrics
        response = client.get("/api/dashboard/metrics", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "total_assets" in data
        assert "entity_count" in data
        assert "pending_approvals" in data
        assert data["total_assets"] == 2110000  # 1055000 + 1055000

class TestEntities:
    """Test entity endpoints"""
    
    def test_get_entities(self, setup_test_db):
        # Login first
        login_response = client.post("/api/auth/login", json={
            "email": "anurmamade@ngicapitaladvisory.com",
            "password": "TestPassword123!"
        })
        token = login_response.json()["access_token"]
        
        # Get entities
        response = client.get("/api/entities", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        entities = response.json()
        assert len(entities) >= 1
        assert entities[0]["legal_name"] == "NGI Capital Advisory LLC"

class TestTransactions:
    """Test transaction endpoints"""
    
    def test_create_small_transaction(self, setup_test_db):
        # Login first
        login_response = client.post("/api/auth/login", json={
            "email": "anurmamade@ngicapitaladvisory.com",
            "password": "TestPassword123!"
        })
        token = login_response.json()["access_token"]
        
        # Create transaction under $500 (auto-approved)
        response = client.post("/api/transactions", 
            json={
                "entity_id": 1,
                "amount": 250,
                "transaction_type": "expense",
                "description": "Office supplies"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "auto_approved"
    
    def test_create_large_transaction_needs_approval(self, setup_test_db):
        # Login first
        login_response = client.post("/api/auth/login", json={
            "email": "anurmamade@ngicapitaladvisory.com",
            "password": "TestPassword123!"
        })
        token = login_response.json()["access_token"]
        
        # Create transaction over $500 (needs approval)
        response = client.post("/api/transactions", 
            json={
                "entity_id": 1,
                "amount": 5000,
                "transaction_type": "expense",
                "description": "Equipment purchase"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "pending"
    
    def test_no_self_approval(self, setup_test_db):
        # Andre creates transaction
        andre_login = client.post("/api/auth/login", json={
            "email": "anurmamade@ngicapitaladvisory.com",
            "password": "TestPassword123!"
        })
        andre_token = andre_login.json()["access_token"]
        
        # Create transaction
        create_response = client.post("/api/transactions", 
            json={
                "entity_id": 1,
                "amount": 5000,
                "transaction_type": "expense",
                "description": "Test transaction"
            },
            headers={"Authorization": f"Bearer {andre_token}"}
        )
        transaction_id = create_response.json()["id"]
        
        # Try to self-approve (should fail)
        approve_response = client.put(
            f"/api/transactions/{transaction_id}/approve",
            headers={"Authorization": f"Bearer {andre_token}"}
        )
        assert approve_response.status_code == 403
        assert "Cannot approve your own transaction" in approve_response.json()["detail"]
    
    def test_partner_can_approve_other_partner_transaction(self, setup_test_db):
        # Andre creates transaction
        andre_login = client.post("/api/auth/login", json={
            "email": "anurmamade@ngicapitaladvisory.com",
            "password": "TestPassword123!"
        })
        andre_token = andre_login.json()["access_token"]
        
        create_response = client.post("/api/transactions", 
            json={
                "entity_id": 1,
                "amount": 5000,
                "transaction_type": "expense",
                "description": "Test transaction"
            },
            headers={"Authorization": f"Bearer {andre_token}"}
        )
        transaction_id = create_response.json()["id"]
        
        # Landon approves (should succeed)
        landon_login = client.post("/api/auth/login", json={
            "email": "lwhitworth@ngicapitaladvisory.com",
            "password": "TestPassword123!"
        })
        landon_token = landon_login.json()["access_token"]
        
        approve_response = client.put(
            f"/api/transactions/{transaction_id}/approve",
            headers={"Authorization": f"Bearer {landon_token}"}
        )
        assert approve_response.status_code == 200
        assert "approved successfully" in approve_response.json()["message"]

class TestPartners:
    """Test partner endpoints"""
    
    def test_get_partners(self, setup_test_db):
        # Login first
        login_response = client.post("/api/auth/login", json={
            "email": "anurmamade@ngicapitaladvisory.com",
            "password": "TestPassword123!"
        })
        token = login_response.json()["access_token"]
        
        # Get partners
        response = client.get("/api/partners", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        partners = response.json()
        assert len(partners) == 2
        assert sum(p["ownership_percentage"] for p in partners) == 100.0

if __name__ == "__main__":
    pytest.main([__file__, "-v"])