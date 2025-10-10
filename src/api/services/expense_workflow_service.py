"""
Expense Report Workflow Service
Dual-approval workflow for expense reports with auto-reimbursement
"""

from decimal import Decimal
from typing import Dict, Optional
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from src.api.models_expenses_payroll import ExpenseReport, ExpenseLine, EmployeePayrollInfo
from src.api.models_accounting import JournalEntry, JournalEntryLine, ChartOfAccounts
from src.api.utils.datetime_utils import get_pst_now

logger = logging.getLogger(__name__)


class ExpenseWorkflowService:
    """Service for managing expense report approval workflow"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def submit_for_approval(
        self,
        report_id: int,
        submitted_by_email: str
    ) -> Dict:
        """
        Submit expense report for approval
        Cannot submit empty reports
        """
        result = await self.db.execute(
            select(ExpenseReport).where(ExpenseReport.id == report_id)
        )
        report = result.scalar_one_or_none()
        
        if not report:
            return {"success": False, "message": "Expense report not found"}
        
        if report.status != "draft":
            return {"success": False, "message": f"Cannot submit report with status: {report.status}"}
        
        if report.total_amount == 0:
            return {"success": False, "message": "Cannot submit empty expense report"}
        
        # Check if employee is submitting their own report
        if report.employee_email != submitted_by_email:
            return {"success": False, "message": "Can only submit your own expense reports"}
        
        # Update status
        report.status = "pending_approval"
        report.submitted_at = get_pst_now()
        report.submitted_by_email = submitted_by_email
        
        await self.db.commit()
        
        # TODO: Send notification to other partner for approval
        
        return {
            "success": True,
            "message": "Expense report submitted for approval",
            "report_id": report_id,
            "status": "pending_approval"
        }
    
    async def approve(
        self,
        report_id: int,
        approved_by_email: str
    ) -> Dict:
        """
        Approve expense report
        Partner cannot approve their own report
        Auto-creates JE and initiates reimbursement
        """
        result = await self.db.execute(
            select(ExpenseReport).where(ExpenseReport.id == report_id)
        )
        report = result.scalar_one_or_none()
        
        if not report:
            return {"success": False, "message": "Expense report not found"}
        
        if report.status != "pending_approval":
            return {"success": False, "message": f"Cannot approve report with status: {report.status}"}
        
        # Validation: Cannot approve own expense report
        if report.employee_email == approved_by_email:
            return {
                "success": False,
                "message": "Cannot approve your own expense report",
                "error_code": "SELF_APPROVAL_NOT_ALLOWED"
            }
        
        # Validation: Only authorized partners can approve
        authorized_partners = ["lwhitworth@ngicapitaladvisory.com", "anurmamade@ngicapitaladvisory.com"]
        if approved_by_email not in authorized_partners:
            return {
                "success": False,
                "message": "Only partners can approve expense reports",
                "error_code": "UNAUTHORIZED_APPROVER"
            }
        
        # Update status
        report.status = "approved"
        report.approved_by_email = approved_by_email
        report.approved_at = get_pst_now()
        
        # Create Journal Entry
        je_result = await self._create_expense_je(report)
        if not je_result["success"]:
            return je_result
        
        report.journal_entry_id = je_result["journal_entry_id"]
        
        await self.db.commit()
        
        # TODO: Initiate direct deposit reimbursement via Mercury
        
        return {
            "success": True,
            "message": "Expense report approved and JE created",
            "report_id": report_id,
            "journal_entry_id": je_result["journal_entry_id"],
            "status": "approved"
        }
    
    async def reject(
        self,
        report_id: int,
        rejected_by_email: str,
        reason: str
    ) -> Dict:
        """Reject expense report with reason"""
        result = await self.db.execute(
            select(ExpenseReport).where(ExpenseReport.id == report_id)
        )
        report = result.scalar_one_or_none()
        
        if not report:
            return {"success": False, "message": "Expense report not found"}
        
        if report.status != "pending_approval":
            return {"success": False, "message": f"Cannot reject report with status: {report.status}"}
        
        # Cannot reject own expense report
        if report.employee_email == rejected_by_email:
            return {"success": False, "message": "Cannot reject your own expense report"}
        
        # Update status
        report.status = "rejected"
        report.rejected_by_email = rejected_by_email
        report.rejected_at = get_pst_now()
        report.rejection_reason = reason
        
        await self.db.commit()
        
        return {
            "success": True,
            "message": "Expense report rejected",
            "report_id": report_id,
            "reason": reason
        }
    
    async def _create_expense_je(self, report: ExpenseReport) -> Dict:
        """
        Create Journal Entry for expense reimbursement
        DR: Expense accounts (from line items)
        CR: Cash (reimbursement paid)
        """
        try:
            # Get expense lines
            lines_result = await self.db.execute(
                select(ExpenseLine).where(ExpenseLine.expense_report_id == report.id)
            )
            expense_lines = lines_result.scalars().all()
            
            if not expense_lines:
                return {"success": False, "message": "No expense lines found"}
            
            # Generate entry number
            entry_number = await self._generate_entry_number(report.entity_id, "EXP")
            
            # Create JE
            je = JournalEntry(
                entity_id=report.entity_id,
                entry_number=entry_number,
                entry_date=report.report_date,
                entry_type="Standard",
                memo=f"Expense Reimbursement - {report.report_number} - {report.employee_name}",
                source_type="ExpenseReport",
                source_id=str(report.id),
                status="draft",
                workflow_stage=0,
                created_by_email="system@ngicapitaladvisory.com",
                created_at=get_pst_now()
            )
            self.db.add(je)
            await self.db.flush()
            
            # Add expense lines (debits)
            line_number = 1
            total_debits = Decimal("0")
            
            for exp_line in expense_lines:
                je_line = JournalEntryLine(
                    journal_entry_id=je.id,
                    line_number=line_number,
                    account_id=exp_line.expense_account_id,
                    debit_amount=exp_line.amount,
                    credit_amount=Decimal("0"),
                    description=f"{exp_line.category} - {exp_line.description[:50]}"
                )
                self.db.add(je_line)
                total_debits += exp_line.amount
                line_number += 1
            
            # Add cash credit (reimbursement)
            cash_account = await self._get_cash_account(report.entity_id)
            if not cash_account:
                return {"success": False, "message": "Cash account not found"}
            
            je_line_cash = JournalEntryLine(
                journal_entry_id=je.id,
                line_number=line_number,
                account_id=cash_account.id,
                debit_amount=Decimal("0"),
                credit_amount=report.reimbursable_amount,
                description=f"Reimbursement to {report.employee_name}"
            )
            self.db.add(je_line_cash)
            
            # Verify balanced
            if total_debits != report.reimbursable_amount:
                return {
                    "success": False,
                    "message": f"JE not balanced: DR {total_debits} != CR {report.reimbursable_amount}"
                }
            
            await self.db.flush()
            
            return {
                "success": True,
                "journal_entry_id": je.id,
                "entry_number": entry_number
            }
            
        except Exception as e:
            logger.error(f"Error creating expense JE for report {report.id}: {str(e)}")
            return {"success": False, "message": f"Error creating JE: {str(e)}"}
    
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
    
    async def _get_cash_account(self, entity_id: int) -> Optional[ChartOfAccounts]:
        """Get primary cash account (10110)"""
        result = await self.db.execute(
            select(ChartOfAccounts).where(
                ChartOfAccounts.entity_id == entity_id,
                ChartOfAccounts.account_number == "10110"
            )
        )
        return result.scalar_one_or_none()
    
    async def calculate_report_totals(self, report_id: int) -> Dict:
        """Calculate total amounts for expense report"""
        lines_result = await self.db.execute(
            select(ExpenseLine).where(ExpenseLine.expense_report_id == report_id)
        )
        lines = lines_result.scalars().all()
        
        total_amount = sum(line.amount for line in lines)
        reimbursable_amount = sum(
            line.amount for line in lines 
            if line.is_tax_deductible  # Only reimburse deductible expenses
        )
        
        return {
            "total_amount": float(total_amount),
            "reimbursable_amount": float(reimbursable_amount),
            "line_count": len(lines)
        }

