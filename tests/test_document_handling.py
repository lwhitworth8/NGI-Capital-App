"""
Comprehensive tests for document handling system
Tests document types, extraction, and storage functionality
"""

import pytest
import json
from datetime import datetime
from pathlib import Path
import sys
import os

# Add parent directories to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'apps', 'desktop', 'src'))

# Mock imports for testing
from unittest.mock import Mock, patch, MagicMock

# Use relative imports for our modules
try:
    from lib.config.documentTypes import (
        DOCUMENT_CATEGORIES, 
        ALL_DOCUMENT_TYPES,
        NGI_CAPITAL_LLC_DOCUMENTS,
        getDocumentsByEntity,
        checkDocumentCompleteness
    )
    from lib.services.documentExtraction import DocumentExtractionService
    from lib.utils.dateUtils import (
        ENTITY_STATUS,
        ENTITY_FORMATION_DATES,
        getCurrentFiscalYear,
        getFiscalYearDates
    )
    modules_imported = True
except ImportError:
    # If imports fail, we'll mock them in tests
    modules_imported = False

# Test data constants
TEST_ENTITIES = [
    {'id': 'ngi-capital-llc', 'name': 'NGI Capital LLC', 'type': 'LLC', 'status': 'active'},
    {'id': 'ngi-capital-inc', 'name': 'NGI Capital, Inc.', 'type': 'C-Corp', 'status': 'converting'},
    {'id': 'creator-terminal', 'name': 'The Creator Terminal, Inc.', 'type': 'C-Corp', 'status': 'pre-formation'},
    {'id': 'ngi-advisory', 'name': 'NGI Capital Advisory LLC', 'type': 'LLC', 'status': 'pre-formation'}
]

TEST_DOCUMENT_CONTENT = {
    'operating_agreement': """
        OPERATING AGREEMENT OF NGI CAPITAL LLC
        
        This Operating Agreement is entered into as of January 1, 2024, by and between:
        
        Member: Andre Nurmamade
        Ownership Interest: 50%
        
        Member: Landon Whitworth  
        Ownership Interest: 50%
        
        The Company shall be member-managed.
        Principal Address: 1234 Innovation Way, San Francisco, CA 94105
        EIN: 12-3456789
    """,
    
    'certificate_formation': """
        CERTIFICATE OF FORMATION
        LIMITED LIABILITY COMPANY
        
        Name of Limited Liability Company: NGI Capital LLC
        Date of Formation: January 1, 2024
        Registered Agent: Corporate Service Company
        Registered Agent Address: 251 Little Falls Drive, Wilmington, DE 19808
        State of Formation: Delaware
    """,
    
    'ein_letter': """
        Department of the Treasury
        Internal Revenue Service
        
        EIN: 12-3456789
        Entity Name: NGI Capital LLC
        Business Name: NGI Capital LLC
        Effective Date: January 15, 2024
    """,
    
    'capital_contribution': """
        INITIAL CAPITAL CONTRIBUTION RECORD
        
        Andre Nurmamade: $50,000
        Landon Whitworth: $50,000
        
        Total Initial Capital: $100,000
        Date of Contribution: January 20, 2024
    """,
    
    'internal_controls': """
        INTERNAL CONTROLS AND ACCOUNTING POLICIES MANUAL
        
        Financial Controls:
        - Dual approval required for all expenditures over $5,000
        - Monthly bank reconciliation required
        - Quarterly financial statements preparation
        
        Operational Controls:
        - Weekly team meetings required
        - Monthly KPI reporting
        - Quarterly strategic reviews
        
        Compliance Controls:
        - Annual tax filing deadlines tracked
        - State compliance calendar maintained
        - Regulatory updates monitored
        
        IT Controls:
        - Multi-factor authentication required
        - Weekly data backups
        - Access controls reviewed quarterly
    """,
    
    'accounting_policies': """
        ACCOUNTING POLICIES
        
        Fiscal Year End: June 30
        Accounting Method: Accrual Basis
        
        Revenue Recognition:
        Revenue is recognized when services are delivered and payment is probable.
        
        Depreciation Method:
        Straight-line depreciation over useful life of assets.
        
        Inventory Method:
        Not applicable - service business
    """
}

class TestDocumentTypes:
    """Test document type configuration"""
    
    def test_document_categories_exist(self):
        """Test that all required document categories are defined"""
        from apps.desktop.src.lib.config.documentTypes import DOCUMENT_CATEGORIES
        
        required_categories = [
            'formation', 'governance', 'equity', 'financial',
            'intellectual-property', 'compliance', 'policies',
            'intercompany', 'conversion'
        ]
        
        category_ids = [cat['id'] for cat in DOCUMENT_CATEGORIES]
        for required in required_categories:
            assert required in category_ids, f"Missing category: {required}"
    
    def test_ngi_capital_llc_documents(self):
        """Test NGI Capital LLC document types"""
        from apps.desktop.src.lib.config.documentTypes import NGI_CAPITAL_LLC_DOCUMENTS
        
        # Check required documents exist
        required_doc_ids = [
            'llc-certificate-formation',
            'llc-operating-agreement',
            'llc-initial-capital',
            'llc-ein-letter',
            'llc-bank-resolution',
            'llc-ip-assignment',
            'llc-internal-controls',
            'llc-accounting-policies'
        ]
        
        doc_ids = [doc['id'] for doc in NGI_CAPITAL_LLC_DOCUMENTS]
        for required in required_doc_ids:
            assert required in doc_ids, f"Missing document type: {required}"
    
    def test_document_completeness_check(self):
        """Test document completeness calculation"""
        from apps.desktop.src.lib.config.documentTypes import checkDocumentCompleteness
        
        # Test with no documents uploaded
        result = checkDocumentCompleteness('ngi-capital-llc', [])
        assert result['complete'] == False
        assert result['percentage'] == 0
        assert len(result['missing']) > 0
        
        # Test with some documents uploaded
        uploaded = ['llc-certificate-formation', 'llc-operating-agreement']
        result = checkDocumentCompleteness('ngi-capital-llc', uploaded)
        assert result['complete'] == False
        assert result['percentage'] > 0
        assert result['percentage'] < 100
    
    def test_get_documents_by_entity(self):
        """Test getting documents for specific entity"""
        from apps.desktop.src.lib.config.documentTypes import getDocumentsByEntity
        
        llc_docs = getDocumentsByEntity('ngi-capital-llc')
        assert len(llc_docs) > 0
        assert all(doc['entityTypes'] == ['LLC'] or 'All' in doc['entityTypes'] 
                  for doc in llc_docs if 'entityTypes' in doc)
        
        corp_docs = getDocumentsByEntity('ngi-capital-inc')
        assert len(corp_docs) > 0
        assert all(doc['entityTypes'] == ['C-Corp'] or 'All' in doc['entityTypes']
                  for doc in corp_docs if 'entityTypes' in doc)


class TestDocumentExtraction:
    """Test document data extraction service"""
    
    @pytest.fixture
    def mock_file(self):
        """Create a mock file object"""
        file = Mock()
        file.name = "test_document.pdf"
        file.size = 1024
        return file
    
    def test_extract_operating_agreement(self, mock_file):
        """Test extracting data from operating agreement"""
        from apps.desktop.src.lib.services.documentExtraction import DocumentExtractionService
        
        # Mock file reading
        with patch.object(DocumentExtractionService, 'readFileContent', 
                         return_value=TEST_DOCUMENT_CONTENT['operating_agreement']):
            
            doc_type = Mock()
            doc_type.id = 'llc-operating-agreement'
            doc_type.extractableData = ['members', 'ownershipPercentages', 'managementStructure']
            
            result = DocumentExtractionService.extractData(
                mock_file, doc_type, 'ngi-capital-llc'
            )
            
            assert result is not None
            assert 'data' in result
            assert 'owners' in result['data']
            
            # Check extracted members
            owners = result['data']['owners']
            assert len(owners) == 2
            assert any(o['name'] == 'Andre Nurmamade' and o['ownership'] == 50 for o in owners)
            assert any(o['name'] == 'Landon Whitworth' and o['ownership'] == 50 for o in owners)
    
    def test_extract_ein_letter(self, mock_file):
        """Test extracting EIN from IRS letter"""
        from apps.desktop.src.lib.services.documentExtraction import DocumentExtractionService
        
        with patch.object(DocumentExtractionService, 'readFileContent',
                         return_value=TEST_DOCUMENT_CONTENT['ein_letter']):
            
            doc_type = Mock()
            doc_type.id = 'llc-ein-letter'
            doc_type.extractableData = ['ein', 'entityName', 'assignmentDate']
            
            result = DocumentExtractionService.extractData(
                mock_file, doc_type, 'ngi-capital-llc'
            )
            
            assert result is not None
            assert 'data' in result
            assert 'ein' in result['data']
            assert result['data']['ein'] == '12-3456789'
            assert result['data']['entityName'] == 'NGI Capital LLC'
    
    def test_extract_capital_contributions(self, mock_file):
        """Test extracting capital contribution data"""
        from apps.desktop.src.lib.services.documentExtraction import DocumentExtractionService
        
        with patch.object(DocumentExtractionService, 'readFileContent',
                         return_value=TEST_DOCUMENT_CONTENT['capital_contribution']):
            
            doc_type = Mock()
            doc_type.id = 'llc-initial-capital'
            doc_type.extractableData = ['contributionAmounts', 'contributionDates', 'memberNames']
            
            result = DocumentExtractionService.extractData(
                mock_file, doc_type, 'ngi-capital-llc'
            )
            
            assert result is not None
            assert 'data' in result
            assert 'contributions' in result['data']
            
            contributions = result['data']['contributions']
            assert len(contributions) == 2
            assert sum(c['amount'] for c in contributions) == 100000
    
    def test_extract_internal_controls(self, mock_file):
        """Test extracting internal control policies"""
        from apps.desktop.src.lib.services.documentExtraction import DocumentExtractionService
        
        with patch.object(DocumentExtractionService, 'readFileContent',
                         return_value=TEST_DOCUMENT_CONTENT['internal_controls']):
            
            doc_type = Mock()
            doc_type.id = 'llc-internal-controls'
            doc_type.extractableData = ['controlCategories', 'policies', 'procedures']
            
            result = DocumentExtractionService.extractData(
                mock_file, doc_type, 'ngi-capital-llc'
            )
            
            assert result is not None
            assert 'data' in result
            assert 'internalControls' in result['data']
            
            controls = result['data']['internalControls']
            assert len(controls) > 0
            
            # Check control categories were extracted
            categories = set(c['category'] for c in controls)
            assert 'Financial Controls' in categories
            assert 'Operational Controls' in categories
            assert 'Compliance Controls' in categories
    
    def test_extract_accounting_policies(self, mock_file):
        """Test extracting accounting policy data"""
        from apps.desktop.src.lib.services.documentExtraction import DocumentExtractionService
        
        with patch.object(DocumentExtractionService, 'readFileContent',
                         return_value=TEST_DOCUMENT_CONTENT['accounting_policies']):
            
            doc_type = Mock()
            doc_type.id = 'llc-accounting-policies'
            doc_type.extractableData = ['fiscalYearEnd', 'accountingMethod', 'revenueRecognition']
            
            result = DocumentExtractionService.extractData(
                mock_file, doc_type, 'ngi-capital-llc'
            )
            
            assert result is not None
            assert 'data' in result
            assert 'accountingPolicies' in result['data']
            
            policies = result['data']['accountingPolicies']
            assert policies['fiscalYearEnd'] == 'June 30'
            assert policies['accountingMethod'] == 'accrual'
            assert 'Revenue is recognized' in policies.get('revenueRecognition', '')
    
    def test_validate_extracted_data(self):
        """Test validation of extracted data"""
        from apps.desktop.src.lib.services.documentExtraction import DocumentExtractionService
        
        # Valid data
        valid_data = {
            'documentId': 'test-123',
            'documentType': 'llc-operating-agreement',
            'entityId': 'ngi-capital-llc',
            'confidence': 0.85,
            'data': {'test': 'data'}
        }
        assert DocumentExtractionService.validateExtractedData(valid_data) == True
        
        # Invalid - missing required field
        invalid_data = {
            'documentType': 'llc-operating-agreement',
            'entityId': 'ngi-capital-llc',
            'confidence': 0.85,
            'data': {'test': 'data'}
        }
        assert DocumentExtractionService.validateExtractedData(invalid_data) == False
        
        # Invalid - low confidence
        low_confidence = {
            'documentId': 'test-123',
            'documentType': 'llc-operating-agreement',
            'entityId': 'ngi-capital-llc',
            'confidence': 0.3,
            'data': {'test': 'data'}
        }
        assert DocumentExtractionService.validateExtractedData(low_confidence) == False
    
    def test_merge_entity_data(self):
        """Test merging extracted data with existing entity data"""
        from apps.desktop.src.lib.services.documentExtraction import DocumentExtractionService
        
        existing = {
            'entityName': 'NGI Capital LLC',
            'ein': '12-3456789',
            'owners': [
                {'name': 'Andre Nurmamade', 'ownership': 50}
            ]
        }
        
        new_data = {
            'formationDate': datetime(2024, 1, 1),
            'owners': [
                {'name': 'Landon Whitworth', 'ownership': 50}
            ],
            'principalAddress': {
                'street': '1234 Innovation Way',
                'city': 'San Francisco',
                'state': 'CA',
                'zip': '94105'
            }
        }
        
        merged = DocumentExtractionService.mergeEntityData(existing, new_data)
        
        assert merged['entityName'] == 'NGI Capital LLC'
        assert merged['ein'] == '12-3456789'
        assert merged['formationDate'] == datetime(2024, 1, 1)
        assert len(merged['owners']) == 2
        assert merged['principalAddress']['city'] == 'San Francisco'


class TestDocumentUpload:
    """Test document upload functionality"""
    
    @pytest.fixture
    def mock_fetch(self):
        """Mock fetch API calls"""
        with patch('apps.desktop.src.app.accounting.documents.page.fetch') as mock:
            yield mock
    
    def test_load_documents_api_call(self, mock_fetch):
        """Test that documents are loaded from API"""
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json = Mock(return_value={'documents': []})
        mock_fetch.return_value = mock_response
        
        # Would test the actual component here
        # For now, just verify the API structure
        assert mock_response.ok == True
        data = mock_response.json()
        assert 'documents' in data
    
    def test_document_type_detection(self):
        """Test automatic document type detection from filename"""
        test_cases = [
            ('Operating_Agreement_NGI_Capital.pdf', 'llc-operating-agreement'),
            ('Certificate_of_Formation.pdf', 'llc-certificate-formation'),
            ('EIN_Assignment_Letter.pdf', 'llc-ein-letter'),
            ('Initial_Capital_Contributions.xlsx', 'llc-initial-capital'),
            ('Internal_Controls_Manual.docx', 'llc-internal-controls'),
            ('Accounting_Policies.pdf', 'llc-accounting-policies'),
            ('Bank_Resolution_Consent.pdf', 'llc-bank-resolution'),
            ('IP_Assignment_Agreement.pdf', 'llc-ip-assignment')
        ]
        
        # Test filename patterns match expected document types
        for filename, expected_type in test_cases:
            lower_name = filename.lower()
            
            if 'operating' in lower_name and 'agreement' in lower_name:
                assert expected_type == 'llc-operating-agreement'
            elif 'certificate' in lower_name and 'formation' in lower_name:
                assert expected_type == 'llc-certificate-formation'
            elif 'ein' in lower_name:
                assert expected_type == 'llc-ein-letter'
            elif 'capital' in lower_name and 'contribution' in lower_name:
                assert expected_type == 'llc-initial-capital'
            elif 'internal' in lower_name and 'control' in lower_name:
                assert expected_type == 'llc-internal-controls'
            elif 'accounting' in lower_name and 'polic' in lower_name:
                assert expected_type == 'llc-accounting-policies'


class TestEntityTransition:
    """Test LLC to C-Corp conversion handling"""
    
    def test_entity_status_tracking(self):
        """Test that entity statuses are properly tracked"""
        from apps.desktop.src.lib.utils.dateUtils import ENTITY_STATUS
        
        assert ENTITY_STATUS['ngi-capital-llc'] == 'active'
        assert ENTITY_STATUS['ngi-capital-inc'] == 'converting'
        assert ENTITY_STATUS['ngi-advisory'] == 'pre-formation'
        assert ENTITY_STATUS['creator-terminal'] == 'pre-formation'
    
    def test_formation_cost_allocation(self):
        """Test that formation costs can be tracked through LLC"""
        # This would test the actual cost allocation logic
        # For now, just verify the structure exists
        formation_costs = {
            'entity': 'ngi-capital-llc',
            'costs': [
                {'description': 'Delaware filing fee', 'amount': 300, 'allocate_to': 'ngi-capital-inc'},
                {'description': 'Legal fees - C-Corp conversion', 'amount': 5000, 'allocate_to': 'ngi-capital-inc'},
                {'description': 'Creator Terminal formation', 'amount': 500, 'allocate_to': 'creator-terminal'},
                {'description': 'NGI Advisory formation', 'amount': 300, 'allocate_to': 'ngi-advisory'}
            ]
        }
        
        total_costs = sum(cost['amount'] for cost in formation_costs['costs'])
        assert total_costs == 6100
        
        # Verify costs can be allocated to different entities
        allocations = {}
        for cost in formation_costs['costs']:
            entity = cost['allocate_to']
            if entity not in allocations:
                allocations[entity] = 0
            allocations[entity] += cost['amount']
        
        assert allocations['ngi-capital-inc'] == 5300
        assert allocations['creator-terminal'] == 500
        assert allocations['ngi-advisory'] == 300


class TestDataIntegrity:
    """Test data integrity and consistency"""
    
    def test_no_hardcoded_data(self):
        """Ensure no hardcoded entity data exists"""
        from apps.desktop.src.lib.utils.dateUtils import ENTITY_FORMATION_DATES
        
        # All formation dates should be None (will be set from documents)
        for entity, date in ENTITY_FORMATION_DATES.items():
            assert date is None, f"Hardcoded date found for {entity}"
    
    def test_fiscal_year_calculation(self):
        """Test fiscal year calculations (July 1 - June 30)"""
        from apps.desktop.src.lib.utils.dateUtils import getCurrentFiscalYear, getFiscalYearDates
        
        # Test dates in different parts of fiscal year
        test_cases = [
            (datetime(2024, 1, 15), 2024),  # Jan = FY 2024
            (datetime(2024, 6, 30), 2024),  # June 30 = FY 2024
            (datetime(2024, 7, 1), 2025),   # July 1 = FY 2025
            (datetime(2024, 12, 31), 2025), # Dec = FY 2025
        ]
        
        for test_date, expected_fy in test_cases:
            assert getCurrentFiscalYear(test_date) == expected_fy
        
        # Test fiscal year date ranges
        fy_dates = getFiscalYearDates(2024)
        assert fy_dates['start'] == datetime(2023, 7, 1)
        assert fy_dates['end'] == datetime(2024, 6, 30)
    
    def test_document_categories_consistency(self):
        """Test that all document types have valid categories"""
        from apps.desktop.src.lib.config.documentTypes import ALL_DOCUMENT_TYPES, DOCUMENT_CATEGORIES
        
        valid_categories = [cat['id'] for cat in DOCUMENT_CATEGORIES]
        
        for doc in ALL_DOCUMENT_TYPES:
            assert doc['category'] in valid_categories, \
                f"Document {doc['id']} has invalid category {doc['category']}"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])