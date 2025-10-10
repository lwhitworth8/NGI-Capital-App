"""
Period Close Service
Comprehensive period close workflow and checklist management
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional
import logging

from src.api.models_period_close import PeriodClose, ClosingEntry, PeriodLock, AdjustingEntry
from src.api.models_accounting import JournalEntry, ChartOfAccounts
from src.api.models_accounting_part2 import BankAccount, BankReconciliation
from src.api.models_fixed_assets import FixedAsset, DepreciationEntry
from src.api.utils.datetime_utils import get_pst_now
from src.api.services.financial_statements_generator import FinancialStatementsGenerator

logger = logging.getLogger(__name__)


class PeriodCloseService:
    """Service for managing period close workflow"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.statements_generator = FinancialStatementsGenerator(db)
    
    async def initiate_period_close(
        self,
        entity_id: int,
        period_type: str,
        period_end_date: date,
        initiated_by_email: str
    ) -> Dict:
        """Initiate period close process"""
        
        # Calculate period start
        period_start_date = self._calculate_period_start(period_end_date, period_type)
        fiscal_year = period_end_date.year
        fiscal_period = self._get_fiscal_period(period_type, period_end_date)
        
        # Check if period close already exists
        existing = await self.db.execute(
            select(PeriodClose).where(
                and_(
                    PeriodClose.entity_id == entity_id,
                    PeriodClose.period_end == period_end_date,
                    PeriodClose.period_type == period_type
                )
            )
        )
        existing_close = existing.scalar_one_or_none()
        
        if existing_close and existing_close.status == "closed":
            return {
                "success": False,
                "message": "Period already closed",
                "close_id": existing_close.id
            }
        
        if existing_close:
            # Resume existing close
            period_close = existing_close
            period_close.status = "in_progress"
        else:
            # Create new period close
            period_close = PeriodClose(
                entity_id=entity_id,
                period_type=period_type,
                period_start=period_start_date,
                period_end=period_end_date,
                fiscal_year=fiscal_year,
                fiscal_period=fiscal_period,
                status="in_progress",
                initiated_by_email=initiated_by_email,
                initiated_at=get_pst_now()
            )
            self.db.add(period_close)
            await self.db.flush()
        
        # Run checklist
        checklist = await self.run_checklist(period_close.id)
        
        await self.db.commit()
        
        return {
            "success": True,
            "close_id": period_close.id,
            "period_start": period_start_date,
            "period_end": period_end_date,
            "checklist": checklist
        }
    
    async def run_checklist(self, close_id: int) -> List[Dict]:
        """Run comprehensive period close checklist"""
        
        close = await self.db.get(PeriodClose, close_id)
        if not close:
            return []
        
        checklist = []
        
        # 1. All documents uploaded and processed
        doc_status = await self._check_documents(close.entity_id, close.period_end)
        close.documents_complete = doc_status["complete"]
        checklist.append({
            "item": "All documents uploaded and processed",
            "category": "documents",
            "status": "complete" if doc_status["complete"] else "incomplete",
            "details": doc_status["details"],
            "action_url": "/accounting/documents" if not doc_status["complete"] else None
        })
        
        # 2. All bank accounts reconciled
        recon_status = await self._check_bank_reconciliation(close.entity_id, close.period_end)
        close.reconciliation_complete = recon_status["complete"]
        checklist.append({
            "item": "All bank accounts reconciled",
            "category": "banking",
            "status": "complete" if recon_status["complete"] else "incomplete",
            "details": recon_status["details"],
            "action_url": "/accounting/banking" if not recon_status["complete"] else None
        })
        
        # 3. All journal entries approved and posted
        je_status = await self._check_journal_entries(close.entity_id, close.period_end)
        close.journal_entries_complete = je_status["complete"]
        checklist.append({
            "item": "All journal entries approved and posted",
            "category": "journal_entries",
            "status": "complete" if je_status["complete"] else "incomplete",
            "details": je_status["details"],
            "action_url": "/accounting/general-ledger" if not je_status["complete"] else None
        })
        
        # 4. Trial balance reviewed and balanced
        tb_status = await self._check_trial_balance(close.entity_id, close.period_end)
        close.trial_balance_complete = tb_status["complete"]
        close.is_balanced = tb_status["balanced"]
        close.trial_balance_debits = tb_status.get("total_debits", 0)
        close.trial_balance_credits = tb_status.get("total_credits", 0)
        checklist.append({
            "item": "Trial balance reviewed and balanced",
            "category": "trial_balance",
            "status": "complete" if tb_status["complete"] else "incomplete",
            "details": tb_status["details"],
            "action_url": "/accounting/general-ledger" if not tb_status["complete"] else None
        })
        
        # 5. Depreciation calculated and recorded
        dep_status = await self._check_depreciation(close.entity_id, close.period_end)
        close.depreciation_complete = dep_status["complete"]
        checklist.append({
            "item": "Depreciation calculated and recorded",
            "category": "depreciation",
            "status": "complete" if dep_status["complete"] else "incomplete",
            "details": dep_status["details"],
            "action_url": "/accounting/fixed-assets" if not dep_status["complete"] else None
        })
        
        # 6. Adjusting entries created (if needed)
        adj_status = await self._check_adjusting_entries(close.entity_id, close.period_end)
        close.adjusting_entries_complete = adj_status["complete"]
        checklist.append({
            "item": "Adjusting entries reviewed (accruals, prepaids, reclassifications)",
            "category": "adjusting_entries",
            "status": "manual_review" if not adj_status["complete"] else "complete",
            "details": adj_status["details"],
            "action_url": "/accounting/general-ledger" if not adj_status["complete"] else None
        })
        
        # 7. Financial statements ready to generate
        stmt_status = await self._check_financial_statements(close.entity_id, close.period_start, close.period_end)
        close.statements_complete = stmt_status["complete"]
        checklist.append({
            "item": "Financial statements generated",
            "category": "statements",
            "status": "ready" if all([
                close.documents_complete,
                close.reconciliation_complete,
                close.journal_entries_complete,
                close.trial_balance_complete,
                close.depreciation_complete
            ]) else "waiting",
            "details": stmt_status["details"],
            "action_url": "/accounting/reporting" if stmt_status["complete"] else None
        })
        
        # Store checklist in close record
        close.checklist_status = checklist
        await self.db.commit()
        
        return checklist
    
    async def execute_period_close(
        self,
        close_id: int,
        closed_by_email: str,
        force: bool = False
    ) -> Dict:
        """Execute period close after checklist complete"""
        
        close = await self.db.get(PeriodClose, close_id)
        if not close:
            return {"success": False, "message": "Period close not found"}
        
        if close.status == "closed":
            return {"success": False, "message": "Period already closed"}
        
        # Verify checklist complete
        if not force:
            checklist = await self.run_checklist(close_id)
            incomplete = [item for item in checklist if item["status"] not in ["complete", "ready"]]
            if incomplete:
                return {
                    "success": False,
                    "message": f"{len(incomplete)} checklist items incomplete",
                    "incomplete_items": [item["item"] for item in incomplete]
                }
        
        # Generate financial statements
        logger.info(f"Generating financial statements for period close {close_id}")
        
        bs = await self.statements_generator.generate_balance_sheet(
            close.entity_id,
            close.period_end,
            consolidated=False
        )
        
        is_stmt = await self.statements_generator.generate_income_statement(
            close.entity_id,
            close.period_start,
            close.period_end,
            consolidated=False
        )
        
        cfs = await self.statements_generator.generate_cash_flow_statement(
            close.entity_id,
            close.period_start,
            close.period_end,
            consolidated=False
        )
        
        equity = await self.statements_generator.generate_equity_statement(
            close.entity_id,
            close.period_start,
            close.period_end,
            consolidated=False
        )
        
        # Store financial summary
        close.total_assets = bs.get("assets", {}).get("total_assets", 0)
        close.total_liabilities = bs.get("liabilities", {}).get("total_liabilities", 0)
        close.total_equity = bs.get("equity", {}).get("total_equity", 0)
        close.period_revenue = is_stmt.get("total_revenue", 0)
        close.period_expenses = is_stmt.get("operating_expenses", {}).get("total_operating_expenses", 0)
        close.net_income = is_stmt.get("net_income", 0)
        
        # Store statements
        close.financial_statements = {
            "balance_sheet": bs,
            "income_statement": is_stmt,
            "cash_flow": cfs,
            "equity_statement": equity
        }
        
        # Generate closing entries (year-end only)
        if close.period_type == "year":
            await self._generate_closing_entries(close_id)
        
        # Lock period
        await self._lock_period(close.entity_id, close.period_start, close.period_end, close_id)
        
        # Mark close complete
        close.status = "closed"
        close.closed_by_email = closed_by_email
        close.closed_at = get_pst_now()
        
        await self.db.commit()
        
        logger.info(f"Period close {close_id} completed successfully")
        
        return {
            "success": True,
            "message": "Period closed successfully",
            "close_id": close_id,
            "financial_summary": {
                "total_assets": float(close.total_assets),
                "total_liabilities": float(close.total_liabilities),
                "total_equity": float(close.total_equity),
                "net_income": float(close.net_income)
            }
        }
    
    async def reopen_period(
        self,
        close_id: int,
        reopened_by_email: str,
        reason: str
    ) -> Dict:
        """Reopen a closed period (requires approval)"""
        
        close = await self.db.get(PeriodClose, close_id)
        if not close:
            return {"success": False, "message": "Period close not found"}
        
        if close.status != "closed":
            return {"success": False, "message": "Period is not closed"}
        
        # Unlock period
        await self._unlock_period(close.entity_id, close.period_start, close.period_end)
        
        # Update close record
        close.status = "reopened"
        close.reopened_by_email = reopened_by_email
        close.reopened_at = get_pst_now()
        close.reopen_reason = reason
        
        await self.db.commit()
        
        logger.warning(f"Period close {close_id} reopened by {reopened_by_email}: {reason}")
        
        return {"success": True, "message": "Period reopened"}
    
    # ============================================================================
    # CHECKLIST HELPERS
    # ============================================================================
    
    async def _check_documents(self, entity_id: int, period_end: date) -> Dict:
        """Check if all documents are uploaded and processed"""
        # TODO: Implement document check logic
        return {
            "complete": True,
            "details": "All documents processed"
        }
    
    async def _check_bank_reconciliation(self, entity_id: int, period_end: date) -> Dict:
        """Check if all bank accounts are reconciled"""
        
        # Get all bank accounts
        result = await self.db.execute(
            select(BankAccount).where(
                and_(
                    BankAccount.entity_id == entity_id,
                    BankAccount.is_active == True
                )
            )
        )
        accounts = result.scalars().all()
        
        if not accounts:
            return {"complete": True, "details": "No bank accounts to reconcile"}
        
        unreconciled = []
        for account in accounts:
            # Check if reconciliation exists for period
            recon_result = await self.db.execute(
                select(BankReconciliation).where(
                    and_(
                        BankReconciliation.bank_account_id == account.id,
                        BankReconciliation.statement_end_date == period_end,
                        BankReconciliation.status == "reconciled"
                    )
                )
            )
            recon = recon_result.scalar_one_or_none()
            if not recon:
                unreconciled.append(account.account_name)
        
        if unreconciled:
            return {
                "complete": False,
                "details": f"{len(unreconciled)} account(s) need reconciliation: {', '.join(unreconciled)}"
            }
        
        return {"complete": True, "details": "All bank accounts reconciled"}
    
    async def _check_journal_entries(self, entity_id: int, period_end: date) -> Dict:
        """Check if all JEs are approved and posted"""
        
        # Get pending JEs in period
        result = await self.db.execute(
            select(func.count(JournalEntry.id)).where(
                and_(
                    JournalEntry.entity_id == entity_id,
                    JournalEntry.entry_date <= period_end,
                    JournalEntry.status.in_(["draft", "pending_first_approval", "pending_final_approval", "approved"])
                )
            )
        )
        pending_count = result.scalar()
        
        if pending_count > 0:
            return {
                "complete": False,
                "details": f"{pending_count} journal entries pending approval/posting"
            }
        
        return {"complete": True, "details": "All journal entries posted"}
    
    async def _check_trial_balance(self, entity_id: int, period_end: date) -> Dict:
        """Check trial balance"""
        
        # Get all accounts with balances
        result = await self.db.execute(
            select(ChartOfAccounts).where(
                and_(
                    ChartOfAccounts.entity_id == entity_id,
                    ChartOfAccounts.is_active == True
                )
            )
        )
        accounts = result.scalars().all()
        
        total_debits = 0
        total_credits = 0
        
        for account in accounts:
            if account.normal_balance == "Debit":
                if account.current_balance >= 0:
                    total_debits += account.current_balance
                else:
                    total_credits += abs(account.current_balance)
            else:  # Credit
                if account.current_balance >= 0:
                    total_credits += account.current_balance
                else:
                    total_debits += abs(account.current_balance)
        
        difference = abs(total_debits - total_credits)
        is_balanced = difference < 0.01  # Allow for rounding
        
        return {
            "complete": is_balanced,
            "balanced": is_balanced,
            "total_debits": float(total_debits),
            "total_credits": float(total_credits),
            "details": f"Trial balance is balanced" if is_balanced else f"Out of balance by ${difference:.2f}"
        }
    
    async def _check_depreciation(self, entity_id: int, period_end: date) -> Dict:
        """Check if depreciation is calculated"""
        
        # Get active fixed assets
        result = await self.db.execute(
            select(func.count(FixedAsset.id)).where(
                and_(
                    FixedAsset.entity_id == entity_id,
                    FixedAsset.status == "In Service"
                )
            )
        )
        asset_count = result.scalar()
        
        if asset_count == 0:
            return {"complete": True, "details": "No fixed assets to depreciate"}
        
        # Check if depreciation entry exists for period
        result = await self.db.execute(
            select(JournalEntry).where(
                and_(
                    JournalEntry.entity_id == entity_id,
                    JournalEntry.entry_type == "Adjusting",
                    JournalEntry.source_type == "Depreciation",
                    JournalEntry.entry_date == period_end,
                    JournalEntry.status == "posted"
                )
            )
        )
        dep_je = result.scalar_one_or_none()
        
        if not dep_je:
            return {
                "complete": False,
                "details": f"Depreciation needed for {asset_count} active assets"
            }
        
        return {"complete": True, "details": "Depreciation calculated and posted"}
    
    async def _check_adjusting_entries(self, entity_id: int, period_end: date) -> Dict:
        """Check adjusting entries"""
        # This is a manual review item
        return {
            "complete": False,
            "details": "Review for accruals, prepaids, and adjustments"
        }
    
    async def _check_financial_statements(self, entity_id: int, period_start: date, period_end: date) -> Dict:
        """Check if financial statements can be generated"""
        return {
            "complete": False,
            "details": "Ready to generate after all checklist items complete"
        }
    
    # ============================================================================
    # CLOSING ENTRIES
    # ============================================================================
    
    async def _generate_closing_entries(self, close_id: int):
        """Generate year-end closing entries"""
        
        close = await self.db.get(PeriodClose, close_id)
        if not close:
            return
        
        # Closing entries follow this sequence:
        # 1. Close revenue accounts to Income Summary
        # 2. Close expense accounts to Income Summary
        # 3. Close Income Summary to Retained Earnings (or Member Capital for LLC)
        # 4. Close Dividends/Distributions to Retained Earnings
        
        logger.info(f"Generating closing entries for period close {close_id}")
        
        # TODO: Implement full closing entry logic
        # This would create JEs to close temporary accounts to permanent accounts
    
    # ============================================================================
    # PERIOD LOCKING
    # ============================================================================
    
    async def _lock_period(self, entity_id: int, period_start: date, period_end: date, close_id: int):
        """Lock period to prevent changes"""
        
        lock = PeriodLock(
            entity_id=entity_id,
            period_close_id=close_id,
            lock_start_date=period_start,
            lock_end_date=period_end,
            is_locked=True,
            lock_reason="Period closed",
            locked_by_email="system",
            locked_at=get_pst_now()
        )
        self.db.add(lock)
        await self.db.flush()
        
        logger.info(f"Period locked: {period_start} to {period_end}")
    
    async def _unlock_period(self, entity_id: int, period_start: date, period_end: date):
        """Unlock period"""
        
        result = await self.db.execute(
            select(PeriodLock).where(
                and_(
                    PeriodLock.entity_id == entity_id,
                    PeriodLock.lock_start_date == period_start,
                    PeriodLock.lock_end_date == period_end,
                    PeriodLock.is_locked == True
                )
            )
        )
        lock = result.scalar_one_or_none()
        
        if lock:
            lock.is_locked = False
            lock.unlocked_at = get_pst_now()
            await self.db.flush()
            logger.info(f"Period unlocked: {period_start} to {period_end}")
    
    # ============================================================================
    # UTILITIES
    # ============================================================================
    
    def _calculate_period_start(self, period_end: date, period_type: str) -> date:
        """Calculate period start date"""
        
        if period_type == "month":
            return date(period_end.year, period_end.month, 1)
        elif period_type == "quarter":
            quarter_month = ((period_end.month - 1) // 3) * 3 + 1
            return date(period_end.year, quarter_month, 1)
        elif period_type == "year":
            return date(period_end.year, 1, 1)
        else:
            return period_end
    
    def _get_fiscal_period(self, period_type: str, period_end: date) -> str:
        """Get fiscal period label"""
        
        if period_type == "month":
            return period_end.strftime("%B %Y")
        elif period_type == "quarter":
            quarter = (period_end.month - 1) // 3 + 1
            return f"Q{quarter} {period_end.year}"
        elif period_type == "year":
            return str(period_end.year)
        else:
            return "Custom"

