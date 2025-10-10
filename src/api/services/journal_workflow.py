"""
NGI Capital - Journal Entry Workflow Service
Handles the draft → pending → posted workflow for journal entries

Author: NGI Capital Development Team
Date: October 9, 2025

All datetime operations use PST (Pacific Standard Time).
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Dict, Any, Optional
from datetime import datetime
import logging
from ..utils.datetime_utils import get_pst_now

logger = logging.getLogger(__name__)

class JournalWorkflowService:
    """Manages journal entry workflow states and approvals"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def submit_for_approval(self, journal_entry_id: int, submitted_by_id: int) -> Dict[str, Any]:
        """Submit a draft journal entry for first partner approval"""
        try:
            # Update the journal entry status
            await self.db.execute(
                update(JournalEntry)
                .where(JournalEntry.id == journal_entry_id)
                .values(
                    status="pending_approval",
                    workflow_stage=2,
                    updated_at=get_pst_now()
                )
            )
            await self.db.commit()
            
            logger.info(f"Journal entry {journal_entry_id} submitted for approval by user {submitted_by_id}")
            return {"success": True, "message": "Journal entry submitted for approval"}
            
        except Exception as e:
            logger.error(f"Error submitting journal entry for approval: {e}")
            await self.db.rollback()
            return {"success": False, "message": f"Error: {str(e)}"}
    
    async def approve_first(self, journal_entry_id: int, approved_by_id: int) -> Dict[str, Any]:
        """First partner approves the journal entry"""
        try:
            # Update the journal entry with first approval
            await self.db.execute(
                update(JournalEntry)
                .where(JournalEntry.id == journal_entry_id)
                .values(
                    first_approved_by_id=approved_by_id,
                    first_approved_at=get_pst_now(),
                    status="pending_final_approval",
                    workflow_stage=3,
                    updated_at=get_pst_now()
                )
            )
            await self.db.commit()
            
            logger.info(f"Journal entry {journal_entry_id} approved by first partner {approved_by_id}")
            return {"success": True, "message": "Journal entry approved by first partner"}
            
        except Exception as e:
            logger.error(f"Error in first approval: {e}")
            await self.db.rollback()
            return {"success": False, "message": f"Error: {str(e)}"}
    
    async def approve_final(self, journal_entry_id: int, approved_by_id: int) -> Dict[str, Any]:
        """Second partner gives final approval and posts the entry"""
        try:
            # Update the journal entry with final approval and post it
            await self.db.execute(
                update(JournalEntry)
                .where(JournalEntry.id == journal_entry_id)
                .values(
                    final_approved_by_id=approved_by_id,
                    final_approved_at=get_pst_now(),
                    status="posted",
                    workflow_stage=4,
                    posted_at=get_pst_now(),
                    posted_by_id=approved_by_id,
                    updated_at=get_pst_now()
                )
            )
            await self.db.commit()
            
            logger.info(f"Journal entry {journal_entry_id} posted by final approver {approved_by_id}")
            return {"success": True, "message": "Journal entry posted successfully"}
            
        except Exception as e:
            logger.error(f"Error in final approval: {e}")
            await self.db.rollback()
            return {"success": False, "message": f"Error: {str(e)}"}
    
    async def reject(self, journal_entry_id: int, rejected_by_id: int, reason: str) -> Dict[str, Any]:
        """Reject a journal entry and return to draft"""
        try:
            # Update the journal entry with rejection
            await self.db.execute(
                update(JournalEntry)
                .where(JournalEntry.id == journal_entry_id)
                .values(
                    status="draft",
                    workflow_stage=1,
                    rejection_reason=reason,
                    updated_at=get_pst_now()
                )
            )
            await self.db.commit()
            
            logger.info(f"Journal entry {journal_entry_id} rejected by user {rejected_by_id}: {reason}")
            return {"success": True, "message": "Journal entry rejected and returned to draft"}
            
        except Exception as e:
            logger.error(f"Error rejecting journal entry: {e}")
            await self.db.rollback()
            return {"success": False, "message": f"Error: {str(e)}"}
    
    async def get_workflow_status(self, journal_entry_id: int) -> Dict[str, Any]:
        """Get the current workflow status of a journal entry"""
        try:
            result = await self.db.execute(
                select(JournalEntry)
                .where(JournalEntry.id == journal_entry_id)
            )
            entry = result.scalar_one_or_none()
            
            if not entry:
                return {"success": False, "message": "Journal entry not found"}
            
            return {
                "success": True,
                "status": entry.status,
                "workflow_stage": entry.workflow_stage,
                "first_approved_by": entry.first_approved_by_id,
                "first_approved_at": entry.first_approved_at,
                "final_approved_by": entry.final_approved_by_id,
                "final_approved_at": entry.final_approved_at,
                "posted_at": entry.posted_at,
                "rejection_reason": entry.rejection_reason
            }
            
        except Exception as e:
            logger.error(f"Error getting workflow status: {e}")
            return {"success": False, "message": f"Error: {str(e)}"}

# Import the JournalEntry model
from ..models_accounting import JournalEntry




