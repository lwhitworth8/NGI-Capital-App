"""
Comprehensive login system tests for NGI Capital
Tests both partners and validates all authentication flows
"""

import pytest
import requests
import json
import time
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8001"
API_URL = f"{BASE_URL}/api"

# Partner credentials
PARTNERS = [
    {
        "email": "anurmamade@ngicapitaladvisory.com",
        "password": "TempPassword123!",
        "name": "Andre Nurmamade",
        "ownership": 50.0
    },
    {
        "email": "lwhitworth@ngicapitaladvisory.com",
        "password": "FlashJayz2002!$!",
        "name": "Landon Whitworth",
        "ownership": 50.0
    }
]

class TestHealthCheck:
    """Test API health and availability"""
    
    def test_api_health(self):
        """Test if API is running and healthy"""
        response = requests.get(f"{API_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == True
        print(f"[PASS] API Health Check: {data['status']} at {data['timestamp']}")
    
    def test_root_endpoint(self):
        """Test root endpoint"""
        response = requests.get(BASE_URL)
        assert response.status_code == 200
        data = response.json()
        assert "NGI Capital" in data["message"]
        print(f"[PASS] Root Endpoint: {data['message']}")

class TestPartnerLogin:
    """Test partner login functionality"""
    
    def test_andre_login_success(self):
        """Test Andre's login with correct credentials"""
        andre = PARTNERS[0]
        response = requests.post(
            f"{API_URL}/auth/login",
            json={
                "email": andre["email"],
                "password": andre["password"]
            }
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["partner_name"] == andre["name"]
        assert data["ownership_percentage"] == andre["ownership"]
        
        print(f"[PASS] Andre Login Success: {andre['email']}")
        print(f"   - Token: {data['access_token'][:50]}...")
        print(f"   - Name: {data['partner_name']}")
        print(f"   - Ownership: {data['ownership_percentage']}%")
        
        return data["access_token"]
    
    def test_landon_login_success(self):
        """Test Landon's login with correct credentials"""
        landon = PARTNERS[1]
        response = requests.post(
            f"{API_URL}/auth/login",
            json={
                "email": landon["email"],
                "password": landon["password"]
            }
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["partner_name"] == landon["name"]
        assert data["ownership_percentage"] == landon["ownership"]
        
        print(f"[PASS] Landon Login Success: {landon['email']}")
        print(f"   - Token: {data['access_token'][:50]}...")
        print(f"   - Name: {data['partner_name']}")
        print(f"   - Ownership: {data['ownership_percentage']}%")
        
        return data["access_token"]
    
    def test_invalid_password(self):
        """Test login with wrong password"""
        response = requests.post(
            f"{API_URL}/auth/login",
            json={
                "email": PARTNERS[0]["email"],
                "password": "WrongPassword123!"
            }
        )
        
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
        print("✅ Invalid password rejected correctly")
    
    def test_invalid_email_domain(self):
        """Test login with non-partner email domain"""
        response = requests.post(
            f"{API_URL}/auth/login",
            json={
                "email": "test@gmail.com",
                "password": "TempPassword123!"
            }
        )
        
        assert response.status_code == 403
        assert "restricted to NGI Capital partners" in response.json()["detail"]
        print("✅ Non-partner email domain rejected correctly")
    
    def test_nonexistent_user(self):
        """Test login with non-existent partner email"""
        response = requests.post(
            f"{API_URL}/auth/login",
            json={
                "email": "nobody@ngicapitaladvisory.com",
                "password": "TempPassword123!"
            }
        )
        
        assert response.status_code == 401
        print("✅ Non-existent user rejected correctly")

class TestAuthenticatedEndpoints:
    """Test endpoints that require authentication"""
    
    def test_get_current_user(self):
        """Test getting current user info with valid token"""
        # First login to get token
        response = requests.post(
            f"{API_URL}/auth/login",
            json={
                "email": PARTNERS[0]["email"],
                "password": PARTNERS[0]["password"]
            }
        )
        token = response.json()["access_token"]
        
        # Test /me endpoint
        response = requests.get(
            f"{API_URL}/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == PARTNERS[0]["email"]
        assert data["name"] == PARTNERS[0]["name"]
        assert data["ownership_percentage"] == PARTNERS[0]["ownership"]
        print(f"[PASS] Get current user successful: {data['name']}")
    
    def test_dashboard_metrics(self):
        """Test dashboard metrics endpoint with authentication"""
        # First login to get token
        response = requests.post(
            f"{API_URL}/auth/login",
            json={
                "email": PARTNERS[0]["email"],
                "password": PARTNERS[0]["password"]
            }
        )
        token = response.json()["access_token"]
        
        # Test dashboard endpoint
        response = requests.get(
            f"{API_URL}/dashboard/metrics",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_assets" in data
        assert "entity_count" in data
        assert "pending_approvals" in data
        print(f"[PASS] Dashboard metrics accessible")
        print(f"   - Total Assets: ${data['total_assets']:,.2f}")
        print(f"   - Entities: {data['entity_count']}")
    
    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        response = requests.get(f"{API_URL}/auth/me")
        assert response.status_code == 403
        print("✅ Unauthorized access blocked correctly")

class TestBothPartnersSequential:
    """Test both partners can login sequentially"""
    
    def test_sequential_logins(self):
        """Test both partners logging in one after another"""
        tokens = []
        
        for partner in PARTNERS:
            response = requests.post(
                f"{API_URL}/auth/login",
                json={
                    "email": partner["email"],
                    "password": partner["password"]
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["partner_name"] == partner["name"]
            tokens.append(data["access_token"])
            print(f"[PASS] Sequential login {len(tokens)}/2: {partner['name']}")
        
        # Verify both tokens work
        for i, token in enumerate(tokens):
            response = requests.get(
                f"{API_URL}/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200
            assert response.json()["name"] == PARTNERS[i]["name"]
            print(f"[PASS] Token {i+1} validated for {PARTNERS[i]['name']}")

def run_all_tests():
    """Run all login tests and report results"""
    print("\n" + "="*60)
    print("NGI CAPITAL LOGIN SYSTEM TEST SUITE")
    print("="*60)
    print(f"Testing API at: {BASE_URL}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60 + "\n")
    
    test_classes = [
        TestHealthCheck,
        TestPartnerLogin,
        TestAuthenticatedEndpoints,
        TestBothPartnersSequential
    ]
    
    total_tests = 0
    passed_tests = 0
    failed_tests = []
    
    for test_class in test_classes:
        print(f"\n[TEST CLASS] {test_class.__name__}:")
        print("-" * 40)
        
        instance = test_class()
        test_methods = [m for m in dir(instance) if m.startswith("test_")]
        
        for method_name in test_methods:
            total_tests += 1
            try:
                method = getattr(instance, method_name)
                method()
                passed_tests += 1
            except Exception as e:
                failed_tests.append({
                    "class": test_class.__name__,
                    "method": method_name,
                    "error": str(e)
                })
                print(f"[FAIL] {method_name} FAILED: {e}")
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests} ✅")
    print(f"Failed: {len(failed_tests)} {'❌' if failed_tests else ''}")
    
    if failed_tests:
        print("\nFailed Tests:")
        for failure in failed_tests:
            print(f"  - {failure['class']}.{failure['method']}: {failure['error']}")
    else:
        print("\n🎉 ALL TESTS PASSED! The login system is working correctly.")
    
    print("="*60 + "\n")
    
    return len(failed_tests) == 0

if __name__ == "__main__":
    # Check if API is running before testing
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=2)
        if response.status_code == 200:
            success = run_all_tests()
            exit(0 if success else 1)
        else:
            print(f"❌ API returned status {response.status_code}")
            exit(1)
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to API at {BASE_URL}")
        print(f"   Error: {e}")
        print("\n⚠️  Make sure the backend is running:")
        print("   python src/api/main_simple.py")
        exit(1)
