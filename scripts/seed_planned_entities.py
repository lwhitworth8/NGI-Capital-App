#!/usr/bin/env python3
"""
Seed planned entity structure for NGI Capital:
1. NGI Capital LLC (active, will convert to C-Corp)
2. NGI Capital Inc (planned C-Corp conversion target)
3. The Creator Terminal Inc (planned, 100% owned by NGI Capital Inc)
4. NGI Capital Advisory LLC (planned, 100% owned by NGI Capital Inc)
"""
import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from services.api.database import get_db
from services.api.models_accounting import AccountingEntity, EntityRelationship
from datetime import date

def seed_planned_entities():
    db = next(get_db())

    try:
        # Check if we already have all entities
        existing_count = db.query(AccountingEntity).count()
        if existing_count >= 4:
            print(f"✓ Entities already exist ({existing_count} found)")
            entities = db.query(AccountingEntity).all()
            for e in entities:
                print(f"  - {e.entity_name} ({e.entity_type}) - Status: {e.entity_status}")
            return

        print("\nSeeding planned entity structure...")

        # 1. NGI Capital LLC (Active - Parent entity that will be converted)
        ngi_llc = db.query(AccountingEntity).filter_by(entity_name="NGI Capital LLC").first()
        if ngi_llc:
            print(f"✓ NGI Capital LLC already exists - ID: {ngi_llc.id}")
        else:
            ngi_llc = AccountingEntity(
                entity_name="NGI Capital LLC",
                entity_type="LLC",
                ein="92-3581038",  # Actual EIN
                formation_date=date(2023, 1, 1),
                formation_state="Delaware",
                parent_entity_id=None,
                entity_status="active",  # Currently active
                is_available=True
            )
            db.add(ngi_llc)
            db.flush()
            print(f"✓ Created NGI Capital LLC (Active) - ID: {ngi_llc.id}")

        # 2. NGI Capital Inc (Planned - C-Corp conversion target)
        ngi_inc = AccountingEntity(
            entity_name="NGI Capital Inc",
            entity_type="C-Corporation",
            ein=None,  # Will get EIN upon conversion
            formation_date=None,  # Will be set upon conversion
            formation_state="Delaware",
            parent_entity_id=None,
            entity_status="planned",  # Planned conversion
            is_available=True
        )
        db.add(ngi_inc)
        db.flush()
        print(f"✓ Created NGI Capital Inc (Planned C-Corp) - ID: {ngi_inc.id}")

        # 3. The Creator Terminal Inc (Planned - 100% owned by NGI Capital Inc)
        creator_terminal = AccountingEntity(
            entity_name="The Creator Terminal Inc",
            entity_type="C-Corporation",
            ein=None,  # Will get EIN upon formation
            formation_date=None,
            formation_state="Delaware",
            parent_entity_id=ngi_inc.id,
            entity_status="planned",
            is_available=True
        )
        db.add(creator_terminal)
        db.flush()
        print(f"✓ Created The Creator Terminal Inc (Planned Subsidiary) - ID: {creator_terminal.id}")

        # 4. NGI Capital Advisory LLC (Planned - 100% owned by NGI Capital Inc)
        ngi_advisory = AccountingEntity(
            entity_name="NGI Capital Advisory LLC",
            entity_type="LLC",
            ein=None,  # Will get EIN upon formation
            formation_date=None,
            formation_state="Delaware",
            parent_entity_id=ngi_inc.id,
            entity_status="planned",
            is_available=True
        )
        db.add(ngi_advisory)
        db.flush()
        print(f"✓ Created NGI Capital Advisory LLC (Planned Subsidiary) - ID: {ngi_advisory.id}")

        # Create entity relationships for planned structure
        # Relationship 1: NGI Capital Inc -> The Creator Terminal Inc (100%)
        rel1 = EntityRelationship(
            parent_entity_id=ngi_inc.id,
            subsidiary_entity_id=creator_terminal.id,
            ownership_percentage=100.0,
            relationship_type="Parent-Subsidiary",
            effective_date=None,  # Will be set when entities become active
            is_active=False  # Not active yet (planned)
        )
        db.add(rel1)

        # Relationship 2: NGI Capital Inc -> NGI Capital Advisory LLC (100%)
        rel2 = EntityRelationship(
            parent_entity_id=ngi_inc.id,
            subsidiary_entity_id=ngi_advisory.id,
            ownership_percentage=100.0,
            relationship_type="Parent-Subsidiary",
            effective_date=None,
            is_active=False  # Not active yet (planned)
        )
        db.add(rel2)

        print(f"✓ Created planned parent-subsidiary relationships")

        db.commit()

        print("\n" + "="*70)
        print("✅ Planned entity structure seeded successfully!")
        print("="*70)
        print(f"\nEntity Structure:")
        print(f"  1. NGI Capital LLC (Active) - ID: {ngi_llc.id}")
        print(f"     └─ Will convert to → NGI Capital Inc")
        print(f"  2. NGI Capital Inc (Planned C-Corp) - ID: {ngi_inc.id}")
        print(f"     ├─ The Creator Terminal Inc (100% owned) - ID: {creator_terminal.id}")
        print(f"     └─ NGI Capital Advisory LLC (100% owned) - ID: {ngi_advisory.id}")
        print(f"\nAll 4 entities should now appear in the entity selector!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding entities: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_planned_entities()
