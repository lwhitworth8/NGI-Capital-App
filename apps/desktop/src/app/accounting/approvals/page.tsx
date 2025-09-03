"use client"

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

export default function ApprovalsPage(){
  const [items, setItems] = useState<any[]>([])
  const load = async ()=>{ try { setItems(await apiClient.accountingApprovalsPending()) } catch {} }
  useEffect(()=>{ load() }, [])
  const approve = async (id: number)=>{ try { await apiClient.accountingApproveJE(id); toast.success('Approval recorded'); await load() } catch (e:any){ toast.error(e?.response?.data?.detail || 'Approve failed') } }
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Approvals Queue</h1>
        <Button variant="secondary" onClick={load}>Refresh</Button>
      </div>
      <div className="border rounded divide-y">
        {items.length===0 && (<div className="p-3 text-sm text-muted-foreground">No pending approvals</div>)}
        {items.map(it => (
          <div key={it.id} className="p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{it.entry_number} • Entity {it.entity_id}</div>
              <div className="text-xs text-muted-foreground">Required: {Array.isArray(it.required)? it.required.join(', ') : ''} • Approvals: {Array.isArray(it.approvals)? it.approvals.join(', '): ''}</div>
            </div>
            <Button variant="primary" onClick={()=>approve(it.id)}>Approve</Button>
          </div>
        ))}
      </div>
    </div>
  )
}

