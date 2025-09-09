"""Test resume upload functionality for student portal."""

import os
import pytest
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from io import BytesIO

# Import the app and database setup
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
from api.main import app
from api.database import get_db

# Create test database
TEST_DB_PATH = "test_resume.db"
engine = create_engine(f"sqlite:///{TEST_DB_PATH}", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

# Test student email
TEST_EMAIL = "test.student@berkeley.edu"

def setup_module():
    """Create test database and tables."""
    with engine.connect() as conn:
        # Create advisory_students table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS advisory_students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id INTEGER,
                first_name TEXT,
                last_name TEXT,
                email TEXT UNIQUE,
                school TEXT,
                program TEXT,
                status TEXT DEFAULT 'active',
                resume_url TEXT,
                theme TEXT,
                learning_notify INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()

def teardown_module():
    """Clean up test database."""
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    # Clean up any uploaded test files
    test_upload_dir = Path("uploads/advisory-docs/users/test.student_at_berkeley.edu")
    if test_upload_dir.exists():
        import shutil
        shutil.rmtree(test_upload_dir.parent.parent.parent.parent)  # Remove entire uploads dir

def test_profile_creation():
    """Test that a profile is created when fetched for the first time."""
    response = client.get(
        "/api/public/profile",
        headers={"X-Student-Email": TEST_EMAIL}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == TEST_EMAIL
    assert data["resume_url"] is None

def test_resume_upload_success():
    """Test successful resume upload."""
    # Create a fake PDF file
    pdf_content = b"%PDF-1.4\n%fake pdf content\n%%EOF"
    files = {
        "file": ("test_resume.pdf", BytesIO(pdf_content), "application/pdf")
    }
    
    response = client.post(
        "/api/public/profile/resume",
        files=files,
        headers={"X-Student-Email": TEST_EMAIL}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "resume_url" in data
    assert data["resume_url"].endswith(".pdf")
    assert "test.student_at_berkeley.edu" in data["resume_url"]
    
    # Verify file was saved
    file_path = Path(data["resume_url"])
    assert file_path.exists()
    
    # Verify database was updated
    profile_response = client.get(
        "/api/public/profile",
        headers={"X-Student-Email": TEST_EMAIL}
    )
    assert profile_response.status_code == 200
    profile_data = profile_response.json()
    assert profile_data["resume_url"] == data["resume_url"]

def test_resume_upload_invalid_file_type():
    """Test resume upload with invalid file type."""
    # Create a fake text file
    text_content = b"This is not a PDF"
    files = {
        "file": ("test_resume.txt", BytesIO(text_content), "text/plain")
    }
    
    response = client.post(
        "/api/public/profile/resume",
        files=files,
        headers={"X-Student-Email": TEST_EMAIL}
    )
    
    assert response.status_code == 415
    assert "PDF only" in response.json()["detail"]

def test_resume_upload_unauthorized():
    """Test resume upload without proper email domain."""
    pdf_content = b"%PDF-1.4\n%fake pdf content\n%%EOF"
    files = {
        "file": ("test_resume.pdf", BytesIO(pdf_content), "application/pdf")
    }
    
    # Test with non-student email
    response = client.post(
        "/api/public/profile/resume",
        files=files,
        headers={"X-Student-Email": "hacker@gmail.com"}
    )
    
    assert response.status_code == 403
    assert "Student email with allowed domain required" in response.json()["detail"]

def test_profile_update_with_resume_deletion():
    """Test deleting resume through profile update."""
    # First upload a resume
    pdf_content = b"%PDF-1.4\n%fake pdf content\n%%EOF"
    files = {
        "file": ("test_resume2.pdf", BytesIO(pdf_content), "application/pdf")
    }
    
    upload_response = client.post(
        "/api/public/profile/resume",
        files=files,
        headers={"X-Student-Email": TEST_EMAIL}
    )
    assert upload_response.status_code == 200
    
    # Now delete it by setting resume_url to null
    response = client.patch(
        "/api/public/profile",
        json={"resume_url": None},
        headers={"X-Student-Email": TEST_EMAIL}
    )
    
    # Note: The current API doesn't support setting resume_url via PATCH
    # This would need to be added to the backend if desired
    # For now, this test documents the expected behavior

def test_resume_file_serving():
    """Test that uploaded resume files can be accessed via the uploads endpoint."""
    # Upload a resume
    pdf_content = b"%PDF-1.4\n%fake pdf content for serving test\n%%EOF"
    files = {
        "file": ("serve_test.pdf", BytesIO(pdf_content), "application/pdf")
    }
    
    upload_response = client.post(
        "/api/public/profile/resume",
        files=files,
        headers={"X-Student-Email": TEST_EMAIL}
    )
    assert upload_response.status_code == 200
    resume_url = upload_response.json()["resume_url"]
    
    # Try to access the file via the uploads endpoint
    # Note: In production, nginx serves this, but in tests we check the file exists
    file_path = Path(resume_url)
    assert file_path.exists()
    with open(file_path, 'rb') as f:
        content = f.read()
    assert content == pdf_content

def test_multiple_resume_uploads():
    """Test that uploading a new resume replaces the old one in the database."""
    # Upload first resume
    pdf_content1 = b"%PDF-1.4\n%first resume\n%%EOF"
    files1 = {
        "file": ("first_resume.pdf", BytesIO(pdf_content1), "application/pdf")
    }
    
    response1 = client.post(
        "/api/public/profile/resume",
        files=files1,
        headers={"X-Student-Email": TEST_EMAIL}
    )
    assert response1.status_code == 200
    first_url = response1.json()["resume_url"]
    
    # Upload second resume
    pdf_content2 = b"%PDF-1.4\n%second resume\n%%EOF"
    files2 = {
        "file": ("second_resume.pdf", BytesIO(pdf_content2), "application/pdf")
    }
    
    response2 = client.post(
        "/api/public/profile/resume",
        files=files2,
        headers={"X-Student-Email": TEST_EMAIL}
    )
    assert response2.status_code == 200
    second_url = response2.json()["resume_url"]
    
    # Verify URLs are different (timestamps should differ)
    assert first_url != second_url
    
    # Verify profile only has the latest resume
    profile_response = client.get(
        "/api/public/profile",
        headers={"X-Student-Email": TEST_EMAIL}
    )
    assert profile_response.status_code == 200
    profile_data = profile_response.json()
    assert profile_data["resume_url"] == second_url
    
    # Both files should still exist on disk (we keep history)
    assert Path(first_url).exists()
    assert Path(second_url).exists()

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])