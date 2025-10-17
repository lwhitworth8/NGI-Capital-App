#!/usr/bin/env python3
"""
FINAL entity seeding - clears all existing and creates proper 4-entity structure
All EIN and formation dates NULL - will come from document upload system
"""
import sys
import os
sys.path.insert(0, os.path.abspath('.'))

# Use the correct database path
os.environ['DATABASE_PATH'] = os.path.join(os.path.dirname(__file__), '..', 'data', 'ngi_capital.db')

from services.api.database import get_db
from services.api.models_accounting import AccountingEntity, EntityRelationship

def seed_final_entities():
    db = next(get_db())

    try:
        # Clear all existing entities and relationships
        print("Clearing all existing entity data...")
        db.query(EntityRelationship).delete()
        db.query(AccountingEntity).delete()
        db.commit()
        print("All existing entities cleared")

        print("\nSeeding final 4-entity structure...")

        # 1. NGI Capital LLC (Active - current entity)
        ngi_llc = AccountingEntity(
            entity_name="NGI Capital LLC",
            entity_type="LLC",
            ein=None,
            formation_date=None,
            formation_state=None,
            parent_entity_id=None,
            entity_status="active",
            is_available=True
        )
        db.add(ngi_llc)
        db.flush()
        print(f"Created NGI Capital LLC (Active) - ID: {ngi_llc.id}")

        # 2. NGI Capital Inc (Planned - C-Corp conversion target)
        ngi_inc = AccountingEntity(
            entity_name="NGI Capital Inc",
            entity_type="C-Corporation",
            ein=None,
            formation_date=None,
            formation_state=None,
            parent_entity_id=None,
            entity_status="planned",
            is_available=True
        )
        db.add(ngi_inc)
        db.flush()
        print(f"Created NGI Capital Inc (Planned C-Corp) - ID: {ngi_inc.id}")

        # 3. The Creator Terminal Inc (Planned - 100% owned by NGI Capital Inc)
        creator_terminal = AccountingEntity(
            entity_name="The Creator Terminal Inc",
            entity_type="C-Corporation",
            ein=None,
            formation_date=None,
            formation_state=None,
            parent_entity_id=ngi_inc.id,
            entity_status="planned",
            is_available=True
        )
        db.add(creator_terminal)
        db.flush()
        print(f"Created The Creator Terminal Inc (Planned) - ID: {creator_terminal.id}")

        # 4. NGI Capital Advisory LLC (Planned - 100% owned by NGI Capital Inc)
        ngi_advisory = AccountingEntity(
            entity_name="NGI Capital Advisory LLC",
            entity_type="LLC",
            ein=None,
            formation_date=None,
            formation_state=None,
            parent_entity_id=ngi_inc.id,
            entity_status="planned",
            is_available=True
        )
        db.add(ngi_advisory)
        db.flush()
        print(f"Created NGI Capital Advisory LLC (Planned) - ID: {ngi_advisory.id}")

        # Skip relationships for now - just need entities
        db.commit()

        print("\n" + "="*60)
        print("FINAL entity seeding complete")
        print("="*60)
        print("\nEntity Structure:")
        print("  1. NGI Capital LLC (Active)")
        print("     -> Planned conversion to NGI Capital Inc")
        print("\n  2. NGI Capital Inc (Planned C-Corp)")
        print("     -> The Creator Terminal Inc (100% owned)")
        print("     -> NGI Capital Advisory LLC (100% owned)")
        print("\nAll 4 entities created with NULL EIN/formation dates.")
        print("Data will be populated via document upload system.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding entities: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_final_entities()
