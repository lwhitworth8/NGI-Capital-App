"""
Comprehensive Backend API Tests for Documents Module
Tests document upload, categorization, and retrieval

Author: NGI Capital Development Team
Date: October 4, 2025
"""

import pytest
from httpx import AsyncClient
from datetime import date, datetime
from pathlib import Path
import io
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.models_accounting import AccountingEntity
from src.api.models_accounting_part2 import AccountingDocument, AccountingDocumentCategory


@pytest.mark.asyncio
class TestDocumentsAPI:
    """Comprehensive tests for Documents API endpoints"""
    
    async def test_upload_document_valid(self, async_client: AsyncClient, test_entity_id: int):
        """Test uploading a valid document using batch-upload endpoint"""
        # Create a test PDF file in memory
        test_file_content = b"%PDF-1.4\n%Test PDF content for invoice"
        test_file = io.BytesIO(test_file_content)
        
        files = [
            ("files", ("test_invoice.pdf", test_file, "application/pdf"))
        ]
        data = {
            "entity_id": str(test_entity_id),
            "category": "receipts"  # Aligned to real categories
        }
        
        response = await async_client.post(
            "/api/accounting/documents/batch-upload",
            files=files,
            data=data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "successful" in result
        assert result["successful"] >= 1
        assert "file_results" in result
        assert len(result["file_results"]) == 1
        assert result["file_results"][0]["status"] == "success"
    
    async def test_upload_document_invalid_type(self, async_client: AsyncClient, test_entity_id: int):
        """Test that invalid file types are rejected"""
        test_file_content = b"<html><body>Not a valid document</body></html>"
        test_file = io.BytesIO(test_file_content)
        
        files = [
            ("files", ("test.html", test_file, "text/html"))
        ]
        data = {
            "entity_id": str(test_entity_id),
            "category": "other"
        }
        
        response = await async_client.post(
            "/api/accounting/documents/batch-upload",
            files=files,
            data=data
        )
        
        assert response.status_code == 200
        result = response.json()
        # Batch upload returns results per file
        assert result["failed"] >= 1
        assert any("not allowed" in str(r.get("error", "")).lower() for r in result["file_results"])
    
    async def test_upload_document_too_large(self, async_client: AsyncClient, test_entity_id: int):
        """Test that files exceeding size limit are rejected"""
        # Create a 51MB file (limit is 50MB)
        test_file_content = b"x" * (51 * 1024 * 1024)
        test_file = io.BytesIO(test_file_content)
        
        files = {
            "file": ("large_file.pdf", test_file, "application/pdf")
        }
        data = {
            "entity_id": test_entity_id,
            "document_type": "invoice",
            "category": "operating_agreement"
        }
        
        response = await async_client.post(
            "/api/accounting/documents/upload",
            files=files,
            data=data
        )
        
        # Depending on implementation, may be 413 or 400
        assert response.status_code in [400, 413]
    
    async def test_get_documents_all(self, async_client: AsyncClient, test_entity_id: int):
        """Test retrieving all documents for an entity"""
        response = await async_client.get(
            f"/api/accounting/documents/?entity_id={test_entity_id}"
        )
        
        assert response.status_code == 200
        documents = response.json()
        assert isinstance(documents, list)
    
    async def test_get_documents_by_category(self, async_client: AsyncClient, test_entity_id: int):
        """Test filtering documents by category"""
        categories = ["operating_agreement", "bylaws", "shareholder_agreement", "invoice", "receipt"]
        
        for category in categories:
            response = await async_client.get(
                f"/api/accounting/documents/?entity_id={test_entity_id}&category={category}"
            )
            
            assert response.status_code == 200
            documents = response.json()
            for doc in documents:
                assert doc["category"] == category
    
    async def test_get_documents_by_type(self, async_client: AsyncClient, test_entity_id: int):
        """Test filtering documents by document type"""
        response = await async_client.get(
            f"/api/accounting/documents/?entity_id={test_entity_id}&document_type=invoice"
        )
        
        assert response.status_code == 200
        documents = response.json()
        for doc in documents:
            assert doc["document_type"] == "invoice"
    
    async def test_get_documents_by_date_range(self, async_client: AsyncClient, test_entity_id: int):
        """Test filtering documents by effective date range"""
        response = await async_client.get(
            f"/api/accounting/documents/?entity_id={test_entity_id}&date_from=2025-01-01&date_to=2025-12-31"
        )
        
        assert response.status_code == 200
        documents = response.json()
        assert isinstance(documents, list)
    
    async def test_get_document_by_id(self, async_client: AsyncClient, test_document_id: int):
        """Test retrieving a specific document by ID"""
        response = await async_client.get(
            f"/api/accounting/documents/{test_document_id}"
        )
        
        assert response.status_code == 200
        document = response.json()
        assert document["id"] == test_document_id
        assert "entity_name" in document
        assert "uploaded_by_name" in document
        assert "file_path" in document
    
    async def test_get_nonexistent_document(self, async_client: AsyncClient):
        """Test retrieving a non-existent document returns 404"""
        response = await async_client.get(
            "/api/accounting/documents/99999"
        )
        assert response.status_code == 404
    
    async def test_download_document(self, async_client: AsyncClient, test_document_id: int):
        """Test downloading a document file"""
        response = await async_client.get(
            f"/api/accounting/documents/download/{test_document_id}"
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] in ["application/pdf", "application/octet-stream"]
        assert len(response.content) > 0
    
    async def test_delete_document(self, async_client: AsyncClient, test_entity_id: int):
        """Test deleting a document"""
        # First, upload a document to delete
        test_file_content = b"%PDF-1.4\n%Test PDF for deletion"
        test_file = io.BytesIO(test_file_content)
        
        files = {
            "file": ("delete_test.pdf", test_file, "application/pdf")
        }
        data = {
            "entity_id": test_entity_id,
            "document_type": "invoice",
            "category": "operating_agreement"
        }
        
        upload_response = await async_client.post(
            "/api/accounting/documents/upload",
            files=files,
            data=data
        )
        document_id = upload_response.json()["id"]
        
        # Now delete it
        delete_response = await async_client.delete(
            f"/api/accounting/documents/{document_id}"
        )
        
        assert delete_response.status_code == 200
        
        # Verify it's deleted
        get_response = await async_client.get(
            f"/api/accounting/documents/{document_id}"
        )
        assert get_response.status_code == 404
    
    async def test_upload_amendment_document(self, async_client: AsyncClient, test_entity_id: int, test_document_id: int):
        """Test uploading an amendment to an existing document"""
        test_file_content = b"%PDF-1.4\n%Amendment document"
        test_file = io.BytesIO(test_file_content)
        
        files = {
            "file": ("amendment.pdf", test_file, "application/pdf")
        }
        data = {
            "entity_id": test_entity_id,
            "document_type": "invoice",
            "category": "operating_agreement",
            "is_amendment": True,
            "amendment_number": 1,
            "original_document_id": test_document_id
        }
        
        response = await async_client.post(
            "/api/accounting/documents/upload",
            files=files,
            data=data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["is_amendment"] is True
        assert result["amendment_number"] == 1
        assert result["original_document_id"] == test_document_id
    
    async def test_document_categories(self, async_client: AsyncClient, test_entity_id: int):
        """Test all document category types"""
        categories = [
            "operating_agreement",
            "bylaws",
            "shareholder_agreement",
            "board_resolution",
            "stock_certificate",
            "irs_determination",
            "partnership_agreement"
        ]
        
        for category in categories:
            test_file = io.BytesIO(b"%PDF-1.4\n%Test")
            files = {"file": (f"{category}.pdf", test_file, "application/pdf")}
            data = {
                "entity_id": test_entity_id,
                "document_type": "invoice",
                "category": category
            }
            
            response = await async_client.post(
                "/api/accounting/documents/upload",
                files=files,
                data=data
            )
            
            assert response.status_code == 200
            assert response.json()["category"] == category
    
    async def test_document_pagination(self, async_client: AsyncClient, test_entity_id: int):
        """Test document list pagination"""
        # Test page 1
        response_page1 = await async_client.get(
            f"/api/accounting/documents/?entity_id={test_entity_id}&page=1&page_size=10"
        )
        assert response_page1.status_code == 200
        page1_docs = response_page1.json()
        assert len(page1_docs) <= 10
        
        # Test page 2
        response_page2 = await async_client.get(
            f"/api/accounting/documents/?entity_id={test_entity_id}&page=2&page_size=10"
        )
        assert response_page2.status_code == 200
        page2_docs = response_page2.json()
        
        # Ensure different results (if there are enough documents)
        if len(page1_docs) == 10 and len(page2_docs) > 0:
            assert page1_docs[0]["id"] != page2_docs[0]["id"]


# Fixtures
@pytest.fixture
async def test_entity_id(async_db: AsyncSession) -> int:
    """Return the ID of NGI Capital LLC for testing"""
    from sqlalchemy import select
    result = await async_db.execute(
        select(AccountingEntity.id).where(AccountingEntity.entity_name == "NGI Capital LLC")
    )
    entity_id = result.scalar()
    if not entity_id:
        entity = AccountingEntity(
            entity_name="Test Entity",
            entity_type="LLC",
            is_available=True
        )
        async_db.add(entity)
        await async_db.commit()
        await async_db.refresh(entity)
        return entity.id
    return entity_id


@pytest.fixture
async def test_document_id(async_client: AsyncClient, test_entity_id: int) -> int:
    """Upload a test document and return its ID"""
    test_file_content = b"%PDF-1.4\n%Fixture test document"
    test_file = io.BytesIO(test_file_content)
    
    files = {
        "file": ("fixture_test.pdf", test_file, "application/pdf")
    }
    data = {
        "entity_id": test_entity_id,
        "document_type": "invoice",
        "category": "operating_agreement",
        "effective_date": "2025-10-04"
    }
    
    response = await async_client.post(
        "/api/accounting/documents/upload",
        files=files,
        data=data
    )
    assert response.status_code == 200
    return response.json()["id"]

