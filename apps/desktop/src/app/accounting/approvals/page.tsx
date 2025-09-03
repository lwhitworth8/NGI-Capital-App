"use client"

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { useApp } from '@/lib/context/AppContext'
import EntitySelectorInline from '@/components/finance/EntitySelectorInline'

export default function ApprovalsPage(){
  const { state } = useApp()
  const [items, setItems] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [entityId, setEntityId] = useState<number|undefined>(undefined)
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [month, setMonth] = useState<number>(new Date().getMonth()+1)
  const [detailsId, setDetailsId] = useState<number|undefined>(undefined)
  const [details, setDetails] = useState<any|null>(null)
  const load = async ()=>{ try { setItems(await apiClient.request('GET','/accounting/approvals/pending', undefined, { params: { entity_id: entityId, year, month } })) } catch {} }
  useEffect(()=>{ (async()=>{ try { setEntities(await apiClient.getEntities()) } catch {} })() }, [])
  useEffect(()=>{ load() }, [entityId, year, month])
  const approve = async (id: number)=>{ try { await apiClient.accountingApproveJE(id); toast.success('Approval recorded'); await load(); if (detailsId===id) { try { setDetails(await apiClient.getJournalEntryDetails(id)) } catch {} } } catch (e:any){ toast.error(e?.response?.data?.detail || 'Approve failed') } }
  const view = async (id: number)=>{ setDetailsId(id); try { setDetails(await apiClient.getJournalEntryDetails(id)) } catch {} }
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Approvals Queue</h1>
          <div className="flex items-center gap-2 mt-2 text-sm">
            <label>Entity
              <select className="ml-2 px-2 py-1 border rounded bg-background" value={entityId ?? ''} onChange={e=>setEntityId(e.target.value? Number(e.target.value): undefined)}>
                <option value="">All</option>
                {entities.map(e=> (<option key={e.id} value={e.id}>{e.legal_name}</option>))}
              </select>
            </label>
            <label>Year<input className="ml-2 w-24 px-2 py-1 border rounded bg-background" value={year} onChange={e=>setYear(Number(e.target.value||0))} /></label>
            <label>Month<input className="ml-2 w-24 px-2 py-1 border rounded bg-background" value={month} onChange={e=>setMonth(Number(e.target.value||0))} /></label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={load}>Refresh</Button>
          <Button variant="secondary" onClick={async ()=>{ try { const blob = await apiClient.accountingExportClosePacket(entityId || 0, year, month); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`close_packet_${entityId||'all'}_${year}${String(month).padStart(2,'0')}.zip`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url) } catch (e:any){ toast.error(e?.response?.data?.detail || 'Download failed') } }}>Download Close Packet</Button>
        </div>
      </div>
      <div className="border rounded divide-y">
        {items.length===0 && (<div className="p-3 text-sm text-muted-foreground">No pending approvals</div>)}
        {items.map(it => (
          <div key={it.id} className="p-3 space-y-2">
            <div>
              <div className="font-medium">{it.entry_number} • Entity {it.entity_id}</div>
              <div className="text-xs text-muted-foreground">Required: {Array.isArray(it.required)? it.required.join(', ') : ''} • Approvals: {Array.isArray(it.approvals)? it.approvals.join(', '): ''}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={()=>view(it.id)}>View</Button>
              <Button variant="primary" onClick={()=>approve(it.id)} disabled={Array.isArray(it.approvals) && it.approvals.includes((state.user?.email||'').toLowerCase())}>Approve</Button>
            </div>
            {details && detailsId===it.id && (
              <div className="mt-2 p-2 border rounded text-sm">
                <div className="mb-1 font-medium">Journal Entry Lines</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {details.lines?.map((ln:any)=> (
                    <div key={ln.id} className="flex items-center justify-between"><span>{ln.account_code} • {ln.account_name}</span><span className="tabular-nums">D {Number(ln.debit_amount||0).toLocaleString()} / C {Number(ln.credit_amount||0).toLocaleString()}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
