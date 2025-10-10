# Entity Selector - Developer Guide

## Architecture

### Backend API
**Endpoint**: `GET /api/entities`

**File**: `src/api/routes/entities.py`

Returns all entities with computed fields for UI display.

**Response**:
```json
[
  {
    "id": 1,
    "entity_name": "NGI Capital LLC",
    "entity_type": "LLC",
    "ein": "12-3456789",
    "entity_status": "active",
    "is_available": true,
    "parent_entity_id": null,
    "ownership_percentage": null,
    "display_label": "NGI Capital LLC",
    "status_label": "Active · Parent Entity"
  },
  {
    "id": 2,
    "entity_name": "NGI Capital Advisory LLC",
    "entity_type": "LLC",
    "ein": "23-4567890",
    "entity_status": "planned",
    "is_available": false,
    "parent_entity_id": 1,
    "ownership_percentage": 100.0,
    "display_label": "NGI Capital Advisory LLC",
    "status_label": "Pending Conversion · Subsidiary"
  }
]
```

### Frontend Context
**File**: `apps/desktop/src/lib/context/UnifiedEntityContext.tsx`

Provides global entity state management:
- Fetches entities from API
- Persists selection to localStorage
- Provides selection methods

**Usage**:
```typescript
import { useEntity } from '@/lib/context/UnifiedEntityContext'

function MyComponent() {
  const { selectedEntity, entities, selectEntity } = useEntity()
  
  return (
    <div>
      Current: {selectedEntity?.entity_name}
      <button onClick={() => selectEntity(2)}>Switch</button>
    </div>
  )
}
```

### Entity Selector Component
**File**: `apps/desktop/src/components/common/EntitySelector.tsx`

Self-contained component with:
- Badge trigger button
- Dialog modal
- Keyboard shortcut handling (Ctrl+E)

**Usage**:
```typescript
import { EntitySelector } from '@/components/common/EntitySelector'

export default function MyPage() {
  return (
    <div className="flex items-center justify-between">
      <h1>My Module</h1>
      <EntitySelector />
    </div>
  )
}
```

## Integration in New Modules

### Step 1: Import the Component
```typescript
import { EntitySelector } from '@/components/common/EntitySelector'
import { useEntity } from '@/lib/context/UnifiedEntityContext'
```

### Step 2: Use the Context
```typescript
const { selectedEntity } = useEntity()
const selectedEntityId = selectedEntity?.id || null
```

### Step 3: Add to UI
```typescript
<div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-semibold">Module Name</h1>
  <EntitySelector />
</div>
```

### Step 4: Use Entity Data
```typescript
// Filter data by entity
const entityData = data.filter(item => item.entity_id === selectedEntityId)

// Show entity name
<p>{selectedEntity?.entity_name}</p>
```

## Adding New Entity Fields

### Backend
1. Add column to `AccountingEntity` model in `src/api/models_accounting.py`
2. Add field to `EntityResponse` in `src/api/routes/entities.py`
3. Include in response mapping

### Frontend
1. Update `Entity` interface in `UnifiedEntityContext.tsx`
2. Use new field in components via `selectedEntity.yourField`

## Testing

### Unit Tests
```bash
npm test UnifiedEntityContext
npm test EntitySelector
```

### E2E Tests
```bash
npx playwright test entity-selector.spec.ts
```

### Manual Testing
1. Start dev environment: `docker compose -f docker-compose.dev.yml up`
2. Navigate to http://localhost:3001/admin/dashboard
3. Test entity selector in all 4 modules
4. Test keyboard shortcut (Ctrl+E)
5. Verify persistence across page loads

## Troubleshooting

### Entity selector not showing
- Check that `UnifiedEntityProvider` is in providers.tsx
- Verify API endpoint `/api/entities` returns data
- Check browser console for errors

### Selection not persisting
- Check localStorage for `ngi_selected_entity_id`
- Verify no errors in console during selection
- Clear localStorage and try again

### Keyboard shortcut not working
- Check for conflicts with browser/OS shortcuts
- Verify event listener is attached (check console)
- Try clicking badge instead

## Best Practices

1. **Always use UnifiedEntityContext** - Don't create separate entity state
2. **Filter by selectedEntityId** - Use the ID to filter API responses
3. **Handle null cases** - Entity may be null on initial load
4. **Show entity name** - Help users know which entity they're viewing
5. **Test all modules** - Entity selector must work consistently everywhere

