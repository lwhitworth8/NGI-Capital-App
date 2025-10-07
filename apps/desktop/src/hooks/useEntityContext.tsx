"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface EntityContextType {
  selectedEntityId: number | null
  setSelectedEntityId: (id: number) => void
}

const EntityContext = createContext<EntityContextType | undefined>(undefined)

export function EntityProvider({ children }: { children: ReactNode }) {
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("ngi_selected_entity_id")
    if (saved) {
      setSelectedEntityId(parseInt(saved))
    } else {
      // Default to entity 1 (NGI Capital Inc)
      setSelectedEntityId(1)
    }
  }, [])

  // Save to localStorage when changed
  const handleSetEntity = (id: number) => {
    setSelectedEntityId(id)
    localStorage.setItem("ngi_selected_entity_id", id.toString())
  }

  return (
    <EntityContext.Provider value={{ selectedEntityId, setSelectedEntityId: handleSetEntity }}>
      {children}
    </EntityContext.Provider>
  )
}

export function useEntityContext() {
  const context = useContext(EntityContext)
  if (context === undefined) {
    throw new Error("useEntityContext must be used within EntityProvider")
  }
  return context
}




