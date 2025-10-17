"""
Depreciation Service - ASC 360 Compliance
Automates monthly depreciation calculations and journal entry creation
"""

from decimal import Decimal
from datetime import date, datetime
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from services.api.models_fixed_assets import FixedAsset, DepreciationEntry
from services.api.models_accounting import JournalEntry, JournalEntryLine, ChartOfAccounts
from services.api.utils.datetime_utils import get_pst_now
import logging

logger = logging.getLogger(__name__)


class DepreciationService:
    """Service for calculating and recording asset depreciation"""
    
    @staticmethod
    async def calculate_monthly_depreciation(
        asset: FixedAsset,
        period_date: date
    ) -> Decimal:
        """
        Calculate monthly depreciation for a single asset
        
        Args:
            asset: FixedAsset instance
            period_date: Last day of the month to calculate depreciation for
            
        Returns:
            Monthly depreciation amount
        """
        if asset.status != "In Service":
            return Decimal("0")
        
        if asset.is_fully_depreciated:
            return Decimal("0")
        
        # Check if asset was in service during this period
        if asset.placed_in_service_date and asset.placed_in_service_date > period_date:
            return Decimal("0")
        
        depreciable_base = asset.acquisition_cost - (asset.salvage_value or Decimal("0"))
        
        if asset.depreciation_method == "Straight-Line":
            # Straight-line: (Cost - Salvage) / Useful Life Years / 12 months
            annual_depreciation = depreciable_base / asset.useful_life_years
            monthly_depreciation = annual_depreciation / 12
            
        elif asset.depreciation_method == "Double-Declining":
            # Double declining balance
            rate = Decimal("2") / asset.useful_life_years
            current_nbv = asset.net_book_value or asset.acquisition_cost
            monthly_depreciation = (current_nbv * rate) / 12
            
            # Don't depreciate below salvage value
            if asset.accumulated_depreciation + monthly_depreciation > depreciable_base:
                monthly_depreciation = depreciable_base - asset.accumulated_depreciation
                
        else:
            # Default to straight-line
            annual_depreciation = depreciable_base / asset.useful_life_years
            monthly_depreciation = annual_depreciation / 12
        
        # Ensure we don't over-depreciate
        remaining_depreciable = depreciable_base - (asset.accumulated_depreciation or Decimal("0"))
        if monthly_depreciation > remaining_depreciable:
            monthly_depreciation = remaining_depreciable
        
        # Round to 2 decimal places
        return round(monthly_depreciation, 2)
    
    @staticmethod
    async def generate_monthly_depreciation_entries(
        entity_id: int,
        period_date: date,
        db: AsyncSession,
        user_email: str = "system@ngi"
    ) -> Optional[int]:
        """
        Generate depreciation entries for all in-service assets for a given month
        Creates a single journal entry with all depreciation
        
        Args:
            entity_id: Entity ID
            period_date: Last day of month for depreciation
            db: Database session
            user_email: User creating the entries
            
        Returns:
            Journal Entry ID if created, None if no depreciation
        """
        # Get all in-service assets for this entity
        result = await db.execute(
            select(FixedAsset).where(
                and_(
                    FixedAsset.entity_id == entity_id,
                    FixedAsset.status == "In Service",
                    FixedAsset.is_fully_depreciated == False
                )
            ).order_by(FixedAsset.asset_number)
        )
        assets = result.scalars().all()
        
        if not assets:
            logger.info(f"No assets to depreciate for entity {entity_id} period {period_date}")
            return None
        
        # Check if depreciation already exists for this period
        existing = await db.execute(
            select(DepreciationEntry).where(
                and_(
                    DepreciationEntry.entity_id == entity_id,
                    DepreciationEntry.period_date == period_date
                )
            )
        )
        if existing.scalars().first():
            logger.warning(f"Depreciation already exists for entity {entity_id} period {period_date}")
            return None
        
        total_depreciation = Decimal("0")
        depreciation_entries = []
        
        # Calculate depreciation for each asset
        for asset in assets:
            monthly_dep = await DepreciationService.calculate_monthly_depreciation(asset, period_date)
            
            if monthly_dep > 0:
                # Create depreciation entry record
                dep_entry = DepreciationEntry(
                    asset_id=asset.id,
                    entity_id=entity_id,
                    period_date=period_date,
                    period_month=period_date.month,
                    period_year=period_date.year,
                    depreciation_amount=monthly_dep,
                    accumulated_depreciation_before=asset.accumulated_depreciation or Decimal("0"),
                    accumulated_depreciation_after=(asset.accumulated_depreciation or Decimal("0")) + monthly_dep,
                    net_book_value_after=(asset.net_book_value or asset.acquisition_cost) - monthly_dep,
                    status="draft",
                    created_by_email=user_email
                )
                depreciation_entries.append((asset, dep_entry, monthly_dep))
                total_depreciation += monthly_dep
        
        if total_depreciation == 0:
            logger.info(f"No depreciation calculated for entity {entity_id} period {period_date}")
            return None
        
        # Generate entry number
        entry_number = await DepreciationService._generate_depreciation_entry_number(
            entity_id, period_date, db
        )
        
        # Create journal entry
        je = JournalEntry(
            entity_id=entity_id,
            entry_number=entry_number,
            entry_date=period_date,
            entry_type="Adjusting",
            memo=f"Monthly depreciation - {period_date.strftime('%B %Y')}",
            source_type="Depreciation",
            source_id=f"DEP-{period_date.strftime('%Y%m')}",
            status="draft",
            workflow_stage=0,
            created_by_email=user_email,
            created_at=get_pst_now()
        )
        db.add(je)
        await db.flush()
        
        # Get expense and accumulated depreciation accounts
        expense_account = await db.execute(
            select(ChartOfAccounts).where(
                and_(
                    ChartOfAccounts.entity_id == entity_id,
                    ChartOfAccounts.account_number == "60710"  # Depreciation Expense
                )
            )
        )
        expense_account = expense_account.scalar_one_or_none()
        
        if not expense_account:
            raise ValueError(f"Depreciation Expense account (60710) not found for entity {entity_id}")
        
        # DR: Depreciation Expense (single line for total)
        je_line_debit = JournalEntryLine(
            journal_entry_id=je.id,
            line_number=1,
            account_id=expense_account.id,
            debit_amount=total_depreciation,
            credit_amount=Decimal("0"),
            description=f"Monthly depreciation - {len(depreciation_entries)} assets"
        )
        db.add(je_line_debit)
        
        # CR: Accumulated Depreciation (one line per asset)
        line_number = 2
        for asset, dep_entry, monthly_dep in depreciation_entries:
            # Get accumulated depreciation account for asset category
            accum_dep_account = await DepreciationService._get_accumulated_depreciation_account(
                entity_id, asset.asset_category, db
            )
            
            je_line_credit = JournalEntryLine(
                journal_entry_id=je.id,
                line_number=line_number,
                account_id=accum_dep_account.id,
                debit_amount=Decimal("0"),
                credit_amount=monthly_dep,
                description=f"{asset.asset_number} - {asset.asset_name}"
            )
            db.add(je_line_credit)
            line_number += 1
            
            # Update asset depreciation tracking
            asset.accumulated_depreciation = (asset.accumulated_depreciation or Decimal("0")) + monthly_dep
            asset.net_book_value = asset.acquisition_cost - asset.accumulated_depreciation
            asset.current_year_depreciation = (asset.current_year_depreciation or Decimal("0")) + monthly_dep
            asset.last_depreciation_date = period_date
            asset.months_depreciated = (asset.months_depreciated or 0) + 1
            
            # Check if fully depreciated
            depreciable_base = asset.acquisition_cost - (asset.salvage_value or Decimal("0"))
            if asset.accumulated_depreciation >= depreciable_base:
                asset.is_fully_depreciated = True
                asset.status = "Fully Depreciated"
            
            # Link depreciation entry to JE
            dep_entry.journal_entry_id = je.id
            db.add(dep_entry)
        
        await db.commit()
        await db.refresh(je)
        
        logger.info(
            f"Created depreciation JE {entry_number} for entity {entity_id} "
            f"period {period_date}: ${total_depreciation:.2f} across {len(depreciation_entries)} assets"
        )
        
        return je.id
    
    @staticmethod
    async def _generate_depreciation_entry_number(
        entity_id: int,
        period_date: date,
        db: AsyncSession
    ) -> str:
        """Generate unique depreciation entry number"""
        prefix = f"DEP-{period_date.strftime('%Y%m')}"
        
        # Check if entry already exists
        result = await db.execute(
            select(func.count(JournalEntry.id)).where(
                and_(
                    JournalEntry.entity_id == entity_id,
                    JournalEntry.entry_number.like(f"{prefix}%")
                )
            )
        )
        count = result.scalar()
        
        if count == 0:
            return prefix
        else:
            return f"{prefix}-{count + 1}"
    
    @staticmethod
    async def _get_accumulated_depreciation_account(
        entity_id: int,
        asset_category: str,
        db: AsyncSession
    ) -> ChartOfAccounts:
        """Get the appropriate accumulated depreciation account for an asset category"""
        # Default to general accumulated depreciation
        account_number = "15170"  # Accumulated Depreciation
        
        # Could add category-specific accounts if needed
        # For now, use single accumulated depreciation account
        
        result = await db.execute(
            select(ChartOfAccounts).where(
                and_(
                    ChartOfAccounts.entity_id == entity_id,
                    ChartOfAccounts.account_number == account_number
                )
            )
        )
        account = result.scalar_one_or_none()
        
        if not account:
            raise ValueError(
                f"Accumulated Depreciation account ({account_number}) not found for entity {entity_id}"
            )
        
        return account
    
    @staticmethod
    async def get_depreciation_schedule(
        entity_id: int,
        as_of_date: Optional[date] = None,
        db: AsyncSession = None
    ) -> List[Dict]:
        """
        Generate depreciation schedule for all assets
        
        Returns list of assets with depreciation details
        """
        if as_of_date is None:
            as_of_date = date.today()
        
        result = await db.execute(
            select(FixedAsset).where(
                FixedAsset.entity_id == entity_id
            ).order_by(FixedAsset.asset_number)
        )
        assets = result.scalars().all()
        
        schedule = []
        for asset in assets:
            # Calculate remaining life
            months_remaining = (asset.useful_life_years * 12) - (asset.months_depreciated or 0)
            
            # Calculate monthly depreciation
            monthly_dep = await DepreciationService.calculate_monthly_depreciation(asset, as_of_date)
            
            schedule.append({
                "asset_number": asset.asset_number,
                "asset_name": asset.asset_name,
                "asset_category": asset.asset_category,
                "acquisition_date": asset.acquisition_date,
                "acquisition_cost": float(asset.acquisition_cost),
                "salvage_value": float(asset.salvage_value or 0),
                "useful_life_years": asset.useful_life_years,
                "depreciation_method": asset.depreciation_method,
                "accumulated_depreciation": float(asset.accumulated_depreciation or 0),
                "net_book_value": float(asset.net_book_value or asset.acquisition_cost),
                "monthly_depreciation": float(monthly_dep),
                "months_depreciated": asset.months_depreciated or 0,
                "months_remaining": max(0, months_remaining),
                "is_fully_depreciated": asset.is_fully_depreciated,
                "status": asset.status,
                "percent_depreciated": float((asset.accumulated_depreciation or 0) / asset.acquisition_cost * 100) if asset.acquisition_cost > 0 else 0
            })
        
        return schedule

