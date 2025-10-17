"""
Mercury API Sync Service
Auto-sync bank transactions every hour with intelligent JE matching
"""

from decimal import Decimal
from typing import Dict, List, Optional
from datetime import date, datetime, timedelta
import os
import logging
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from services.api.models_accounting import (
    JournalEntry, JournalEntryLine, ChartOfAccounts
)
from services.api.models_accounting_part2 import BankAccount, BankTransaction
from services.api.utils.datetime_utils import get_pst_now, convert_to_pst

logger = logging.getLogger(__name__)


class MercurySyncService:
    """
    Service for syncing Mercury bank transactions
    Auto-matches to existing JEs or creates draft JEs for unmatched transactions
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.api_key = os.getenv("NGI_CAPITAL_LLC_MERCURY_API_KEY")
        self.base_url = "https://api.mercury.com/api/v1"
        self.account_id = os.getenv("MERCURY_ACCOUNT_ID")
        # Mercury bank account opened date (from API account creation)
        self.mercury_opening_date = date(2025, 8, 28)
    
    async def sync_transactions(self, entity_id: int, days_back: int = 30) -> Dict:
        """
        Sync Mercury transactions for the past N days
        REVISED: Only imports transactions into staging, does NOT create JEs
        US GAAP Compliance: Transactions need supporting docs before JE creation
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
                    "new_transactions": 0,
                    "message": "No new transactions to sync"
                }

            # Group related transactions (main transaction + cashback rewards)
            grouped_txns = await self._group_related_transactions(transactions)

            new_count = 0
            skipped_count = 0

            for txn_group in grouped_txns:
                main_txn = txn_group["main"]
                cashback_txn = txn_group.get("cashback")

                # Check if main transaction already exists
                existing = await self._get_existing_transaction(main_txn["id"])
                if existing:
                    skipped_count += 1
                    continue

                # REVISED: Save to staging, run smart suggestions, NO JE CREATION
                await self._save_transaction_to_staging(
                    main_txn, entity_id, cashback_txn=cashback_txn
                )
                new_count += 1

            # Update last sync timestamp
            await self._update_sync_timestamp(entity_id, get_pst_now())

            await self.db.commit()

            return {
                "success": True,
                "synced": len(transactions),
                "new_transactions": new_count,
                "skipped": skipped_count,
                "message": f"Synced {new_count} new transactions (skipped {skipped_count} duplicates). Ready for review and matching."
            }

        except Exception as e:
            logger.error(f"Error syncing Mercury transactions: {str(e)}")
            await self.db.rollback()
            return {
                "success": False,
                "message": f"Sync failed: {str(e)}"
            }
    
    async def _fetch_mercury_account_details(self) -> Dict:
        """Fetch full account details from Mercury API"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/account/{self.account_id}",
                    headers=headers,
                    timeout=30.0
                )

            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Mercury API error: {response.status_code} - {response.text}")
                return {}

        except Exception as e:
            logger.error(f"Error fetching Mercury account details: {str(e)}")
            return {}

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
    
    async def _group_related_transactions(self, transactions: List[Dict]) -> List[Dict]:
        """
        Group related transactions (main transaction + cashback rewards)
        Mercury provides cashback as separate positive transactions close in time

        Returns: List of {"main": txn, "cashback": txn | None}
        """
        # Sort by date and amount
        sorted_txns = sorted(
            transactions,
            key=lambda t: (
                datetime.fromisoformat(t["postedAt"].replace("Z", "+00:00")),
                -abs(float(t["amount"]))  # Larger amounts first
            )
        )

        grouped = []
        processed_ids = set()

        for i, txn in enumerate(sorted_txns):
            if txn["id"] in processed_ids:
                continue

            amount = Decimal(str(txn["amount"]))
            txn_datetime = datetime.fromisoformat(txn["postedAt"].replace("Z", "+00:00"))

            # If negative (expense), look for small positive cashback within 5 minutes
            cashback_txn = None
            if amount < 0:
                for j in range(i + 1, min(i + 5, len(sorted_txns))):  # Check next 4 transactions
                    potential_cashback = sorted_txns[j]
                    if potential_cashback["id"] in processed_ids:
                        continue

                    cashback_amount = Decimal(str(potential_cashback["amount"]))
                    cashback_datetime = datetime.fromisoformat(
                        potential_cashback["postedAt"].replace("Z", "+00:00")
                    )

                    # Cashback criteria:
                    # 1. Positive amount (credit)
                    # 2. Small amount (< $10)
                    # 3. Within 5 minutes of main transaction
                    # 4. Description contains "cashback" or "reward"
                    time_diff = abs((cashback_datetime - txn_datetime).total_seconds())
                    description_lower = potential_cashback.get("description", "").lower()

                    if (cashback_amount > 0 and
                        cashback_amount < Decimal("10.00") and
                        time_diff <= 300 and  # 5 minutes
                        ("cashback" in description_lower or "reward" in description_lower or
                         "credit" in description_lower)):

                        cashback_txn = potential_cashback
                        processed_ids.add(potential_cashback["id"])
                        logger.info(
                            f"Grouped cashback ${cashback_amount} with main transaction ${amount}"
                        )
                        break

            grouped.append({
                "main": txn,
                "cashback": cashback_txn
            })
            processed_ids.add(txn["id"])

        return grouped

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
        je.reconciliation_status = "pending_review"  # US GAAP: Requires review before marked as matched
        je.needs_review = True  # Flag for manual review and document upload

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
            status="pending",  # US GAAP: Pending until reviewed, documents uploaded, and approved
            matched_journal_entry_id=je.id,
            created_at=get_pst_now()
        )
        self.db.add(bank_txn)

        logger.info(f"Matched Mercury transaction {transaction['id']} to JE {je.entry_number} (pending review)")
    
    async def _save_transaction_to_staging(
        self,
        transaction: Dict,
        entity_id: int,
        cashback_txn: Optional[Dict] = None
    ):
        """
        REVISED: Save transaction to staging for user review
        NO JOURNAL ENTRY CREATION - transactions wait for supporting documents
        US GAAP Compliant: Transactions need docs before posting to GL
        """
        amount = Decimal(str(transaction["amount"]))
        is_credit = amount > 0

        txn_date = datetime.fromisoformat(
            transaction["postedAt"].replace("Z", "+00:00")
        ).date()

        # Parse transaction metadata for intelligent categorization
        description = transaction.get("description", "")
        counterparty_name = transaction.get("counterpartyName", "")
        note = transaction.get("note", "")

        # Intelligent categorization for suggestions (NOT for JE creation)
        category_result = await self._categorize_transaction(
            description, counterparty_name, note, amount, entity_id
        )

        # Store suggested account as JSON string for new fields
        suggested_account_id = None
        if category_result.get("account"):
            suggested_account_id = category_result["account"].id

        # Detect recurring vendor
        is_recurring = bool(counterparty_name and len(counterparty_name) > 3)

        # Create BankTransaction record (STAGING - NO JE!)
        bank_txn = BankTransaction(
            entity_id=entity_id,
            bank_account_id=await self._get_bank_account_id(entity_id),
            mercury_transaction_id=transaction["id"],
            transaction_date=txn_date,
            description=description,
            amount=amount,
            transaction_type="credit" if is_credit else "debit",
            merchant_name=counterparty_name,
            merchant_category=transaction.get("merchantCategory"),
            status="unmatched",
            needs_review=True,
            suggested_account_id=suggested_account_id,
            is_recurring_vendor=is_recurring,
            recurring_vendor_name=counterparty_name if is_recurring else None,
            confidence_score=Decimal(str(category_result.get("confidence", 0.0))),
            imported_at=get_pst_now(),
            created_at=get_pst_now()
        )
        self.db.add(bank_txn)

        # Handle cashback if present - save as related transaction
        if cashback_txn:
            cashback_amount = Decimal(str(cashback_txn["amount"]))
            cashback_date = datetime.fromisoformat(
                cashback_txn["postedAt"].replace("Z", "+00:00")
            ).date()

            cashback_bank_txn = BankTransaction(
                entity_id=entity_id,
                bank_account_id=await self._get_bank_account_id(entity_id),
                mercury_transaction_id=cashback_txn["id"],
                transaction_date=cashback_date,
                description=cashback_txn.get("description", "Cashback reward"),
                amount=cashback_amount,
                transaction_type="credit",
                merchant_name="Mercury Cashback",
                status="unmatched",
                needs_review=True,
                grouped_transaction_ids=str([bank_txn.id]),  # Link to main transaction
                imported_at=get_pst_now(),
                created_at=get_pst_now()
            )
            self.db.add(cashback_bank_txn)

            logger.info(
                f"Saved cashback transaction ${cashback_amount} linked to main transaction"
            )

        # Log result
        suggestion_note = (
            f"[Suggested: {category_result.get('category_name')}]"
            if category_result.get("account")
            else "[No auto-categorization]"
        )

        logger.info(
            f"Imported Mercury transaction '{description}' "
            f"(${amount}) to staging - {suggestion_note}. "
            f"Awaiting document upload for JE creation."
        )
    
    async def _categorize_transaction(
        self,
        description: str,
        counterparty: str,
        note: str,
        amount: Decimal,
        entity_id: int
    ) -> Dict:
        """
        Intelligently categorize Mercury transaction based on description, counterparty, and patterns
        Returns: {
            "account": ChartOfAccounts | None,
            "category_name": str,
            "description": str,
            "confidence": float  # 0-1
        }
        """
        # Combine all text fields for analysis
        full_text = f"{description} {counterparty} {note}".lower()
        is_credit = amount > 0  # Positive = money in (revenue), Negative = money out (expense)

        # Define categorization rules (keyword matching)
        # Format: (keywords, account_number, category_name, description_template)

        expense_rules = [
            # Software & SaaS (62100 - Software & Subscriptions)
            (
                ["openai", "anthropic", "claude", "gpt", "api", "github", "gitlab", "vercel", "netlify",
                 "aws", "azure", "gcp", "google cloud", "digitalocean", "heroku", "software", "saas",
                 "subscription", "slack", "notion", "figma", "linear", "zoom", "microsoft 365"],
                "62100",
                "Software & Subscriptions",
                "Software/SaaS"
            ),
            # Legal & Professional (62700 - Legal & Professional Fees)
            (
                ["attorney", "lawyer", "legal", "law firm", "stripe atlas", "clerky", "incorporation",
                 "filing fee", "state filing", "delaware", "secretary of state", "registered agent",
                 "northwest registered", "incfile", "legalzoom", "rocket lawyer"],
                "62700",
                "Legal & Professional Fees",
                "Legal/Professional services"
            ),
            # Marketing & Advertising (62200 - Marketing & Advertising)
            (
                ["google ads", "facebook ads", "linkedin ads", "twitter ads", "meta", "ad spend",
                 "advertising", "marketing", "mailchimp", "sendgrid", "hubspot", "campaign"],
                "62200",
                "Marketing & Advertising",
                "Marketing/Advertising"
            ),
            # Travel & Entertainment (62600 - Travel & Entertainment)
            (
                ["airline", "hotel", "airbnb", "uber", "lyft", "rental car", "flight", "travel",
                 "restaurant", "meal", "doordash", "ubereats", "grubhub", "entertainment"],
                "62600",
                "Travel & Entertainment",
                "Travel/Entertainment"
            ),
            # Office Supplies (62400 - Office Supplies & Equipment)
            (
                ["amazon", "staples", "office depot", "supplies", "equipment", "furniture",
                 "desk", "chair", "monitor", "keyboard", "mouse"],
                "62400",
                "Office Supplies & Equipment",
                "Office supplies/equipment"
            ),
            # Insurance (62800 - Insurance)
            (
                ["insurance", "liability", "workers comp", "health insurance", "dental",
                 "vision", "embroker", "next insurance", "hiscox"],
                "62800",
                "Insurance",
                "Insurance premium"
            ),
            # Utilities (62500 - Utilities)
            (
                ["internet", "phone", "mobile", "verizon", "at&t", "t-mobile", "comcast",
                 "spectrum", "utility", "electric", "power"],
                "62500",
                "Utilities",
                "Utilities"
            ),
            # Bank Fees (62900 - Bank Fees)
            (
                ["bank fee", "service charge", "wire fee", "ach fee", "monthly fee",
                 "transaction fee", "overdraft", "mercury fee"],
                "62900",
                "Bank Fees",
                "Bank fees"
            ),
            # Rent (62300 - Rent)
            (
                ["rent", "lease", "office space", "coworking", "wework", "regus"],
                "62300",
                "Rent",
                "Rent expense"
            ),
            # Payroll (63000 - Payroll Expenses)
            (
                ["payroll", "salary", "wages", "gusto", "rippling", "adp", "paychex",
                 "employee", "contractor payment"],
                "63000",
                "Payroll Expenses",
                "Payroll/Compensation"
            ),
        ]

        revenue_rules = [
            # Service Revenue (40100 - Service Revenue)
            (
                ["client payment", "invoice payment", "service fee", "consulting", "advisory",
                 "professional services", "revenue", "stripe", "payment received"],
                "40100",
                "Service Revenue",
                "Service revenue"
            ),
            # Interest Income (40500 - Interest Income)
            (
                ["interest", "interest earned", "mercury interest", "bank interest"],
                "40500",
                "Interest Income",
                "Interest income"
            ),
            # Refunds/Returns
            (
                ["refund", "return", "reimbursement", "credit memo"],
                "40400",
                "Other Income",
                "Refund/Return"
            ),
        ]

        # Apply rules based on transaction direction
        rules_to_check = revenue_rules if is_credit else expense_rules

        for keywords, account_number, category_name, desc_template in rules_to_check:
            # Check if any keyword matches
            if any(keyword in full_text for keyword in keywords):
                # Get the account
                result = await self.db.execute(
                    select(ChartOfAccounts).where(
                        and_(
                            ChartOfAccounts.entity_id == entity_id,
                            ChartOfAccounts.account_number == account_number
                        )
                    )
                )
                account = result.scalar_one_or_none()

                if account:
                    # Build description with counterparty if available
                    final_desc = f"{desc_template} - {counterparty}" if counterparty else desc_template

                    logger.info(
                        f"Auto-categorized transaction: '{description}' → "
                        f"{account_number} ({category_name})"
                    )

                    return {
                        "account": account,
                        "category_name": category_name,
                        "description": final_desc,
                        "confidence": 0.85  # High confidence for keyword match
                    }

        # No match found - will use suspense account
        logger.info(f"Could not auto-categorize: '{description}' - using Suspense account")
        return {
            "account": None,
            "category_name": None,
            "description": None,
            "confidence": 0.0
        }

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
                normal_balance="Debit",
                description="Temporary holding account for unmatched Mercury transactions",
                is_active=True,
                allow_posting=True,
                created_at=get_pst_now()
            )
            self.db.add(account)
            await self.db.flush()
        
        return account
    
    async def _get_bank_account_id(self, entity_id: int) -> int:
        """Get Mercury bank account ID"""
        result = await self.db.execute(
            select(BankAccount).where(
                and_(
                    BankAccount.entity_id == entity_id,
                    BankAccount.mercury_account_id == self.account_id
                )
            )
        )
        account = result.scalar_one_or_none()

        # Create bank account if doesn't exist
        if not account:
            # Get cash GL account
            cash_account = await self._get_cash_account(entity_id)

            # Fetch full account details from Mercury API
            account_details = await self._fetch_mercury_account_details()

            account = BankAccount(
                entity_id=entity_id,
                bank_name="Mercury",
                account_name=account_details.get("name", f"Mercury Checking ••{self.account_id[-4:] if self.account_id else '****'}"),
                account_number=account_details.get("accountNumber"),
                account_number_masked=f"••{account_details.get('accountNumber', '')[-4:]}" if account_details.get("accountNumber") else None,
                routing_number=account_details.get("routingNumber"),
                account_type=account_details.get("kind", "checking"),
                currency="USD",
                current_balance=Decimal(str(account_details.get("currentBalance", 0))),
                available_balance=Decimal(str(account_details.get("availableBalance", 0))),
                is_primary=True,  # First Mercury account is primary
                gl_account_id=cash_account.id,
                is_active=True,
                mercury_account_id=self.account_id,
                auto_sync_enabled=True,
                sync_frequency="daily",
                last_sync_at=get_pst_now(),
                last_sync_status="success",
                created_at=get_pst_now()
            )
            self.db.add(account)
            await self.db.flush()

        return account.id
    
    async def _generate_je_number(self, entity_id: int, fiscal_year: int) -> str:
        """
        Generate US GAAP compliant journal entry number: JE-YYYY-NNNNNN
        Consistent with manual journal entries for audit trail
        """
        result = await self.db.execute(
            select(func.count(JournalEntry.id)).where(
                and_(
                    JournalEntry.entity_id == entity_id,
                    JournalEntry.fiscal_year == fiscal_year
                )
            )
        )
        count = result.scalar()
        return f"JE-{fiscal_year}-{(count + 1):06d}"

    async def _generate_entry_number(self, entity_id: int, prefix: str) -> str:
        """
        DEPRECATED: Use _generate_je_number instead for US GAAP compliance
        Generate sequential entry number
        """
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

