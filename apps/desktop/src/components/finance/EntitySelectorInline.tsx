'use client';

import React, { useMemo, useState } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { cn } from '@/lib/utils';

export default function EntitySelectorInline() {
  const { state, setCurrentEntity } = useApp()
  const [open, setOpen] = useState(false)

  const entities = state.entities || []
  const activeId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
  const active = entities.find(e => Number(e.id) === activeId)

  const onSelect = (id: number) => {
    const entity = entities.find(e => Number(e.id) === id)
    if (!entity) return
    setCurrentEntity(entity)
    // sync ?entity in URL
    const params = new URLSearchParams(window.location.search)
    params.set('entity', String(id))
    const next = `${window.location.pathname}?${params.toString()}`
    window.history.pushState({}, '', next)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button className="flex items-center space-x-2 border rounded-md px-3 py-1" onClick={()=>setOpen(v=>!v)}>
        <Building2 className="w-4 h-4" />
        <span className="text-sm">{active?.legal_name || 'Select Entity'}</span>
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute mt-2 w-64 bg-card border border-border rounded-md shadow z-20">
          <div className="py-1">
            {entities.map(entity => (
              <button
                key={entity.id}
                onClick={() => onSelect(Number(entity.id))}
                className={cn('block w-full text-left px-4 py-2 text-sm hover:bg-muted', Number(entity.id)===activeId && 'bg-muted/50')}
              >
                {entity.legal_name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
