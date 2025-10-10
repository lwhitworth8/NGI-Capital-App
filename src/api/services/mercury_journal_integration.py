"""
NGI Capital - Mercury Bank Journal Entry Integration
Automatically creates journal entries from Mercury bank transactions

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
from ..models_accounting_part2 import BankAccount, BankTransaction

logger = logging.getLogger(__name__)


class MercuryJournalIntegration:
    """Service for creating journal entries from Mercury bank transactions"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def sync_mercury_transactions_and_create_journal_entries(
        self, 
        entity_id: int,
        account_id: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Sync Mercury transactions and create journal entries for unmatched ones
        """
        try:
            # Get Mercury transactions (this would call the Mercury API)
            mercury_transactions = await self._get_mercury_transactions(account_id, start_date, end_date)
            
            created_entries = []
            matched_count = 0
            
            for txn in mercury_transactions:
                # Check if transaction already has a journal entry
                existing_entry = await self._find_existing_journal_entry(entity_id, txn["id"])
                
                if existing_entry:
                    matched_count += 1
                    continue
                
                # Create journal entry for unmatched transaction
                try:
                    journal_entry = await self._create_banking_journal_entry(
                        entity_id=entity_id,
                        transaction=txn,
                        account_id=account_id
                    )
                    created_entries.append(journal_entry)
                    
                except Exception as e:
                    logger.error(f"Failed to create journal entry for transaction {txn['id']}: {e}")
                    continue
            
            return {
                "total_transactions": len(mercury_transactions),
                "matched_transactions": matched_count,
                "new_journal_entries": len(created_entries),
                "created_entries": created_entries
            }
            
        except Exception as e:
            logger.error(f"Error syncing Mercury transactions: {e}")
            raise
    
    async def _get_mercury_transactions(
        self, 
        account_id: str, 
        start_date: date, 
        end_date: date
    ) -> List[Dict[str, Any]]:
        """
        Get transactions from Mercury API
        This is a placeholder - would integrate with actual Mercury API
        """
        # TODO: Implement actual Mercury API integration
        # For now, return mock data
        return [
            {
                "id": "mercury_txn_001",
                "account_id": account_id,
                "amount": "1000.00",
                "description": "Wire transfer received",
                "transaction_date": start_date.isoformat(),
                "merchant_name": "Client Payment",
                "category": "Income"
            },
            {
                "id": "mercury_txn_002", 
                "account_id": account_id,
                "amount": "-250.00",
                "description": "Office rent payment",
                "transaction_date": start_date.isoformat(),
                "merchant_name": "Property Management",
                "category": "Rent"
            }
        ]
    
    async def _find_existing_journal_entry(
        self, 
        entity_id: int, 
        transaction_id: str
    ) -> Optional[JournalEntry]:
        """Check if a journal entry already exists for this transaction"""
        result = await self.db.execute(
            select(JournalEntry)
            .where(
                JournalEntry.entity_id == entity_id,
                JournalEntry.source_id == transaction_id,
                JournalEntry.source_type == "MercuryImport"
            )
        )
        return result.scalar_one_or_none()
    
    async def _create_banking_journal_entry(
        self,
        entity_id: int,
        transaction: Dict[str, Any],
        account_id: str
    ) -> Dict[str, Any]:
        """Create a journal entry for a bank transaction"""
        
        amount = Decimal(transaction["amount"])
        is_debit = amount > 0
        abs_amount = abs(amount)
        
        # Determine accounts based on transaction category
        if transaction.get("category") == "Income":
            if is_debit:
                # Money coming in - debit cash, credit revenue
                debit_account = "10110"  # Cash - Operating Account
                credit_account = "40110"  # Advisory Fees
                description = f"Revenue received: {transaction.get('merchant_name', 'Unknown')}"
            else:
                # Money going out - debit expense, credit cash
                debit_account = "50100"  # Direct Labor
                credit_account = "10110"  # Cash - Operating Account
                description = f"Expense paid: {transaction.get('merchant_name', 'Unknown')}"
        elif transaction.get("category") == "Rent":
            if not is_debit:
                # Rent payment - debit rent expense, credit cash
                debit_account = "50100"  # Direct Labor (using as general expense)
                credit_account = "10110"  # Cash - Operating Account
                description = f"Rent payment: {transaction.get('merchant_name', 'Unknown')}"
            else:
                # This shouldn't happen for rent, but handle it
                debit_account = "10110"  # Cash - Operating Account
                credit_account = "40110"  # Advisory Fees
                description = f"Revenue received: {transaction.get('merchant_name', 'Unknown')}"
        else:
            # Default handling
            if is_debit:
                debit_account = "10110"  # Cash - Operating Account
                credit_account = "40110"  # Advisory Fees
                description = f"Revenue received: {transaction.get('merchant_name', 'Unknown')}"
            else:
                debit_account = "50100"  # Direct Labor
                credit_account = "10110"  # Cash - Operating Account
                description = f"Expense paid: {transaction.get('merchant_name', 'Unknown')}"
        
        # Generate entry number
        entry_number = await self._generate_entry_number(entity_id)
        
        # Create journal entry
        journal_entry = JournalEntry(
            entry_number=entry_number,
            entity_id=entity_id,
            entry_date=date.fromisoformat(transaction["transaction_date"]),
            fiscal_year=date.fromisoformat(transaction["transaction_date"]).year,
            fiscal_period=date.fromisoformat(transaction["transaction_date"]).month,
            entry_type="standard",
            memo=f"Mercury transaction: {transaction['description']}",
            reference=transaction["id"],
            source_type="MercuryImport",
            source_id=transaction["id"],
            status="draft",
            workflow_stage=0,
            created_by_id=1,  # System user
            created_at=datetime.utcnow()
        )
        
        self.db.add(journal_entry)
        await self.db.flush()
        
        # Create journal entry lines
        if is_debit:
            # Debit cash, credit revenue/other
            debit_line = JournalEntryLine(
                journal_entry_id=journal_entry.id,
                line_number=1,
                account_id=await self._get_account_id(entity_id, debit_account),
                debit_amount=abs_amount,
                credit_amount=Decimal("0"),
                description=description
            )
            credit_line = JournalEntryLine(
                journal_entry_id=journal_entry.id,
                line_number=2,
                account_id=await self._get_account_id(entity_id, credit_account),
                debit_amount=Decimal("0"),
                credit_amount=abs_amount,
                description=description
            )
        else:
            # Debit expense, credit cash
            debit_line = JournalEntryLine(
                journal_entry_id=journal_entry.id,
                line_number=1,
                account_id=await self._get_account_id(entity_id, debit_account),
                debit_amount=abs_amount,
                credit_amount=Decimal("0"),
                description=description
            )
            credit_line = JournalEntryLine(
                journal_entry_id=journal_entry.id,
                line_number=2,
                account_id=await self._get_account_id(entity_id, credit_account),
                debit_amount=Decimal("0"),
                credit_amount=abs_amount,
                description=description
            )
        
        self.db.add(debit_line)
        self.db.add(credit_line)
        
        # Create audit log
        audit_log = JournalEntryAuditLog(
            journal_entry_id=journal_entry.id,
            action="created",
            performed_by_id=1,  # System user
            performed_at=datetime.utcnow(),
            comment="Auto-created from Mercury transaction"
        )
        self.db.add(audit_log)
        
        await self.db.commit()
        await self.db.refresh(journal_entry)
        
        return {
            "id": journal_entry.id,
            "entry_number": journal_entry.entry_number,
            "status": journal_entry.status,
            "amount": float(abs_amount),
            "description": description
        }
    
    async def _generate_entry_number(self, entity_id: int) -> str:
        """Generate unique entry number"""
        result = await self.db.execute(
            select(JournalEntry.entry_number)
            .where(JournalEntry.entity_id == entity_id)
            .order_by(JournalEntry.id.desc())
            .limit(1)
        )
        last_entry = result.scalar_one_or_none()
        
        if last_entry:
            try:
                last_number = int(last_entry.split('-')[-1])
                next_number = last_number + 1
            except (ValueError, IndexError):
                next_number = 1
        else:
            next_number = 1
        
        return f"JE-{entity_id:03d}-{next_number:06d}"
    
    async def _get_account_id(self, entity_id: int, account_number: str) -> int:
        """Get account ID by account number"""
        result = await self.db.execute(
            select(ChartOfAccounts.id)
            .where(
                ChartOfAccounts.entity_id == entity_id,
                ChartOfAccounts.account_number == account_number
            )
        )
        account_id = result.scalar_one_or_none()
        if not account_id:
            raise ValueError(f"Account {account_number} not found for entity {entity_id}")
        return account_id


async def sync_mercury_and_create_journal_entries(
    db: AsyncSession,
    entity_id: int,
    account_id: str,
    start_date: date,
    end_date: date
) -> Dict[str, Any]:
    """
    Convenience function to sync Mercury and create journal entries
    """
    service = MercuryJournalIntegration(db)
    return await service.sync_mercury_transactions_and_create_journal_entries(
        entity_id, account_id, start_date, end_date
    )
