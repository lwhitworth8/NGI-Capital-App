'use client'

import { useEntity } from '@/lib/context/UnifiedEntityContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function EntitySelector() {
  const { selectedEntity, entities, selectEntity, loading } = useEntity()

  if (loading) {
    return (
      <div className="w-[280px] h-9 rounded-md border border-input bg-background px-3 py-2 text-sm">
        Loading entities...
      </div>
    )
  }

  if (entities.length === 0) {
    return (
      <div className="w-[280px] h-9 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
        No entities available
      </div>
    )
  }

  return (
    <Select
      value={selectedEntity?.id?.toString()}
      onValueChange={(val) => selectEntity(parseInt(val))}
    >
      <SelectTrigger className="w-[280px]">
        <SelectValue>
          {selectedEntity?.entity_name || 'Select entity'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {entities.map((entity) => (
          <SelectItem
            key={entity.id}
            value={entity.id.toString()}
            disabled={!entity.is_available}
          >
            <div className="flex flex-col gap-0.5">
              <span className={!entity.is_available ? 'text-muted-foreground' : ''}>
                {entity.entity_name}
              </span>
              {!entity.is_available && (
                <span className="text-xs text-muted-foreground">Pending Conversion</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

