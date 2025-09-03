'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

interface Scenario { id: number; entity_id: number; name: string; state: string; created_at?: string }
interface Assumption { id: number; key: string; value: string; effective_start?: string; effective_end?: string; created_at?: string }

export default function ForecastTool({ entityId }: { entityId?: number }) {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [active, setActive] = useState<Scenario | null>(null)
  const [assumptions, setAssumptions] = useState<Assumption[]>([])
  const [newName, setNewName] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const j = await apiClient.request<any[]>(
          'GET',
          '/finance/forecast/scenarios',
          undefined,
          { params: entityId ? { entity_id: entityId } : {} },
        )
        const arr = Array.isArray(j) ? j : []
        setScenarios(arr)
        if (arr.length) setActive(arr[0] as any)
      } catch {
        setScenarios([])
        setActive(null)
      }
    }
    load()
  }, [entityId])

  useEffect(() => {
    const loadAssumptions = async () => {
      if (!active) { setAssumptions([]); return }
      try {
        const j = await apiClient.request<any[]>(
          'GET',
          `/finance/forecast/scenarios/${active.id}/assumptions`,
        )
        setAssumptions(Array.isArray(j) ? j : [])
      } catch {
        setAssumptions([])
      }
    }
    loadAssumptions()
  }, [active])

  const createScenario = async () => {
    try {
      const j = await apiClient.request<any>('POST', '/finance/forecast/scenarios', { name: newName || 'Scenario', entity_id: entityId })
      setScenarios(s => [j, ...s])
      setActive(j)
    } catch {}
    setNewName('')
  }

  const addAssumption = async () => {
    if (!active) return
    try {
      const j = await apiClient.request<any>('POST', `/finance/forecast/scenarios/${active.id}/assumptions`, { key: newKey, value: newVal })
      setAssumptions(a => [j, ...a])
    } catch {}
    setNewKey(''); setNewVal('')
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Financial Forecasting</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-3">
        {/* Scenarios */}
        <div className="rounded-md border border-border p-3">
          <div className="text-xs text-muted-foreground mb-2">Scenarios</div>
          <div className="flex gap-2 mb-2">
            <input className="flex-1 px-2 py-1 border rounded" placeholder="New scenario name" value={newName} onChange={e=>setNewName(e.target.value)} />
            <button className="px-2 py-1 border rounded" onClick={createScenario}>Add</button>
          </div>
          <ul>
            {(Array.isArray(scenarios) ? scenarios : []).map(s => (
              <li key={s.id}>
                <button className={`w-full text-left px-2 py-1 rounded ${active?.id===s.id?'bg-muted':''}`} onClick={()=>setActive(s)}>
                  {s.name} <span className="text-xs text-muted-foreground">({s.state})</span>
                </button>
              </li>
            ))}
            {scenarios.length===0 && <li className="text-sm text-muted-foreground">No scenarios.</li>}
          </ul>
        </div>
        {/* Assumptions */}
        <div className="rounded-md border border-border p-3 lg:col-span-2">
          <div className="text-xs text-muted-foreground mb-2">Assumptions ({active?.name || 'none selected'})</div>
          <div className="flex gap-2 mb-2">
            <input className="flex-1 px-2 py-1 border rounded" placeholder="Key (e.g., hiring.engineering.headcount)" value={newKey} onChange={e=>setNewKey(e.target.value)} />
            <input className="flex-1 px-2 py-1 border rounded" placeholder="Value" value={newVal} onChange={e=>setNewVal(e.target.value)} />
            <button className="px-2 py-1 border rounded" onClick={addAssumption} disabled={!active}>Add</button>
          </div>
          <div className="max-h-64 overflow-auto border rounded">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-2 py-1">Key</th>
                  <th className="px-2 py-1">Value</th>
                  <th className="px-2 py-1">Created</th>
                </tr>
              </thead>
              <tbody>
                {assumptions.map(a => (
                  <tr key={a.id} className="border-t">
                    <td className="px-2 py-1">{a.key}</td>
                    <td className="px-2 py-1">{a.value}</td>
                    <td className="px-2 py-1">{a.created_at || ''}</td>
                  </tr>
                ))}
                {assumptions.length===0 && (
                  <tr><td className="px-2 py-4 text-muted-foreground" colSpan={3}>No assumptions.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Outputs placeholder (P&L, cash, runway) */}
      <div className="mt-4 text-sm text-muted-foreground">Outputs will render charts/tables for P&L, cash flow, and runway forecasts based on assumptions and actuals.</div>
    </div>
  )
}
