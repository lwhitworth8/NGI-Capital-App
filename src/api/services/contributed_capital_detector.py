"""
Contributed Capital Detection Service
Determines if expenses should be classified as contributed capital based on Mercury Bank first deposit date
"""

import logging
from typing import Dict, Any, Optional
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models_accounting import AccountingEntity
from .mercury_sync import MercurySyncService

logger = logging.getLogger(__name__)


class ContributedCapitalDetector:
    """Service to detect if expenses should be classified as contributed capital"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.mercury_sync = MercurySyncService(db)
    
    async def is_contributed_capital(
        self, 
        entity_id: int, 
        amount: Decimal, 
        extracted_data: Dict[str, Any]
    ) -> bool:
        """
        Determine if an expense should be classified as contributed capital
        
        Args:
            entity_id: Entity ID
            amount: Expense amount
            extracted_data: Data extracted from document by GPT-5 Vision
            
        Returns:
            True if should be contributed capital, False if regular expense
        """
        try:
            # Get Mercury first deposit date for entity
            first_deposit_date = await self.mercury_sync.get_first_deposit_date(entity_id)
            
            if not first_deposit_date:
                # No Mercury deposit yet - all expenses are contributed capital
                logger.info(f"Entity {entity_id}: No Mercury deposit date found, treating as contributed capital")
                return True
            
            # Extract transaction date from document
            transaction_date = self._extract_transaction_date(extracted_data)
            
            if not transaction_date:
                # If we can't determine date, assume it's contributed capital for safety
                logger.warning(f"Entity {entity_id}: Could not extract transaction date, treating as contributed capital")
                return True
            
            # Compare transaction date with first deposit date
            is_contributed = transaction_date < first_deposit_date
            
            logger.info(f"Entity {entity_id}: Transaction date {transaction_date} vs first deposit {first_deposit_date} -> {'Contributed Capital' if is_contributed else 'Regular Expense'}")
            
            return is_contributed
            
        except Exception as e:
            logger.error(f"Error determining contributed capital status: {str(e)}")
            # Default to contributed capital for safety
            return True
    
    def _extract_transaction_date(self, extracted_data: Dict[str, Any]) -> Optional[date]:
        """Extract transaction date from GPT-5 Vision extracted data"""
        try:
            # Look for dates in the extracted data
            dates = extracted_data.get("dates", {})
            
            # Try different date fields in order of preference
            date_fields = [
                "invoice_date",
                "service_date", 
                "transaction_date",
                "date"
            ]
            
            for field in date_fields:
                if field in dates and dates[field]:
                    date_str = dates[field]
                    if isinstance(date_str, str):
                        # Parse various date formats
                        parsed_date = self._parse_date_string(date_str)
                        if parsed_date:
                            return parsed_date
            
            # If no specific date found, return None
            return None
            
        except Exception as e:
            logger.error(f"Error extracting transaction date: {str(e)}")
            return None
    
    def _parse_date_string(self, date_str: str) -> Optional[date]:
        """Parse date string in various formats"""
        try:
            # Try YYYY-MM-DD format first
            if len(date_str) == 10 and date_str.count('-') == 2:
                return datetime.strptime(date_str, "%Y-%m-%d").date()
            
            # Try MM/DD/YYYY format
            if len(date_str) == 10 and date_str.count('/') == 2:
                return datetime.strptime(date_str, "%m/%d/%Y").date()
            
            # Try MM/DD/YY format
            if len(date_str) == 8 and date_str.count('/') == 2:
                parsed = datetime.strptime(date_str, "%m/%d/%y").date()
                # Adjust for 2-digit year
                if parsed.year < 2000:
                    parsed = parsed.replace(year=parsed.year + 100)
                return parsed
            
            # Try other common formats
            formats = [
                "%Y-%m-%d",
                "%m/%d/%Y", 
                "%m/%d/%y",
                "%d/%m/%Y",
                "%d-%m-%Y",
                "%B %d, %Y",
                "%b %d, %Y",
                "%d %B %Y",
                "%d %b %Y"
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(date_str, fmt).date()
                except ValueError:
                    continue
            
            return None
            
        except Exception as e:
            logger.error(f"Error parsing date string '{date_str}': {str(e)}")
            return None
    
    async def get_contributed_capital_split(self, entity_id: int) -> Dict[str, str]:
        """
        Get the account numbers for contributed capital split
        
        Returns:
            Dict with 'andre' and 'landon' account numbers
        """
        return {
            "andre": "30510",  # Member Capital - Andre Nurmamade
            "landon": "30520"  # Member Capital - Landon Whitworth
        }
    
    async def create_contributed_capital_journal_lines(
        self, 
        amount: Decimal, 
        description: str,
        entity_id: int
    ) -> list:
        """
        Create journal entry lines for contributed capital (50/50 split)
        
        Args:
            amount: Total contributed capital amount
            description: Description for the journal entry
            entity_id: Entity ID
            
        Returns:
            List of journal entry line dictionaries
        """
        half_amount = amount / 2
        
        return [
            {
                "account_number": "30510",  # Member Capital - Andre Nurmamade
                "debit_amount": 0,
                "credit_amount": float(half_amount),
                "description": f"Andre Nurmamade - {description}"
            },
            {
                "account_number": "30520",  # Member Capital - Landon Whitworth
                "debit_amount": 0,
                "credit_amount": float(half_amount),
                "description": f"Landon Whitworth - {description}"
            }
        ]




