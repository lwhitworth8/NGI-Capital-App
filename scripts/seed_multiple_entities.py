#!/usr/bin/env python3
"""
Seed multiple entities for multi-entity accounting system
- NGI Capital Inc (Parent C-Corp)
- NGI Capital Advisory LLC (Subsidiary)
- Creator Terminal LLC (Separate entity)
"""
import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from src.api.database import get_db
from src.api.models_accounting import AccountingEntity, EntityRelationship
from src.api.models import Partners, Entities
from datetime import date

def seed_entities():
    db = next(get_db())
    
    try:
        # Check if entities already exist
        existing = db.query(AccountingEntity).count()
        if existing > 0:
            print(f"Entities already exist ({existing} found). Skipping seed.")
            return
        
        print("Seeding multiple entities...")
        
        # 1. NGI Capital Inc (Parent C-Corp)
        ngi_inc = AccountingEntity(
            entity_name="NGI Capital Inc",
            entity_type="C-Corporation",
            ein="XX-XXXXXXX",  # Replace with actual
            formation_date=date(2025, 1, 1),
            formation_state="Delaware",
            parent_entity_id=None,
            is_active=True
        )
        db.add(ngi_inc)
        db.flush()
        print(f"✓ Created NGI Capital Inc (ID: {ngi_inc.id})")
        
        # 2. NGI Capital Advisory LLC (Subsidiary)
        ngi_advisory = AccountingEntity(
            entity_name="NGI Capital Advisory LLC",
            entity_type="LLC",
            ein="XX-YYYYYYY",  # Replace with actual
            formation_date=date(2024, 6, 1),
            formation_state="Delaware",
            parent_entity_id=ngi_inc.id,
            is_active=True
        )
        db.add(ngi_advisory)
        db.flush()
        print(f"✓ Created NGI Capital Advisory LLC (ID: {ngi_advisory.id})")
        
        # 3. Creator Terminal LLC (Separate)
        creator_terminal = AccountingEntity(
            entity_name="Creator Terminal LLC",
            entity_type="LLC",
            ein="XX-ZZZZZZZ",  # Replace with actual
            formation_date=date(2024, 9, 1),
            formation_state="Delaware",
            parent_entity_id=None,  # Not a subsidiary, separate entity
            is_active=True
        )
        db.add(creator_terminal)
        db.flush()
        print(f"✓ Created Creator Terminal LLC (ID: {creator_terminal.id})")
        
        # 4. NGI Capital LLC (Historical - Converted)
        ngi_llc_historical = AccountingEntity(
            entity_name="NGI Capital LLC",
            entity_type="LLC",
            ein="XX-WWWWWWW",  # Replace with actual
            formation_date=date(2023, 1, 1),
            formation_state="Delaware",
            parent_entity_id=None,
            is_active=False  # Historical/converted
        )
        db.add(ngi_llc_historical)
        db.flush()
        print(f"✓ Created NGI Capital LLC (Historical) (ID: {ngi_llc_historical.id})")
        
        # Create entity relationships
        parent_sub_relationship = EntityRelationship(
            parent_entity_id=ngi_inc.id,
            subsidiary_entity_id=ngi_advisory.id,
            ownership_percentage=100.0,
            relationship_type="Parent-Subsidiary",
            effective_date=date(2025, 1, 1),
            is_active=True
        )
        db.add(parent_sub_relationship)
        print(f"✓ Created parent-subsidiary relationship")
        
        db.commit()
        
        print("\n" + "="*60)
        print("✅ Multi-entity seeding complete!")
        print("="*60)
        print(f"\nEntities created:")
        print(f"  1. NGI Capital Inc (Parent) - ID: {ngi_inc.id}")
        print(f"  2. NGI Capital Advisory LLC (Subsidiary) - ID: {ngi_advisory.id}")
        print(f"  3. Creator Terminal LLC (Separate) - ID: {creator_terminal.id}")
        print(f"  4. NGI Capital LLC (Historical) - ID: {ngi_llc_historical.id}")
        print(f"\nEntity selector will now show all active entities!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding entities: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_entities()

