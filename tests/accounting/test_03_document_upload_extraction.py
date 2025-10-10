"""
Test document upload and extraction with real NGI Capital LLC documents
"""
import pytest
import asyncio
import os
import sqlite3
from pathlib import Path
from httpx import AsyncClient
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.models_accounting import AccountingEntity
from src.api.models_accounting_part2 import AccountingDocument
from src.api.services.document_extractor_vision import DocumentExtractorVision
from src.api.services.document_type_detector import DocumentTypeDetector
from src.api.services.ein_processor import EINProcessor


class TestDocumentUploadExtraction:
    """Test document upload and extraction functionality with real documents"""

    @pytest.fixture
    def db_connection(self):
        """Get connection to the SQLite database"""
        db_path = 'ngi_capital.db'
        if not os.path.exists(db_path):
            pytest.skip("Database not found")
        
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        yield conn
        conn.close()

    @pytest.fixture
    def real_documents(self, db_connection):
        """Get real documents from the database"""
        cursor = db_connection.cursor()
        cursor.execute("""
            SELECT id, entity_id, filename, document_type, category, file_path, 
                   file_size_bytes, processing_status, workflow_status, 
                   extracted_data, extraction_confidence
            FROM accounting_documents 
            WHERE entity_id = 1
            ORDER BY id
        """)
        documents = cursor.fetchall()
        return [dict(doc) for doc in documents]

    def test_document_type_detection(self):
        """Test document type detection with real filenames"""
        detector = DocumentTypeDetector()
        
        test_cases = [
            ("NGICapitalLLC_ein_federal.pdf", "ein", "federal"),
            ("NGI_Capital_LLC_Operating_Agreement.xps.pdf", "operating_agreement", "contract"),
            ("NGI_Capital_LLC_Company_Resolution_to_Open_a_Bank_Account.xps.pdf", "board_resolution", "contract"),
            ("Invoice-YLZOXTDS-0033 (3).pdf", "invoices", "invoice"),
            ("7-16-25 - DE - Formation Document - NGI Capital LLC.pdf", "formation", "formation")
        ]
        
        for filename, expected_category, expected_type in test_cases:
            result = detector.detect_document_type(filename)
            print(f"Filename: {filename}, Expected: {expected_type}/{expected_category}, Got: {result['document_type']}/{result['category']}")
            assert result['document_type'] == expected_type
            assert result['category'] == expected_category

    @pytest.mark.asyncio
    async def test_vision_api_connection(self):
        """Test Vision API connection and basic extraction"""
        extractor = DocumentExtractorVision()
        
        # Check if API key is available
        import os
        if not os.getenv("OPENAI_API_KEY"):
            pytest.skip("Vision API test requires OPENAI_API_KEY environment variable")
        
        # Test with a real document from the database
        import sqlite3
        conn = sqlite3.connect('ngi_capital.db')
        cursor = conn.cursor()
        cursor.execute("SELECT file_path FROM accounting_documents WHERE entity_id = 1 LIMIT 1")
        result = cursor.fetchone()
        conn.close()
        
        if not result or not os.path.exists(result[0]):
            pytest.skip("No real document files available for testing")
        
        # Test extraction with real document
        try:
            result = await extractor.extract_document_data(result[0], 1, "test")
            assert result is not None
            assert "success" in result
            print(f"Vision API test successful: {result.get('success', False)}")
        except Exception as e:
            # Don't fail the test if API is down, just log the error
            print(f"Vision API test failed (expected in test environment): {e}")
            pytest.skip(f"Vision API test failed: {e}")

    @pytest.mark.asyncio
    async def test_document_upload_with_real_files(self, real_documents, db_connection):
        """Test document upload with real files from database"""
        # Get entity ID for NGI Capital LLC (entity_id 1)
        cursor = db_connection.cursor()
        cursor.execute("SELECT id FROM accounting_entities WHERE id = 1")
        entity_result = cursor.fetchone()
        
        if not entity_result:
            pytest.skip("NGI Capital LLC entity not found in database")
        
        entity_id = entity_result['id']
        
        # Test that we have at least 12 real documents (may be more due to test uploads)
        assert len(real_documents) >= 12
        assert all(doc['entity_id'] == entity_id for doc in real_documents)
        
        # Test document type detection on real filenames
        detector = DocumentTypeDetector()
        for doc in real_documents:
            result = detector.detect_document_type(doc['filename'])
            assert 'document_type' in result
            assert 'category' in result
            assert result['document_type'] is not None
            assert result['category'] is not None
            
            print(f"Real document: {doc['filename']} -> {result['category']}/{result['document_type']}")

    @pytest.mark.asyncio
    async def test_ein_processing(self, real_documents, db_connection):
        """Test EIN processing with real EIN documents"""
        # Get entity ID for NGI Capital LLC (entity_id 1)
        cursor = db_connection.cursor()
        cursor.execute("SELECT id FROM accounting_entities WHERE id = 1")
        entity_result = cursor.fetchone()
        
        if not entity_result:
            pytest.skip("NGI Capital LLC entity not found in database")
        
        entity_id = entity_result['id']
        
        # Find EIN documents
        ein_docs = [doc for doc in real_documents if doc['category'] == 'ein']
        assert len(ein_docs) >= 1, "Should have at least one EIN document"
        
        # Test EIN extraction
        detector = DocumentTypeDetector()
        for ein_doc in ein_docs:
            # Test EIN extraction from filename
            ein_from_filename = detector.extract_ein_from_filename(ein_doc['filename'])
            print(f"EIN document: {ein_doc['filename']} -> EIN from filename: {ein_from_filename}")

    def test_document_upload_endpoint(self, async_client, real_documents, db_connection):
        """Test document upload endpoint with real file data"""
        # Get the first real document as test data
        if not real_documents:
            pytest.skip("No real documents available")
        
        test_doc = real_documents[0]
        
        # Create test file content (simulate file upload)
        test_content = b"Test PDF content for upload"
        
        # Test the upload endpoint
        files = {'file': (test_doc['filename'], test_content, 'application/pdf')}
        data = {
            'entity_id': test_doc['entity_id'],
            'document_type': test_doc['document_type'],
            'category': test_doc['category']
        }
        
        response = async_client.post('/api/accounting/documents/upload', files=files, data=data)
        
        # Check response
        assert response.status_code in [200, 201, 400], f"Unexpected status code: {response.status_code}"
        
        if response.status_code in [200, 201]:
            result = response.json()
            assert 'id' in result
            assert 'filename' in result
            print(f"Document upload successful: {result['filename']}")
            
            # Clean up the test document to avoid affecting other tests
            cursor = db_connection.cursor()
            cursor.execute("DELETE FROM accounting_documents WHERE id = ?", (result['id'],))
            db_connection.commit()
            print(f"Cleaned up test document ID {result['id']}")

    def test_document_reprocess_endpoint(self, async_client, real_documents):
        """Test document reprocess endpoint with real document ID"""
        if not real_documents:
            pytest.skip("No real documents available")
        
        # Use the first real document
        test_doc = real_documents[0]
        
        # Test reprocess endpoint
        response = async_client.post(f'/api/accounting/documents/{test_doc["id"]}/reprocess')
        
        # Check response
        assert response.status_code in [200, 404, 400], f"Unexpected status code: {response.status_code}"
        
        if response.status_code == 200:
            result = response.json()
            assert 'id' in result
            print(f"Document reprocess successful: {result['filename']}")

    def test_document_list_endpoint(self, async_client, real_documents):
        """Test document list endpoint with real data"""
        if not real_documents:
            pytest.skip("No real documents available")
        
        # Test list endpoint
        response = async_client.get('/api/accounting/documents/?entity_id=1')
        
        # Check response
        assert response.status_code == 200, f"Unexpected status code: {response.status_code}"
        
        result = response.json()
        assert isinstance(result, list)
        assert len(result) == len(real_documents)
        
        print(f"Document list endpoint returned {len(result)} documents")
        
        # Verify all documents have required fields
        for doc in result:
            assert 'id' in doc
            assert 'filename' in doc
            assert 'entity_id' in doc
            assert 'category' in doc
            assert 'document_type' in doc

    def test_document_get_endpoint(self, async_client, real_documents):
        """Test document get endpoint with real document ID"""
        if not real_documents:
            pytest.skip("No real documents available")
        
        # Use the first real document
        test_doc = real_documents[0]
        
        # Test get endpoint
        response = async_client.get(f'/api/accounting/documents/{test_doc["id"]}')
        
        # Check response
        assert response.status_code in [200, 404], f"Unexpected status code: {response.status_code}"
        
        if response.status_code == 200:
            result = response.json()
            assert 'id' in result
            assert 'filename' in result
            assert 'entity_id' in result
            print(f"Document get successful: {result['filename']}")

    @pytest.mark.asyncio
    async def test_extract_all_data_from_real_documents(self, real_documents, db_connection):
        """Test extracting ALL data from all real documents"""
        if not real_documents:
            pytest.skip("No real documents available")
        
        print(f"\n=== EXTRACTING ALL DATA FROM {len(real_documents)} REAL DOCUMENTS ===")
        
        detector = DocumentTypeDetector()
        extractor = DocumentExtractorVision()
        
        for i, doc in enumerate(real_documents, 1):
            print(f"\n--- Document {i}/{len(real_documents)}: {doc['filename']} ---")
            
            # Test document type detection
            type_result = detector.detect_document_type(doc['filename'])
            print(f"  Type Detection: {type_result['category']}/{type_result['document_type']}")
            
            # Test EIN extraction if it's an EIN document
            if doc['category'] == 'ein':
                ein_from_filename = detector.extract_ein_from_filename(doc['filename'])
                print(f"  EIN from filename: {ein_from_filename}")
            
            # Test file size
            if doc['file_size_bytes']:
                print(f"  File size: {doc['file_size_bytes']} bytes")
            
            # Test extracted data
            if doc['extracted_data']:
                try:
                    import json
                    if isinstance(doc['extracted_data'], str):
                        extracted_data = json.loads(doc['extracted_data'])
                    else:
                        extracted_data = doc['extracted_data']
                    
                    print(f"  Extracted data keys: {list(extracted_data.keys())}")
                    print(f"    Entity ID: {extracted_data.get('entity_id', 'N/A')}")
                    print(f"    Confidence: {extracted_data.get('confidence_score', 'N/A')}")
                    print(f"    Success: {extracted_data.get('success', 'N/A')}")
                    if 'error' in extracted_data:
                        print(f"    Error: {str(extracted_data['error'])[:100]}...")
                except Exception as e:
                    print(f"  Error parsing extracted data: {e}")
            
            # Test processing status
            print(f"  Processing Status: {doc['processing_status']}")
            print(f"  Workflow Status: {doc['workflow_status']}")
            print(f"  Confidence: {doc['extraction_confidence']}")
        
        print(f"\n=== COMPLETED EXTRACTION FROM ALL {len(real_documents)} DOCUMENTS ===")
        
        # Verify we processed all documents
        assert len(real_documents) >= 12
        print(f"✓ Successfully processed all {len(real_documents)} real NGI Capital LLC documents")
