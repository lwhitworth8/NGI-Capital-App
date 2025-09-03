"use client"

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'

export function ComplianceSummary(){
  const [approvals, setApprovals] = useState<number>(0)
  const [cleared, setCleared] = useState<{ name: string; pct: number }[]>([])
  useEffect(()=>{ (async()=>{
    try { const items = await apiClient.accountingApprovalsPending(); setApprovals(items?.length || 0) } catch {}
    try { const stats = await apiClient.bankingReconciliationStats(); setCleared((stats||[]).map((s:any)=> ({ name: s.account_name, pct: s.percent }))) } catch {}
  })() }, [])
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs text-muted-foreground">Pending Approvals</div>
        <div className="text-2xl font-semibold tabular-nums">{approvals}</div>
        <div className="text-[10px] text-muted-foreground mt-1">journal entries awaiting dual approval</div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs text-muted-foreground">Bank Cleared %</div>
        {cleared.length===0 ? (
          <div className="text-sm text-muted-foreground">No data</div>
        ) : (
          <div className="space-y-1 text-sm">
            {cleared.map((c,i)=> (
              <div key={i} className="flex items-center justify-between"><span className="truncate mr-2">{c.name}</span><span className="tabular-nums">{c.pct}%</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

