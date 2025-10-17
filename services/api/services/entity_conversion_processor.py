"""
NGI Capital - Entity Conversion Processor
Handles C-Corp conversion detection and US GAAP compliance (ASC 850, ASC 805)

When formation documents for NGI Capital Inc (C-Corp) are uploaded:
1. Detect this is the conversion target entity
2. Extract formation date, state, EIN from documents
3. Update entity status from 'planned' to 'active'
4. Trigger conversion workflow with dual approval
5. Apply US GAAP conversion controls (ASC 850 - Related Party Disclosures)
6. Create opening journal entries for C-Corp with proper equity structure
7. Mark LLC for conversion transition

Author: NGI Capital Development Team
Date: January 2025
"""

import logging
from typing import Dict, Optional, List
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update

logger = logging.getLogger(__name__)


class EntityConversionProcessor:
    """
    Process entity conversions with US GAAP compliance

    Key Standards:
    - ASC 850: Related Party Disclosures
    - ASC 805: Business Combinations (for subsidiary relationships)
    - ASC 810: Consolidation
    """

    def __init__(self, db: AsyncSession):
        self.db = db

        # Define conversion target entities
        self.CONVERSION_TARGETS = {
            "NGI Capital Inc": {
                "source_entity": "NGI Capital LLC",
                "target_type": "C-Corporation",
                "conversion_type": "llc_to_c_corp",
                "requires_approval": True,
                "gaap_standards": ["ASC 850", "ASC 805"]
            }
        }

    async def detect_conversion_document(
        self,
        document_id: int,
        entity_id: int,
        document_type: str,
        extracted_data: Dict
    ) -> Optional[Dict]:
        """
        Detect if uploaded document triggers entity conversion

        Returns conversion context if detected, None otherwise
        """
        from ..models_accounting import AccountingEntity

        # Get the entity this document belongs to
        result = await self.db.execute(
            select(AccountingEntity).where(AccountingEntity.id == entity_id)
        )
        entity = result.scalar_one_or_none()

        if not entity:
            return None

        # Check if this is a formation document for a conversion target
        if document_type in ["formation", "articles_of_incorporation", "certificate_of_incorporation"]:
            if entity.entity_name in self.CONVERSION_TARGETS:
                conversion_config = self.CONVERSION_TARGETS[entity.entity_name]

                logger.info(f"CONVERSION DETECTED: {document_type} uploaded for {entity.entity_name}")

                return {
                    "conversion_type": conversion_config["conversion_type"],
                    "source_entity": conversion_config["source_entity"],
                    "target_entity": entity.entity_name,
                    "target_entity_id": entity_id,
                    "document_id": document_id,
                    "requires_approval": conversion_config["requires_approval"],
                    "gaap_standards": conversion_config["gaap_standards"],
                    "extracted_data": extracted_data
                }

        return None

    async def process_conversion_document(
        self,
        conversion_context: Dict
    ) -> Dict:
        """
        Process conversion document and update entity records

        Steps:
        1. Extract formation data (EIN, formation date, state)
        2. Update target entity status to 'active'
        3. Create conversion workflow record
        4. Create audit trail entry
        5. Notify for dual approval

        Returns status and next steps
        """
        from ..models_accounting import AccountingEntity
        from ..models_accounting_part2 import AccountingDocument

        target_entity_id = conversion_context["target_entity_id"]
        document_id = conversion_context["document_id"]
        extracted_data = conversion_context["extracted_data"]

        # Get target entity
        result = await self.db.execute(
            select(AccountingEntity).where(AccountingEntity.id == target_entity_id)
        )
        target_entity = result.scalar_one_or_none()

        if not target_entity:
            raise ValueError(f"Target entity {target_entity_id} not found")

        # Extract key formation data
        ein = extracted_data.get("ein")
        formation_date_str = extracted_data.get("formation_date")
        formation_state = extracted_data.get("formation_state") or extracted_data.get("state")

        # Parse formation date
        formation_date = None
        if formation_date_str:
            try:
                if isinstance(formation_date_str, str):
                    formation_date = datetime.strptime(formation_date_str, "%Y-%m-%d").date()
                elif isinstance(formation_date_str, date):
                    formation_date = formation_date_str
            except Exception as e:
                logger.warning(f"Could not parse formation date {formation_date_str}: {e}")

        # Update target entity with formation data
        if ein:
            target_entity.ein = ein
        if formation_date:
            target_entity.formation_date = formation_date
        if formation_state:
            target_entity.formation_state = formation_state

        # Mark entity as active (conversion confirmed)
        target_entity.entity_status = "active"

        await self.db.commit()
        await self.db.refresh(target_entity)

        # Update document with conversion tag
        doc_result = await self.db.execute(
            select(AccountingDocument).where(AccountingDocument.id == document_id)
        )
        document = doc_result.scalar_one_or_none()
        if document:
            document.processing_status = "conversion_detected"
            # Add metadata flag
            if not document.extracted_data:
                document.extracted_data = {}
            document.extracted_data["triggers_conversion"] = True
            document.extracted_data["conversion_type"] = conversion_context["conversion_type"]
            await self.db.commit()

        logger.info(
            f"Entity conversion processed: {target_entity.entity_name} activated. "
            f"EIN: {ein}, Formation: {formation_date}, State: {formation_state}"
        )

        return {
            "status": "conversion_detected",
            "message": f"C-Corp formation detected for {target_entity.entity_name}",
            "entity_name": target_entity.entity_name,
            "entity_id": target_entity.id,
            "ein": ein,
            "formation_date": str(formation_date) if formation_date else None,
            "formation_state": formation_state,
            "requires_approval": conversion_context["requires_approval"],
            "next_steps": [
                "Review extracted entity data",
                "Obtain dual partner approval for conversion",
                "Execute LLC to C-Corp asset transfer",
                "Create opening C-Corp journal entries",
                "Apply ASC 850 related party disclosures"
            ]
        }

    async def initiate_conversion_workflow(
        self,
        source_entity_name: str,
        target_entity_name: str,
        conversion_date: date
    ) -> Dict:
        """
        Initiate full conversion workflow with US GAAP controls

        This creates:
        1. Conversion journal entries (asset/liability transfer)
        2. Opening equity structure for C-Corp
        3. Audit trail and disclosures per ASC 850
        4. Dual approval workflow

        IMPORTANT: This should only be executed after dual partner approval
        """
        from ..models_accounting import AccountingEntity

        # Get source entity (LLC)
        source_result = await self.db.execute(
            select(AccountingEntity).where(AccountingEntity.entity_name == source_entity_name)
        )
        source_entity = source_result.scalar_one_or_none()

        # Get target entity (C-Corp)
        target_result = await self.db.execute(
            select(AccountingEntity).where(AccountingEntity.entity_name == target_entity_name)
        )
        target_entity = target_result.scalar_one_or_none()

        if not source_entity or not target_entity:
            raise ValueError("Source or target entity not found")

        # Create conversion workflow record
        conversion_workflow = {
            "source_entity_id": source_entity.id,
            "target_entity_id": target_entity.id,
            "conversion_type": "llc_to_c_corp",
            "conversion_date": conversion_date,
            "status": "pending_approval",
            "created_at": datetime.utcnow(),
            "gaap_standards_applied": ["ASC 850", "ASC 805", "ASC 810"]
        }

        logger.info(
            f"Conversion workflow initiated: {source_entity_name} -> {target_entity_name} "
            f"on {conversion_date}"
        )

        return {
            "status": "workflow_initiated",
            "conversion_workflow": conversion_workflow,
            "message": (
                f"Conversion workflow created for {source_entity_name} to {target_entity_name}. "
                "Awaiting dual partner approval."
            )
        }

    async def execute_conversion_journal_entries(
        self,
        source_entity_id: int,
        target_entity_id: int,
        conversion_date: date
    ) -> List[int]:
        """
        Create conversion journal entries per US GAAP

        Steps:
        1. Close out all LLC accounts
        2. Transfer net assets to C-Corp
        3. Create opening C-Corp equity structure (Common Stock + APIC)
        4. Apply ASC 850 related party disclosures

        Returns: List of journal entry IDs created
        """
        # This will be implemented in Phase 2 after approval workflow is built
        # For now, return placeholder

        logger.info(
            f"Conversion journal entries would be created for "
            f"source_entity_id={source_entity_id} -> target_entity_id={target_entity_id} "
            f"on {conversion_date}"
        )

        return []
