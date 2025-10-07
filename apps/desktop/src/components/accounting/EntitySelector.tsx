"use client"

import { useEffect, useState } from "react"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Building2, Lock } from "lucide-react"

interface Entity {
  id: number
  entity_name: string
  entity_type: string
  ein?: string
  entity_status: string
  is_available: boolean
  parent_entity_id?: number | null
  ownership_percentage?: number | null
}

interface EntitySelectorProps {
  value?: number
  onChange: (entityId: number) => void
  className?: string
}

export function EntitySelector({ value, onChange, className }: EntitySelectorProps) {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEntities()
  }, [])

  const fetchEntities = async () => {
    try {
      const response = await fetch("/api/accounting/entities", {
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        setEntities(data)
        
        // Auto-select NGI Capital LLC (id=1) if no value selected
        if (!value && data.length > 0) {
          const defaultEntity = data.find((e: Entity) => e.id === 1 && e.is_available) || data.find((e: Entity) => e.is_available) || data[0]
          onChange(defaultEntity.id)
        }
      } else {
        console.error("Failed to fetch entities:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("Error loading entities:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        Loading entities...
      </div>
    )
  }

  if (entities.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No entities found
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={value?.toString()}
        onValueChange={(val) => onChange(parseInt(val))}
      >
        <SelectTrigger className="w-[420px]">
          <SelectValue placeholder="Select entity" />
        </SelectTrigger>
        <SelectContent>
          {entities.map((entity) => {
            // Don't show type suffix if it's already in the entity name
            const showTypeSuffix = !(
              (entity.entity_name.includes("LLC") && entity.entity_type === "LLC") ||
              ((entity.entity_name.includes("Inc") || entity.entity_name.includes("Corp")) && entity.entity_type === "C-Corp")
            )
            
            const isDisabled = !entity.is_available
            const isSubsidiary = entity.parent_entity_id !== null && entity.parent_entity_id !== undefined
            
            return (
              <SelectItem 
                key={entity.id} 
                value={entity.id.toString()}
                disabled={isDisabled}
                className={isDisabled ? "opacity-50 cursor-not-allowed py-2" : "py-2"}
              >
                <div className="flex items-center gap-2 text-sm">
                  {isDisabled && <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                  <span className={`font-medium ${isDisabled ? "text-muted-foreground" : ""}`}>
                    {entity.entity_name}
                  </span>
                  {!isDisabled && entity.entity_status === "active" && (
                    <span className="text-xs text-green-600 font-medium">
                      (Active)
                    </span>
                  )}
                  {showTypeSuffix && (
                    <span className="text-xs text-muted-foreground">
                      {entity.entity_type}
                    </span>
                  )}
                  {isSubsidiary && entity.ownership_percentage && isDisabled && (
                    <span className="text-xs text-muted-foreground">
                      - {entity.ownership_percentage}% owned
                    </span>
                  )}
                  {isDisabled && (
                    <span className="text-xs text-orange-600 font-medium italic">
                      Pending Conversion
                    </span>
                  )}
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}

