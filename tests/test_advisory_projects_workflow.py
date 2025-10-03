"""
Test the full advisory projects workflow: create, edit, save draft, publish.
Tests all field saving including project leads, team requirements, etc.
"""

import pytest
import json
from fastapi.testclient import TestClient
from src.api.main import app
from src.api.database import get_db
from sqlalchemy.sql import text

client = TestClient(app)

# Test admin credentials (bypasses auth for testing)
TEST_ADMIN_HEADERS = {
    "X-Test-Admin-Bypass": "1",
    "Authorization": "Bearer test-admin-token"
}

@pytest.fixture
def db_session():
    """Get a database session for testing."""
    db = next(get_db())
    yield db
    db.close()

def test_create_project_with_all_fields(db_session):
    """Test creating a project with all fields including leads and team requirements."""
    
    # Step 1: Create project
    project_data = {
        "entity_id": 1,
        "client_name": "Liverpool FC, Fenway Sports Group",
        "project_name": "Liverpool FC Data Analytics Project",
        "summary": "Build ML models for player scouting using professional sports data",
        "description": "This project leverages Liverpool FC data to build predictive models for player performance.",
        "status": "draft",
        "mode": "remote",
        "location_text": "Remote",
        "duration_weeks": 10,
        "commitment_hours_per_week": 12,
        "team_size": 6,
        "allow_applications": 1,
        "is_public": 1,
        "team_requirements": ["Computer Science", "Data Science", "Statistics"],
        "partner_logos": [
            {"name": "Liverpool FC", "logo": "https://logo.clearbit.com/liverpoolfc.com"},
            {"name": "Fenway Sports Group", "logo": "https://logo.clearbit.com/fenway-sports.com"}
        ]
    }
    
    response = client.post(
        "/api/advisory/projects",
        json=project_data,
        headers=TEST_ADMIN_HEADERS
    )
    
    assert response.status_code == 200
    result = response.json()
    project_id = result["id"]
    assert project_id > 0
    
    # Step 2: Set project leads
    leads_data = {
        "emails": ["andre@ngicapital.com", "landon@ngicapital.com"]
    }
    
    response = client.put(
        f"/api/advisory/projects/{project_id}/leads",
        json=leads_data,
        headers=TEST_ADMIN_HEADERS
    )
    
    assert response.status_code == 200
    
    # Step 3: Verify project was created with all fields
    response = client.get(
        f"/api/advisory/projects/{project_id}",
        headers=TEST_ADMIN_HEADERS
    )
    
    assert response.status_code == 200
    project = response.json()
    
    assert project["project_name"] == "Liverpool FC Data Analytics Project"
    assert project["team_size"] == 6
    assert project["duration_weeks"] == 10
    assert project["commitment_hours_per_week"] == 12
    assert len(project["team_requirements"]) == 3
    assert "Computer Science" in project["team_requirements"]
    assert len(project["partner_logos"]) == 2
    
    # Step 4: Verify leads were saved
    response = client.get(
        f"/api/advisory/projects/{project_id}/leads",
        headers=TEST_ADMIN_HEADERS
    )
    
    assert response.status_code == 200
    leads = response.json()["leads"]
    assert len(leads) == 2
    assert "andre@ngicapital.com" in leads
    assert "landon@ngicapital.com" in leads
    
    # Step 5: Edit project
    update_data = {
        "team_size": 8,
        "duration_weeks": 12
    }
    
    response = client.put(
        f"/api/advisory/projects/{project_id}",
        json=update_data,
        headers=TEST_ADMIN_HEADERS
    )
    
    assert response.status_code == 200
    
    # Step 6: Verify updates
    response = client.get(
        f"/api/advisory/projects/{project_id}",
        headers=TEST_ADMIN_HEADERS
    )
    
    assert response.status_code == 200
    project = response.json()
    assert project["team_size"] == 8
    assert project["duration_weeks"] == 12
    
    # Step 7: Publish project (status: draft -> active)
    publish_data = {
        "status": "active"
    }
    
    response = client.put(
        f"/api/advisory/projects/{project_id}",
        json=publish_data,
        headers=TEST_ADMIN_HEADERS
    )
    
    assert response.status_code == 200
    
    # Step 8: Verify project is now active
    response = client.get(
        f"/api/advisory/projects/{project_id}",
        headers=TEST_ADMIN_HEADERS
    )
    
    assert response.status_code == 200
    project = response.json()
    assert project["status"] == "active"
    
    # Cleanup
    db_session.execute(text(f"DELETE FROM advisory_project_leads WHERE project_id = {project_id}"))
    db_session.execute(text(f"DELETE FROM advisory_projects WHERE id = {project_id}"))
    db_session.commit()

def test_publish_without_leads_fails(db_session):
    """Test that publishing a project without leads fails."""
    
    # Create project
    project_data = {
        "entity_id": 1,
        "client_name": "Test Client",
        "project_name": "Test Project",
        "summary": "Test summary",
        "status": "draft"
    }
    
    response = client.post(
        "/api/advisory/projects",
        json=project_data,
        headers=TEST_ADMIN_HEADERS
    )
    
    assert response.status_code == 200
    project_id = response.json()["id"]
    
    # Try to publish without leads
    publish_data = {
        "status": "active"
    }
    
    response = client.put(
        f"/api/advisory/projects/{project_id}",
        json=publish_data,
        headers=TEST_ADMIN_HEADERS
    )
    
    # Should fail with 422
    assert response.status_code == 422
    assert "lead" in response.json()["detail"].lower()
    
    # Cleanup
    db_session.execute(text(f"DELETE FROM advisory_projects WHERE id = {project_id}"))
    db_session.commit()

def test_team_requirements_json_handling(db_session):
    """Test that team requirements are properly stored and retrieved as JSON."""
    
    # Create project with team requirements
    project_data = {
        "entity_id": 1,
        "client_name": "Test Client",
        "project_name": "Test Project with Majors",
        "summary": "Test summary",
        "status": "draft",
        "team_requirements": ["Finance", "Economics", "Accounting", "Data Science"]
    }
    
    response = client.post(
        "/api/advisory/projects",
        json=project_data,
        headers=TEST_ADMIN_HEADERS
    )
    
    assert response.status_code == 200
    project_id = response.json()["id"]
    
    # Retrieve and verify
    response = client.get(
        f"/api/advisory/projects/{project_id}",
        headers=TEST_ADMIN_HEADERS
    )
    
    assert response.status_code == 200
    project = response.json()
    assert isinstance(project["team_requirements"], list)
    assert len(project["team_requirements"]) == 4
    assert "Finance" in project["team_requirements"]
    assert "Data Science" in project["team_requirements"]
    
    # Update team requirements
    update_data = {
        "team_requirements": ["Computer Science", "Mathematics"]
    }
    
    response = client.put(
        f"/api/advisory/projects/{project_id}",
        json=update_data,
        headers=TEST_ADMIN_HEADERS
    )
    
    assert response.status_code == 200
    
    # Verify update
    response = client.get(
        f"/api/advisory/projects/{project_id}",
        headers=TEST_ADMIN_HEADERS
    )
    
    assert response.status_code == 200
    project = response.json()
    assert len(project["team_requirements"]) == 2
    assert "Computer Science" in project["team_requirements"]
    assert "Mathematics" in project["team_requirements"]
    
    # Cleanup
    db_session.execute(text(f"DELETE FROM advisory_projects WHERE id = {project_id}"))
    db_session.commit()

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

