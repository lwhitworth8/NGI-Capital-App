"""
Integration tests for advisory onboarding workflow.

Tests the complete flow from creating an onboarding flow to finalizing it
and verifying employee record creation.
"""

import pytest
import json
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text

from src.api.database import get_db
from src.api.routes.advisory import create_onboarding_flow, patch_onboarding_flow, finalize_onboarding_flow, provision_onboarding_email


class TestOnboardingIntegration:
    """Test the complete onboarding workflow integration."""

    def setup_method(self):
        """Set up test data before each test."""
        self.db = next(get_db())
        self._cleanup_test_data()
        self._setup_test_data()

    def teardown_method(self):
        """Clean up test data after each test."""
        self._cleanup_test_data()
        self.db.close()

    def _cleanup_test_data(self):
        """Clean up any existing test data."""
        try:
            # Clean up in reverse dependency order
            self.db.execute(sa_text("DELETE FROM advisory_onboarding_flow_files WHERE flow_id IN (SELECT id FROM advisory_onboarding_flows WHERE created_by = 'test@example.com')"))
            self.db.execute(sa_text("DELETE FROM advisory_onboarding_flows WHERE created_by = 'test@example.com'"))
            self.db.execute(sa_text("DELETE FROM advisory_project_assignments WHERE student_id IN (SELECT id FROM advisory_students WHERE email = 'teststudent@berkeley.edu')"))
            self.db.execute(sa_text("DELETE FROM employees WHERE email = 'teststudent@berkeley.edu'"))
            self.db.execute(sa_text("DELETE FROM advisory_students WHERE email = 'teststudent@berkeley.edu'"))
            self.db.execute(sa_text("DELETE FROM advisory_projects WHERE project_name = 'Test Project'"))
            self.db.execute(sa_text("DELETE FROM advisory_applications WHERE email = 'teststudent@berkeley.edu'"))
            self.db.execute(sa_text("DELETE FROM advisory_applications_archived WHERE email = 'teststudent@berkeley.edu'"))
            self.db.commit()
        except Exception as e:
            print(f"Warning: Error during cleanup: {e}")
            self.db.rollback()

    def _setup_test_data(self):
        """Set up test data for onboarding workflow."""
        # Create test entity
        self.db.execute(sa_text("""
            INSERT OR IGNORE INTO entities (legal_name, entity_type, is_active, created_at)
            VALUES ('Test Advisory Entity', 'LLC', 1, datetime('now'))
        """))
        
        # Get entity ID
        entity_result = self.db.execute(sa_text("SELECT id FROM entities WHERE legal_name = 'Test Advisory Entity'")).fetchone()
        self.entity_id = entity_result[0] if entity_result else 1

        # Create test project
        self.db.execute(sa_text("""
            INSERT INTO advisory_projects (entity_id, project_name, client_name, summary, status, allow_applications, created_at)
            VALUES (:eid, 'Test Project', 'Test Client', 'Test Summary', 'active', 1, datetime('now'))
        """), {"eid": self.entity_id})
        
        project_result = self.db.execute(sa_text("SELECT id FROM advisory_projects WHERE project_name = 'Test Project'")).fetchone()
        self.project_id = project_result[0]

        # Create test student (only if doesn't exist)
        existing_student = self.db.execute(sa_text("SELECT id FROM advisory_students WHERE email = 'teststudent@berkeley.edu'")).fetchone()
        if not existing_student:
            self.db.execute(sa_text("""
                INSERT INTO advisory_students (entity_id, email, first_name, last_name, school, program, created_at)
                VALUES (:eid, 'teststudent@berkeley.edu', 'Test', 'Student', 'UC Berkeley', 'Computer Science', datetime('now'))
            """), {"eid": self.entity_id})
        
        student_result = self.db.execute(sa_text("SELECT id FROM advisory_students WHERE email = 'teststudent@berkeley.edu'")).fetchone()
        self.student_id = student_result[0]

        # Create test application in 'offer' status
        self.db.execute(sa_text("""
            INSERT INTO advisory_applications (email, first_name, last_name, school, program, target_project_id, status, created_at)
            VALUES ('teststudent@berkeley.edu', 'Test', 'Student', 'UC Berkeley', 'Computer Science', :pid, 'offer', datetime('now'))
        """), {"pid": self.project_id})

        self.db.commit()

    async def test_create_onboarding_flow(self):
        """Test creating a new onboarding flow."""
        # Create onboarding flow
        result = await create_onboarding_flow({
            "student_id": self.student_id,
            "project_id": self.project_id,
            "nda_required": True
        }, {"email": "test@example.com"}, self.db)
        
        assert "id" in result
        flow_id = result["id"]
        assert flow_id > 0

        # Verify flow was created in database
        flow = self.db.execute(sa_text("""
            SELECT id, student_id, project_id, nda_required, status, created_by
            FROM advisory_onboarding_flows WHERE id = :id
        """), {"id": flow_id}).fetchone()
        
        assert flow is not None
        assert flow[1] == self.student_id  # student_id
        assert flow[2] == self.project_id  # project_id
        assert flow[3] == 1  # nda_required
        assert flow[4] == 'in_progress'  # status
        assert flow[5] == 'test@example.com'  # created_by

    async def test_patch_onboarding_flow(self):
        """Test updating onboarding flow fields."""
        # Create flow first
        create_result = await create_onboarding_flow({
            "student_id": self.student_id,
            "project_id": self.project_id,
            "nda_required": True
        }, {"email": "test@example.com"}, self.db)
        flow_id = create_result["id"]

        # Update flow fields
        patch_result = await patch_onboarding_flow(flow_id, {
            "email_created": True,
            "intern_agreement_sent": True,
            "intern_agreement_received": True,
            "nda_sent": True,
            "nda_received": True
        }, {"email": "test@example.com"}, self.db)
        
        assert patch_result["id"] == flow_id

        # Verify updates in database
        flow = self.db.execute(sa_text("""
            SELECT email_created, intern_agreement_sent, intern_agreement_received, nda_sent, nda_received
            FROM advisory_onboarding_flows WHERE id = :id
        """), {"id": flow_id}).fetchone()
        
        assert flow[0] == 1  # email_created
        assert flow[1] == 1  # intern_agreement_sent
        assert flow[2] == 1  # intern_agreement_received
        assert flow[3] == 1  # nda_sent
        assert flow[4] == 1  # nda_received

    async def test_provision_email_mock(self):
        """Test email provisioning (mock mode)."""
        # Create flow first
        create_result = await create_onboarding_flow({
            "student_id": self.student_id,
            "project_id": self.project_id,
            "nda_required": True
        }, {"email": "test@example.com"}, self.db)
        flow_id = create_result["id"]

        # Provision email (should work in mock mode)
        provision_result = await provision_onboarding_email(flow_id, {"email": "test@example.com"}, self.db)
        
        assert provision_result["id"] == flow_id
        assert provision_result["provisioned"] == True
        assert "email" in provision_result
        assert provision_result["email"].endswith("@ngicapitaladvisory.com")

        # Verify email was set in database
        flow = self.db.execute(sa_text("""
            SELECT ngi_email, email_created FROM advisory_onboarding_flows WHERE id = :id
        """), {"id": flow_id}).fetchone()
        
        assert flow[0] is not None  # ngi_email
        assert flow[1] == 1  # email_created

    async def test_finalize_onboarding_creates_employee(self):
        """Test that finalizing onboarding creates an employee record."""
        # Create flow first
        create_result = await create_onboarding_flow({
            "student_id": self.student_id,
            "project_id": self.project_id,
            "nda_required": True
        }, {"email": "test@example.com"}, self.db)
        flow_id = create_result["id"]

        # Set all required fields to complete
        await patch_onboarding_flow(flow_id, {
            "email_created": True,
            "intern_agreement_sent": True,
            "intern_agreement_received": True,
            "nda_sent": True,
            "nda_received": True
        }, {"email": "test@example.com"}, self.db)

        # Finalize onboarding
        finalize_result = await finalize_onboarding_flow(flow_id, {"email": "test@example.com"}, self.db)
        
        assert finalize_result["id"] == flow_id
        assert finalize_result["status"] == "onboarded"

        # Verify flow status was updated
        flow = self.db.execute(sa_text("""
            SELECT status FROM advisory_onboarding_flows WHERE id = :id
        """), {"id": flow_id}).fetchone()
        
        assert flow[0] == "onboarded"

        # Verify employee record was created
        employee = self.db.execute(sa_text("""
            SELECT entity_id, name, email, title, role, classification, status, employment_type
            FROM employees WHERE email = 'teststudent@berkeley.edu'
        """)).fetchone()
        
        assert employee is not None
        assert employee[0] == self.entity_id  # entity_id
        assert employee[1] == "Test Student"  # name
        assert employee[2] == "teststudent@berkeley.edu"  # email
        assert employee[3] == "Student Analyst"  # title
        assert employee[4] == "Student Analyst"  # role
        assert employee[5] == "intern"  # classification
        assert employee[6] == "active"  # status
        assert employee[7] == "intern"  # employment_type

        # Verify project assignment was created
        assignment = self.db.execute(sa_text("""
            SELECT project_id, student_id, role, active
            FROM advisory_project_assignments 
            WHERE project_id = :pid AND student_id = :sid
        """), {"pid": self.project_id, "sid": self.student_id}).fetchone()
        
        assert assignment is not None
        assert assignment[0] == self.project_id  # project_id
        assert assignment[1] == self.student_id  # student_id
        assert assignment[2] == "analyst"  # role
        assert assignment[3] == 1  # active

        # Verify application was archived
        archived_app = self.db.execute(sa_text("""
            SELECT original_id, email, reason
            FROM advisory_applications_archived 
            WHERE email = 'teststudent@berkeley.edu'
        """)).fetchone()
        
        assert archived_app is not None
        assert archived_app[1] == "teststudent@berkeley.edu"  # email
        assert archived_app[2] == "onboarding_completed"  # reason

    async def test_finalize_requires_documents(self):
        """Test that finalization fails if required documents are missing."""
        # Create flow first
        create_result = await create_onboarding_flow({
            "student_id": self.student_id,
            "project_id": self.project_id,
            "nda_required": True
        }, {"email": "test@example.com"}, self.db)
        flow_id = create_result["id"]

        # Try to finalize without required documents
        with pytest.raises(Exception):  # Should raise HTTPException
            await finalize_onboarding_flow(flow_id, {"email": "test@example.com"}, self.db)

    async def test_complete_workflow_integration(self):
        """Test the complete workflow from start to finish."""
        # Step 1: Create onboarding flow
        create_result = await create_onboarding_flow({
            "student_id": self.student_id,
            "project_id": self.project_id,
            "nda_required": True
        }, {"email": "test@example.com"}, self.db)
        flow_id = create_result["id"]

        # Step 2: Provision email
        provision_result = await provision_onboarding_email(flow_id, {"email": "test@example.com"}, self.db)
        assert provision_result["provisioned"] == True

        # Step 3: Mark documents as sent and received
        await patch_onboarding_flow(flow_id, {
            "intern_agreement_sent": True,
            "intern_agreement_received": True,
            "nda_sent": True,
            "nda_received": True
        }, {"email": "test@example.com"}, self.db)

        # Step 4: Finalize onboarding
        finalize_result = await finalize_onboarding_flow(flow_id, {"email": "test@example.com"}, self.db)
        assert finalize_result["status"] == "onboarded"

        # Step 5: Verify complete state
        # Flow should be onboarded
        flow = self.db.execute(sa_text("SELECT status FROM advisory_onboarding_flows WHERE id = :id"), {"id": flow_id}).fetchone()
        assert flow[0] == "onboarded"

        # Employee should exist
        employee = self.db.execute(sa_text("SELECT name, email FROM employees WHERE email = 'teststudent@berkeley.edu'")).fetchone()
        assert employee is not None
        assert employee[0] == "Test Student"

        # Project assignment should exist
        assignment = self.db.execute(sa_text("""
            SELECT COUNT(*) FROM advisory_project_assignments 
            WHERE project_id = :pid AND student_id = :sid AND active = 1
        """), {"pid": self.project_id, "sid": self.student_id}).fetchone()
        assert assignment[0] == 1

        # Application should be archived
        archived = self.db.execute(sa_text("""
            SELECT COUNT(*) FROM advisory_applications_archived 
            WHERE email = 'teststudent@berkeley.edu'
        """)).fetchone()
        assert archived[0] == 1

        print("✅ Complete onboarding workflow integration test passed!")


if __name__ == "__main__":
    import asyncio
    
    async def run_tests():
        # Run tests directly
        test_instance = TestOnboardingIntegration()
        test_instance.setup_method()
        
        try:
            await test_instance.test_create_onboarding_flow()
            print("✅ test_create_onboarding_flow passed")
            
            await test_instance.test_patch_onboarding_flow()
            print("✅ test_patch_onboarding_flow passed")
            
            await test_instance.test_provision_email_mock()
            print("✅ test_provision_email_mock passed")
            
            await test_instance.test_finalize_requires_documents()
            print("✅ test_finalize_requires_documents passed")
            
            # Reset for complete workflow test
            test_instance.teardown_method()
            test_instance.setup_method()
            
            await test_instance.test_complete_workflow_integration()
            print("✅ test_complete_workflow_integration passed")
            
        finally:
            test_instance.teardown_method()
        
        print("\n🎉 All onboarding integration tests passed!")
    
    asyncio.run(run_tests())
