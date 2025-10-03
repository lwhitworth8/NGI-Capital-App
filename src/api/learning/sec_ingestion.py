"""
SEC Data Ingestion for NGI Learning Module
Uses sec-edgar-downloader to fetch 10-K/10-Q filings
Following specifications from MarkdownFiles/NGILearning/Appendix.Ingestion.Spec.md
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Optional
from sec_edgar_downloader import Downloader


class SECDataIngester:
    """
    Fetch SEC filings for learning module companies.
    Rate-limited to SEC's 10 requests/second guideline.
    """
    
    def __init__(self, company_name: str = "NGI Capital Advisory", email: str = "api@ngicapitaladvisory.com"):
        """
        Initialize SEC downloader with company name and email (required by SEC).
        
        Args:
            company_name: Your company name (SEC requirement)
            email: Contact email (SEC requirement)
        """
        self.company_name = company_name
        self.email = email
        self.downloader = Downloader(company_name, email)
        self.output_dir = "uploads/sec_filings"
        os.makedirs(self.output_dir, exist_ok=True)
    
    def ingest_company(
        self,
        ticker: str,
        cik: Optional[str] = None,
        filing_types: List[str] = None,
        num_filings: int = 5
    ) -> Dict:
        """
        Ingest SEC filings for a company.
        
        Args:
            ticker: Company ticker symbol
            cik: SEC CIK number (optional, will lookup from ticker)
            filing_types: List of filing types to download (default: ['10-K', '10-Q'])
            num_filings: Number of each filing type to download
        
        Returns:
            Dictionary with ingestion results
        """
        if filing_types is None:
            filing_types = ['10-K', '10-Q']
        
        results = {
            'ticker': ticker,
            'cik': cik,
            'timestamp': datetime.utcnow().isoformat(),
            'filings_downloaded': [],
            'errors': []
        }
        
        try:
            # Download each filing type
            for filing_type in filing_types:
                try:
                    # Download to our custom directory
                    download_path = os.path.join(self.output_dir, ticker)
                    
                    # Use ticker (downloader will resolve CIK automatically)
                    num_downloaded = self.downloader.get(
                        filing_type,
                        ticker,
                        amount=num_filings,
                        download_details=True
                    )
                    
                    results['filings_downloaded'].append({
                        'filing_type': filing_type,
                        'count': num_filings,
                        'status': 'success'
                    })
                    
                except Exception as e:
                    results['errors'].append({
                        'filing_type': filing_type,
                        'error': str(e)
                    })
            
            # Save ingestion metadata
            metadata_path = os.path.join(self.output_dir, ticker, 'ingestion_metadata.json')
            os.makedirs(os.path.dirname(metadata_path), exist_ok=True)
            with open(metadata_path, 'w') as f:
                json.dump(results, f, indent=2)
            
            results['status'] = 'completed' if not results['errors'] else 'completed_with_errors'
            
        except Exception as e:
            results['status'] = 'failed'
            results['errors'].append({
                'stage': 'ingestion',
                'error': str(e)
            })
        
        return results
    
    def get_filing_path(self, ticker: str, filing_type: str) -> Optional[str]:
        """
        Get path to downloaded filings.
        
        Args:
            ticker: Company ticker
            filing_type: Filing type (e.g., '10-K')
        
        Returns:
            Path to filing directory or None if not found
        """
        path = os.path.join(self.output_dir, ticker, 'sec-edgar-filings', ticker, filing_type)
        return path if os.path.exists(path) else None
    
    def extract_financial_tables(self, ticker: str) -> Dict:
        """
        Extract financial statement tables from downloaded filings.
        Basic extraction for V1 - will be enhanced with pdfplumber/XBRL parsing later.
        
        Args:
            ticker: Company ticker
        
        Returns:
            Dictionary with extracted financial data
        """
        # Placeholder for V1 - actual extraction will use pdfplumber + XBRL
        return {
            'ticker': ticker,
            'extraction_status': 'pending',
            'message': 'Table extraction will be implemented with pdfplumber in next iteration',
            'filing_path': self.get_filing_path(ticker, '10-K')
        }

