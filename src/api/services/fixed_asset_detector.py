"""
Fixed Asset Auto-Detection Service
Automatically detects and creates fixed assets from expense documents
Per capitalization policy: > $2,500 and useful life > 1 year
"""

from decimal import Decimal
from datetime import date
from typing import Optional, Dict, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from src.api.models_fixed_assets import FixedAsset
from src.api.models_accounting import JournalEntry, JournalEntryLine, ChartOfAccounts
from src.api.models_accounting_part2 import AccountingDocument
from src.api.utils.datetime_utils import get_pst_now
import logging

logger = logging.getLogger(__name__)


class FixedAssetDetector:
    """Service for auto-detecting fixed assets from expense documents"""
    
    # Capitalization threshold
    CAPITALIZATION_THRESHOLD = Decimal("2500.00")
    
    # Asset detection keywords with (category, useful_life_years, account_number, confidence_boost)
    ASSET_KEYWORDS = {
        # Computer Equipment
        "computer": ("Computer Equipment", 5, "15150", 20),
        "laptop": ("Computer Equipment", 3, "15150", 25),
        "desktop": ("Computer Equipment", 5, "15150", 25),
        "server": ("Computer Equipment", 5, "15150", 30),
        "macbook": ("Computer Equipment", 3, "15150", 30),
        "imac": ("Computer Equipment", 5, "15150", 30),
        "workstation": ("Computer Equipment", 5, "15150", 25),
        "monitor": ("Computer Equipment", 5, "15150", 15),
        "display": ("Computer Equipment", 5, "15150", 10),
        
        # Furniture and Fixtures
        "furniture": ("Furniture and Fixtures", 7, "15140", 25),
        "desk": ("Furniture and Fixtures", 7, "15140", 20),
        "chair": ("Furniture and Fixtures", 7, "15140", 20),
        "table": ("Furniture and Fixtures", 7, "15140", 20),
        "cabinet": ("Furniture and Fixtures", 7, "15140", 20),
        "bookshelf": ("Furniture and Fixtures", 7, "15140", 20),
        "office furniture": ("Furniture and Fixtures", 7, "15140", 30),
        
        # Software (if perpetual license)
        "software license": ("Software", 3, "15160", 20),
        "perpetual license": ("Software", 3, "15160", 30),
        "enterprise software": ("Software", 3, "15160", 25),
        
        # Leasehold Improvements
        "leasehold": ("Leasehold Improvements", 10, "15130", 35),
        "tenant improvement": ("Leasehold Improvements", 10, "15130", 35),
        "office buildout": ("Leasehold Improvements", 10, "15130", 30),
        "renovation": ("Leasehold Improvements", 10, "15130", 20),
        
        # Machinery and Equipment
        "machinery": ("Machinery and Equipment", 10, "15120", 25),
        "equipment": ("Machinery and Equipment", 7, "15120", 15),
        "printer": ("Machinery and Equipment", 5, "15120", 20),
        "copier": ("Machinery and Equipment", 5, "15120", 25),
        "scanner": ("Machinery and Equipment", 5, "15120", 20),
        
        # Vehicles
        "vehicle": ("Vehicles", 5, "15110", 30),
        "car": ("Vehicles", 5, "15110", 25),
        "truck": ("Vehicles", 5, "15110", 25),
        "van": ("Vehicles", 5, "15110", 25),
    }
    
    # Vendor names that strongly suggest fixed assets
    ASSET_VENDORS = {
        "apple": ("Computer Equipment", 3, 25),
        "dell": ("Computer Equipment", 5, 25),
        "lenovo": ("Computer Equipment", 5, 25),
        "hp": ("Computer Equipment", 5, 20),
        "microsoft": ("Software", 3, 20),
        "adobe": ("Software", 3, 20),
        "herman miller": ("Furniture and Fixtures", 7, 30),
        "steelcase": ("Furniture and Fixtures", 7, 30),
        "ikea": ("Furniture and Fixtures", 7, 15),
    }
    
    @staticmethod
    async def detect_fixed_asset(
        extracted_data: Dict,
        entity_id: int,
        document_id: Optional[int],
        db: AsyncSession
    ) -> Optional[FixedAsset]:
        """
        Detect if an expense should be capitalized as a fixed asset
        
        Args:
            extracted_data: Extracted document data from OCR
            entity_id: Entity ID
            document_id: Document ID if available
            db: Database session
            
        Returns:
            FixedAsset if detected and created, None otherwise
        """
        amount = Decimal(str(extracted_data.get("total_amount", 0)))
        description = (extracted_data.get("description", "") or "").lower()
        vendor_name = (extracted_data.get("vendor_name", "") or "").lower()
        transaction_date = extracted_data.get("date") or extracted_data.get("transaction_date")
        
        # Check capitalization threshold
        if amount < FixedAssetDetector.CAPITALIZATION_THRESHOLD:
            logger.debug(f"Amount ${amount} below capitalization threshold ${FixedAssetDetector.CAPITALIZATION_THRESHOLD}")
            return None
        
        # Detect asset category and calculate confidence
        detection_result = FixedAssetDetector._detect_category_and_confidence(
            description, vendor_name
        )
        
        if not detection_result:
            logger.debug(f"No asset category detected for: {description}")
            return None
        
        category, useful_life, account_number, confidence, matched_keywords = detection_result
        
        # Only auto-create if confidence is reasonably high (>= 40%)
        if confidence < 40:
            logger.info(
                f"Asset detection confidence too low ({confidence}%) for: {description}"
            )
            return None
        
        # Generate asset number
        asset_number = await FixedAssetDetector._generate_asset_number(entity_id, db)
        
        # Create fixed asset
        asset = FixedAsset(
            entity_id=entity_id,
            asset_number=asset_number,
            asset_name=extracted_data.get("description", "New Asset")[:255],
            asset_category=category,
            asset_description=description[:500] if description else None,
            acquisition_date=transaction_date,
            acquisition_cost=amount,
            salvage_value=Decimal("0"),  # Default to 0
            useful_life_years=useful_life,
            useful_life_months=useful_life * 12,
            depreciation_method="Straight-Line",
            placed_in_service_date=transaction_date,
            net_book_value=amount,
            accumulated_depreciation=Decimal("0"),
            status="In Service",
            is_fully_depreciated=False,
            purchase_document_id=document_id,
            auto_detected=True,
            detection_confidence=Decimal(str(confidence)),
            detection_metadata={
                "matched_keywords": matched_keywords,
                "vendor_name": vendor_name,
                "amount": str(amount),
                "description": description[:500],
                "account_number": account_number
            },
            created_by_email="system@ngi",
            created_at=get_pst_now()
        )
        
        db.add(asset)
        await db.flush()
        
        logger.info(
            f"Auto-detected fixed asset: {asset_number} - {category} "
            f"(${amount}, {confidence}% confidence)"
        )
        
        # Create capitalization journal entry (in draft for approval)
        je_id = await FixedAssetDetector._create_capitalization_je(
            asset, account_number, entity_id, db
        )
        
        if je_id:
            asset.purchase_journal_entry_id = je_id
        
        await db.commit()
        await db.refresh(asset)
        
        return asset
    
    @staticmethod
    def _detect_category_and_confidence(
        description: str,
        vendor_name: str
    ) -> Optional[Tuple[str, int, str, int, list]]:
        """
        Detect asset category and confidence score
        
        Returns:
            (category, useful_life, account_number, confidence, matched_keywords) or None
        """
        confidence = 0
        category = None
        useful_life = 0
        account_number = None
        matched_keywords = []
        
        # Check description keywords
        for keyword, (cat, life, acct, boost) in FixedAssetDetector.ASSET_KEYWORDS.items():
            if keyword in description:
                if category is None or boost > confidence:
                    category = cat
                    useful_life = life
                    account_number = acct
                    confidence = boost
                matched_keywords.append(keyword)
        
        # Check vendor names
        for vendor_keyword, (cat, life, boost) in FixedAssetDetector.ASSET_VENDORS.items():
            if vendor_keyword in vendor_name:
                if category is None or boost > confidence:
                    category = cat
                    useful_life = life
                    # Get account number for category
                    for kw, (c, l, a, b) in FixedAssetDetector.ASSET_KEYWORDS.items():
                        if c == cat:
                            account_number = a
                            break
                confidence += boost
                matched_keywords.append(f"vendor:{vendor_keyword}")
        
        # Base confidence for any match
        if category:
            confidence += 20  # Base confidence
        
        # Cap at 100
        confidence = min(confidence, 100)
        
        if category:
            return (category, useful_life, account_number, confidence, matched_keywords)
        
        return None
    
    @staticmethod
    async def _generate_asset_number(entity_id: int, db: AsyncSession) -> str:
        """Generate unique asset number"""
        # Get highest asset number for entity
        result = await db.execute(
            select(FixedAsset.asset_number)
            .where(FixedAsset.entity_id == entity_id)
            .order_by(FixedAsset.asset_number.desc())
        )
        last_number = result.scalar()
        
        if last_number:
            # Extract number from format "FA-00001"
            try:
                num = int(last_number.split("-")[1])
                new_num = num + 1
            except (IndexError, ValueError):
                new_num = 1
        else:
            new_num = 1
        
        return f"FA-{new_num:05d}"
    
    @staticmethod
    async def _create_capitalization_je(
        asset: FixedAsset,
        account_number: str,
        entity_id: int,
        db: AsyncSession
    ) -> Optional[int]:
        """
        Create capitalization journal entry for fixed asset
        DR: Fixed Asset Account
        CR: Accounts Payable or Cash
        """
        try:
            # Get fixed asset account
            asset_account = await db.execute(
                select(ChartOfAccounts).where(
                    and_(
                        ChartOfAccounts.entity_id == entity_id,
                        ChartOfAccounts.account_number == account_number
                    )
                )
            )
            asset_account = asset_account.scalar_one_or_none()
            
            if not asset_account:
                logger.warning(
                    f"Fixed asset account {account_number} not found for entity {entity_id}"
                )
                return None
            
            # Default to AP account for credit side
            ap_account = await db.execute(
                select(ChartOfAccounts).where(
                    and_(
                        ChartOfAccounts.entity_id == entity_id,
                        ChartOfAccounts.account_number == "20110"  # Accounts Payable
                    )
                )
            )
            ap_account = ap_account.scalar_one_or_none()
            
            if not ap_account:
                logger.warning(f"AP account not found for entity {entity_id}")
                return None
            
            # Generate entry number
            from sqlalchemy import func
            result = await db.execute(
                select(func.count(JournalEntry.id)).where(
                    JournalEntry.entity_id == entity_id
                )
            )
            count = result.scalar()
            entry_number = f"FA-{asset.asset_number}-CAP"
            
            # Create journal entry
            je = JournalEntry(
                entity_id=entity_id,
                entry_number=entry_number,
                entry_date=asset.acquisition_date,
                entry_type="Standard",
                memo=f"Capitalization of fixed asset: {asset.asset_name}",
                source_type="Fixed Asset",
                source_id=str(asset.id),
                status="draft",
                workflow_stage=0,
                created_by_email="system@ngi",
                created_at=get_pst_now()
            )
            db.add(je)
            await db.flush()
            
            # DR: Fixed Asset
            je_line_debit = JournalEntryLine(
                journal_entry_id=je.id,
                line_number=1,
                account_id=asset_account.id,
                debit_amount=asset.acquisition_cost,
                credit_amount=Decimal("0"),
                description=f"{asset.asset_name} - {asset.asset_category}"
            )
            db.add(je_line_debit)
            
            # CR: Accounts Payable
            je_line_credit = JournalEntryLine(
                journal_entry_id=je.id,
                line_number=2,
                account_id=ap_account.id,
                debit_amount=Decimal("0"),
                credit_amount=asset.acquisition_cost,
                description=f"Purchase of {asset.asset_name}"
            )
            db.add(je_line_credit)
            
            await db.flush()
            
            logger.info(
                f"Created capitalization JE {entry_number} for asset {asset.asset_number}"
            )
            
            return je.id
            
        except Exception as e:
            logger.error(f"Failed to create capitalization JE for asset {asset.id}: {e}")
            return None

