"""
NGI Capital - Enhanced Journal Entry Workflow Service
Dual-approval workflow with email-based authorization for Landon + Andre

Author: NGI Capital Development Team
Date: October 10, 2025

All datetime operations use PST (Pacific Standard Time).

Workflow States:
1. draft (workflow_stage=0) - Initial creation
2. pending_first_approval (workflow_stage=1) - Submitted, awaiting first approval
3. pending_final_approval (workflow_stage=2) - First approved, awaiting final approval
4. approved (workflow_stage=3) - Dual approval complete, ready to post
5. posted (workflow_stage=4) - Posted to GL, locked
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Dict, Any, Optional
from decimal import Decimal
import logging
from ..utils.datetime_utils import get_pst_now
from ..models_accounting import JournalEntry, JournalEntryLine, ChartOfAccounts

logger = logging.getLogger(__name__)

# Authorized approvers (Landon Whitworth and Andre Nurmamade)
AUTHORIZED_APPROVERS = [
    "lwhitworth@ngicapitaladvisory.com",
    "anurmamade@ngicapitaladvisory.com"
]


class JournalWorkflowServiceEnhanced:
    """Enhanced workflow service with strict dual-approval and email-based authorization"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def submit_for_approval(
        self, 
        journal_entry_id: int, 
        submitted_by_email: str
    ) -> Dict[str, Any]:
        """
        Submit a draft journal entry for first approval
        
        Args:
            journal_entry_id: ID of journal entry to submit
            submitted_by_email: Email of submitter
            
        Returns:
            Success/failure dict with message
        """
        try:
            # Get journal entry
            result = await self.db.execute(
                select(JournalEntry).where(JournalEntry.id == journal_entry_id)
            )
            entry = result.scalar_one_or_none()
            
            if not entry:
                return {"success": False, "message": "Journal entry not found"}
            
            # Validate status
            if entry.status != "draft":
                return {
                    "success": False, 
                    "message": f"Entry must be in draft status (current: {entry.status})"
                }
            
            # Validate entry is balanced
            is_balanced = await self._check_if_balanced(journal_entry_id)
            if not is_balanced:
                return {
                    "success": False,
                    "message": "Entry must be balanced (debits = credits)"
                }
            
            # Update entry status
            entry.status = "pending_first_approval"
            entry.workflow_stage = 1
            entry.updated_at = get_pst_now()
            
            await self.db.commit()
            
            logger.info(
                f"Journal entry {journal_entry_id} submitted for approval by {submitted_by_email}"
            )
            
            return {
                "success": True,
                "message": "Journal entry submitted for first approval",
                "status": "pending_first_approval"
            }
            
        except Exception as e:
            logger.error(f"Error submitting journal entry for approval: {e}")
            await self.db.rollback()
            return {"success": False, "message": f"Error: {str(e)}"}
    
    async def approve(
        self,
        journal_entry_id: int,
        approver_email: str
    ) -> Dict[str, Any]:
        """
        Approve journal entry (handles both first and final approval)
        
        Args:
            journal_entry_id: ID of journal entry to approve
            approver_email: Email of approver
            
        Returns:
            Success/failure dict with message
        """
        try:
            # Get journal entry
            result = await self.db.execute(
                select(JournalEntry).where(JournalEntry.id == journal_entry_id)
            )
            entry = result.scalar_one_or_none()
            
            if not entry:
                return {"success": False, "message": "Journal entry not found"}
            
            # Validate approver is authorized
            if approver_email not in AUTHORIZED_APPROVERS:
                return {
                    "success": False,
                    "message": "Only authorized partners can approve entries"
                }
            
            # Cannot approve own entry
            if hasattr(entry, 'created_by_email') and entry.created_by_email == approver_email:
                return {
                    "success": False,
                    "message": "Cannot approve your own entry"
                }
            
            # Handle based on current status
            if entry.status == "pending_first_approval":
                return await self._approve_first(entry, approver_email)
            elif entry.status == "pending_final_approval":
                return await self._approve_final(entry, approver_email)
            else:
                return {
                    "success": False,
                    "message": f"Invalid entry status for approval: {entry.status}"
                }
            
        except Exception as e:
            logger.error(f"Error approving journal entry: {e}")
            await self.db.rollback()
            return {"success": False, "message": f"Error: {str(e)}"}
    
    async def _approve_first(
        self,
        entry: JournalEntry,
        approver_email: str
    ) -> Dict[str, Any]:
        """First approval - move to pending_final_approval"""
        try:
            # Store first approver email in metadata or create a field for it
            entry.first_approved_by_email = approver_email if hasattr(entry, 'first_approved_by_email') else None
            entry.first_approved_at = get_pst_now() if hasattr(entry, 'first_approved_at') else None
            entry.status = "pending_final_approval"
            entry.workflow_stage = 2
            entry.updated_at = get_pst_now()
            
            await self.db.commit()
            
            logger.info(f"Journal entry {entry.id} approved by first partner {approver_email}")
            
            return {
                "success": True,
                "message": "First approval complete. Awaiting final approval.",
                "status": "pending_final_approval",
                "workflow_stage": 2
            }
            
        except Exception as e:
            logger.error(f"Error in first approval: {e}")
            await self.db.rollback()
            return {"success": False, "message": f"Error: {str(e)}"}
    
    async def _approve_final(
        self,
        entry: JournalEntry,
        approver_email: str
    ) -> Dict[str, Any]:
        """Final approval - move to approved status"""
        try:
            # Validate not same approver twice
            if hasattr(entry, 'first_approved_by_email'):
                if entry.first_approved_by_email == approver_email:
                    return {
                        "success": False,
                        "message": "Cannot provide both approvals"
                    }
            
            # Store final approver
            entry.final_approved_by_email = approver_email if hasattr(entry, 'final_approved_by_email') else None
            entry.final_approved_at = get_pst_now() if hasattr(entry, 'final_approved_at') else None
            entry.status = "approved"
            entry.workflow_stage = 3
            entry.updated_at = get_pst_now()
            
            await self.db.commit()
            
            logger.info(f"Journal entry {entry.id} approved by final partner {approver_email}")
            
            return {
                "success": True,
                "message": "Dual approval complete. Entry is now approved and ready to post.",
                "status": "approved",
                "workflow_stage": 3
            }
            
        except Exception as e:
            logger.error(f"Error in final approval: {e}")
            await self.db.rollback()
            return {"success": False, "message": f"Error: {str(e)}"}
    
    async def post_to_gl(
        self,
        journal_entry_id: int,
        posted_by_email: str
    ) -> Dict[str, Any]:
        """
        Post approved journal entry to general ledger
        
        Args:
            journal_entry_id: ID of journal entry to post
            posted_by_email: Email of user posting
            
        Returns:
            Success/failure dict with message
        """
        try:
            # Get journal entry with lines
            result = await self.db.execute(
                select(JournalEntry).where(JournalEntry.id == journal_entry_id)
            )
            entry = result.scalar_one_or_none()
            
            if not entry:
                return {"success": False, "message": "Journal entry not found"}
            
            # Validate entry is approved
            if entry.status != "approved":
                return {
                    "success": False,
                    "message": "Entry must be approved before posting"
                }
            
            # Get all lines for this entry
            lines_result = await self.db.execute(
                select(JournalEntryLine).where(
                    JournalEntryLine.journal_entry_id == journal_entry_id
                )
            )
            lines = lines_result.scalars().all()
            
            # Update account balances
            for line in lines:
                account_result = await self.db.execute(
                    select(ChartOfAccounts).where(ChartOfAccounts.id == line.account_id)
                )
                account = account_result.scalar_one_or_none()
                
                if account:
                    # Update balance based on normal balance
                    if account.normal_balance == "Debit":
                        account.current_balance += line.debit_amount - line.credit_amount
                    else:
                        account.current_balance += line.credit_amount - line.debit_amount
                    
                    # Update YTD activity
                    account.ytd_activity += abs(line.debit_amount + line.credit_amount)
            
            # Update journal entry to posted status
            entry.status = "posted"
            entry.workflow_stage = 4
            entry.is_locked = True
            entry.posted_at = get_pst_now()
            entry.posted_by_email = posted_by_email if hasattr(entry, 'posted_by_email') else None
            entry.updated_at = get_pst_now()
            
            await self.db.commit()
            
            logger.info(f"Journal entry {journal_entry_id} posted to GL by {posted_by_email}")
            
            return {
                "success": True,
                "message": "Entry posted to general ledger successfully",
                "status": "posted",
                "workflow_stage": 4
            }
            
        except Exception as e:
            logger.error(f"Error posting journal entry to GL: {e}")
            await self.db.rollback()
            return {"success": False, "message": f"Error: {str(e)}"}
    
    async def reject(
        self,
        journal_entry_id: int,
        rejected_by_email: str,
        reason: str
    ) -> Dict[str, Any]:
        """
        Reject journal entry and return to draft
        
        Args:
            journal_entry_id: ID of journal entry to reject
            rejected_by_email: Email of rejector
            reason: Reason for rejection
            
        Returns:
            Success/failure dict with message
        """
        try:
            # Get journal entry
            result = await self.db.execute(
                select(JournalEntry).where(JournalEntry.id == journal_entry_id)
            )
            entry = result.scalar_one_or_none()
            
            if not entry:
                return {"success": False, "message": "Journal entry not found"}
            
            # Validate approver is authorized
            if rejected_by_email not in AUTHORIZED_APPROVERS:
                return {
                    "success": False,
                    "message": "Only authorized partners can reject entries"
                }
            
            # Update entry
            entry.status = "draft"
            entry.workflow_stage = 0
            entry.rejection_reason = reason
            entry.updated_at = get_pst_now()
            
            # Clear approval data
            if hasattr(entry, 'first_approved_by_email'):
                entry.first_approved_by_email = None
                entry.first_approved_at = None
            if hasattr(entry, 'final_approved_by_email'):
                entry.final_approved_by_email = None
                entry.final_approved_at = None
            
            await self.db.commit()
            
            logger.info(f"Journal entry {journal_entry_id} rejected by {rejected_by_email}: {reason}")
            
            return {
                "success": True,
                "message": "Entry rejected and returned to draft",
                "status": "draft",
                "rejection_reason": reason
            }
            
        except Exception as e:
            logger.error(f"Error rejecting journal entry: {e}")
            await self.db.rollback()
            return {"success": False, "message": f"Error: {str(e)}"}
    
    async def _check_if_balanced(self, journal_entry_id: int) -> bool:
        """Check if journal entry is balanced (debits = credits)"""
        try:
            result = await self.db.execute(
                select(JournalEntryLine).where(
                    JournalEntryLine.journal_entry_id == journal_entry_id
                )
            )
            lines = result.scalars().all()
            
            total_debits = sum(line.debit_amount for line in lines)
            total_credits = sum(line.credit_amount for line in lines)
            
            # Use Decimal comparison to avoid floating point issues
            return abs(total_debits - total_credits) < Decimal("0.01")
            
        except Exception as e:
            logger.error(f"Error checking if entry is balanced: {e}")
            return False
    
    async def get_workflow_status(self, journal_entry_id: int) -> Dict[str, Any]:
        """Get detailed workflow status of a journal entry"""
        try:
            result = await self.db.execute(
                select(JournalEntry).where(JournalEntry.id == journal_entry_id)
            )
            entry = result.scalar_one_or_none()
            
            if not entry:
                return {"success": False, "message": "Journal entry not found"}
            
            status_info = {
                "success": True,
                "entry_id": entry.id,
                "entry_number": entry.entry_number,
                "status": entry.status,
                "workflow_stage": entry.workflow_stage,
                "is_balanced": await self._check_if_balanced(journal_entry_id),
                "is_locked": entry.is_locked,
                "created_at": entry.created_at.isoformat() if entry.created_at else None,
                "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
            }
            
            # Add approval info if available
            if hasattr(entry, 'first_approved_by_email'):
                status_info["first_approved_by"] = entry.first_approved_by_email
                status_info["first_approved_at"] = entry.first_approved_at.isoformat() if entry.first_approved_at else None
            
            if hasattr(entry, 'final_approved_by_email'):
                status_info["final_approved_by"] = entry.final_approved_by_email
                status_info["final_approved_at"] = entry.final_approved_at.isoformat() if entry.final_approved_at else None
            
            if hasattr(entry, 'posted_by_email'):
                status_info["posted_by"] = entry.posted_by_email
                status_info["posted_at"] = entry.posted_at.isoformat() if entry.posted_at else None
            
            if entry.rejection_reason:
                status_info["rejection_reason"] = entry.rejection_reason
            
            return status_info
            
        except Exception as e:
            logger.error(f"Error getting workflow status: {e}")
            return {"success": False, "message": f"Error: {str(e)}"}

