'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api'
import { TaxEntity, TaxObligation, TaxCalendarItem, TaxFiling, TaxDocument } from '@/lib/tax/schemas'
import { useApp } from '@/lib/context/AppContext'

type Tab = 'overview'|'federal'|'delaware'|'california'|'documents'|'calendar'|'admin'

export default function TaxDashboardPage() {
  const { state, setCurrentEntity } = useApp()
  const [entities, setEntities] = useState<any[]>([])
  const [defaultId, setDefaultId] = useState<string|number|undefined>()
  const [entityId, setEntityId] = useState<string|number|undefined>()
  const [tab, setTab] = useState<Tab>('overview')
  const [profile, setProfile] = useState<any>(null)
  const [obligations, setObligations] = useState<any[]>([])
  const [calendar, setCalendar] = useState<any[]>([])
  const [filings, setFilings] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const ent = await apiClient.taxGetEntities()
        if (!mounted) return
        setEntities(ent.items || [])
        setDefaultId(ent.defaultId)
        // prefer global current entity if available
        const globalId = state.currentEntity?.id
        setEntityId(globalId || ent.defaultId || ent.items?.[0]?.id)
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [state.currentEntity?.id])

  useEffect(() => {
    if (!entityId) return
    let mounted = true
    ;(async () => {
      try {
        const [p, obs, cal, fl] = await Promise.all([
          apiClient.taxGetProfile(entityId),
          apiClient.taxGetObligations(entityId),
          apiClient.taxGetCalendar(entityId),
          apiClient.taxGetFilings(entityId),
        ])
        if (!mounted) return
        setProfile(p)
        setObligations(obs)
        setCalendar(cal)
        setFilings(fl)
        const y = new Date().getUTCFullYear()
        setDocs(await apiClient.taxGetDocuments(entityId, y))
      } catch {
        // noop
      }
    })()
    return () => { mounted = false }
  }, [entityId])

  const currentEntity = useMemo(() => (entities || []).find(e => e.id == entityId), [entities, entityId])

  const banner = useMemo(() => {
    const cd = profile?.entity?.conversionDate
    if (!cd) return null
    return (
      <div className="rounded-md bg-blue-50 border border-blue-200 text-blue-800 p-3 text-sm" role="alert">
        Conversion: {cd}. Switch to post-conversion entity for C?Corp obligations.
      </div>
    )
  }, [profile])

  const Tabs = (
    <div className="mt-4 border-b border-border">
      {(['overview','federal','delaware','california','documents','calendar','admin'] as Tab[]).map(t => (
        <button key={t} onClick={()=>setTab(t)} className={`mr-4 pb-2 text-sm ${tab===t?'border-b-2 border-blue-600 text-foreground':'text-muted-foreground'}`} aria-current={tab===t}>
          {t.charAt(0).toUpperCase()+t.slice(1)}
        </button>
      ))}
    </div>
  )

  const EntitySelector = (
    <select className="border rounded px-2 py-1" aria-label="Select entity" value={String(entityId||'')} onChange={e=>{ setEntityId(e.target.value); const found=(entities||[]).find((x:any)=>String(x.id)===String(e.target.value)); if(found){ setCurrentEntity({ id: found.id.toString(), legal_name: found.legalName, entity_type: found.entityType, ein:'', formation_date:'', state: found.domicile||'' } as any) } }}>
      {(entities||[]).map((e:any)=>(<option key={e.id} value={e.id}>{e.legalName}</option>))}
    </select>
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Tax</h1>
        {EntitySelector}
      </div>
      {banner}
      {Tabs}

      {tab==='overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <div className="ngi-card-elevated p-4">
              <h2 className="font-semibold mb-2">Snapshot</h2>
              <div className="text-sm text-muted-foreground">
                <div>Type: <span className="text-foreground">{profile?.entity?.entityType || '-'}</span></div>
                <div>Election: <span className="text-foreground">{profile?.entity?.taxElection || '-'}</span></div>
                <div>Identifiers: <span className="text-foreground">DE {profile?.entity?.identifiers?.deFile || '-'} | CA {profile?.entity?.identifiers?.caSOS || '-'}</span></div>
              </div>
            </div>

            <div className="ngi-card-elevated p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">Upcoming Filings (next 90 days)</h2>
                <button className="text-sm px-2 py-1 border rounded" onClick={async()=>{ await apiClient.taxRefreshCalendar(entityId!); const cal=await apiClient.taxGetCalendar(entityId!); setCalendar(cal) }}>Regenerate Calendar</button>
              </div>
              <ul className="text-sm">
                {(calendar||[]).slice(0,6).map((c:any)=>(
                  <li key={c.id} className="flex items-center justify-between py-1">
                    <span>{c.jurisdiction} {c.form}</span>
                    <span className="tabular-nums text-muted-foreground">{c.dueDate}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <div className="ngi-card-elevated p-4">
              <h2 className="font-semibold mb-2">Quick Calculators</h2>
              <div className="space-y-2">
                <button className="text-sm px-3 py-1 border rounded" onClick={async()=>{ const r=await apiClient.taxCalcDEFranchise({ entityId: entityId!, method:'authorized', inputs:{} }); alert(`DE Franchise (Authorized): $${r.amount}`) }}>DE Franchise - Authorized</button>
                <button className="text-sm px-3 py-1 border rounded" onClick={async()=>{ const r=await apiClient.taxCalcDEFranchise({ entityId: entityId!, method:'assumed', inputs:{ issuedShares: 1000000, assetValue: 500000 } }); alert(`DE Franchise (Assumed): $${r.amount}`) }}>DE Franchise - Assumed Par</button>
                <button className="text-sm px-3 py-1 border rounded" onClick={async()=>{ const r=await apiClient.taxCalcCaLlcFee({ entityId: entityId!, year: new Date().getUTCFullYear(), revenue: { total: 800000 } }); alert(`CA LLC Fee: $${r.amount}`) }}>CA LLC Fee</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab==='federal' && (
        <JurisdictionView entityId={entityId!} jurisdiction="FED" filings={filings} onCreate={setFilings} />
      )}

      {tab==='delaware' && (
        <DelawareView entityId={entityId!} obligations={obligations} filings={filings} />
      )}

      {tab==='california' && (
        <CaliforniaView entityId={entityId!} profile={profile} filings={filings} />
      )}

      {tab==='documents' && (
        <div className="ngi-card-elevated p-4">
          <h2 className="font-semibold mb-2">Documents (Current Year)</h2>
          <div className="flex items-center gap-2 mb-3">
            <input id="docTitle" className="border rounded px-2 py-1" placeholder="Title" />
            <input id="docUrl" className="border rounded px-2 py-1 flex-1" placeholder="File URL (PDF)" />
            <button className="text-sm px-2 py-1 border rounded" onClick={async()=>{
              const title=(document.getElementById('docTitle') as HTMLInputElement)?.value
              const fileUrl=(document.getElementById('docUrl') as HTMLInputElement)?.value
              const y=new Date().getUTCFullYear()
              if(!title||!fileUrl||!entityId) return
              await apiClient.taxAddDocument({ entityId, year:y, jurisdiction:'MIXED', form:'', title, fileUrl })
              setDocs(await apiClient.taxGetDocuments(entityId, y))
            }}>Add</button>
          </div>
          <ul className="text-sm list-disc pl-5">
            {(docs||[]).map((d:any)=>(<li key={d.id}><a className="text-blue-600 hover:underline" href={d.fileUrl} target="_blank" rel="noreferrer">{d.title}</a> - {d.jurisdiction} {d.form} ({d.year})</li>))}
          </ul>
        </div>
      )}

      {tab==='calendar' && (
        <div className="ngi-card-elevated p-4">
          <h2 className="font-semibold mb-2">Calendar</h2>
          <ul className="text-sm">
            {(calendar||[]).map((c:any)=>(<li key={c.id} className="flex items-center justify-between py-1"><span>{c.jurisdiction} {c.form}</span><span className="tabular-nums text-muted-foreground">{c.dueDate}</span></li>))}
          </ul>
        </div>
      )}

      {tab==='admin' && (
        <AdminConfig />
      )}
    </div>
  )
}

function JurisdictionView({ entityId, jurisdiction, filings, onCreate }: { entityId: string|number; jurisdiction: string; filings: any[]; onCreate: (f:any[])=>void }) {
  const [ps, setPs] = useState('2025-01-01')
  const [pe, setPe] = useState('2025-12-31')
  const [form, setForm] = useState(jurisdiction==='FED'?'1120':'')
  const filtered = (filings||[]).filter((f:any)=>f.jurisdiction===jurisdiction)
  return (
    <div className="ngi-card-elevated p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{jurisdiction} Filings</h2>
        <div className="flex items-center gap-2" aria-label="Create filing">
          <input className="border rounded px-2 py-1 w-28" value={ps} onChange={e=>setPs(e.target.value)} aria-label="Period start" />
          <input className="border rounded px-2 py-1 w-28" value={pe} onChange={e=>setPe(e.target.value)} aria-label="Period end" />
          <input className="border rounded px-2 py-1 w-24" value={form} onChange={e=>setForm(e.target.value)} aria-label="Form" />
          <button className="text-sm px-2 py-1 border rounded" onClick={async()=>{
            await apiClient.taxUpsertFiling({ entityId, jurisdiction, form, periodStart:ps, periodEnd:pe })
            const fl=await apiClient.taxGetFilings(entityId); onCreate(fl)
          }}>Add Filing</button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-muted-foreground"><th>Form</th><th>Period</th><th>Due</th><th>Status</th><th>Amount</th><th>Actions</th></tr></thead>
        <tbody>
          {filtered.map((f:any)=>(
            <tr key={f.id} className="border-t border-border">
              <td>{f.form}</td>
              <td className="tabular-nums">{f.periodStart} - {f.periodEnd}</td>
              <td className="tabular-nums">{f.dueDate||'-'}</td>
              <td>{f.status}</td>
              <td className="tabular-nums">{typeof f.amount==='number'?`$${f.amount.toFixed(2)}`:'-'}</td>
              <td>
                <button className="text-xs px-2 py-1 border rounded" onClick={async()=>{ await apiClient.taxPatchFiling(f.id, { status:'FILED', filedDate:new Date().toISOString().slice(0,10) }); const fl=await apiClient.taxGetFilings(entityId); onCreate(fl) }}>Mark Filed</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DelawareView({ entityId, obligations, filings }: { entityId: string|number; obligations: any[]; filings: any[] }) {
  const obs = (obligations||[]).filter((o:any)=>o.jurisdiction==='DE')
  return (
    <div className="space-y-4">
      <div className="ngi-card-elevated p-4">
        <h2 className="font-semibold mb-2">Franchise Tax Calculator</h2>
        <div className="flex gap-2">
          <button className="text-sm px-2 py-1 border rounded" onClick={async()=>{ const r=await apiClient.taxCalcDEFranchise({ entityId, method:'authorized', inputs:{} }); alert(`Authorized Shares Method: $${r.amount}`) }}>Authorized Shares</button>
          <button className="text-sm px-2 py-1 border rounded" onClick={async()=>{ const r=await apiClient.taxCalcDEFranchise({ entityId, method:'assumed', inputs:{ issuedShares: 1000000, assetValue: 500000 } }); alert(`Assumed Par Value: $${r.amount}`) }}>Assumed Par</button>
        </div>
      </div>
      <JurisdictionView entityId={entityId} jurisdiction="DE" filings={filings} onCreate={()=>{}} />
    </div>
  )
}

function CaliforniaView({ entityId, profile, filings }: { entityId: string|number; profile: any; filings: any[] }) {
  const isCA = (() => {
    const ops = profile?.entity?.operatingStates
    if (Array.isArray(ops)) return ops.includes('CA')
    if (typeof ops==='string') return ops.toUpperCase()==='CA'
    return false
  })()
  return (
    <div className="space-y-4">
      {!isCA && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 text-sm" role="alert">Not registered or operating in California. Read-only guidance.</div>
      )}
      <div className="ngi-card-elevated p-4">
        <h2 className="font-semibold mb-2">LLC Minimum + Gross Receipts Fee</h2>
        <button className="text-sm px-2 py-1 border rounded" onClick={async()=>{ const r=await apiClient.taxCalcCaLlcFee({ entityId, year: new Date().getUTCFullYear(), revenue: { total: 800000 } }); alert(`CA LLC Fee Tier ${r.tier}: $${r.amount}`) }}>Estimate Fee</button>
      </div>
      <JurisdictionView entityId={entityId} jurisdiction="CA" filings={filings} onCreate={()=>{}} />
    </div>
  )
}

function AdminConfig() {
  const [versions, setVersions] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [vid, setVid] = useState<string>('')
  const [key, setKey] = useState('')
  const [val, setVal] = useState('{}')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    ;(async () => {
      const vs = await apiClient.taxListConfigVersions()
      setVersions(vs)
      const first = vs?.[0]?.id
      if (first) {
        setVid(first)
        setItems(await apiClient.taxListConfigItems(first))
      }
    })()
  }, [])

  const loadItems = async (v: string) => {
    setItems(await apiClient.taxListConfigItems(v))
  }

  return (
    <div className="ngi-card-elevated p-4 space-y-4">
      <h2 className="font-semibold">Admin: Tax Config</h2>
      <div className="flex items-center gap-2">
        <select className="border rounded px-2 py-1" value={vid} onChange={async e=>{ setVid(e.target.value); await loadItems(e.target.value) }}>
          {versions.map(v => (<option key={v.id} value={v.id}>{v.id}</option>))}
        </select>
        <input className="border rounded px-2 py-1" placeholder="New version notes" value={notes} onChange={e=>setNotes(e.target.value)} />
        <button className="text-sm px-2 py-1 border rounded" onClick={async()=>{ const r=await apiClient.taxCreateConfigVersion(notes); const vs=await apiClient.taxListConfigVersions(); setVersions(vs); setVid(r.id); setItems([]) }}>Create Version</button>
      </div>
      <div className="flex items-center gap-2">
        <input className="border rounded px-2 py-1 w-64" placeholder="key (e.g., DE_FRANCHISE_AUTH_TABLE)" value={key} onChange={e=>setKey(e.target.value)} />
        <input className="border rounded px-2 py-1 flex-1" placeholder="JSON value" value={val} onChange={e=>setVal(e.target.value)} />
        <button className="text-sm px-2 py-1 border rounded" onClick={async()=>{ try { const parsed = JSON.parse(val || '{}'); await apiClient.taxUpsertConfigItem({ versionId: vid, key, value: parsed }); setItems(await apiClient.taxListConfigItems(vid)); } catch { alert('Invalid JSON') } }}>Upsert</button>
      </div>
      <div>
        <h3 className="font-medium mb-1">Items</h3>
        <ul className="text-sm list-disc pl-5">
          {items.map((it:any)=>(<li key={it.id}><span className="font-mono text-xs">{it.key}</span> = <span className="font-mono text-xs">{JSON.stringify(it.value)}</span></li>))}
        </ul>
      </div>
    </div>
  )
}
