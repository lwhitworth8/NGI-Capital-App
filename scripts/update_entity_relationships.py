"""
Update existing entities with parent-child relationships and availability flags
Run this to update the database if entities already exist
"""

from datetime import date
from decimal import Decimal
from services.api.database import get_db
from services.api.models_accounting import AccountingEntity


def update_entity_relationships():
    """
    Update existing entities with new relationship structure
    """
    db = next(get_db())
    try:
        # Entity 1: NGI Capital LLC (currently named "NGI Capital Inc." in DB)
        entity1 = db.query(AccountingEntity).filter_by(id=1).first()
        if entity1:
            # Keep current name if it's already Inc., otherwise update
            if "Inc" not in entity1.entity_name:
                entity1.entity_name = "NGI Capital LLC"
                entity1.entity_type = "LLC"
            entity1.entity_status = "active"
            entity1.is_available = True  # Available
            entity1.parent_entity_id = None
            entity1.ownership_percentage = None
            db.add(entity1)
            print(f"[OK] Updated Entity 1: {entity1.entity_name} (Available)")
        
        # Entity 2: NGI Capital Advisory LLC
        entity2 = db.query(AccountingEntity).filter_by(id=2).first()
        if entity2:
            entity2.entity_name = "NGI Capital Advisory LLC"
            entity2.entity_type = "LLC"
            entity2.entity_status = "planned"
            entity2.is_available = False  # Greyed out
            entity2.parent_entity_id = 1
            entity2.ownership_percentage = Decimal("100.00")
            db.add(entity2)
            print(f"[OK] Updated Entity 2: {entity2.entity_name} (Greyed Out)")
        
        # Entity 3: The Creator Terminal Inc.
        entity3 = db.query(AccountingEntity).filter_by(id=3).first()
        if entity3:
            entity3.entity_name = "The Creator Terminal Inc."
            entity3.entity_type = "C-Corp"
            entity3.entity_status = "planned"
            entity3.is_available = False  # Greyed out
            entity3.parent_entity_id = 1
            entity3.ownership_percentage = Decimal("100.00")
            db.add(entity3)
            print(f"[OK] Updated Entity 3: {entity3.entity_name} (Greyed Out)")
        
        db.commit()
        
        print("\n[SUCCESS] Successfully updated entity relationships!")
        print("\nCurrent Structure:")
        print("   NGI Capital LLC (Active, Selectable)")
        print("   +-- NGI Capital Advisory LLC (Planned, Greyed Out)")
        print("   +-- The Creator Terminal Inc. (Planned, Greyed Out)")
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error updating entities: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    update_entity_relationships()

