"""
Mercury Bank Integration Service
Handles Mercury Bank API integration and first deposit date detection
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from ..models_accounting import AccountingEntity
from ..models_accounting_part2 import BankTransaction, BankAccount

logger = logging.getLogger(__name__)


class MercurySyncService:
    """Service for Mercury Bank integration and transaction sync"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_first_deposit_date(self, entity_id: int) -> Optional[date]:
        """
        Get the first Mercury Bank deposit date for an entity
        
        Args:
            entity_id: Entity ID
            
        Returns:
            First deposit date or None if no deposits found
        """
        try:
            # Check if we have cached first deposit date in entity metadata
            entity = await self._get_entity(entity_id)
            if entity and hasattr(entity, 'mercury_first_deposit_date') and entity.mercury_first_deposit_date:
                return entity.mercury_first_deposit_date
            
            # Query bank transactions for first positive amount (deposit)
            # Join through BankAccount to get entity_id
            result = await self.db.execute(
                select(BankTransaction.transaction_date)
                .join(BankAccount, BankTransaction.bank_account_id == BankAccount.id)
                .where(
                    BankAccount.entity_id == entity_id,
                    BankTransaction.amount > 0,  # Positive amounts are deposits
                    BankAccount.account_type == "checking"  # Mercury checking account
                )
                .order_by(BankTransaction.transaction_date.asc())
                .limit(1)
            )
            
            first_deposit = result.scalar_one_or_none()
            
            if first_deposit:
                # Cache the result in entity metadata
                await self._cache_first_deposit_date(entity_id, first_deposit)
                logger.info(f"Entity {entity_id}: First Mercury deposit date: {first_deposit}")
                return first_deposit
            else:
                logger.info(f"Entity {entity_id}: No Mercury deposits found")
                return None
                
        except Exception as e:
            logger.error(f"Error getting first deposit date for entity {entity_id}: {str(e)}")
            return None
    
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
    
    async def _cache_first_deposit_date(self, entity_id: int, deposit_date: date):
        """Cache first deposit date in entity metadata"""
        try:
            await self.db.execute(
                update(AccountingEntity)
                .where(AccountingEntity.id == entity_id)
                .values(mercury_first_deposit_date=deposit_date)
            )
            await self.db.commit()
            logger.info(f"Cached first deposit date {deposit_date} for entity {entity_id}")
        except Exception as e:
            logger.error(f"Error caching first deposit date: {str(e)}")
            await self.db.rollback()
    
    async def sync_mercury_transactions(self, entity_id: int) -> Dict[str, Any]:
        """
        Sync transactions from Mercury Bank API
        
        Args:
            entity_id: Entity ID
            
        Returns:
            Sync result summary
        """
        try:
            # This would integrate with Mercury Bank API
            # For now, return a placeholder implementation
            
            logger.info(f"Syncing Mercury transactions for entity {entity_id}")
            
            # Placeholder for actual Mercury API integration
            # In production, this would:
            # 1. Authenticate with Mercury API
            # 2. Fetch transactions for the entity's Mercury account
            # 3. Store/update transactions in bank_transactions table
            # 4. Update first deposit date if earlier transaction found
            
            return {
                "success": True,
                "transactions_synced": 0,
                "new_deposits_found": 0,
                "first_deposit_updated": False
            }
            
        except Exception as e:
            logger.error(f"Error syncing Mercury transactions: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "transactions_synced": 0
            }
    
    async def get_mercury_account_balance(self, entity_id: int) -> Optional[Decimal]:
        """
        Get current Mercury account balance
        
        Args:
            entity_id: Entity ID
            
        Returns:
            Current balance or None if not found
        """
        try:
            # Get latest balance from bank transactions
            result = await self.db.execute(
                select(BankTransaction.running_balance)
                .where(
                    BankTransaction.entity_id == entity_id,
                    BankTransaction.account_type == "mercury"
                )
                .order_by(BankTransaction.transaction_date.desc())
                .limit(1)
            )
            
            balance = result.scalar_one_or_none()
            return balance
            
        except Exception as e:
            logger.error(f"Error getting Mercury balance for entity {entity_id}: {str(e)}")
            return None
    
    async def get_mercury_transactions(
        self, 
        entity_id: int, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        """
        Get Mercury transactions for an entity
        
        Args:
            entity_id: Entity ID
            start_date: Optional start date filter
            end_date: Optional end date filter
            
        Returns:
            List of transaction dictionaries
        """
        try:
            query = select(BankTransaction).where(
                BankTransaction.entity_id == entity_id,
                BankTransaction.account_type == "mercury"
            )
            
            if start_date:
                query = query.where(BankTransaction.transaction_date >= start_date)
            if end_date:
                query = query.where(BankTransaction.transaction_date <= end_date)
            
            query = query.order_by(BankTransaction.transaction_date.desc())
            
            result = await self.db.execute(query)
            transactions = result.scalars().all()
            
            return [
                {
                    "id": txn.id,
                    "transaction_date": txn.transaction_date,
                    "amount": float(txn.amount),
                    "description": txn.description,
                    "running_balance": float(txn.running_balance) if txn.running_balance else None,
                    "merchant_name": txn.merchant_name,
                    "category": txn.category
                }
                for txn in transactions
            ]
            
        except Exception as e:
            logger.error(f"Error getting Mercury transactions: {str(e)}")
            return []
    
    async def update_first_deposit_if_earlier(self, entity_id: int, new_date: date) -> bool:
        """
        Update first deposit date if the new date is earlier
        
        Args:
            entity_id: Entity ID
            new_date: New deposit date to check
            
        Returns:
            True if updated, False if not
        """
        try:
            current_first_deposit = await self.get_first_deposit_date(entity_id)
            
            if not current_first_deposit or new_date < current_first_deposit:
                await self._cache_first_deposit_date(entity_id, new_date)
                logger.info(f"Updated first deposit date to {new_date} for entity {entity_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error updating first deposit date: {str(e)}")
            return False


# Standalone functions for compatibility
async def sync_mercury_account(entity_id: int, account_id: str = None) -> Dict[str, Any]:
    """Sync Mercury account data for an entity."""
    service = MercurySyncService()
    return await service.sync_account_data(entity_id, account_id)


async def match_bank_transaction(transaction_id: int, entity_id: int) -> Dict[str, Any]:
    """Match a bank transaction with accounting entries."""
    service = MercurySyncService()
    return await service.match_transaction(transaction_id, entity_id)


async def auto_match_transactions(entity_id: int) -> Dict[str, Any]:
    """Auto-match transactions for an entity."""
    service = MercurySyncService()
    return await service.auto_match_all_transactions(entity_id)


async def apply_matching_rules(entity_id: int) -> Dict[str, Any]:
    """Apply matching rules for an entity."""
    service = MercurySyncService()
    return await service.apply_matching_rules(entity_id)