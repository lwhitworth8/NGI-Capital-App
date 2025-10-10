"""
EIN Document Processor
Processes EIN documents and updates entity records with extracted EIN numbers
"""

import re
import logging
from typing import Dict, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from src.api.models_accounting import AccountingEntity

logger = logging.getLogger(__name__)


class EINProcessor:
    """Process EIN documents and update entity records"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def process_ein_document(
        self, 
        document_id: int, 
        entity_id: int, 
        extracted_data: Dict
    ) -> Optional[str]:
        """
        Process EIN document and update entity with extracted EIN
        
        Returns:
            The extracted EIN number if found and updated
        """
        try:
            # Extract EIN from the document data
            ein_number = self._extract_ein_from_data(extracted_data)
            
            if not ein_number:
                logger.warning(f"No EIN found in document {document_id}")
                return None
            
            # Validate EIN format (XX-XXXXXXX)
            if not self._validate_ein_format(ein_number):
                logger.warning(f"Invalid EIN format: {ein_number}")
                return None
            
            # Check if this EIN is already used by another entity
            existing_entity = await self._check_ein_exists(ein_number, entity_id)
            if existing_entity:
                logger.warning(f"EIN {ein_number} already exists for entity {existing_entity.id}")
                return None
            
            # Update the entity with the extracted EIN
            await self._update_entity_ein(entity_id, ein_number)
            
            logger.info(f"Successfully updated entity {entity_id} with EIN {ein_number}")
            return ein_number
            
        except Exception as e:
            logger.error(f"Error processing EIN document {document_id}: {e}")
            return None
    
    def _extract_ein_from_data(self, extracted_data: Dict) -> Optional[str]:
        """Extract EIN number from extracted document data"""
        # Check ein_numbers array first
        ein_numbers = extracted_data.get("ein_numbers", [])
        if ein_numbers and len(ein_numbers) > 0:
            # Return the first valid EIN
            for ein in ein_numbers:
                if self._validate_ein_format(ein):
                    return ein
        
        # Check raw text for EIN patterns
        raw_text = extracted_data.get("raw_text", "")
        if raw_text:
            ein_matches = re.findall(r'\b\d{2}-\d{7}\b', raw_text)
            for ein in ein_matches:
                if self._validate_ein_format(ein):
                    return ein
        
        # Check vendor_name for EIN (sometimes EIN is in the name field)
        vendor_name = extracted_data.get("vendor_name", "")
        if vendor_name:
            ein_matches = re.findall(r'\b\d{2}-\d{7}\b', vendor_name)
            for ein in ein_matches:
                if self._validate_ein_format(ein):
                    return ein
        
        # Check reference_numbers for EIN
        reference_numbers = extracted_data.get("reference_numbers", [])
        for ref in reference_numbers:
            ein_matches = re.findall(r'\b\d{2}-\d{7}\b', str(ref))
            for ein in ein_matches:
                if self._validate_ein_format(ein):
                    return ein
        
        return None
    
    def _validate_ein_format(self, ein: str) -> bool:
        """Validate EIN format (XX-XXXXXXX)"""
        pattern = r'^\d{2}-\d{7}$'
        return bool(re.match(pattern, ein))
    
    async def _check_ein_exists(self, ein: str, exclude_entity_id: int) -> Optional[AccountingEntity]:
        """Check if EIN already exists for another entity"""
        result = await self.db.execute(
            select(AccountingEntity).where(
                AccountingEntity.ein == ein,
                AccountingEntity.id != exclude_entity_id
            )
        )
        return result.scalar_one_or_none()
    
    async def _update_entity_ein(self, entity_id: int, ein: str) -> None:
        """Update entity record with EIN"""
        await self.db.execute(
            update(AccountingEntity)
            .where(AccountingEntity.id == entity_id)
            .values(ein=ein)
        )
        await self.db.commit()
    
    def extract_ein_from_filename(self, filename: str) -> Optional[str]:
        """Extract EIN from filename if present"""
        # Look for EIN pattern in filename (XX-XXXXXXX)
        ein_matches = re.findall(r'\b\d{2}-\d{7}\b', filename)
        for ein in ein_matches:
            if self._validate_ein_format(ein):
                return ein
        return None
