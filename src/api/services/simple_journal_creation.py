"""
NGI Capital - Simple Journal Entry Creation Service
Creates journal entries automatically from processed documents using basic accounting principles

Author: NGI Capital Development Team
Date: October 10, 2025
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models_accounting import (
    JournalEntry, JournalEntryLine, ChartOfAccounts, 
    AccountingEntity, JournalEntryAuditLog
)
from ..models_accounting_part2 import AccountingDocument

logger = logging.getLogger(__name__)


class SimpleJournalCreationService:
    """Simple service for creating journal entries from documents"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def process_document_for_journal_entries(
        self, 
        document: AccountingDocument,
        extracted_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Process a document and create appropriate journal entries
        Returns list of created journal entry IDs
        """
        created_entries = []
        
        try:
            # Get the total amount from extracted data
            total_amount = self._extract_amount(extracted_data)
            vendor_name = extracted_data.get('vendor_name', 'Unknown Vendor')
            
            if total_amount <= 0:
                logger.info(f"No amount found for document {document.id}, skipping journal entry creation")
                return created_entries
            
            # Determine the appropriate journal entry based on document type
            if document.category == "invoices" and document.document_type == "invoice":
                # This is an expense invoice - we owe money
                entry = await self._create_expense_entry(
                    document, extracted_data, total_amount, vendor_name
                )
                if entry:
                    created_entries.append(entry)
            
            elif document.category == "formation":
                # This is a formation cost - startup expense
                entry = await self._create_formation_entry(
                    document, extracted_data, total_amount, vendor_name
                )
                if entry:
                    created_entries.append(entry)
            
            else:
                # Default to general expense
                entry = await self._create_general_expense_entry(
                    document, extracted_data, total_amount, vendor_name
                )
                if entry:
                    created_entries.append(entry)
            
            logger.info(f"Created {len(created_entries)} journal entries for document {document.id}")
            return created_entries
            
        except Exception as e:
            logger.error(f"Error creating journal entries for document {document.id}: {str(e)}")
            return created_entries
    
    def _extract_amount(self, extracted_data: Dict[str, Any]) -> float:
        """Extract the total amount from extracted data"""
        try:
            # Try different possible amount fields
            if "total" in extracted_data:
                return float(extracted_data["total"])
            
            if "amounts" in extracted_data and extracted_data["amounts"]:
                if isinstance(extracted_data["amounts"], list) and len(extracted_data["amounts"]) > 0:
                    return float(extracted_data["amounts"][0].get("value", 0.0))
                elif isinstance(extracted_data["amounts"], dict) and "total" in extracted_data["amounts"]:
                    return float(extracted_data["amounts"]["total"])
            
            return 0.0
        except (ValueError, TypeError, KeyError):
            return 0.0
    
    async def _create_expense_entry(
        self, 
        document: AccountingDocument, 
        extracted_data: Dict[str, Any], 
        amount: float,
        vendor_name: str
    ) -> Optional[Dict[str, Any]]:
        """Create journal entry for expense invoice"""
        try:
            # Create journal entry
            entry = await self._create_journal_entry(
                entity_id=document.entity_id,
                entry_type="expense",
                source_type="DocumentExtraction",
                source_id=str(document.id),
                memo=f"Expense: {vendor_name} - {document.filename}",
                reference=extracted_data.get('reference_numbers', [''])[0] if extracted_data.get('reference_numbers') else document.filename,
                lines=[
                    {
                        "account_number": "60100",  # General Operating Expenses
                        "debit_amount": amount,
                        "credit_amount": 0,
                        "description": f"Expense from {vendor_name}"
                    },
                    {
                        "account_number": "20100",  # Accounts Payable
                        "debit_amount": 0,
                        "credit_amount": amount,
                        "description": f"Amount owed to {vendor_name}"
                    }
                ]
            )
            return entry
        except Exception as e:
            logger.error(f"Error creating expense entry: {str(e)}")
            return None
    
    async def _create_formation_entry(
        self, 
        document: AccountingDocument, 
        extracted_data: Dict[str, Any], 
        amount: float,
        vendor_name: str
    ) -> Optional[Dict[str, Any]]:
        """Create journal entry for formation costs"""
        try:
            # Create journal entry for formation costs
            entry = await self._create_journal_entry(
                entity_id=document.entity_id,
                entry_type="formation",
                source_type="DocumentExtraction",
                source_id=str(document.id),
                memo=f"Formation cost: {vendor_name} - {document.filename}",
                reference=extracted_data.get('reference_numbers', [''])[0] if extracted_data.get('reference_numbers') else document.filename,
                lines=[
                    {
                        "account_number": "60110",  # Formation & Legal Expenses
                        "debit_amount": amount,
                        "credit_amount": 0,
                        "description": f"Formation cost from {vendor_name}"
                    },
                    {
                        "account_number": "20100",  # Accounts Payable
                        "debit_amount": 0,
                        "credit_amount": amount,
                        "description": f"Amount owed to {vendor_name}"
                    }
                ]
            )
            return entry
        except Exception as e:
            logger.error(f"Error creating formation entry: {str(e)}")
            return None
    
    async def _create_general_expense_entry(
        self, 
        document: AccountingDocument, 
        extracted_data: Dict[str, Any], 
        amount: float,
        vendor_name: str
    ) -> Optional[Dict[str, Any]]:
        """Create journal entry for general expenses"""
        try:
            # Create journal entry for general expenses
            entry = await self._create_journal_entry(
                entity_id=document.entity_id,
                entry_type="expense",
                source_type="DocumentExtraction",
                source_id=str(document.id),
                memo=f"General expense: {vendor_name} - {document.filename}",
                reference=extracted_data.get('reference_numbers', [''])[0] if extracted_data.get('reference_numbers') else document.filename,
                lines=[
                    {
                        "account_number": "60100",  # General Operating Expenses
                        "debit_amount": amount,
                        "credit_amount": 0,
                        "description": f"Expense from {vendor_name}"
                    },
                    {
                        "account_number": "20100",  # Accounts Payable
                        "debit_amount": 0,
                        "credit_amount": amount,
                        "description": f"Amount owed to {vendor_name}"
                    }
                ]
            )
            return entry
        except Exception as e:
            logger.error(f"Error creating general expense entry: {str(e)}")
            return None
    
    async def _create_journal_entry(
        self,
        entity_id: int,
        entry_type: str,
        source_type: str,
        source_id: str,
        memo: str,
        reference: str,
        lines: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Create a journal entry with the given lines"""
        try:
            # Generate entry number
            entry_number = await self._generate_entry_number(entity_id)
            
            # Create journal entry
            journal_entry = JournalEntry(
                entity_id=entity_id,
                entry_number=entry_number,
                entry_type=entry_type,
                entry_date=datetime.utcnow().date(),
                memo=memo,
                reference=reference,
                source_type=source_type,
                source_id=source_id,
                status="draft",
                created_by="system",
                created_at=datetime.utcnow()
            )
            
            self.db.add(journal_entry)
            await self.db.flush()  # Get the ID
            
            # Create journal entry lines
            for line_data in lines:
                line = JournalEntryLine(
                    journal_entry_id=journal_entry.id,
                    account_number=line_data["account_number"],
                    debit_amount=Decimal(str(line_data["debit_amount"])),
                    credit_amount=Decimal(str(line_data["credit_amount"])),
                    description=line_data["description"],
                    created_at=datetime.utcnow()
                )
                self.db.add(line)
            
            await self.db.commit()
            
            return {
                "id": journal_entry.id,
                "entry_number": journal_entry.entry_number,
                "memo": journal_entry.memo,
                "amount": sum(line_data["debit_amount"] for line_data in lines)
            }
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating journal entry: {str(e)}")
            raise
    
    async def _generate_entry_number(self, entity_id: int) -> str:
        """Generate a unique journal entry number"""
        try:
            # Get the latest entry number for this entity
            result = await self.db.execute(
                select(JournalEntry.entry_number)
                .where(JournalEntry.entity_id == entity_id)
                .order_by(JournalEntry.created_at.desc())
                .limit(1)
            )
            latest_entry = result.scalar_one_or_none()
            
            if latest_entry:
                # Extract number and increment
                try:
                    number = int(latest_entry.split('-')[-1])
                    next_number = number + 1
                except (ValueError, IndexError):
                    next_number = 1
            else:
                next_number = 1
            
            return f"JE-{entity_id}-{next_number:04d}"
            
        except Exception as e:
            logger.error(f"Error generating entry number: {str(e)}")
            return f"JE-{entity_id}-{int(datetime.utcnow().timestamp())}"
