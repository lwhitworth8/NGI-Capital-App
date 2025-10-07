# Entity Hierarchy Implementation
## Updated: October 4, 2025

## Entity Structure Overview

### Current State (Pre-Conversion)
```
NGI Capital LLC (Main Entity)
  - Status: Active
  - Available: YES (Default Selected)
  - Parent: None
  
  +-- NGI Capital Advisory LLC
      - Status: Planned
      - Available: NO (Greyed Out - Pending Conversion)
      - Parent: NGI Capital LLC (id=1)
      - Ownership: 100%
  
  +-- Creator Terminal Inc.
      - Status: Planned
      - Available: NO (Greyed Out - Pending Conversion)
      - Parent: NGI Capital LLC (id=1)
      - Ownership: 100%
```

### After Conversion Workflow
```
NGI Capital Inc. (C-Corp) [Converted from LLC]
  - Status: Active
  - Available: YES
  - Parent: None
  
  +-- NGI Capital Advisory LLC (ACTIVATED)
      - Status: Active
      - Available: YES
      - Parent: NGI Capital Inc.
      - Ownership: 100%
  
  +-- Creator Terminal Inc. (ACTIVATED)
      - Status: Active
      - Available: YES
      - Parent: NGI Capital Inc.
      - Ownership: 100%
```

## Implementation Details

### Database Schema Changes

**New Columns Added to `accounting_entities` table:**
- `is_available` (BOOLEAN) - Controls whether entity can be selected in UI
- `parent_entity_id` (INTEGER) - Foreign key to parent entity (NULL for top-level)
- `ownership_percentage` (NUMERIC(5,2)) - Ownership % (e.g., 100.00)

### Backend API Changes

**File:** `src/api/routes/accounting_entities.py`
- Updated `EntityResponse` model to include new fields
- API now returns: `is_available`, `parent_entity_id`, `ownership_percentage`

**File:** `src/api/models_accounting.py`
- Added new columns to `AccountingEntity` model

### Frontend UI Changes

**File:** `apps/desktop/src/components/accounting/EntitySelector.tsx`
- Shows all entities (available and unavailable)
- Disabled entities display with:
  - Lock icon
  - Grey text
  - "Pending Conversion" label
  - Ownership percentage (e.g., "100% owned")
- Auto-selects NGI Capital LLC (id=1) by default
- Prevents selection of unavailable entities

### Database Seeding

**Files Created:**
- `scripts/seed_accounting_entities.py` - Initial entity seeding
- `scripts/update_entity_relationships.py` - Update existing entities

**Entities Seeded:**
1. NGI Capital LLC (id=1, Available)
2. NGI Capital Advisory LLC (id=2, NOT Available)
3. Creator Terminal Inc. (id=3, NOT Available)

## Business Rules

1. **Default Selection:** NGI Capital LLC is automatically selected on page load
2. **Entity Conversion Trigger:** Entity Conversion module will activate subsidiaries
3. **Consolidated Reporting:** Uses parent_entity_id to roll up financials
4. **Visual State:** Unavailable entities are shown but disabled with clear indicators

## Conversion Workflow (Future)

When user completes Entity Conversion:
1. Create new entity: NGI Capital Inc. (C-Corp)
2. Set NGI Capital LLC status to "converted"
3. Update Advisory & Creator Terminal:
   - Set `is_available = True`
   - Update `parent_entity_id` to new NGI Capital Inc. id
   - Set status to "active"
4. User can now select all 3 entities

## Testing

To test the implementation:
```bash
# 1. Recreate tables with new schema
python -c "from src.api.database import drop_all_tables, init_db; drop_all_tables(); init_db()"

# 2. Seed entities
python scripts/seed_accounting_entities.py

# Or update existing entities:
python scripts/update_entity_relationships.py
```

## Next Steps

1. Update Entity Conversion page to activate subsidiaries
2. Update Consolidated Reporting to use parent-child relationships
3. Add entity hierarchy visualization
4. Create conversion workflow UI
5. Update all tests to handle multi-entity scenarios


