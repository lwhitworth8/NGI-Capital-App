'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface Entity {
  id: number
  entity_name: string
  entity_type: string
  ein: string | null
  entity_status: string
  is_available: boolean
  parent_entity_id: number | null
  ownership_percentage: number | null
  display_label: string
  status_label: string
}

interface EntityContextValue {
  selectedEntity: Entity | null
  entities: Entity[]
  loading: boolean
  selectEntity: (id: number) => void
  openCommandMenu: () => void
}

const EntityContext = createContext<EntityContextValue | undefined>(undefined)

export function UnifiedEntityProvider({ children }: { children: ReactNode }) {
  const [entities, setEntities] = useState<Entity[]>([])
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [loading, setLoading] = useState(true)

  // Load entities on mount
  useEffect(() => {
    async function loadEntities() {
      try {
        const response = await fetch('/api/accounting/entities')
        const data = await response.json()
        
        // API returns array directly
        const entitiesArray = Array.isArray(data) ? data : []
        setEntities(entitiesArray)
        
        // Load saved entity or default to first available
        const savedId = localStorage.getItem('ngi_selected_entity_id')
        const selected = savedId 
          ? entitiesArray.find((e: Entity) => e.id === parseInt(savedId))
          : entitiesArray.find((e: Entity) => e.is_available)
        
        if (selected) {
          console.log("UnifiedEntityContext: Selected entity:", selected)
          setSelectedEntity(selected)
        } else {
          console.log("UnifiedEntityContext: No entity selected from:", entitiesArray)
        }
      } catch (error) {
        console.error('Failed to load entities:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadEntities()
  }, [])

  const selectEntity = useCallback((id: number) => {
    const entity = entities.find(e => e.id === id)
    if (entity && entity.is_available) {
      setSelectedEntity(entity)
      localStorage.setItem('ngi_selected_entity_id', id.toString())
    }
  }, [entities])

  const openCommandMenu = useCallback(() => {
    // Trigger command menu (implemented in component)
    window.dispatchEvent(new CustomEvent('open-entity-selector'))
  }, [])

  return (
    <EntityContext.Provider value={{
      selectedEntity,
      entities,
      loading,
      selectEntity,
      openCommandMenu
    }}>
      {children}
    </EntityContext.Provider>
  )
}

export function useEntity() {
  const context = useContext(EntityContext)
  if (!context) {
    throw new Error('useEntity must be used within UnifiedEntityProvider')
  }
  return context
}

