"""
Document Type Auto-Detection Service
Automatically detects document types based on filename and content patterns
"""

import re
import logging
from typing import Dict, Optional, List
from pathlib import Path

logger = logging.getLogger(__name__)


class DocumentTypeDetector:
    """Auto-detect document types based on filename and content patterns"""
    
    def __init__(self):
        # EIN/Federal document patterns
        self.ein_patterns = [
            r'ein_federal',
            r'ein.*federal',
            r'federal.*ein',
            r'irs.*ein',
            r'ein.*certificate',
            r'tax.*id',
            r'employer.*identification',
            r'federal.*tax.*id'
        ]
        
        # Formation document patterns
        self.formation_patterns = [
            r'formation',
            r'articles.*incorporation',
            r'articles.*organization',
            r'certificate.*formation',
            r'certificate.*incorporation',
            r'de.*formation',
            r'state.*filing'
        ]
        
        # Operating agreement patterns
        self.operating_agreement_patterns = [
            r'operating.*agreement',
            r'operating.*agreement.*amendment',
            r'amendment.*operating'
        ]
        
        # Bylaws patterns
        self.bylaws_patterns = [
            r'bylaws',
            r'corporate.*bylaws'
        ]
        
        # Board resolution patterns
        self.board_resolution_patterns = [
            r'board.*resolution',
            r'resolution.*board',
            r'company.*resolution'
        ]
        
        # Invoice patterns
        self.invoice_patterns = [
            r'invoice',
            r'bill',
            r'statement'
        ]
        
        # Receipt patterns
        self.receipt_patterns = [
            r'receipt',
            r'payment.*confirmation',
            r'payment.*receipt'
        ]
        
        # Bank statement patterns
        self.bank_statement_patterns = [
            r'bank.*statement',
            r'statement.*bank',
            r'account.*statement'
        ]
        
        # Tax document patterns
        self.tax_patterns = [
            r'tax.*return',
            r'form.*1120',
            r'form.*1065',
            r'form.*941',
            r'form.*940',
            r'quarterly.*return',
            r'annual.*return'
        ]
        
        # Stock certificate patterns
        self.stock_certificate_patterns = [
            r'stock.*certificate',
            r'share.*certificate',
            r'certificate.*stock'
        ]
        
        # Shareholder agreement patterns
        self.shareholder_agreement_patterns = [
            r'shareholder.*agreement',
            r'stockholder.*agreement',
            r'stock.*agreement'
        ]
        
        # Partnership agreement patterns
        self.partnership_agreement_patterns = [
            r'partnership.*agreement',
            r'partnership.*agreement.*amendment'
        ]
        
        # Internal controls patterns
        self.internal_controls_patterns = [
            r'internal.*control',
            r'control.*manual',
            r'accounting.*control',
            r'financial.*control',
            r'internal.*controls',
            r'controls.*manual',
            r'accounting.*controls',
            r'financial.*controls'
        ]
        
        # Accounting policies patterns
        self.accounting_policies_patterns = [
            r'accounting.*polic',
            r'polic.*accounting',
            r'accounting.*procedure',
            r'procedure.*accounting',
            r'accounting.*policies',
            r'policies.*accounting',
            r'accounting.*procedures',
            r'procedures.*accounting'
        ]
    
    def detect_document_type(self, filename: str, content_hint: Optional[str] = None) -> Dict[str, str]:
        """
        Detect document type based on filename and optional content
        
        Returns:
            Dict with 'document_type' and 'category' keys
        """
        filename_lower = filename.lower()
        
        # Check for EIN/Federal documents first (highest priority)
        if self._matches_patterns(filename_lower, self.ein_patterns):
            return {
                'document_type': 'federal',
                'category': 'ein'
            }
        
        # Check for formation documents
        if self._matches_patterns(filename_lower, self.formation_patterns):
            return {
                'document_type': 'formation',
                'category': 'formation'
            }
        
        # Check for operating agreements
        if self._matches_patterns(filename_lower, self.operating_agreement_patterns):
            return {
                'document_type': 'contract',
                'category': 'operating_agreement'
            }
        
        # Check for bylaws
        if self._matches_patterns(filename_lower, self.bylaws_patterns):
            return {
                'document_type': 'contract',
                'category': 'bylaws'
            }
        
        # Check for board resolutions
        if self._matches_patterns(filename_lower, self.board_resolution_patterns):
            return {
                'document_type': 'contract',
                'category': 'board_resolution'
            }
        
        # Check for stock certificates
        if self._matches_patterns(filename_lower, self.stock_certificate_patterns):
            return {
                'document_type': 'certificate',
                'category': 'stock_certificate'
            }
        
        # Check for shareholder agreements
        if self._matches_patterns(filename_lower, self.shareholder_agreement_patterns):
            return {
                'document_type': 'contract',
                'category': 'shareholder_agreement'
            }
        
        # Check for partnership agreements
        if self._matches_patterns(filename_lower, self.partnership_agreement_patterns):
            return {
                'document_type': 'contract',
                'category': 'partnership_agreement'
            }
        
        # Check for internal controls
        if self._matches_patterns(filename_lower, self.internal_controls_patterns):
            return {
                'document_type': 'internal_controls',
                'category': 'policies'
            }
        
        # Check for accounting policies
        if self._matches_patterns(filename_lower, self.accounting_policies_patterns):
            return {
                'document_type': 'accounting_policies',
                'category': 'policies'
            }
        
        # Check for tax documents
        if self._matches_patterns(filename_lower, self.tax_patterns):
            return {
                'document_type': 'tax',
                'category': 'tax'
            }
        
        # Check for invoices
        if self._matches_patterns(filename_lower, self.invoice_patterns):
            return {
                'document_type': 'invoice',
                'category': 'invoices'
            }
        
        # Check for receipts
        if self._matches_patterns(filename_lower, self.receipt_patterns):
            return {
                'document_type': 'receipt',
                'category': 'receipts'
            }
        
        # Check for bank statements
        if self._matches_patterns(filename_lower, self.bank_statement_patterns):
            return {
                'document_type': 'bank_statement',
                'category': 'banking'
            }
        
        # If content hint is provided, check it too
        if content_hint:
            content_lower = content_hint.lower()
            
            # Check for EIN in content
            if self._contains_ein_patterns(content_lower):
                return {
                    'document_type': 'federal',
                    'category': 'ein'
                }
            
            # Check for formation keywords in content
            if any(keyword in content_lower for keyword in ['articles of incorporation', 'articles of organization', 'certificate of formation']):
                return {
                    'document_type': 'formation',
                    'category': 'formation'
                }
        
        # Default fallback
        return {
            'document_type': 'other',
            'category': 'other'
        }
    
    def _matches_patterns(self, text: str, patterns: List[str]) -> bool:
        """Check if text matches any of the given patterns"""
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False
    
    def _contains_ein_patterns(self, text: str) -> bool:
        """Check if text contains EIN-related patterns"""
        ein_content_patterns = [
            r'employer identification number',
            r'federal tax id',
            r'ein.*\d{2}-\d{7}',
            r'tax.*id.*\d{2}-\d{7}',
            r'irs.*\d{2}-\d{7}',
            r'federal.*\d{2}-\d{7}'
        ]
        
        return self._matches_patterns(text, ein_content_patterns)
    
    def extract_ein_from_filename(self, filename: str) -> Optional[str]:
        """Extract EIN from filename if present"""
        # Look for EIN pattern in filename (XX-XXXXXXX)
        ein_match = re.search(r'(\d{2}-\d{7})', filename)
        if ein_match:
            return ein_match.group(1)
        return None
    
    def extract_ein_from_content(self, content: str) -> List[str]:
        """Extract all EIN numbers from content"""
        # Find all EIN patterns in content
        ein_pattern = r'\b\d{2}-\d{7}\b'
        ein_matches = re.findall(ein_pattern, content)
        return ein_matches
