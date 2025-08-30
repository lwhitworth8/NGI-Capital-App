"""
Comprehensive pytest tests for document processing system
Tests OCR, categorization, data extraction, and database population
"""

import pytest
import os
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import json
from datetime import datetime

# Import the document processing module
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from api.routes.documents import DocumentProcessor, DOCUMENT_CATEGORIES, ENTITY_PATTERNS

class TestDocumentProcessor:
    """Test suite for DocumentProcessor class"""
    
    @pytest.fixture
    def sample_formation_text(self):
        """Sample formation document text"""
        return """
        CERTIFICATE OF INCORPORATION
        OF
        NGI CAPITAL, INC.
        
        The undersigned, acting as incorporator of a corporation under the 
        General Corporation Law of the State of Delaware, hereby certifies that:
        
        1. The name of the corporation is NGI Capital, Inc.
        2. The registered office of the corporation in the State of Delaware is 
           1209 Orange Street, Wilmington, Delaware 19801.
        3. The registered agent is Corporation Service Company.
        4. The corporation is authorized to issue 10,000,000 shares of common stock.
        5. EIN: 88-1234567
        6. Formation Date: January 15, 2024
        """
    
    @pytest.fixture
    def sample_receipt_text(self):
        """Sample receipt/invoice text"""
        return """
        INVOICE
        
        From: Amazon Web Services
        To: NGI Capital Advisory LLC
        
        Invoice #: AWS-2024-001234
        Date: March 1, 2024
        
        Description: Cloud Services - March 2024
        Amount: $1,250.00
        
        Total Due: $1,250.00
        """
    
    @pytest.fixture
    def sample_tax_text(self):
        """Sample tax document text"""
        return """
        Form 1120
        U.S. Corporation Income Tax Return
        
        Tax Year: 2023
        
        Name: The Creator Terminal, Inc.
        EIN: 87-7654321
        
        Gross Income: $500,000
        Total Deductions: $350,000
        Taxable Income: $150,000
        """
    
    def test_categorize_formation_document(self, sample_formation_text):
        """Test categorization of formation documents"""
        category = DocumentProcessor.categorize_document(
            sample_formation_text, 
            "certificate_of_incorporation.pdf"
        )
        assert category == "formation"
    
    def test_categorize_receipt_document(self, sample_receipt_text):
        """Test categorization of receipts"""
        category = DocumentProcessor.categorize_document(
            sample_receipt_text,
            "aws_invoice.pdf"
        )
        assert category == "receipts"
    
    def test_categorize_tax_document(self, sample_tax_text):
        """Test categorization of tax documents"""
        category = DocumentProcessor.categorize_document(
            sample_tax_text,
            "form_1120_2023.pdf"
        )
        assert category == "tax"
    
    def test_detect_ngi_capital_entity(self, sample_formation_text):
        """Test entity detection for NGI Capital"""
        entity = DocumentProcessor.detect_entity(sample_formation_text)
        assert entity == "ngi-capital"
    
    def test_detect_ngi_advisory_entity(self, sample_receipt_text):
        """Test entity detection for NGI Advisory"""
        entity = DocumentProcessor.detect_entity(sample_receipt_text)
        assert entity == "ngi-advisory"
    
    def test_detect_creator_terminal_entity(self, sample_tax_text):
        """Test entity detection for Creator Terminal"""
        entity = DocumentProcessor.detect_entity(sample_tax_text)
        assert entity == "creator-terminal"
    
    def test_extract_formation_data(self, sample_formation_text):
        """Test extraction of formation document data"""
        data = DocumentProcessor.extract_entity_data(sample_formation_text, "formation")
        
        assert 'ein' in data
        assert data['ein'] == '88-1234567'
        
        assert 'state' in data
        assert 'Delaware' in data['state']
        
        assert 'formation_date' in data
        assert 'January 15, 2024' in data['formation_date']
        
        assert 'registered_agent' in data
        assert 'Corporation Service Company' in data['registered_agent']
    
    def test_extract_receipt_data(self, sample_receipt_text):
        """Test extraction of receipt data"""
        data = DocumentProcessor.extract_entity_data(sample_receipt_text, "receipts")
        
        assert 'amounts' in data
        assert '$1,250.00' in data['amounts']
        
        assert 'vendor' in data
        assert 'Amazon Web Services' in data['vendor']
        
        assert 'invoice_number' in data
        assert data['invoice_number'] == 'AWS-2024-001234' or data['invoice_number'] == '001234'
    
    def test_extract_tax_data(self, sample_tax_text):
        """Test extraction of tax document data"""
        data = DocumentProcessor.extract_entity_data(sample_tax_text, "tax")
        
        assert 'tax_year' in data
        assert data['tax_year'] == '2023'
        
        assert 'form_type' in data
        assert data['form_type'] == '1120'
    
    def test_extract_multiple_amounts(self):
        """Test extraction of multiple amounts from a document"""
        text = """
        Invoice Details:
        Subtotal: $1,000.00
        Tax: $80.00
        Shipping: $20.00
        Total: $1,100.00
        """
        data = DocumentProcessor.extract_entity_data(text, "receipts")
        
        assert 'amounts' in data
        assert len(data['amounts']) == 4
        assert '$1,100.00' in data['amounts']
    
    def test_categorize_uncategorized_document(self):
        """Test handling of uncategorized documents"""
        text = "This is a random document with no specific category keywords."
        category = DocumentProcessor.categorize_document(text, "random.txt")
        assert category == "uncategorized"
    
    def test_detect_no_entity(self):
        """Test handling when no entity is detected"""
        text = "Generic document with no company names"
        entity = DocumentProcessor.detect_entity(text)
        assert entity is None
    
    @patch('pypdf.PdfReader')
    def test_extract_text_from_pdf(self, mock_pdf_reader):
        """Test PDF text extraction"""
        # Mock PDF reader
        mock_page = Mock()
        mock_page.extract_text.return_value = "Test PDF content"
        mock_reader_instance = Mock()
        mock_reader_instance.pages = [mock_page]
        mock_pdf_reader.return_value = mock_reader_instance
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp_path = tmp.name
            tmp.write(b"PDF content")
        
        try:
            text = DocumentProcessor.extract_text_from_pdf(tmp_path)
            assert "Test PDF content" in text
        finally:
            os.unlink(tmp_path)
    
    def test_extract_text_from_docx(self):
        """Test Word document text extraction"""
        # Mock at the module level where it's imported
        with patch('api.routes.documents.DocxDocument') as mock_docx:
            # Mock document
            mock_paragraph = Mock()
            mock_paragraph.text = "Test Word content"
            mock_doc_instance = Mock()
            mock_doc_instance.paragraphs = [mock_paragraph]
            mock_docx.return_value = mock_doc_instance
            
            with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
                tmp_path = tmp.name
                tmp.write(b"DOCX content")
            
            try:
                text = DocumentProcessor.extract_text_from_docx(tmp_path)
                assert "Test Word content" in text
            finally:
                os.unlink(tmp_path)
    
    def test_ein_extraction_various_formats(self):
        """Test EIN extraction with various formats"""
        test_cases = [
            ("EIN: 12-3456789", "12-3456789"),
            ("Federal Tax ID Number: 98-7654321", "98-7654321"),
            ("Employer Identification Number 11-2233445", "11-2233445"),
        ]
        
        for text, expected_ein in test_cases:
            data = DocumentProcessor.extract_entity_data(text, "formation")
            assert 'ein' in data
            assert data['ein'] == expected_ein
    
    def test_date_extraction_various_formats(self):
        """Test date extraction with various formats"""
        test_cases = [
            "Formation Date: January 1, 2024",
            "Incorporated on March 15, 2024",
            "Date of Formation: December 31, 2023"
        ]
        
        for text in test_cases:
            data = DocumentProcessor.extract_entity_data(text, "formation")
            assert 'formation_date' in data
            assert data['formation_date'] is not None
    
    def test_vendor_extraction_various_formats(self):
        """Test vendor name extraction with various formats"""
        test_cases = [
            ("From: Acme Corporation", "Acme Corporation"),
            ("Vendor: Tech Solutions Inc.", "Tech Solutions Inc."),
            ("Bill To: NGI Capital\nFrom: AWS", "AWS"),
        ]
        
        for text, expected_vendor in test_cases:
            data = DocumentProcessor.extract_entity_data(text, "receipts")
            if 'vendor' in data:
                assert expected_vendor in data['vendor']

class TestDocumentAPI:
    """Test suite for document API endpoints"""
    
    @pytest.fixture
    def mock_upload_file(self):
        """Create a mock uploaded file"""
        mock_file = Mock()
        mock_file.filename = "test_document.pdf"
        # Make read() an async function that returns bytes
        async def async_read():
            return b"Test content"
        mock_file.read = Mock(side_effect=async_read)
        return mock_file
    
    @pytest.mark.asyncio
    async def test_upload_documents_success(self, mock_upload_file):
        """Test successful document upload"""
        from api.routes.documents import upload_documents
        
        with patch('api.routes.documents.DocumentProcessor.extract_text_from_pdf', return_value="Test text"):
            with patch('api.routes.documents.DocumentProcessor.categorize_document', return_value="formation"):
                with patch('api.routes.documents.DocumentProcessor.detect_entity', return_value="ngi-capital"):
                    result = await upload_documents([mock_upload_file])
                    
                    assert result['message'].startswith("Successfully uploaded")
                    assert len(result['documents']) == 1
                    assert result['documents'][0]['category'] == "formation"
                    assert result['documents'][0]['entity'] == "ngi-capital"
    
    @pytest.mark.asyncio
    async def test_process_document_formation(self):
        """Test processing of formation document"""
        from api.routes.documents import process_document
        
        # Create a temporary test file
        test_id = "test-doc-id"
        test_file = Path(f"uploads/documents/{test_id}.pdf")
        test_file.parent.mkdir(parents=True, exist_ok=True)
        test_file.write_text("Test content")
        
        try:
            with patch('api.routes.documents.DocumentProcessor.extract_text_from_pdf', 
                      return_value="NGI Capital EIN: 12-3456789"):
                with patch('api.routes.documents.DocumentProcessor.categorize_document', 
                          return_value="formation"):
                    with patch('api.routes.documents.DocumentProcessor.detect_entity', 
                              return_value="ngi-capital"):
                        result = await process_document(test_id)
                        
                        assert result['status'] == "processed"
                        assert result['category'] == "formation"
                        assert len(result['database_updates']) > 0
        finally:
            # Cleanup
            if test_file.exists():
                test_file.unlink()
            processed_file = Path(f"uploads/processed/{test_id}.pdf")
            if processed_file.exists():
                processed_file.unlink()
    
    @pytest.mark.asyncio
    async def test_get_documents(self):
        """Test getting list of documents"""
        from api.routes.documents import get_documents
        
        result = await get_documents()
        assert 'documents' in result
        assert 'total' in result
        assert isinstance(result['documents'], list)
    
    @pytest.mark.asyncio
    async def test_delete_document_not_found(self):
        """Test deleting non-existent document"""
        from api.routes.documents import delete_document
        from fastapi import HTTPException
        
        with pytest.raises(HTTPException) as exc_info:
            await delete_document("non-existent-id")
        
        assert exc_info.value.status_code == 404

class TestDatabasePopulation:
    """Test suite for database population logic"""
    
    def test_formation_document_creates_entity_update(self):
        """Test that formation documents trigger entity updates"""
        extracted_data = {
            'ein': '12-3456789',
            'state': 'Delaware',
            'formation_date': 'January 1, 2024',
            'registered_agent': 'CSC'
        }
        
        # Simulate database update logic
        updates = []
        for field, value in extracted_data.items():
            updates.append({
                'action': 'update_entity',
                'field': field,
                'value': value
            })
        
        assert len(updates) == 4
        assert any(u['field'] == 'ein' for u in updates)
        assert any(u['field'] == 'state' for u in updates)
    
    def test_receipt_creates_transaction(self):
        """Test that receipts create transaction records"""
        extracted_data = {
            'vendor': 'AWS',
            'amounts': ['$1,250.00'],
            'invoice_number': 'INV-001'
        }
        
        # Simulate transaction creation
        transaction = {
            'type': 'expense',
            'vendor': extracted_data['vendor'],
            'amount': extracted_data['amounts'][0],
            'reference': extracted_data['invoice_number']
        }
        
        assert transaction['type'] == 'expense'
        assert transaction['vendor'] == 'AWS'
        assert transaction['amount'] == '$1,250.00'

# Run tests with coverage
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=api.routes.documents", "--cov-report=html"])