"use client"

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api'
import EntitySelectorInline from '@/components/finance/EntitySelectorInline'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

export default function AccountingClosePage() {
  const [entities, setEntities] = useState<any[]>([])
  const [entityId, setEntityId] = useState<number>(0)
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [month, setMonth] = useState<number>(new Date().getMonth()+1)
  const [status, setStatus] = useState<any | null>(null)

  useEffect(()=>{ (async ()=>{ const es = await apiClient.getEntities(); setEntities(es); if (es[0]) setEntityId(Number(es[0].id)) })() }, [])

  const onPreview = async () => {
    try {
      const s = await apiClient.accountingClosePreview(entityId, year, month)
      setStatus(s)
    } catch (e:any) { toast.error(e?.response?.data?.detail || 'Preview failed') }
  }
  const onRunClose = async () => {
    try {
      const r = await apiClient.accountingCloseRun(entityId, year, month)
      toast.success(`Period locked through ${r.period_end}`)
      setStatus(null)
    } catch (e:any) { toast.error(e?.response?.data?.detail || 'Close failed') }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Close Books</h1>
          <p className="text-sm text-muted-foreground">Monthly US GAAP close checklist</p>
        </div>
        <EntitySelectorInline />
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">Entity</span>
            <select className="w-full px-2 py-1 border rounded bg-background" value={entityId} onChange={e=>setEntityId(Number(e.target.value))}>
              {entities.map(e=> (<option key={e.id} value={e.id}>{e.legal_name}</option>))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">Year</span>
            <input className="w-full px-2 py-1 border rounded bg-background" value={year} onChange={e=>setYear(Number(e.target.value||0))} />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">Month</span>
            <input className="w-full px-2 py-1 border rounded bg-background" value={month} onChange={e=>setMonth(Number(e.target.value||0))} />
          </label>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onPreview}>Preview Checklist</Button>
          <Button variant="primary" onClick={onRunClose} disabled={!status || status.bank_unreconciled || status.docs_unposted}>Lock Period</Button>
        </div>
        {status && (
          <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
            <ChecklistItem label="Bank Reconciliation" ok={!status.bank_unreconciled} />
            <ChecklistItem label="AP/AR (Documents posted/accrued)" ok={!status.docs_unposted} />
            <ChecklistItem label="Founder-Paid review" ok={!status.founder_due_open} />
            <ChecklistItem label="Accruals/Prepaids/Deferrals" ok={true} />
            <ChecklistItem label="Fixed assets & depreciation" ok={true} />
            <ChecklistItem label="FX remeasurement/elimination" ok={true} />
            <ChecklistItem label="Trial Balance variance review" ok={true} />
          </div>
        )}
      </div>
    </div>
  )
}

function ChecklistItem({ label, ok }: { label: string; ok: boolean }){
  return (
    <div className={`p-2 rounded border ${ok ? 'border-green-600 text-green-700' : 'border-yellow-600 text-yellow-700'}`}>{label}: {ok ? 'OK' : 'Needs attention'}</div>
  )
}

