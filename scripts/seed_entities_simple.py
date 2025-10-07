#!/usr/bin/env python3
"""
Simple entity seed - use exact model fields
"""
import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from src.api.database import get_db
from src.api.models_accounting import AccountingEntity
from datetime import date

def seed():
    db = next(get_db())
    
    try:
        # Check existing
        count = db.query(AccountingEntity).count()
        if count > 0:
            print(f"✓ {count} entities already exist")
            entities = db.query(AccountingEntity).all()
            for e in entities:
                print(f"  - {e.entity_name} ({e.entity_type}) - ID: {e.id}")
            return
        
        print("Creating 3 entities...")
        
        # Use only fields that exist in model (entity_status not is_active)
        e1 = AccountingEntity(
            entity_name="NGI Capital Inc",
            entity_type="C-Corporation",
            ein="45-1234567",
            formation_date=date(2025, 1, 1),
            formation_state="DE",
            entity_status="active"
        )
        db.add(e1)
        
        e2 = AccountingEntity(
            entity_name="NGI Capital Advisory LLC",
            entity_type="LLC",
            ein="45-2234567",
            formation_date=date(2024, 6, 1),
            formation_state="DE",
            entity_status="active"
        )
        db.add(e2)
        
        e3 = AccountingEntity(
            entity_name="Creator Terminal LLC",
            entity_type="LLC",
            ein="45-3234567",
            formation_date=date(2024, 9, 1),
            formation_state="DE",
            entity_status="active"
        )
        db.add(e3)
        
        db.commit()
        print("✅ Created 3 entities successfully!")
        print(f"  1. {e1.entity_name} - ID: {e1.id}")
        print(f"  2. {e2.entity_name} - ID: {e2.id}")
        print(f"  3. {e3.entity_name} - ID: {e3.id}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()

