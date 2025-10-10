'use client';

import React, { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api'

interface Team { id: number; name: string; description?: string }

export default function TeamsSuggestInput({ entityId, onSelect }: { entityId?: number; onSelect?: (team: Team)=>void }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!entityId) return
    let mounted = true
    ;(async ()=>{
      try {
        const list = await apiClient.request<any[]>('GET', '/teams', undefined, { params: { entity_id: entityId } })
        if (mounted) setTeams(list as Team[])
      } catch {
        setTeams([])
      }
    })()
    return () => { mounted = false }
  }, [entityId])

  const filtered = useMemo(() => {
    const s = (q||'').toLowerCase()
    const base = teams.length ? teams : [
      { id: 0, name: 'Executive' },
      { id: 0, name: 'Engineering' },
      { id: 0, name: 'Sales' },
      { id: 0, name: 'Marketing' },
      { id: 0, name: 'G&A' },
      { id: 0, name: 'Advisory' },
      { id: 0, name: 'Finance' },
      { id: 0, name: 'Legal' },
    ]
    return base.filter(t => t.name.toLowerCase().includes(s)).slice(0,8)
  }, [q, teams])

  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground mb-2">Add teams (seeded from Employees)</div>
      <input className="w-full px-2 py-1 border rounded bg-background" placeholder="Type a team (e.g., Engineering)" value={q} onChange={e=>setQ(e.target.value)} />
      {q && (
        <div className="mt-2 border rounded divide-y max-h-40 overflow-auto">
          {filtered.map((t, i) => (
            <button key={i} className="w-full text-left px-2 py-1 hover:bg-muted" onClick={()=> onSelect?.(t)}>
              {t.name}
            </button>
          ))}
          {filtered.length===0 && <div className="px-2 py-1 text-sm text-muted-foreground">No matches</div>}
        </div>
      )}
    </div>
  )
}

