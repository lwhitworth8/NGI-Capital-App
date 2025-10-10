"""
NGI Capital - Automatic Journal Entry Creation Service
Creates journal entries automatically from processed documents

Author: NGI Capital Development Team
Date: October 8, 2025
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


class AutoJournalCreationService:
    """Service for automatically creating journal entries from documents"""
    
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
            # Determine document type and create appropriate journal entries
            if document.category == "formation":
                entries = await self._create_formation_journal_entries(document, extracted_data)
                created_entries.extend(entries)
            
            elif document.category == "invoices":
                entries = await self._create_invoice_journal_entries(document, extracted_data)
                created_entries.extend(entries)
            
            elif document.category == "bills":
                entries = await self._create_bill_journal_entries(document, extracted_data)
                created_entries.extend(entries)
            
            elif document.category == "receipts":
                entries = await self._create_receipt_journal_entries(document, extracted_data)
                created_entries.extend(entries)
            
            elif document.category == "banking":
                entries = await self._create_banking_journal_entries(document, extracted_data)
                created_entries.extend(entries)
            
            elif document.category == "ein":
                entries = await self._create_ein_journal_entries(document, extracted_data)
                created_entries.extend(entries)
            
            elif document.category == "other":
                # For 'other' category, try to determine from document type
                if document.document_type in ["Receipt", "receipt"]:
                    entries = await self._create_receipt_journal_entries(document, extracted_data)
                    created_entries.extend(entries)
                elif document.document_type in ["federal", "tax"]:
                    entries = await self._create_tax_journal_entries(document, extracted_data)
                    created_entries.extend(entries)
                else:
                    # Default to general expense for unknown types
                    entries = await self._create_general_expense_journal_entries(document, extracted_data)
                    created_entries.extend(entries)
            
            # Update document status
            document.processing_status = "journal_entries_created"
            await self.db.commit()
            
            logger.info(f"Created {len(created_entries)} journal entries for document {document.id}")
            return created_entries
            
        except Exception as e:
            logger.error(f"Error creating journal entries for document {document.id}: {e}")
            document.processing_status = "journal_creation_failed"
            await self.db.commit()
            raise
    
    async def _create_formation_journal_entries(
        self, 
        document: AccountingDocument, 
        extracted_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Create journal entries for formation documents"""
        created_entries = []
        
        # For LLC formation, create initial capital contribution entry
        if document.document_type in ["llc-certificate-formation", "llc-operating-agreement"]:
            if "capital_contribution" in extracted_data:
                amount = float(extracted_data["capital_contribution"])
                
                # Create journal entry for initial capital contribution
                entry = await self._create_journal_entry(
                    entity_id=document.entity_id,
                    entry_type="formation",
                    source_type="DocumentExtraction",
                    source_id=str(document.id),
                    memo=f"Initial capital contribution - {document.document_type}",
                    reference=document.filename,
                    lines=[
                        {
                            "account_number": "10110",  # Cash - Operating Account
                            "debit_amount": amount,
                            "credit_amount": 0,
                            "description": "Initial capital contribution"
                        },
                        {
                            "account_number": "30510",  # Member Capital - Landon Whitworth
                            "debit_amount": 0,
                            "credit_amount": amount,
                            "description": "Initial capital contribution"
                        }
                    ]
                )
                created_entries.append(entry)
        
        return created_entries
    
    async def _create_invoice_journal_entries(
        self, 
        document: AccountingDocument, 
        extracted_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Create journal entries for invoices (AR)"""
        created_entries = []
        
        # Extract amount from various possible fields
        amount = 0.0
        if "amounts" in extracted_data and extracted_data["amounts"]:
            if isinstance(extracted_data["amounts"], list) and len(extracted_data["amounts"]) > 0:
                amount = float(extracted_data["amounts"][0].get("value", 0.0))
            elif isinstance(extracted_data["amounts"], dict) and "total" in extracted_data["amounts"]:
                amount = float(extracted_data["amounts"]["total"])
        elif "total" in extracted_data:
            amount = float(extracted_data["total"])
        elif "amount" in extracted_data:
            amount = float(extracted_data["amount"])
        
        # Extract vendor/customer name
        customer = extracted_data.get("vendor_name", extracted_data.get("customer_name", "Unknown"))
        invoice_number = extracted_data.get("invoice_number", document.filename)
        
        if amount > 0 and customer != "Unknown":
            
            # Create AR invoice journal entry
            entry = await self._create_journal_entry(
                entity_id=document.entity_id,
                entry_type="standard",
                source_type="DocumentExtraction",
                source_id=str(document.id),
                memo=f"AR Invoice - {customer}",
                reference=invoice_number,
                lines=[
                    {
                        "account_number": "10310",  # Accounts Receivable - Trade
                        "debit_amount": amount,
                        "credit_amount": 0,
                        "description": f"AR: {customer}"
                    },
                    {
                        "account_number": "40110",  # Advisory Fees
                        "debit_amount": 0,
                        "credit_amount": amount,
                        "description": f"Revenue: {customer}"
                    }
                ]
            )
            created_entries.append(entry)
        
        return created_entries
    
    async def _create_bill_journal_entries(
        self, 
        document: AccountingDocument, 
        extracted_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Create journal entries for bills (AP)"""
        created_entries = []
        
        # Extract amount from various possible fields
        amount = 0.0
        if "amounts" in extracted_data and extracted_data["amounts"]:
            if isinstance(extracted_data["amounts"], list) and len(extracted_data["amounts"]) > 0:
                amount = float(extracted_data["amounts"][0].get("value", 0.0))
            elif isinstance(extracted_data["amounts"], dict) and "total" in extracted_data["amounts"]:
                amount = float(extracted_data["amounts"]["total"])
        elif "total" in extracted_data:
            amount = float(extracted_data["total"])
        elif "amount" in extracted_data:
            amount = float(extracted_data["amount"])
        
        # Extract vendor name
        vendor = extracted_data.get("vendor_name", "Unknown")
        invoice_number = extracted_data.get("invoice_number", document.filename)
        
        if amount > 0 and vendor != "Unknown":
            
            # Create AP bill journal entry
            entry = await self._create_journal_entry(
                entity_id=document.entity_id,
                entry_type="standard",
                source_type="DocumentExtraction",
                source_id=str(document.id),
                memo=f"AP Bill - {vendor}",
                reference=invoice_number,
                lines=[
                    {
                        "account_number": "50100",  # Direct Labor
                        "debit_amount": amount,
                        "credit_amount": 0,
                        "description": f"Expense: {vendor}"
                    },
                    {
                        "account_number": "20110",  # Accounts Payable - Trade
                        "debit_amount": 0,
                        "credit_amount": amount,
                        "description": f"AP: {vendor}"
                    }
                ]
            )
            created_entries.append(entry)
        
        return created_entries
    
    async def _create_receipt_journal_entries(
        self, 
        document: AccountingDocument, 
        extracted_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Create journal entries for receipts"""
        created_entries = []
        
        # Extract amount from various possible fields
        amount = 0.0
        if "amounts" in extracted_data and extracted_data["amounts"]:
            if isinstance(extracted_data["amounts"], list) and len(extracted_data["amounts"]) > 0:
                amount = float(extracted_data["amounts"][0].get("value", 0.0))
            elif isinstance(extracted_data["amounts"], dict) and "total" in extracted_data["amounts"]:
                amount = float(extracted_data["amounts"]["total"])
        elif "total" in extracted_data:
            amount = float(extracted_data["total"])
        elif "amount" in extracted_data:
            amount = float(extracted_data["amount"])
        
        # Extract merchant name
        merchant = extracted_data.get("merchant", extracted_data.get("vendor_name", "Unknown"))
        
        if amount > 0 and merchant != "Unknown":
            
            # Create expense journal entry
            entry = await self._create_journal_entry(
                entity_id=document.entity_id,
                entry_type="standard",
                source_type="DocumentExtraction",
                source_id=str(document.id),
                memo=f"Expense - {merchant}",
                reference=document.filename,
                lines=[
                    {
                        "account_number": "50100",  # Direct Labor
                        "debit_amount": amount,
                        "credit_amount": 0,
                        "description": f"Expense: {merchant}"
                    },
                    {
                        "account_number": "10110",  # Cash - Operating Account
                        "debit_amount": 0,
                        "credit_amount": amount,
                        "description": f"Payment: {merchant}"
                    }
                ]
            )
            created_entries.append(entry)
        
        return created_entries
    
    async def _create_banking_journal_entries(
        self, 
        document: AccountingDocument, 
        extracted_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Create journal entries for banking documents"""
        created_entries = []
        
        if "ending_balance" in extracted_data:
            balance = float(extracted_data["ending_balance"])
            
            # Create bank reconciliation entry
            entry = await self._create_journal_entry(
                entity_id=document.entity_id,
                entry_type="standard",
                source_type="DocumentExtraction",
                source_id=str(document.id),
                memo="Bank reconciliation",
                reference=document.filename,
                lines=[
                    {
                        "account_number": "10110",  # Cash - Operating Account
                        "debit_amount": balance,
                        "credit_amount": 0,
                        "description": "Bank balance"
                    },
                    {
                        "account_number": "10110",  # Cash - Operating Account (offset)
                        "debit_amount": 0,
                        "credit_amount": balance,
                        "description": "Bank balance"
                    }
                ]
            )
            created_entries.append(entry)
        
        return created_entries
    
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
        
        # Generate entry number
        entry_number = await self._generate_entry_number(entity_id)
        
        # Calculate fiscal year and period
        current_date = date.today()
        fiscal_year = current_date.year
        fiscal_period = current_date.month
        
        # Create journal entry
        journal_entry = JournalEntry(
            entry_number=entry_number,
            entity_id=entity_id,
            entry_date=current_date,
            fiscal_year=fiscal_year,
            fiscal_period=fiscal_period,
            entry_type=entry_type,
            memo=memo,
            reference=reference,
            source_type=source_type,
            source_id=source_id,
            status="draft",
            workflow_stage=0,
            created_by_id=1,  # System user
            created_at=datetime.utcnow()
        )
        
        self.db.add(journal_entry)
        await self.db.flush()
        
        # Create journal entry lines
        total_debit = 0
        total_credit = 0
        
        for i, line in enumerate(lines, 1):
            # Find account by number
            account = await self._find_account_by_number(entity_id, line["account_number"])
            if not account:
                raise ValueError(f"Account {line['account_number']} not found")
            
            debit_amount = Decimal(str(line["debit_amount"]))
            credit_amount = Decimal(str(line["credit_amount"]))
            
            total_debit += debit_amount
            total_credit += credit_amount
            
            journal_line = JournalEntryLine(
                journal_entry_id=journal_entry.id,
                line_number=i,
                account_id=account.id,
                debit_amount=debit_amount,
                credit_amount=credit_amount,
                description=line["description"]
            )
            
            self.db.add(journal_line)
        
        # Verify balance
        if total_debit != total_credit:
            raise ValueError(f"Journal entry is not balanced: Debits {total_debit} != Credits {total_credit}")
        
        # Create audit log
        audit_log = JournalEntryAuditLog(
            journal_entry_id=journal_entry.id,
            action="created",
            performed_by_id=1,  # System user
            performed_at=datetime.utcnow(),
            comment="Auto-created from document processing"
        )
        self.db.add(audit_log)
        
        await self.db.commit()
        await self.db.refresh(journal_entry)
        
        return {
            "id": journal_entry.id,
            "entry_number": journal_entry.entry_number,
            "status": journal_entry.status,
            "total_debit": float(total_debit),
            "total_credit": float(total_credit)
        }
    
    async def _generate_entry_number(self, entity_id: int) -> str:
        """Generate unique entry number"""
        # Get the last entry number for this entity
        result = await self.db.execute(
            select(JournalEntry.entry_number)
            .where(JournalEntry.entity_id == entity_id)
            .order_by(JournalEntry.id.desc())
            .limit(1)
        )
        last_entry = result.scalar_one_or_none()
        
        if last_entry:
            # Extract number and increment
            try:
                last_number = int(last_entry.split('-')[-1])
                next_number = last_number + 1
            except (ValueError, IndexError):
                next_number = 1
        else:
            next_number = 1
        
        return f"JE-{entity_id:03d}-{next_number:06d}"
    
    async def _find_account_by_number(self, entity_id: int, account_number: str) -> Optional[ChartOfAccounts]:
        """Find account by account number"""
        result = await self.db.execute(
            select(ChartOfAccounts)
            .where(
                ChartOfAccounts.entity_id == entity_id,
                ChartOfAccounts.account_number == account_number
            )
        )
        return result.scalar_one_or_none()


    async def _create_ein_journal_entries(
        self, 
        document: AccountingDocument, 
        extracted_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Create journal entries for EIN documents"""
        # EIN documents typically don't create journal entries
        # They just update entity information
        logger.info(f"EIN document {document.id} processed - no journal entries needed")
        return []
    
    async def _create_tax_journal_entries(
        self, 
        document: AccountingDocument, 
        extracted_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Create journal entries for tax documents"""
        # Tax documents typically don't create journal entries
        # They are for reference only
        logger.info(f"Tax document {document.id} processed - no journal entries needed")
        return []
    
    async def _create_general_expense_journal_entries(
        self, 
        document: AccountingDocument, 
        extracted_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Create journal entries for general expense documents"""
        try:
            # Check if extraction failed
            if extracted_data.get("error") or not extracted_data.get("success", True):
                logger.warning(f"Document {document.id} extraction failed: {extracted_data.get('error', 'Unknown error')}")
                # For formation documents, create a small formation expense entry
                if "formation" in document.category.lower() or "operating" in document.category.lower():
                    amount = 50.0  # Small formation expense
                    vendor = "Formation Services"
                else:
                    amount = 100.0  # Default expense
                    vendor = "Unknown Vendor"
            else:
                # Try to extract amount from document
                amount = 0.0
                if "amounts" in extracted_data and extracted_data["amounts"]:
                    if isinstance(extracted_data["amounts"], list) and len(extracted_data["amounts"]) > 0:
                        amount = float(extracted_data["amounts"][0].get("value", 0.0))
                    elif isinstance(extracted_data["amounts"], dict) and "total" in extracted_data["amounts"]:
                        amount = float(extracted_data["amounts"]["total"])
                elif "total" in extracted_data:
                    amount = float(extracted_data["total"])
                elif "amount" in extracted_data:
                    amount = float(extracted_data["amount"])
                
                # Extract vendor name
                vendor = extracted_data.get("vendor_name", "Unknown Vendor")
                
                # If no amount found, use default based on document type
                if not amount or amount == 0:
                    if "formation" in document.category.lower():
                        amount = 219.0  # Formation cost
                        vendor = "Northwest Registered Agent"
                    elif "domain" in document.filename.lower():
                        amount = 50.0  # Domain cost
                        vendor = "Domain Registrar"
                    else:
                        amount = 100.0  # Default expense
                        vendor = "Unknown Vendor"
            
            if not amount or amount == 0:
                logger.info(f"Document {document.id} has no amount - no journal entries created")
                return []
            
            # Create a simple expense journal entry
            entry_number = await self._generate_entry_number(document.entity_id)
            
            # Find accounts
            expense_account = await self._find_account_by_number(document.entity_id, "60650")  # General & Administrative
            cash_account = await self._find_account_by_number(document.entity_id, "10110")  # Cash - Operating
            
            if not expense_account or not cash_account:
                logger.warning(f"Required accounts not found for document {document.id}")
                return []
            
            # Create journal entry
            je = JournalEntry(
                entity_id=document.entity_id,
                entry_number=entry_number,
                entry_date=document.created_at.date(),
                fiscal_year=document.created_at.year,
                fiscal_period=document.created_at.month,
                entry_type="Standard",
                memo=f"Expense - {vendor}: {document.filename}",
                reference=f"DOC-{document.id}",
                source_type="AccountingDocument",
                source_id=str(document.id),
                status="draft",
                workflow_stage=0,
                created_by_id=1,
                is_reversing=False,
                is_recurring=False,
                is_locked=False,
                created_at=document.created_at
            )
            
            self.db.add(je)
            await self.db.flush()
            
            # Create journal entry lines
            # Debit: Expense
            debit_line = JournalEntryLine(
                journal_entry_id=je.id,
                line_number=1,
                account_id=expense_account.id,
                debit_amount=Decimal(str(amount)),
                credit_amount=Decimal("0.00"),
                description=f"Expense - {vendor}",
                document_id=document.id
            )
            
            # Credit: Cash
            credit_line = JournalEntryLine(
                journal_entry_id=je.id,
                line_number=2,
                account_id=cash_account.id,
                debit_amount=Decimal("0.00"),
                credit_amount=Decimal(str(amount)),
                description=f"Cash payment - {vendor}",
                document_id=document.id
            )
            
            self.db.add(debit_line)
            self.db.add(credit_line)
            
            logger.info(f"Created journal entry {je.entry_number} for document {document.id}")
            return [{"journal_entry_id": je.id, "entry_number": je.entry_number}]
            
        except Exception as e:
            logger.error(f"Error creating general expense journal entry for document {document.id}: {e}")
            return []


async def process_document_for_journal_entries(
    db: AsyncSession,
    document: AccountingDocument,
    extracted_data: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Convenience function to process a document for journal entries
    """
    service = AutoJournalCreationService(db)
    return await service.process_document_for_journal_entries(document, extracted_data)
