"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

export default function ApprovalDetailPage(){
  const params = useParams() as { id?: string }
  const id = Number(params?.id || 0)
  const [details, setDetails] = useState<any|null>(null)
  useEffect(()=>{ (async()=>{ try { if (id) setDetails(await apiClient.getJournalEntryDetails(id)) } catch {} })() }, [id])
  const approve = async ()=>{ try { await apiClient.accountingApproveJE(id); toast.success('Approval recorded'); setDetails(await apiClient.getJournalEntryDetails(id)) } catch (e:any){ toast.error(e?.response?.data?.detail || 'Approve failed') } }
  if (!id) return <div className="p-6">Invalid id</div>
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">JE #{id}</h1>
        <Button variant="primary" onClick={approve}>Approve</Button>
      </div>
      {!details ? (<div className="text-sm text-muted-foreground">Loading…</div>) : (
        <div className="space-y-2">
          <div className="text-sm">Entry Number: {details.entry_number}</div>
          <div className="text-sm">Entity: {details.entity_id}</div>
          <div className="text-sm">Date: {details.entry_date}</div>
          <div className="text-sm">Description: {details.description}</div>
          <div className="mt-2 text-sm font-medium">Lines</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
            {details.lines?.map((ln:any)=> (
              <div key={ln.id} className="flex items-center justify-between"><span>{ln.account_code} • {ln.account_name}</span><span className="tabular-nums">D {Number(ln.debit_amount||0).toLocaleString()} / C {Number(ln.credit_amount||0).toLocaleString()}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

