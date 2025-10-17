"""
Startup Cost Tracker Service
Tracks and enforces ASC 720 startup cost thresholds ($5,000 limit)
"""

import logging
from typing import Tuple, Optional
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from ..models_accounting import AccountingEntity

logger = logging.getLogger(__name__)


class StartupCostTracker:
    """Service to track startup costs and enforce ASC 720 thresholds"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.startup_cost_threshold = Decimal("5000.00")  # ASC 720 threshold
    
    async def determine_account_treatment(
        self, 
        entity_id: int, 
        amount: Decimal, 
        description: str, 
        vendor: str
    ) -> Tuple[str, str]:
        """
        Determine if expense should be treated as startup cost or regular expense
        
        Args:
            entity_id: Entity ID
            amount: Expense amount
            description: Expense description
            vendor: Vendor name
            
        Returns:
            Tuple of (account_number, treatment_type)
        """
        try:
            # Get current cumulative startup costs for entity
            current_startup_costs = await self.get_cumulative_startup_costs(entity_id)
            
            # Check if this would exceed the threshold
            if current_startup_costs + amount <= self.startup_cost_threshold:
                # Still within startup cost threshold
                new_cumulative = current_startup_costs + amount
                await self.update_cumulative_startup_costs(entity_id, new_cumulative)
                
                logger.info(f"Entity {entity_id}: Treating ${amount} as startup cost (cumulative: ${new_cumulative})")
                return "18200", "startup_cost"  # Startup Costs - Deferred
            else:
                # Would exceed threshold - treat as regular expense
                logger.info(f"Entity {entity_id}: Treating ${amount} as regular expense (would exceed $5k threshold)")
                return self._determine_regular_expense_account(description, vendor), "regular_expense"
                
        except Exception as e:
            logger.error(f"Error determining account treatment: {str(e)}")
            # Default to regular expense for safety
            return self._determine_regular_expense_account(description, vendor), "regular_expense"
    
    async def get_cumulative_startup_costs(self, entity_id: int) -> Decimal:
        """Get cumulative startup costs for entity"""
        try:
            entity = await self._get_entity(entity_id)
            if entity and hasattr(entity, 'startup_costs_cumulative'):
                return entity.startup_costs_cumulative or Decimal("0.00")
            return Decimal("0.00")
        except Exception as e:
            logger.error(f"Error getting cumulative startup costs: {str(e)}")
            return Decimal("0.00")
    
    async def update_cumulative_startup_costs(self, entity_id: int, new_amount: Decimal):
        """Update cumulative startup costs for entity"""
        try:
            await self.db.execute(
                update(AccountingEntity)
                .where(AccountingEntity.id == entity_id)
                .values(startup_costs_cumulative=new_amount)
            )
            await self.db.commit()
            logger.info(f"Updated cumulative startup costs to ${new_amount} for entity {entity_id}")
        except Exception as e:
            logger.error(f"Error updating cumulative startup costs: {str(e)}")
            await self.db.rollback()
    
    async def _get_entity(self, entity_id: int) -> Optional[AccountingEntity]:
        """Get entity by ID"""
        try:
            result = await self.db.execute(
                select(AccountingEntity).where(AccountingEntity.id == entity_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting entity {entity_id}: {str(e)}")
            return None
    
    def _determine_regular_expense_account(self, description: str, vendor: str) -> str:
        """Determine regular expense account based on description and vendor"""
        description_lower = description.lower() if description else ""
        vendor_lower = vendor.lower() if vendor else ""
        
        # Technology/Software expenses
        if any(keyword in vendor_lower for keyword in ["openai", "api", "software", "squarespace", "cursor", "github", "vercel", "aws", "cloud"]):
            return "60210"  # Software Subscriptions
        if any(keyword in description_lower for keyword in ["api", "software", "subscription", "hosting", "domain", "website"]):
            return "60210"  # Software Subscriptions
            
        # Professional services
        if any(keyword in vendor_lower for keyword in ["legal", "law", "attorney", "counsel"]):
            return "60410"  # Legal Fees
        if any(keyword in vendor_lower for keyword in ["accounting", "cpa", "bookkeeping", "audit"]):
            return "60420"  # Accounting Fees
        if any(keyword in vendor_lower for keyword in ["consulting", "advisor", "consultant"]):
            return "60430"  # Consulting Fees
            
        # Marketing and business development
        if any(keyword in vendor_lower for keyword in ["marketing", "advertising", "google", "facebook", "linkedin", "twitter"]):
            return "60510"  # Advertising
        if any(keyword in vendor_lower for keyword in ["travel", "hotel", "flight", "uber", "lyft"]):
            return "60520"  # Travel and Entertainment
            
        # Office and administrative
        if any(keyword in vendor_lower for keyword in ["office", "supplies", "staples", "amazon"]):
            return "60330"  # Office Supplies
        if any(keyword in vendor_lower for keyword in ["rent", "lease", "office space"]):
            return "60310"  # Rent Expense
        if any(keyword in vendor_lower for keyword in ["utilities", "electric", "water", "internet", "phone"]):
            return "60320"  # Utilities
            
        # Insurance
        if any(keyword in vendor_lower for keyword in ["insurance", "liability", "general"]):
            return "60610"  # Insurance - General
        if any(keyword in vendor_lower for keyword in ["directors", "officers", "d&o"]):
            return "60620"  # Insurance - D&O
            
        # Banking and financial
        if any(keyword in vendor_lower for keyword in ["bank", "mercury", "chase", "wells", "fargo"]):
            return "60630"  # Bank Fees
            
        # Licenses and permits
        if any(keyword in vendor_lower for keyword in ["license", "permit", "registration", "filing"]):
            return "60640"  # Licenses and Permits
            
        # Dues and subscriptions
        if any(keyword in vendor_lower for keyword in ["membership", "dues", "subscription", "newsletter"]):
            return "60650"  # Dues and Subscriptions
            
        # Default to General and Administrative
        return "60600"  # General and Administrative
    
    async def reset_startup_costs(self, entity_id: int):
        """Reset startup costs for entity (useful for testing or corrections)"""
        try:
            await self.update_cumulative_startup_costs(entity_id, Decimal("0.00"))
            logger.info(f"Reset startup costs for entity {entity_id}")
        except Exception as e:
            logger.error(f"Error resetting startup costs: {str(e)}")
    
    async def get_startup_cost_status(self, entity_id: int) -> dict:
        """Get startup cost status for entity"""
        try:
            cumulative = await self.get_cumulative_startup_costs(entity_id)
            remaining = self.startup_cost_threshold - cumulative
            is_at_threshold = cumulative >= self.startup_cost_threshold
            
            return {
                "cumulative_startup_costs": float(cumulative),
                "threshold": float(self.startup_cost_threshold),
                "remaining": float(remaining) if remaining > 0 else 0,
                "is_at_threshold": is_at_threshold,
                "percentage_used": float((cumulative / self.startup_cost_threshold) * 100)
            }
        except Exception as e:
            logger.error(f"Error getting startup cost status: {str(e)}")
            return {
                "cumulative_startup_costs": 0.0,
                "threshold": 5000.0,
                "remaining": 5000.0,
                "is_at_threshold": False,
                "percentage_used": 0.0
            }