"""
Bank Reconciliation Service
Complete bank reconciliation workflow per GAAP standards with smart period detection
"""

from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_
import logging

from services.api.models_accounting import JournalEntry, JournalEntryLine, ChartOfAccounts, AccountingEntity
from services.api.models_accounting_part2 import BankAccount, BankTransaction, BankReconciliation
from services.api.models_accounting_part3 import AccountingPeriod, PeriodCloseValidation
from services.api.utils.datetime_utils import get_pst_now

logger = logging.getLogger(__name__)


class BankReconciliationService:
    """
    Service for bank reconciliation workflow
    Matches bank transactions to GL entries and generates reconciliation reports
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_smart_reconciliation_status(
        self,
        entity_id: int,
        as_of_date: Optional[date] = None
    ) -> Dict:
        """
        Smart bank reconciliation status with workflow awareness

        Determines:
        - Has entity closed periods before?
        - What period needs closing?
        - Prerequisites checklist
        - Current blocking issues

        Returns comprehensive status for UI
        """
        try:
            # Use PST timezone for consistency
            if as_of_date is None:
                as_of_date = get_pst_now().date()

            # Get entity
            entity = await self.db.get(AccountingEntity, entity_id)
            if not entity:
                return {"success": False, "message": "Entity not found"}

            # Determine period close status
            period_status = await self._get_period_close_status(entity_id, as_of_date)

            # Get prerequisites checklist
            prerequisites = await self._get_reconciliation_prerequisites(
                entity_id,
                period_status["target_period_start"],
                period_status["target_period_end"]
            )

            # Validate period close date logic
            close_date_validation = self._validate_period_close_date(
                period_status["target_period_end"]
            )

            # Get bank accounts for entity
            bank_accounts_result = await self.db.execute(
                select(BankAccount).where(
                    BankAccount.entity_id == entity_id
                )
            )
            bank_accounts = bank_accounts_result.scalars().all()

            # Get reconciliation status for each bank account
            bank_account_statuses = []
            for bank_account in bank_accounts:
                account_status = await self.get_reconciliation_status(
                    bank_account.id,
                    period_status["target_period_end"]
                )
                if account_status.get("success"):
                    bank_account_statuses.append(account_status)

            return {
                "success": True,
                "entity": {
                    "id": entity.id,
                    "name": entity.entity_name,
                    "entity_type": entity.entity_type,
                    "inception_date": entity.formation_date.isoformat() if entity.formation_date else None
                },
                "period_status": period_status,
                "prerequisites": prerequisites,
                "close_date_validation": close_date_validation,
                "bank_accounts": bank_account_statuses,
                "overall_status": self._determine_overall_status(prerequisites),
                "next_action": self._determine_next_action(prerequisites),
                "as_of_date": as_of_date.isoformat()
            }

        except Exception as e:
            logger.error(f"Error getting smart reconciliation status: {str(e)}")
            return {"success": False, "message": str(e)}

    async def _get_period_close_status(
        self,
        entity_id: int,
        as_of_date: date
    ) -> Dict:
        """
        Determine period close status for entity

        Returns:
        - has_closed_before: bool
        - last_closed_period: dict or None
        - target_period_start: date
        - target_period_end: date
        - is_first_time_close: bool
        """
        # Get all closed periods for entity
        closed_periods_result = await self.db.execute(
            select(AccountingPeriod).where(
                and_(
                    AccountingPeriod.entity_id == entity_id,
                    AccountingPeriod.status.in_(["closed", "locked"])
                )
            ).order_by(AccountingPeriod.end_date.desc())
        )
        closed_periods = closed_periods_result.scalars().all()

        has_closed_before = len(closed_periods) > 0

        # Get entity formation date
        entity = await self.db.get(AccountingEntity, entity_id)
        inception_date = entity.formation_date if entity and entity.formation_date else date(2024, 7, 1)

        if has_closed_before:
            # Continue from last closed period
            last_period = closed_periods[0]
            target_period_start = last_period.end_date + timedelta(days=1)

            # Target period end is end of month containing as_of_date
            target_period_end = date(as_of_date.year, as_of_date.month, 1) + relativedelta(months=1) - timedelta(days=1)

            return {
                "has_closed_before": True,
                "last_closed_period": {
                    "id": last_period.id,
                    "fiscal_year": last_period.fiscal_year,
                    "fiscal_period": last_period.fiscal_period,
                    "start_date": last_period.start_date.isoformat(),
                    "end_date": last_period.end_date.isoformat(),
                    "status": last_period.status
                },
                "target_period_start": target_period_start,
                "target_period_end": target_period_end,
                "is_first_time_close": False,
                "period_description": f"{target_period_start.strftime('%B %Y')} (continuing from last close)"
            }
        else:
            # First-time close: from inception to current month end
            target_period_start = inception_date
            target_period_end = date(as_of_date.year, as_of_date.month, 1) + relativedelta(months=1) - timedelta(days=1)

            # Calculate number of months
            months_diff = (target_period_end.year - target_period_start.year) * 12 + \
                         (target_period_end.month - target_period_start.month) + 1

            return {
                "has_closed_before": False,
                "last_closed_period": None,
                "target_period_start": target_period_start,
                "target_period_end": target_period_end,
                "is_first_time_close": True,
                "period_description": f"First close: {target_period_start.strftime('%b %Y')} - {target_period_end.strftime('%b %Y')} ({months_diff} months)",
                "months_count": months_diff
            }

    async def _get_reconciliation_prerequisites(
        self,
        entity_id: int,
        period_start: date,
        period_end: date
    ) -> Dict:
        """
        Get prerequisites checklist for bank reconciliation

        Returns checklist with status for each prerequisite:
        - Draft JEs need to be posted
        - Unmatched bank transactions
        - Trial balance balanced
        - Required adjusting entries
        """
        checklist = []
        all_blocking_issues = []

        # 1. Check for draft JEs in period
        draft_jes_result = await self.db.execute(
            select(func.count(JournalEntry.id)).where(
                and_(
                    JournalEntry.entity_id == entity_id,
                    JournalEntry.entry_date >= period_start,
                    JournalEntry.entry_date <= period_end,
                    JournalEntry.workflow_stage == 0,
                    JournalEntry.status == "draft"
                )
            )
        )
        draft_jes_count = draft_jes_result.scalar() or 0

        draft_jes_status = "completed" if draft_jes_count == 0 else "blocked"
        checklist.append({
            "task": "Post all draft journal entries",
            "status": draft_jes_status,
            "blocking": draft_jes_count > 0,
            "details": f"{draft_jes_count} draft entries need approval and posting" if draft_jes_count > 0 else "All entries posted",
            "count": draft_jes_count
        })
        if draft_jes_count > 0:
            all_blocking_issues.append(f"{draft_jes_count} draft journal entries need posting")

        # 2. Check for unmatched bank transactions in period
        unmatched_txns_result = await self.db.execute(
            select(func.count(BankTransaction.id)).where(
                and_(
                    BankTransaction.entity_id == entity_id,
                    BankTransaction.transaction_date >= period_start,
                    BankTransaction.transaction_date <= period_end,
                    BankTransaction.matched_journal_entry_id.is_(None)
                )
            )
        )
        unmatched_txns_count = unmatched_txns_result.scalar() or 0

        unmatched_status = "completed" if unmatched_txns_count == 0 else "blocked"
        checklist.append({
            "task": "Match all bank transactions to journal entries",
            "status": unmatched_status,
            "blocking": unmatched_txns_count > 0,
            "details": f"{unmatched_txns_count} unmatched transactions" if unmatched_txns_count > 0 else "All transactions matched",
            "count": unmatched_txns_count
        })
        if unmatched_txns_count > 0:
            all_blocking_issues.append(f"{unmatched_txns_count} unmatched bank transactions")

        # 3. Check trial balance (debits = credits)
        trial_balance_check = await self._check_trial_balance(entity_id, period_end)
        checklist.append({
            "task": "Verify trial balance is balanced",
            "status": "completed" if trial_balance_check["is_balanced"] else "blocked",
            "blocking": not trial_balance_check["is_balanced"],
            "details": trial_balance_check["message"],
            "difference": trial_balance_check.get("difference", 0)
        })
        if not trial_balance_check["is_balanced"]:
            all_blocking_issues.append("Trial balance is out of balance")

        # 4. Check for pending approvals in period
        pending_approvals_result = await self.db.execute(
            select(func.count(JournalEntry.id)).where(
                and_(
                    JournalEntry.entity_id == entity_id,
                    JournalEntry.entry_date >= period_start,
                    JournalEntry.entry_date <= period_end,
                    or_(
                        JournalEntry.workflow_stage == 1,
                        JournalEntry.workflow_stage == 2
                    )
                )
            )
        )
        pending_approvals_count = pending_approvals_result.scalar() or 0

        pending_status = "completed" if pending_approvals_count == 0 else "blocked"
        checklist.append({
            "task": "Complete all pending approvals",
            "status": pending_status,
            "blocking": pending_approvals_count > 0,
            "details": f"{pending_approvals_count} entries pending approval" if pending_approvals_count > 0 else "All approvals complete",
            "count": pending_approvals_count
        })
        if pending_approvals_count > 0:
            all_blocking_issues.append(f"{pending_approvals_count} journal entries pending approval")

        # 5. Check for any transactions after period end
        future_txns_result = await self.db.execute(
            select(func.count(JournalEntry.id)).where(
                and_(
                    JournalEntry.entity_id == entity_id,
                    JournalEntry.entry_date > period_end
                )
            )
        )
        future_txns_count = future_txns_result.scalar() or 0

        checklist.append({
            "task": "Ensure no transactions exist after period end",
            "status": "warning" if future_txns_count > 0 else "completed",
            "blocking": False,  # Warning only, not blocking
            "details": f"{future_txns_count} transactions dated after period end" if future_txns_count > 0 else "No future-dated transactions",
            "count": future_txns_count
        })

        # Calculate overall completion
        total_tasks = len([c for c in checklist if c.get("blocking") is not None])
        completed_tasks = len([c for c in checklist if c["status"] == "completed"])

        return {
            "checklist": checklist,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "completion_percentage": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0,
            "is_ready_to_reconcile": len(all_blocking_issues) == 0,
            "blocking_issues": all_blocking_issues
        }

    def _validate_period_close_date(self, period_end: date) -> Dict:
        """
        Validate period close date logic

        Close date should be day after period end
        e.g., Close January 31 period on February 1
        """
        close_date = period_end + timedelta(days=1)
        today = get_pst_now().date()

        can_close_now = today >= close_date

        return {
            "period_end": period_end.isoformat(),
            "recommended_close_date": close_date.isoformat(),
            "can_close_now": can_close_now,
            "message": f"Period can be closed on or after {close_date.strftime('%B %d, %Y')}" if not can_close_now else "Period is ready to close",
            "days_until_close": (close_date - today).days if not can_close_now else 0
        }

    async def _check_trial_balance(self, entity_id: int, as_of_date: date) -> Dict:
        """
        Check if trial balance is balanced (total debits = total credits)
        """
        try:
            # Sum all debits and credits for posted entries
            result = await self.db.execute(
                select(
                    func.sum(JournalEntryLine.debit_amount).label("total_debits"),
                    func.sum(JournalEntryLine.credit_amount).label("total_credits")
                ).select_from(JournalEntryLine).join(
                    JournalEntry,
                    JournalEntry.id == JournalEntryLine.journal_entry_id
                ).where(
                    and_(
                        JournalEntry.entity_id == entity_id,
                        JournalEntry.entry_date <= as_of_date,
                        JournalEntry.workflow_stage == 3,  # Posted only
                        JournalEntry.status == "posted"
                    )
                )
            )
            row = result.first()

            total_debits = row.total_debits or Decimal("0")
            total_credits = row.total_credits or Decimal("0")
            difference = abs(total_debits - total_credits)

            is_balanced = difference < Decimal("0.01")

            return {
                "is_balanced": is_balanced,
                "total_debits": float(total_debits),
                "total_credits": float(total_credits),
                "difference": float(difference),
                "message": "Trial balance is balanced" if is_balanced else f"Out of balance by ${difference:,.2f}"
            }

        except Exception as e:
            logger.error(f"Error checking trial balance: {str(e)}")
            return {
                "is_balanced": False,
                "message": f"Error checking trial balance: {str(e)}"
            }

    def _determine_overall_status(self, prerequisites: Dict) -> str:
        """
        Determine overall reconciliation status

        Returns: ready, blocked, warning
        """
        if prerequisites["is_ready_to_reconcile"]:
            return "ready"

        # Check if any blocking issues
        blocking_count = len(prerequisites["blocking_issues"])
        if blocking_count > 0:
            return "blocked"

        return "warning"

    def _determine_next_action(self, prerequisites: Dict) -> str:
        """
        Determine the next action user should take
        """
        if prerequisites["is_ready_to_reconcile"]:
            return "Ready to run bank reconciliation"

        # Get first blocking issue
        if len(prerequisites["blocking_issues"]) > 0:
            return prerequisites["blocking_issues"][0]

        # Check checklist for first incomplete task
        for item in prerequisites["checklist"]:
            if item["status"] != "completed":
                return item["task"]

        return "Review checklist for next steps"
    
    async def get_reconciliation_status(
        self,
        bank_account_id: int,
        as_of_date: date
    ) -> Dict:
        """
        Get current reconciliation status for a bank account
        Shows matched/unmatched transactions and GL balance vs Bank balance
        """
        try:
            # Get bank account
            bank_account = await self.db.get(BankAccount, bank_account_id)
            if not bank_account:
                return {"success": False, "message": "Bank account not found"}
            
            # Get all transactions up to date
            transactions_result = await self.db.execute(
                select(BankTransaction).where(
                    and_(
                        BankTransaction.bank_account_id == bank_account_id,
                        BankTransaction.transaction_date <= as_of_date
                    )
                ).order_by(BankTransaction.transaction_date)
            )
            transactions = transactions_result.scalars().all()
            
            # Separate matched and unmatched
            matched_txns = [t for t in transactions if t.matched_journal_entry_id]
            unmatched_txns = [t for t in transactions if not t.matched_journal_entry_id]
            
            # Calculate bank balance
            bank_balance = sum(t.amount for t in transactions)
            
            # Get GL cash account balance
            cash_account = await self._get_cash_account(bank_account.entity_id)
            gl_balance = cash_account.current_balance if cash_account else Decimal("0")
            
            # Calculate difference
            difference = gl_balance - bank_balance
            
            return {
                "success": True,
                "bank_account": {
                    "id": bank_account.id,
                    "bank_name": bank_account.bank_name,
                    "account_name": bank_account.account_name,
                    "account_number_last_four": bank_account.account_number_last_four
                },
                "as_of_date": as_of_date.isoformat(),
                "bank_balance": float(bank_balance),
                "gl_balance": float(gl_balance),
                "difference": float(difference),
                "is_reconciled": abs(difference) < Decimal("0.01"),
                "matched_transactions": len(matched_txns),
                "unmatched_transactions": len(unmatched_txns),
                "matched_txn_list": [
                    {
                        "id": t.id,
                        "date": t.transaction_date.isoformat(),
                        "description": t.description,
                        "amount": float(t.amount),
                        "je_number": await self._get_je_number(t.matched_journal_entry_id)
                    }
                    for t in matched_txns
                ],
                "unmatched_txn_list": [
                    {
                        "id": t.id,
                        "date": t.transaction_date.isoformat(),
                        "description": t.description,
                        "amount": float(t.amount),
                        "mercury_id": t.mercury_transaction_id
                    }
                    for t in unmatched_txns
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting reconciliation status: {str(e)}")
            return {"success": False, "message": str(e)}
    
    async def match_transaction_to_je(
        self,
        transaction_id: int,
        journal_entry_id: int
    ) -> Dict:
        """Manually match a transaction to a journal entry"""
        try:
            transaction = await self.db.get(BankTransaction, transaction_id)
            if not transaction:
                return {"success": False, "message": "Transaction not found"}
            
            je = await self.db.get(JournalEntry, journal_entry_id)
            if not je:
                return {"success": False, "message": "Journal entry not found"}
            
            # Verify amount matches (within $0.01)
            lines_result = await self.db.execute(
                select(JournalEntryLine).where(
                    JournalEntryLine.journal_entry_id == journal_entry_id
                )
            )
            lines = lines_result.scalars().all()
            
            total_debit = sum(line.debit_amount for line in lines)
            total_credit = sum(line.credit_amount for line in lines)
            je_amount = max(total_debit, total_credit)
            txn_amount = abs(transaction.amount)
            
            if abs(je_amount - txn_amount) > Decimal("0.01"):
                return {
                    "success": False,
                    "message": f"Amount mismatch: Transaction ${txn_amount} vs JE ${je_amount}"
                }
            
            # Link transaction to JE
            transaction.matched_journal_entry_id = journal_entry_id
            transaction.status = "cleared"
            
            # Update JE
            je.mercury_transaction_id = transaction.mercury_transaction_id
            je.reconciliation_status = "matched"
            
            await self.db.commit()
            
            return {
                "success": True,
                "message": "Transaction matched successfully",
                "transaction_id": transaction_id,
                "je_number": je.entry_number
            }
            
        except Exception as e:
            logger.error(f"Error matching transaction: {str(e)}")
            await self.db.rollback()
            return {"success": False, "message": str(e)}
    
    async def unmatch_transaction(self, transaction_id: int) -> Dict:
        """Remove match between transaction and JE"""
        try:
            transaction = await self.db.get(BankTransaction, transaction_id)
            if not transaction:
                return {"success": False, "message": "Transaction not found"}
            
            # Get JE before unlinking
            je_id = transaction.matched_journal_entry_id
            if je_id:
                je = await self.db.get(JournalEntry, je_id)
                if je:
                    je.mercury_transaction_id = None
                    je.reconciliation_status = "unmatched"
            
            # Unlink
            transaction.matched_journal_entry_id = None
            transaction.status = "pending"
            
            await self.db.commit()
            
            return {
                "success": True,
                "message": "Transaction unmatched successfully"
            }
            
        except Exception as e:
            logger.error(f"Error unmatching transaction: {str(e)}")
            await self.db.rollback()
            return {"success": False, "message": str(e)}
    
    async def create_reconciliation_report(
        self,
        bank_account_id: int,
        period_start: date,
        period_end: date,
        ending_bank_balance: Decimal
    ) -> Dict:
        """
        Create formal bank reconciliation report
        Shows reconciliation from GL balance to Bank balance
        """
        try:
            bank_account = await self.db.get(BankAccount, bank_account_id)
            if not bank_account:
                return {"success": False, "message": "Bank account not found"}
            
            # Get GL cash account balance
            cash_account = await self._get_cash_account(bank_account.entity_id)
            gl_ending_balance = cash_account.current_balance if cash_account else Decimal("0")
            
            # Get outstanding deposits (in GL but not in bank yet)
            outstanding_deposits = await self._get_outstanding_deposits(
                bank_account_id, period_end
            )
            
            # Get outstanding checks (in GL but not cleared yet)
            outstanding_checks = await self._get_outstanding_checks(
                bank_account_id, period_end
            )
            
            # Calculate reconciliation
            reconciliation = {
                "bank_account": {
                    "bank_name": bank_account.bank_name,
                    "account_name": bank_account.account_name,
                    "account_number_last_four": bank_account.account_number_last_four
                },
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "gl_ending_balance": float(gl_ending_balance),
                "ending_bank_balance": float(ending_bank_balance),
                "outstanding_deposits": [
                    {
                        "date": d["date"].isoformat(),
                        "description": d["description"],
                        "amount": float(d["amount"])
                    }
                    for d in outstanding_deposits
                ],
                "outstanding_checks": [
                    {
                        "date": c["date"].isoformat(),
                        "description": c["description"],
                        "amount": float(c["amount"])
                    }
                    for c in outstanding_checks
                ],
                "total_outstanding_deposits": float(sum(d["amount"] for d in outstanding_deposits)),
                "total_outstanding_checks": float(sum(c["amount"] for c in outstanding_checks))
            }
            
            # Calculate adjusted bank balance
            adjusted_bank_balance = (
                ending_bank_balance +
                sum(d["amount"] for d in outstanding_deposits) -
                sum(c["amount"] for c in outstanding_checks)
            )
            
            reconciliation["adjusted_bank_balance"] = float(adjusted_bank_balance)
            reconciliation["difference"] = float(gl_ending_balance - adjusted_bank_balance)
            reconciliation["is_reconciled"] = abs(gl_ending_balance - adjusted_bank_balance) < Decimal("0.01")
            
            # Save reconciliation record
            rec_record = BankReconciliation(
                entity_id=bank_account.entity_id,
                bank_account_id=bank_account_id,
                reconciliation_date=period_end,
                period_start=period_start,
                period_end=period_end,
                gl_balance=gl_ending_balance,
                bank_balance=ending_bank_balance,
                adjusted_bank_balance=adjusted_bank_balance,
                difference=gl_ending_balance - adjusted_bank_balance,
                is_reconciled=abs(gl_ending_balance - adjusted_bank_balance) < Decimal("0.01"),
                reconciliation_data=reconciliation,
                created_at=get_pst_now()
            )
            self.db.add(rec_record)
            await self.db.commit()
            
            reconciliation["reconciliation_id"] = rec_record.id
            
            return {
                "success": True,
                "reconciliation": reconciliation
            }
            
        except Exception as e:
            logger.error(f"Error creating reconciliation report: {str(e)}")
            await self.db.rollback()
            return {"success": False, "message": str(e)}
    
    async def _get_cash_account(self, entity_id: int) -> Optional[ChartOfAccounts]:
        """Get primary cash account"""
        result = await self.db.execute(
            select(ChartOfAccounts).where(
                and_(
                    ChartOfAccounts.entity_id == entity_id,
                    ChartOfAccounts.account_number == "10110"
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def _get_outstanding_deposits(
        self,
        bank_account_id: int,
        as_of_date: date
    ) -> List[Dict]:
        """
        Get deposits in transit - recorded in GL but not yet cleared at bank

        US GAAP Requirement: ASC 305-10-50-1
        "Deposits in transit are deposits that have been recorded in the entity's
        accounting records but have not yet been recorded by the bank."

        Logic:
        1. Find all JEs with DEBIT to Cash (account 10110)
        2. Check if there's a matching bank transaction
        3. If no match and date <= as_of_date, it's outstanding
        """
        try:
            bank_account = await self.db.get(BankAccount, bank_account_id)
            if not bank_account:
                return []

            # Get cash account for this entity
            cash_account_result = await self.db.execute(
                select(ChartOfAccounts).where(
                    and_(
                        ChartOfAccounts.entity_id == bank_account.entity_id,
                        ChartOfAccounts.account_number == "10110"
                    )
                )
            )
            cash_account = cash_account_result.scalar_one_or_none()

            if not cash_account:
                return []

            # Find all posted JE lines with DEBIT to cash (deposits)
            # that don't have matching bank transactions
            je_lines_result = await self.db.execute(
                select(JournalEntryLine, JournalEntry).join(
                    JournalEntry,
                    JournalEntry.id == JournalEntryLine.journal_entry_id
                ).outerjoin(
                    BankTransaction,
                    and_(
                        BankTransaction.matched_journal_entry_id == JournalEntry.id,
                        BankTransaction.bank_account_id == bank_account_id
                    )
                ).where(
                    and_(
                        JournalEntry.entity_id == bank_account.entity_id,
                        JournalEntry.entry_date <= as_of_date,
                        JournalEntry.workflow_stage == 3,  # Posted
                        JournalEntry.status == "posted",
                        JournalEntryLine.account_id == cash_account.id,
                        JournalEntryLine.debit_amount > 0,  # Deposits are debits to cash
                        BankTransaction.id.is_(None)  # No matching bank transaction
                    )
                ).order_by(JournalEntry.entry_date)
            )

            outstanding = []
            for line, je in je_lines_result:
                outstanding.append({
                    "date": je.entry_date,
                    "description": f"JE {je.entry_number}: {je.memo or 'Deposit'}",
                    "amount": line.debit_amount,
                    "je_id": je.id,
                    "je_number": je.entry_number
                })

            return outstanding

        except Exception as e:
            logger.error(f"Error getting outstanding deposits: {str(e)}")
            return []

    async def _get_outstanding_checks(
        self,
        bank_account_id: int,
        as_of_date: date
    ) -> List[Dict]:
        """
        Get outstanding checks - checks issued (recorded in GL) but not yet cleared at bank

        US GAAP Requirement: ASC 305-10-50-1
        "Outstanding checks are checks that have been issued and recorded in the entity's
        accounting records but have not yet cleared the bank."

        Logic:
        1. Find all JEs with CREDIT to Cash (account 10110)
        2. Check if there's a matching bank transaction
        3. If no match and date <= as_of_date, check is outstanding
        """
        try:
            bank_account = await self.db.get(BankAccount, bank_account_id)
            if not bank_account:
                return []

            # Get cash account for this entity
            cash_account_result = await self.db.execute(
                select(ChartOfAccounts).where(
                    and_(
                        ChartOfAccounts.entity_id == bank_account.entity_id,
                        ChartOfAccounts.account_number == "10110"
                    )
                )
            )
            cash_account = cash_account_result.scalar_one_or_none()

            if not cash_account:
                return []

            # Find all posted JE lines with CREDIT to cash (checks/payments)
            # that don't have matching bank transactions
            je_lines_result = await self.db.execute(
                select(JournalEntryLine, JournalEntry).join(
                    JournalEntry,
                    JournalEntry.id == JournalEntryLine.journal_entry_id
                ).outerjoin(
                    BankTransaction,
                    and_(
                        BankTransaction.matched_journal_entry_id == JournalEntry.id,
                        BankTransaction.bank_account_id == bank_account_id
                    )
                ).where(
                    and_(
                        JournalEntry.entity_id == bank_account.entity_id,
                        JournalEntry.entry_date <= as_of_date,
                        JournalEntry.workflow_stage == 3,  # Posted
                        JournalEntry.status == "posted",
                        JournalEntryLine.account_id == cash_account.id,
                        JournalEntryLine.credit_amount > 0,  # Checks are credits to cash
                        BankTransaction.id.is_(None)  # No matching bank transaction
                    )
                ).order_by(JournalEntry.entry_date)
            )

            outstanding = []
            for line, je in je_lines_result:
                outstanding.append({
                    "date": je.entry_date,
                    "description": f"JE {je.entry_number}: {je.memo or 'Payment'}",
                    "amount": line.credit_amount,
                    "je_id": je.id,
                    "je_number": je.entry_number
                })

            return outstanding

        except Exception as e:
            logger.error(f"Error getting outstanding checks: {str(e)}")
            return []
    
    async def _get_je_number(self, je_id: Optional[int]) -> Optional[str]:
        """Get JE number from ID"""
        if not je_id:
            return None
        
        je = await self.db.get(JournalEntry, je_id)
        return je.entry_number if je else None

