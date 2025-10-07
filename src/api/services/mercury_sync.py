"""
NGI Capital - Mercury Bank API Integration
Automated transaction sync and smart matching

Author: NGI Capital Development Team
Date: October 3, 2025
"""

import os
import asyncio
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ..models_accounting import (
    JournalEntry, JournalEntryLine, ChartOfAccounts
)
from ..models_accounting_part2 import (
    BankAccount, BankTransaction, BankTransactionMatch,
    BankMatchingRule
)


class MercuryBankClient:
    """Mercury Bank API client"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.mercury.com/api/v1"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    async def get_accounts(self) -> List[Dict[str, Any]]:
        """Get all Mercury accounts"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/accounts",
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json().get("accounts", [])
    
    async def get_transactions(
        self,
        account_id: str,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        """Get transactions for an account"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/accounts/{account_id}/transactions",
                headers=self.headers,
                params={
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                timeout=30.0
            )
            response.raise_for_status()
            return response.json().get("transactions", [])
    
    async def get_account_balance(self, account_id: str) -> Decimal:
        """Get current account balance"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/accounts/{account_id}",
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return Decimal(str(data.get("currentBalance", 0)))


async def sync_mercury_account(
    db: AsyncSession,
    bank_account_id: int,
    days_back: int = 30
) -> Dict[str, Any]:
    """
    Sync transactions from Mercury for a bank account
    Returns: {transactions_imported: int, duplicates_skipped: int}
    """
    
    # Get bank account
    result = await db.execute(
        select(BankAccount).where(BankAccount.id == bank_account_id)
    )
    bank_account = result.scalar_one_or_none()
    
    if not bank_account:
        raise ValueError("Bank account not found")
    
    if not bank_account.mercury_account_id:
        raise ValueError("Bank account not linked to Mercury")
    
    # Decrypt API token (simplified - in production use proper encryption)
    api_key = os.getenv("MERCURY_API_KEY", bank_account.mercury_access_token_encrypted)
    
    if not api_key:
        raise ValueError("Mercury API key not configured")
    
    # Initialize client
    client = MercuryBankClient(api_key)
    
    # Calculate date range
    end_date = date.today()
    start_date = end_date - timedelta(days=days_back)
    
    try:
        # Update sync status
        bank_account.last_sync_status = "in_progress"
        await db.commit()
        
        # Fetch transactions
        transactions = await client.get_transactions(
            bank_account.mercury_account_id,
            start_date,
            end_date
        )
        
        imported_count = 0
        duplicates_count = 0
        
        for txn_data in transactions:
            # Check if transaction already exists
            existing_result = await db.execute(
                select(BankTransaction).where(
                    BankTransaction.mercury_transaction_id == txn_data.get("id")
                )
            )
            
            if existing_result.scalar_one_or_none():
                duplicates_count += 1
                continue
            
            # Parse transaction data
            txn_date = datetime.fromisoformat(txn_data["postedAt"].replace("Z", "+00:00")).date()
            amount = Decimal(str(txn_data["amount"]))
            
            # Create transaction record
            bank_txn = BankTransaction(
                bank_account_id=bank_account_id,
                transaction_date=txn_date,
                post_date=txn_date,
                description=txn_data.get("description", ""),
                amount=amount,
                mercury_transaction_id=txn_data.get("id"),
                merchant_name=txn_data.get("counterpartyName"),
                merchant_category=txn_data.get("category"),
                status="unmatched",
                imported_at=datetime.utcnow()
            )
            
            db.add(bank_txn)
            imported_count += 1
        
        # Update sync status
        bank_account.last_sync_at = datetime.utcnow()
        bank_account.last_sync_status = "success"
        bank_account.last_sync_error = None
        
        await db.commit()
        
        return {
            "transactions_imported": imported_count,
            "duplicates_skipped": duplicates_count,
            "total_fetched": len(transactions)
        }
        
    except Exception as e:
        # Update error status
        bank_account.last_sync_status = "failed"
        bank_account.last_sync_error = str(e)
        await db.commit()
        
        raise


async def match_bank_transaction(
    db: AsyncSession,
    bank_transaction_id: int,
    journal_entry_id: int,
    match_type: str = "manual",
    confidence: Optional[Decimal] = None
) -> BankTransactionMatch:
    """
    Create a match between bank transaction and journal entry
    """
    
    # Verify both exist
    bank_txn_result = await db.execute(
        select(BankTransaction).where(BankTransaction.id == bank_transaction_id)
    )
    bank_txn = bank_txn_result.scalar_one_or_none()
    
    je_result = await db.execute(
        select(JournalEntry).where(JournalEntry.id == journal_entry_id)
    )
    journal_entry = je_result.scalar_one_or_none()
    
    if not bank_txn or not journal_entry:
        raise ValueError("Bank transaction or journal entry not found")
    
    # Create match
    match = BankTransactionMatch(
        bank_transaction_id=bank_transaction_id,
        journal_entry_id=journal_entry_id,
        match_type=match_type,
        confidence=confidence,
        matched_by_id=1,  # TODO: Get from context
        matched_at=datetime.utcnow()
    )
    
    db.add(match)
    
    # Update bank transaction status
    bank_txn.is_matched = True
    bank_txn.matched_at = datetime.utcnow()
    bank_txn.status = "matched"
    bank_txn.confidence_score = confidence
    
    await db.commit()
    
    return match


async def auto_match_transactions(
    db: AsyncSession,
    bank_account_id: int,
    confidence_threshold: Decimal = Decimal("0.85")
) -> Dict[str, int]:
    """
    Automatically match unmatched transactions using rules and ML
    Returns: {matched: int, suggestions: int}
    """
    
    # Get unmatched transactions
    unmatched_result = await db.execute(
        select(BankTransaction).where(
            and_(
                BankTransaction.bank_account_id == bank_account_id,
                BankTransaction.status == "unmatched"
            )
        )
    )
    unmatched_txns = unmatched_result.scalars().all()
    
    matched_count = 0
    suggestions_count = 0
    
    for txn in unmatched_txns:
        # Try to find matching journal entry
        # 1. Exact amount match
        # 2. Same date or within 3 days
        # 3. Similar description
        
        date_range_start = txn.transaction_date - timedelta(days=3)
        date_range_end = txn.transaction_date + timedelta(days=3)
        
        # Find potential matches
        je_result = await db.execute(
            select(JournalEntry, JournalEntryLine).join(
                JournalEntryLine,
                JournalEntry.id == JournalEntryLine.journal_entry_id
            ).where(
                and_(
                    JournalEntry.entry_date >= date_range_start,
                    JournalEntry.entry_date <= date_range_end,
                    JournalEntry.status == "posted",
                    # Match amount (considering debits or credits)
                    (
                        (JournalEntryLine.debit_amount == abs(txn.amount)) |
                        (JournalEntryLine.credit_amount == abs(txn.amount))
                    )
                )
            )
        )
        
        potential_matches = je_result.all()
        
        if len(potential_matches) == 1:
            # Exact match found
            je, line = potential_matches[0]
            
            # Calculate confidence
            confidence = Decimal("0.95")  # Exact amount + date match
            
            if confidence >= confidence_threshold:
                # Auto-match
                await match_bank_transaction(
                    db,
                    txn.id,
                    je.id,
                    match_type="exact",
                    confidence=confidence
                )
                matched_count += 1
            else:
                suggestions_count += 1
        
        elif len(potential_matches) > 1:
            # Multiple matches - suggest to user
            suggestions_count += 1
    
    return {
        "matched": matched_count,
        "suggestions": suggestions_count
    }


async def apply_matching_rules(
    db: AsyncSession,
    bank_transaction: BankTransaction
) -> Optional[int]:
    """
    Apply matching rules to suggest an account
    Returns: account_id or None
    """
    
    # Get bank account
    bank_account_result = await db.execute(
        select(BankAccount).where(BankAccount.id == bank_transaction.bank_account_id)
    )
    bank_account = bank_account_result.scalar_one()
    
    # Get matching rules for this entity
    rules_result = await db.execute(
        select(BankMatchingRule).where(
            and_(
                BankMatchingRule.entity_id == bank_account.entity_id,
                BankMatchingRule.is_active == True
            )
        ).order_by(BankMatchingRule.priority.desc())
    )
    
    rules = rules_result.scalars().all()
    
    for rule in rules:
        matched = False
        
        # Check rule conditions
        if rule.description_contains:
            if rule.description_contains.lower() in bank_transaction.description.lower():
                matched = True
        
        if rule.merchant_name:
            if bank_transaction.merchant_name and rule.merchant_name.lower() in bank_transaction.merchant_name.lower():
                matched = True
        
        if rule.amount_min and rule.amount_max:
            if rule.amount_min <= abs(bank_transaction.amount) <= rule.amount_max:
                matched = True
        
        if matched:
            # Update rule stats
            rule.times_applied += 1
            await db.commit()
            
            return rule.auto_categorize_account_id
    
    return None

