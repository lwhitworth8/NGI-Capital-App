"use client"

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { useApp } from '@/lib/context/AppContext'

export default function ApprovalsPage(){
  const { state } = useApp()
  const [items, setItems] = useState<any[]>([])
  const [detailsId, setDetailsId] = useState<number|undefined>(undefined)
  const [details, setDetails] = useState<any|null>(null)
  const load = async ()=>{ try { setItems(await apiClient.accountingApprovalsPending()) } catch {} }
  useEffect(()=>{ load() }, [])
  const approve = async (id: number)=>{ try { await apiClient.accountingApproveJE(id); toast.success('Approval recorded'); await load(); if (detailsId===id) { try { setDetails(await apiClient.getJournalEntryDetails(id)) } catch {} } } catch (e:any){ toast.error(e?.response?.data?.detail || 'Approve failed') } }
  const view = async (id: number)=>{ setDetailsId(id); try { setDetails(await apiClient.getJournalEntryDetails(id)) } catch {} }
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Approvals Queue</h1>
        <Button variant="secondary" onClick={load}>Refresh</Button>
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
