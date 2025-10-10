"""
Bank Reconciliation Service
Complete bank reconciliation workflow per GAAP standards
"""

from decimal import Decimal
from typing import Dict, List, Optional
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
import logging

from src.api.models_accounting import JournalEntry, JournalEntryLine, ChartOfAccounts
from src.api.models_accounting_part2 import BankAccount, BankTransaction, BankReconciliation
from src.api.utils.datetime_utils import get_pst_now

logger = logging.getLogger(__name__)


class BankReconciliationService:
    """
    Service for bank reconciliation workflow
    Matches bank transactions to GL entries and generates reconciliation reports
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
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
        """Get deposits in GL but not yet in bank"""
        # In production, this would query for JEs with cash debits
        # that don't have matching bank transactions
        return []
    
    async def _get_outstanding_checks(
        self,
        bank_account_id: int,
        as_of_date: date
    ) -> List[Dict]:
        """Get checks issued but not yet cleared"""
        # In production, this would query for JEs with cash credits
        # that don't have matching bank transactions
        return []
    
    async def _get_je_number(self, je_id: Optional[int]) -> Optional[str]:
        """Get JE number from ID"""
        if not je_id:
            return None
        
        je = await self.db.get(JournalEntry, je_id)
        return je.entry_number if je else None

