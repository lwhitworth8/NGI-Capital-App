'use client';

import React, { useState } from 'react'
import { apiClient } from '@/lib/api'

export default function FundsPlanner({ entityId, scenarioId }: { entityId?: number; scenarioId?: number }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('GM')
  const [msg, setMsg] = useState('')
  const [sid, setSid] = useState<number | undefined>(scenarioId)

  React.useEffect(() => {
    let mounted = true
    if (!sid) {
      ;(async ()=>{
        try {
          const list = await apiClient.request<any[]>('GET', '/finance/forecast/scenarios', undefined, { params: entityId ? { entity_id: entityId } : {} })
          if (mounted) setSid(list?.[0]?.id)
        } catch {}
      })()
    }
    return () => { mounted = false }
  }, [entityId, sid])

  const add = async () => {
    const target = sid || scenarioId
    if (!target || !name) return
    try {
      await apiClient.request('POST', `/finance/forecast/scenarios/${target}/assumptions`, { key: `funds.${name}.role`, value: role })
      await apiClient.request('POST', `/finance/forecast/scenarios/${target}/assumptions`, { key: `funds.${name}.entityId`, value: String(entityId||'') })
      setMsg('Saved')
      setName('')
    } catch {
      setMsg('Failed')
    }
    setTimeout(()=>setMsg(''), 1500)
  }

  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground mb-2">Funds (SPV / LP) — assign GM role</div>
      <div className="flex gap-2">
        <input className="flex-1 px-2 py-1 border rounded" placeholder="Fund name (e.g., NGI SPV I)" value={name} onChange={e=>setName(e.target.value)} />
        <select className="px-2 py-1 border rounded" value={role} onChange={e=>setRole(e.target.value)}>
          <option>GM</option>
          <option>GP</option>
          <option>Manager</option>
        </select>
        <button className="px-2 py-1 border rounded" onClick={add} disabled={!(sid || scenarioId) || !name}>Add</button>
      </div>
      {msg && <div className="text-xs text-muted-foreground mt-1">{msg}</div>}
    </div>
  )
}
