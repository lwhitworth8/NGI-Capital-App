"""
Mercury API Sync Service
Auto-sync bank transactions every 6 hours with intelligent JE matching
"""

from decimal import Decimal
from typing import Dict, List, Optional
from datetime import date, datetime, timedelta
import os
import logging
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from src.api.models_accounting import (
    JournalEntry, JournalEntryLine, ChartOfAccounts
)
from src.api.models_accounting_part2 import BankAccount, BankTransaction
from src.api.utils.datetime_utils import get_pst_now, convert_to_pst

logger = logging.getLogger(__name__)


class MercurySyncService:
    """
    Service for syncing Mercury bank transactions
    Auto-matches to existing JEs or creates draft JEs for unmatched transactions
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.api_key = os.getenv("MERCURY_API_KEY")
        self.base_url = "https://api.mercury.com/api/v1"
        self.account_id = os.getenv("MERCURY_ACCOUNT_ID")
    
    async def sync_transactions(self, entity_id: int, days_back: int = 30) -> Dict:
        """
        Sync Mercury transactions for the past N days
        Auto-matches to existing JEs or creates drafts
        """
        try:
            # Get last sync timestamp or use days_back
            last_sync = await self._get_last_sync_timestamp(entity_id)
            if not last_sync:
                last_sync = datetime.now() - timedelta(days=days_back)
            
            # Fetch transactions from Mercury
            transactions = await self._fetch_mercury_transactions(last_sync)
            
            if not transactions:
                logger.info(f"No new transactions found for entity {entity_id}")
                return {
                    "success": True,
                    "synced": 0,
                    "matched": 0,
                    "created_drafts": 0
                }
            
            matched_count = 0
            draft_count = 0
            
            for txn in transactions:
                # Check if transaction already exists
                existing = await self._get_existing_transaction(txn["id"])
                if existing:
                    continue
                
                # Try to match existing JE
                matched_je = await self._match_transaction_to_je(txn, entity_id)
                
                if matched_je:
                    # Link transaction to JE
                    await self._link_transaction_to_je(txn, matched_je, entity_id)
                    matched_count += 1
                else:
                    # Create draft JE for unmatched transaction
                    await self._create_draft_je_from_transaction(txn, entity_id)
                    draft_count += 1
            
            # Update last sync timestamp
            await self._update_sync_timestamp(entity_id, get_pst_now())
            
            await self.db.commit()
            
            return {
                "success": True,
                "synced": len(transactions),
                "matched": matched_count,
                "created_drafts": draft_count,
                "message": f"Synced {len(transactions)} transactions: {matched_count} matched, {draft_count} drafts created"
            }
            
        except Exception as e:
            logger.error(f"Error syncing Mercury transactions: {str(e)}")
            return {
                "success": False,
                "message": f"Sync failed: {str(e)}"
            }
    
    async def _fetch_mercury_transactions(self, since: datetime) -> List[Dict]:
        """Fetch transactions from Mercury API"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            params = {
                "accountId": self.account_id,
                "start": since.strftime("%Y-%m-%d"),
                "limit": 100
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/transactions",
                    params=params,
                    headers=headers,
                    timeout=30.0
                )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("transactions", [])
            else:
                logger.error(f"Mercury API error: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching Mercury transactions: {str(e)}")
            return []
    
    async def _get_existing_transaction(self, mercury_transaction_id: str):
        """Check if transaction already synced"""
        result = await self.db.execute(
            select(BankTransaction).where(
                BankTransaction.mercury_transaction_id == mercury_transaction_id
            )
        )
        return result.scalar_one_or_none()
    
    async def _match_transaction_to_je(
        self,
        transaction: Dict,
        entity_id: int
    ) -> Optional[JournalEntry]:
        """
        Intelligently match Mercury transaction to existing JE
        Matching criteria:
        1. Amount matches (within $0.01)
        2. Date within 3 days
        3. Description similarity
        4. Not already matched
        """
        txn_amount = abs(Decimal(str(transaction["amount"])))
        txn_date = datetime.fromisoformat(transaction["postedAt"].replace("Z", "+00:00")).date()
        txn_description = transaction.get("description", "").lower()
        
        # Search for potential matches
        date_range_start = txn_date - timedelta(days=3)
        date_range_end = txn_date + timedelta(days=3)
        
        result = await self.db.execute(
            select(JournalEntry).where(
                and_(
                    JournalEntry.entity_id == entity_id,
                    JournalEntry.entry_date >= date_range_start,
                    JournalEntry.entry_date <= date_range_end,
                    JournalEntry.status.in_(["approved", "posted"]),
                    or_(
                        JournalEntry.mercury_transaction_id.is_(None),
                        JournalEntry.mercury_transaction_id == ""
                    )
                )
            )
        )
        potential_matches = result.scalars().all()
        
        # Check each potential match
        for je in potential_matches:
            # Get JE lines
            lines_result = await self.db.execute(
                select(JournalEntryLine).where(
                    JournalEntryLine.journal_entry_id == je.id
                )
            )
            lines = lines_result.scalars().all()
            
            # Calculate total amount (sum of debits or credits)
            total_debit = sum(line.debit_amount for line in lines)
            total_credit = sum(line.credit_amount for line in lines)
            je_amount = max(total_debit, total_credit)
            
            # Check amount match (within $0.01)
            if abs(je_amount - txn_amount) <= Decimal("0.01"):
                # Check description similarity
                je_memo = (je.memo or "").lower()
                if self._description_similarity(txn_description, je_memo) > 0.5:
                    return je
        
        return None
    
    @staticmethod
    def _description_similarity(desc1: str, desc2: str) -> float:
        """Calculate simple description similarity (0-1)"""
        if not desc1 or not desc2:
            return 0.0
        
        words1 = set(desc1.split())
        words2 = set(desc2.split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union)
    
    async def _link_transaction_to_je(
        self,
        transaction: Dict,
        je: JournalEntry,
        entity_id: int
    ):
        """Link Mercury transaction to existing JE"""
        # Update JE with Mercury transaction ID
        je.mercury_transaction_id = transaction["id"]
        je.reconciliation_status = "matched"
        
        # Create BankTransaction record
        bank_txn = BankTransaction(
            entity_id=entity_id,
            bank_account_id=await self._get_bank_account_id(entity_id),
            mercury_transaction_id=transaction["id"],
            transaction_date=datetime.fromisoformat(
                transaction["postedAt"].replace("Z", "+00:00")
            ).date(),
            description=transaction.get("description", ""),
            amount=Decimal(str(transaction["amount"])),
            transaction_type="credit" if float(transaction["amount"]) > 0 else "debit",
            status="cleared",
            matched_journal_entry_id=je.id,
            created_at=get_pst_now()
        )
        self.db.add(bank_txn)
        
        logger.info(f"Matched Mercury transaction {transaction['id']} to JE {je.entry_number}")
    
    async def _create_draft_je_from_transaction(
        self,
        transaction: Dict,
        entity_id: int
    ):
        """Create draft JE from unmatched Mercury transaction"""
        amount = Decimal(str(transaction["amount"]))
        is_credit = amount > 0
        amount_abs = abs(amount)
        
        txn_date = datetime.fromisoformat(
            transaction["postedAt"].replace("Z", "+00:00")
        ).date()
        
        # Generate entry number
        entry_number = await self._generate_entry_number(entity_id, "BANK")
        
        # Create JE
        je = JournalEntry(
            entity_id=entity_id,
            entry_number=entry_number,
            entry_date=txn_date,
            entry_type="Standard",
            memo=f"Mercury: {transaction.get('description', 'Bank Transaction')}",
            source_type="Mercury",
            source_id=transaction["id"],
            mercury_transaction_id=transaction["id"],
            status="draft",
            workflow_stage=0,
            reconciliation_status="unmatched",
            needs_review=True,
            created_by_email="mercury-sync@system",
            created_at=get_pst_now()
        )
        self.db.add(je)
        await self.db.flush()
        
        # Get cash account
        cash_account = await self._get_cash_account(entity_id)
        
        if is_credit:
            # Money IN (Deposit)
            # DR: Cash
            # CR: Suspense/Undeposited Funds (needs review)
            je.lines.append(JournalEntryLine(
                journal_entry_id=je.id,
                line_number=1,
                account_id=cash_account.id,
                debit_amount=amount_abs,
                credit_amount=Decimal("0"),
                description="Bank deposit - needs categorization"
            ))
            
            suspense_account = await self._get_suspense_account(entity_id)
            je.lines.append(JournalEntryLine(
                journal_entry_id=je.id,
                line_number=2,
                account_id=suspense_account.id,
                debit_amount=Decimal("0"),
                credit_amount=amount_abs,
                description="Suspense - pending categorization"
            ))
        else:
            # Money OUT (Withdrawal)
            # DR: Suspense/Uncategorized Expense (needs review)
            # CR: Cash
            suspense_account = await self._get_suspense_account(entity_id)
            je.lines.append(JournalEntryLine(
                journal_entry_id=je.id,
                line_number=1,
                account_id=suspense_account.id,
                debit_amount=amount_abs,
                credit_amount=Decimal("0"),
                description="Suspense - pending categorization"
            ))
            
            je.lines.append(JournalEntryLine(
                journal_entry_id=je.id,
                line_number=2,
                account_id=cash_account.id,
                debit_amount=Decimal("0"),
                credit_amount=amount_abs,
                description="Bank withdrawal - needs categorization"
            ))
        
        # Create BankTransaction record
        bank_txn = BankTransaction(
            entity_id=entity_id,
            bank_account_id=await self._get_bank_account_id(entity_id),
            mercury_transaction_id=transaction["id"],
            transaction_date=txn_date,
            description=transaction.get("description", ""),
            amount=amount,
            transaction_type="credit" if is_credit else "debit",
            status="pending",
            matched_journal_entry_id=je.id,
            created_at=get_pst_now()
        )
        self.db.add(bank_txn)
        
        logger.info(f"Created draft JE {entry_number} for Mercury transaction {transaction['id']}")
    
    async def _get_cash_account(self, entity_id: int) -> ChartOfAccounts:
        """Get primary cash account (10110)"""
        result = await self.db.execute(
            select(ChartOfAccounts).where(
                and_(
                    ChartOfAccounts.entity_id == entity_id,
                    ChartOfAccounts.account_number == "10110"
                )
            )
        )
        return result.scalar_one()
    
    async def _get_suspense_account(self, entity_id: int) -> ChartOfAccounts:
        """Get suspense/clearing account for unmatched transactions"""
        result = await self.db.execute(
            select(ChartOfAccounts).where(
                and_(
                    ChartOfAccounts.entity_id == entity_id,
                    ChartOfAccounts.account_number == "10190"  # Suspense/Clearing
                )
            )
        )
        account = result.scalar_one_or_none()
        
        # Create suspense account if doesn't exist
        if not account:
            account = ChartOfAccounts(
                entity_id=entity_id,
                account_number="10190",
                account_name="Suspense/Clearing",
                account_type="Asset",
                account_subtype="Current Asset",
                normal_balance="Debit",
                is_active=True,
                created_at=get_pst_now()
            )
            self.db.add(account)
            await self.db.flush()
        
        return account
    
    async def _get_bank_account_id(self, entity_id: int) -> int:
        """Get primary bank account ID"""
        result = await self.db.execute(
            select(BankAccount).where(
                and_(
                    BankAccount.entity_id == entity_id,
                    BankAccount.is_primary == True
                )
            )
        )
        account = result.scalar_one_or_none()
        
        # Create bank account if doesn't exist
        if not account:
            account = BankAccount(
                entity_id=entity_id,
                bank_name="Mercury",
                account_name="Operating Account",
                account_number_last_four=self.account_id[-4:] if self.account_id else "****",
                account_type="Checking",
                is_primary=True,
                is_active=True,
                mercury_account_id=self.account_id,
                created_at=get_pst_now()
            )
            self.db.add(account)
            await self.db.flush()
        
        return account.id
    
    async def _generate_entry_number(self, entity_id: int, prefix: str) -> str:
        """Generate sequential entry number"""
        result = await self.db.execute(
            select(JournalEntry)
            .where(JournalEntry.entity_id == entity_id)
            .where(JournalEntry.entry_number.like(f"{prefix}-%"))
            .order_by(JournalEntry.id.desc())
            .limit(1)
        )
        last_entry = result.scalar_one_or_none()
        
        if last_entry and last_entry.entry_number:
            try:
                last_num = int(last_entry.entry_number.split("-")[-1])
                next_num = last_num + 1
            except:
                next_num = 1
        else:
            next_num = 1
        
        return f"{prefix}-{next_num:06d}"
    
    async def _get_last_sync_timestamp(self, entity_id: int) -> Optional[datetime]:
        """Get last sync timestamp from database"""
        # This would query a sync_log table in production
        # For now, return None to sync last 30 days
        return None
    
    async def _update_sync_timestamp(self, entity_id: int, timestamp: datetime):
        """Update last sync timestamp"""
        # This would update a sync_log table in production
        logger.info(f"Sync completed for entity {entity_id} at {timestamp}")

