"""
Tests for NGI Learning Module API endpoints
Sprint 1: Company selection and progress tracking
Following test specifications from MarkdownFiles/NGILearning/TestPlan.NGILearningModule.md
"""

import pytest
import sys
import os
from datetime import datetime, date
from fastapi.testclient import TestClient

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.api.main import app
from src.api.database import get_db, _ensure_engine
from src.api.models import Base
from src.api.models_learning import (
    LearningCompany, LearningProgress, LearningPackage
)


client = TestClient(app)


@pytest.fixture(scope="function")
def setup_learning_db():
    """Setup test database with learning tables"""
    # Ensure engine is initialized
    _ensure_engine()
    
    # Create tables
    from src.api.database import _engine
    Base.metadata.create_all(bind=_engine)
    
    # Get database session
    db = next(get_db())
    
    # Clear existing data
    db.query(LearningProgress).delete()
    db.query(LearningPackage).delete()
    db.query(LearningCompany).delete()
    db.commit()
    
    # Seed test companies
    test_companies = [
        {
            "ticker": "TSLA",
            "company_name": "Tesla, Inc.",
            "industry": "Automotive",
            "sub_industry": "Electric Vehicles",
            "description": "EV manufacturer with clean Q x P modeling",
            "headquarters": "Austin, Texas",
            "fiscal_year_end": "December 31",
            "revenue_model_type": "QxP",
            "revenue_driver_notes": "Q = Vehicle deliveries; P = ASP",
            "data_quality_score": 10,
            "is_active": True
        },
        {
            "ticker": "COST",
            "company_name": "Costco Wholesale Corporation",
            "industry": "Retail",
            "sub_industry": "Warehouse Clubs",
            "description": "Membership-based warehouse club",
            "headquarters": "Issaquah, Washington",
            "fiscal_year_end": "August 31",
            "revenue_model_type": "QxP",
            "revenue_driver_notes": "Q = Transactions; P = Avg ticket",
            "data_quality_score": 10,
            "is_active": True
        }
    ]
    
    for company_data in test_companies:
        company = LearningCompany(**company_data)
        db.add(company)
    
    db.commit()
    
    yield db
    
    # Cleanup
    db.close()


class TestLearningCompanies:
    """Test company retrieval endpoints"""
    
    def test_get_companies(self, setup_learning_db):
        """Test GET /api/learning/companies returns list of companies"""
        response = client.get("/api/learning/companies")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2  # At least our test companies
        
        # Verify company structure
        company = data[0]
        assert "ticker" in company
        assert "company_name" in company
        assert "revenue_model_type" in company
        assert "is_active" in company
    
    def test_get_company_by_id(self, setup_learning_db):
        """Test GET /api/learning/companies/{id} returns specific company"""
        # Get first company
        companies_response = client.get("/api/learning/companies")
        companies = companies_response.json()
        assert len(companies) > 0
        
        company_id = companies[0]["id"]
        
        # Get specific company
        response = client.get(f"/api/learning/companies/{company_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == company_id
        assert data["ticker"] in ["TSLA", "COST"]
    
    def test_get_nonexistent_company(self, setup_learning_db):
        """Test GET /api/learning/companies/999999 returns 404"""
        response = client.get("/api/learning/companies/999999")
        assert response.status_code == 404


class TestLearningProgress:
    """Test progress tracking endpoints"""
    
    def test_get_progress_creates_record_on_first_access(self, setup_learning_db):
        """Test GET /api/learning/progress creates progress record if not exists"""
        response = client.get("/api/learning/progress")
        assert response.status_code == 200
        
        data = response.json()
        assert data["user_id"] == "pytest@ngicapitaladvisory.com"
        assert data["completion_percentage"] == 0.0
        assert data["current_streak_days"] == 0
        assert data["capstone_submitted"] == False
    
    def test_select_company(self, setup_learning_db):
        """Test POST /api/learning/progress/select-company updates progress"""
        # Get a company ID
        companies_response = client.get("/api/learning/companies")
        companies = companies_response.json()
        company_id = companies[0]["id"]
        
        # Select company
        response = client.post(
            "/api/learning/progress/select-company",
            json={"company_id": company_id}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert data["company_id"] == company_id
        assert "ticker" in data
        
        # Verify progress updated
        progress_response = client.get("/api/learning/progress")
        progress = progress_response.json()
        assert progress["selected_company_id"] == company_id
    
    def test_select_invalid_company(self, setup_learning_db):
        """Test POST /api/learning/progress/select-company with invalid ID returns 404"""
        response = client.post(
            "/api/learning/progress/select-company",
            json={"company_id": 999999}
        )
        assert response.status_code == 404
    
    def test_update_streak(self, setup_learning_db):
        """Test POST /api/learning/progress/update-streak increments streak"""
        # First streak update
        response = client.post("/api/learning/progress/update-streak")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert data["current_streak"] == 1
        assert data["longest_streak"] == 1
        
        # Same day update (no change)
        response2 = client.post("/api/learning/progress/update-streak")
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["current_streak"] == 1


class TestLearningPackages:
    """Test Excel package endpoints"""
    
    def test_get_latest_package_not_generated(self, setup_learning_db):
        """Test GET /api/learning/packages/{id}/latest when no package exists"""
        # Get a company ID
        companies_response = client.get("/api/learning/companies")
        companies = companies_response.json()
        company_id = companies[0]["id"]
        
        response = client.get(f"/api/learning/packages/{company_id}/latest")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "not_generated"
        assert "message" in data


class TestHealthCheck:
    """Test health check endpoint"""
    
    def test_health_check(self, setup_learning_db):
        """Test GET /api/learning/health returns system status"""
        response = client.get("/api/learning/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["module"] == "learning"
        assert data["active_companies"] >= 2
        assert "timestamp" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

