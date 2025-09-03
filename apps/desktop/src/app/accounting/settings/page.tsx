"use client"

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api'
import EntitySelectorInline from '@/components/finance/EntitySelectorInline'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

export default function AccountingSettingsPage() {
  const [entities, setEntities] = useState<any[]>([])
  const [src, setSrc] = useState<string>('')
  const [tgt, setTgt] = useState<string>('')
  const [effective, setEffective] = useState<string>('')
  const [par, setPar] = useState<number>(0.0001)
  const [shares, setShares] = useState<number>(10_000_000)
  const [preview, setPreview] = useState<any | null>(null)

  useEffect(() => { (async ()=>{ try { setEntities(await apiClient.getEntities()) } catch {} })() }, [])
  const srcId = useMemo(()=> Number(entities.find(e=> e.legal_name?.toLowerCase().includes('llc'))?.id || 0), [entities])
  const tgtId = useMemo(()=> Number(entities.find(e=> e.legal_name?.toLowerCase().includes('inc'))?.id || 0), [entities])
  useEffect(()=>{ if (srcId) setSrc(String(srcId)); if (tgtId) setTgt(String(tgtId)) }, [srcId, tgtId])

  const onPreview = async () => {
    try {
      const res = await apiClient.accountingConversionPreview({ effective_date: effective, source_entity_id: Number(src), target_entity_id: Number(tgt), par_value: par, total_shares: shares })
      setPreview(res)
    } catch (e:any) {
      toast.error(e?.response?.data?.detail || 'Preview failed')
    }
  }
  const onExecute = async () => {
    try {
      await apiClient.accountingConversionExecute({ effective_date: effective, source_entity_id: Number(src), target_entity_id: Number(tgt), par_value: par, total_shares: shares })
      toast.success('Conversion executed and locked')
    } catch (e:any) {
      toast.error(e?.response?.data?.detail || 'Execute failed')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Accounting Settings</h1>
          <p className="text-sm text-muted-foreground">Entity Conversion Wizard</p>
        </div>
        <EntitySelectorInline />
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">Effective Date</span>
            <input type="date" className="w-full px-2 py-1 border rounded bg-background" value={effective} onChange={e=>setEffective(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">Source (LLC)</span>
            <select className="w-full px-2 py-1 border rounded bg-background" value={src} onChange={e=>setSrc(e.target.value)}>
              {entities.map(e=> (<option key={e.id} value={e.id}>{e.legal_name}</option>))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">Target (C-Corp)</span>
            <select className="w-full px-2 py-1 border rounded bg-background" value={tgt} onChange={e=>setTgt(e.target.value)}>
              {entities.map(e=> (<option key={e.id} value={e.id}>{e.legal_name}</option>))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">Par Value</span>
            <input className="w-full px-2 py-1 border rounded bg-background" value={par} onChange={e=>setPar(Number(e.target.value || 0))} />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">Total Shares</span>
            <input className="w-full px-2 py-1 border rounded bg-background" value={shares} onChange={e=>setShares(Number(e.target.value || 0))} />
          </label>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onPreview}>Preview</Button>
          <Button variant="primary" onClick={onExecute} disabled={!preview}>Execute Conversion</Button>
        </div>
        {preview && (
          <div className="text-sm text-muted-foreground">Equity Total: ${Number(preview.equity_total||0).toLocaleString()} • Common: ${Number(preview.common_stock||0).toLocaleString()} • APIC: ${Number(preview.apic||0).toLocaleString()}</div>
        )}
      </div>
    </div>
  )
}

