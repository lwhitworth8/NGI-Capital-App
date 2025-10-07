"""
Update entity names to fix duplicates and correct entity types
Run this to update existing entities in the database
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.api.database import get_db
from src.api.models_accounting import AccountingEntity

def update_entities():
    """Update entity names"""
    db = next(get_db())
    
    try:
        # Update entity 1: NGI Capital LLC -> NGI Capital Inc. (C-Corp)
        entity1 = db.query(AccountingEntity).filter(AccountingEntity.id == 1).first()
        if entity1:
            entity1.entity_name = "NGI Capital Inc."
            entity1.entity_type = "C-Corp"
            print(f"Updated entity 1: {entity1.entity_name} ({entity1.entity_type})")
        
        # Update entity 2: Keep as NGI Capital Advisory LLC
        entity2 = db.query(AccountingEntity).filter(AccountingEntity.id == 2).first()
        if entity2:
            print(f"Entity 2 unchanged: {entity2.entity_name} ({entity2.entity_type})")
        
        # Update entity 3: NGI Capital Inc. -> Creator Terminal Inc. (C-Corp)
        entity3 = db.query(AccountingEntity).filter(AccountingEntity.id == 3).first()
        if entity3:
            entity3.entity_name = "Creator Terminal Inc."
            entity3.entity_type = "C-Corp"
            print(f"Updated entity 3: {entity3.entity_name} ({entity3.entity_type})")
        
        db.commit()
        print("\n✅ Successfully updated entities!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating entities: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    update_entities()

