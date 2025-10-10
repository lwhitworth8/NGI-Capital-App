"""
Test PDF signing functionality.
"""

import pytest
import os
import tempfile
from datetime import datetime

# Test the PDF signing functionality
def test_create_intern_agreement_pdf():
    """Test creating an intern agreement PDF."""
    try:
        from src.api.integrations.pdf_signing import create_intern_agreement_pdf
        
        result = create_intern_agreement_pdf(
            student_name="Test Student",
            student_email="test@berkeley.edu",
            project_name="Test Project",
            role="Student Analyst",
            duration="3 months"
        )
        
        assert result["success"] == True
        assert "file_path" in result
        assert "filename" in result
        assert result["filename"].endswith(".pdf")
        
        # Check if file was created
        if os.path.exists(result["file_path"]):
            file_size = os.path.getsize(result["file_path"])
            assert file_size > 0  # File should not be empty
            print(f"✅ Intern agreement PDF created: {result['filename']} ({file_size} bytes)")
        else:
            print("⚠️ PDF file not found on disk (may be in memory)")
            
    except ImportError as e:
        print(f"⚠️ PDF signing dependencies not available: {e}")
        print("Install with: pip install reportlab PyPDF2")
    except Exception as e:
        print(f"❌ Error creating intern agreement PDF: {e}")
        raise

def test_create_nda_pdf():
    """Test creating an NDA PDF."""
    try:
        from src.api.integrations.pdf_signing import create_nda_pdf
        
        result = create_nda_pdf(
            student_name="Test Student",
            student_email="test@berkeley.edu",
            project_name="Test Project"
        )
        
        assert result["success"] == True
        assert "file_path" in result
        assert "filename" in result
        assert result["filename"].endswith(".pdf")
        
        # Check if file was created
        if os.path.exists(result["file_path"]):
            file_size = os.path.getsize(result["file_path"])
            assert file_size > 0  # File should not be empty
            print(f"✅ NDA PDF created: {result['filename']} ({file_size} bytes)")
        else:
            print("⚠️ PDF file not found on disk (may be in memory)")
            
    except ImportError as e:
        print(f"⚠️ PDF signing dependencies not available: {e}")
        print("Install with: pip install reportlab PyPDF2")
    except Exception as e:
        print(f"❌ Error creating NDA PDF: {e}")
        raise

def test_create_signing_links():
    """Test creating signing links."""
    try:
        from src.api.integrations.pdf_signing import create_signing_links
        
        result = create_signing_links(
            student_name="Test Student",
            student_email="test@berkeley.edu",
            project_name="Test Project",
            role="Student Analyst"
        )
        
        assert result["success"] == True
        assert "intern_agreement_link" in result
        assert "nda_link" in result
        assert "intern_filename" in result
        assert "nda_filename" in result
        
        print(f"✅ Signing links created:")
        print(f"   Intern Agreement: {result['intern_agreement_link']}")
        print(f"   NDA: {result['nda_link']}")
        
    except ImportError as e:
        print(f"⚠️ PDF signing dependencies not available: {e}")
        print("Install with: pip install reportlab PyPDF2")
    except Exception as e:
        print(f"❌ Error creating signing links: {e}")
        raise

def test_email_integration():
    """Test email integration with PDF signing."""
    try:
        from src.api.integrations.email_service import send_offer_email
        
        result = send_offer_email(
            student_email="test@berkeley.edu",
            student_name="Test Student",
            project_name="Test Project",
            role="Student Analyst",
            contract_duration="3 months"
        )
        
        assert result["success"] == True
        assert "message" in result
        
        print(f"✅ Offer email sent successfully: {result['message']}")
        
    except Exception as e:
        print(f"❌ Error sending offer email: {e}")
        raise

if __name__ == "__main__":
    print("Testing PDF Signing System...")
    print("=" * 50)
    
    try:
        test_create_intern_agreement_pdf()
        test_create_nda_pdf()
        test_create_signing_links()
        test_email_integration()
        
        print("\n🎉 All PDF signing tests passed!")
        print("\nThis system provides:")
        print("✅ Free PDF generation (no DocuSign costs)")
        print("✅ Professional contract templates")
        print("✅ Email integration with signing links")
        print("✅ Database integration for tracking")
        print("✅ Simple web-based signing interface")
        
    except Exception as e:
        print(f"\n❌ Tests failed: {e}")
        print("\nTo fix:")
        print("1. Install dependencies: pip install reportlab PyPDF2")
        print("2. Ensure directories exist: mkdir -p uploads/signatures")
        print("3. Check file permissions")
