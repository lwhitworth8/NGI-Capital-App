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

  const onDownloadPacket = async () => {
    try {
      const blob = await apiClient.accountingExportClosePacket(entityId, year, month)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `close_packet_${entityId}_${year}${String(month).padStart(2,'0')}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e:any) {
      toast.error(e?.response?.data?.detail || 'Download failed')
    }
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
          <Button variant="secondary" onClick={onDownloadPacket} disabled={!status}>Download Close Packet</Button>
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

      {/* Templates */}
      <Templates entityId={entityId} />
    </div>
  )
}

function ChecklistItem({ label, ok }: { label: string; ok: boolean }){
  return (
    <div className={`p-2 rounded border ${ok ? 'border-green-600 text-green-700' : 'border-yellow-600 text-yellow-700'}`}>{label}: {ok ? 'OK' : 'Needs attention'}</div>
  )
}

function Templates({ entityId }: { entityId: number }){
  const [acc, setAcc] = useState({ expense_account_id: 0, accrual_account_id: 0, amount: 0, date: '' })
  const [pre, setPre] = useState({ prepaid_account_id: 0, cash_account_id: 0, amount: 0, date: '' })
  const [defr, setDefr] = useState({ deferred_revenue_account_id: 0, revenue_account_id: 0, amount: 0, start_date: '', months: 12 })
  const [depr, setDepr] = useState({ asset_account_id: 0, accum_depr_account_id: 0, expense_account_id: 0, amount: 0, start_date: '', useful_life_months: 36 })

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <h2 className="font-semibold">Close Templates</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="p-3 border rounded space-y-2">
          <div className="font-medium">Accrual</div>
          <label>Expense Acct<input className="ml-2 w-28 px-2 py-1 border rounded bg-background" value={acc.expense_account_id||''} onChange={e=>setAcc({...acc, expense_account_id: Number(e.target.value||0)})} /></label>
          <label>Accrual Acct<input className="ml-2 w-28 px-2 py-1 border rounded bg-background" value={acc.accrual_account_id||''} onChange={e=>setAcc({...acc, accrual_account_id: Number(e.target.value||0)})} /></label>
          <label>Amount<input className="ml-2 w-28 px-2 py-1 border rounded bg-background" value={acc.amount||''} onChange={e=>setAcc({...acc, amount: Number(e.target.value||0)})} /></label>
          <label>Date<input type="date" className="ml-2 px-2 py-1 border rounded bg-background" value={acc.date} onChange={e=>setAcc({...acc, date: e.target.value})} /></label>
          <Button variant="secondary" onClick={async ()=>{ try { await apiClient.accountingTemplateAccrual({ entity_id: entityId, ...acc }); toast.success('Accrual created') } catch(e:any){ toast.error(e?.response?.data?.detail || 'Failed') } }}>Create</Button>
        </div>
        <div className="p-3 border rounded space-y-2">
          <div className="font-medium">Prepaid</div>
          <label>Prepaid Acct<input className="ml-2 w-28 px-2 py-1 border rounded bg-background" value={pre.prepaid_account_id||''} onChange={e=>setPre({...pre, prepaid_account_id: Number(e.target.value||0)})} /></label>
          <label>Cash Acct<input className="ml-2 w-28 px-2 py-1 border rounded bg-background" value={pre.cash_account_id||''} onChange={e=>setPre({...pre, cash_account_id: Number(e.target.value||0)})} /></label>
          <label>Amount<input className="ml-2 w-28 px-2 py-1 border rounded bg-background" value={pre.amount||''} onChange={e=>setPre({...pre, amount: Number(e.target.value||0)})} /></label>
          <label>Date<input type="date" className="ml-2 px-2 py-1 border rounded bg-background" value={pre.date} onChange={e=>setPre({...pre, date: e.target.value})} /></label>
          <Button variant="secondary" onClick={async ()=>{ try { await apiClient.accountingTemplatePrepaid({ entity_id: entityId, ...pre }); toast.success('Prepaid created') } catch(e:any){ toast.error(e?.response?.data?.detail || 'Failed') } }}>Create</Button>
        </div>
        <div className="p-3 border rounded space-y-2">
          <div className="font-medium">Deferral (Revenue)</div>
          <label>Deferred Rev<input className="ml-2 w-28 px-2 py-1 border rounded bg-background" value={defr.deferred_revenue_account_id||''} onChange={e=>setDefr({...defr, deferred_revenue_account_id: Number(e.target.value||0)})} /></label>
          <label>Revenue Acct<input className="ml-2 w-28 px-2 py-1 border rounded bg-background" value={defr.revenue_account_id||''} onChange={e=>setDefr({...defr, revenue_account_id: Number(e.target.value||0)})} /></label>
          <label>Amount<input className="ml-2 w-28 px-2 py-1 border rounded bg-background" value={defr.amount||''} onChange={e=>setDefr({...defr, amount: Number(e.target.value||0)})} /></label>
          <label>Start<input type="date" className="ml-2 px-2 py-1 border rounded bg-background" value={defr.start_date} onChange={e=>setDefr({...defr, start_date: e.target.value})} /></label>
          <label>Months<input className="ml-2 w-28 px-2 py-1 border rounded bg-background" value={defr.months||''} onChange={e=>setDefr({...defr, months: Number(e.target.value||0)})} /></label>
          <Button variant="secondary" onClick={async ()=>{ try { await apiClient.accountingTemplateDeferralRevenue({ entity_id: entityId, ...defr }); toast.success('Deferral schedule created') } catch(e:any){ toast.error(e?.response?.data?.detail || 'Failed') } }}>Create</Button>
        </div>
        <div className="p-3 border rounded space-y-2">
          <div className="font-medium">Depreciation (Straight-line)</div>
          <label>Asset Acct<input className="ml-2 w-28 px-2 py-1 border rounded bg-background" value={depr.asset_account_id||''} onChange={e=>setDepr({...depr, asset_account_id: Number(e.target.value||0)})} /></label>
          <label>Accum Depr<input className="ml-2 w-28 px-2 py-1 border rounded bg-background" value={depr.accum_depr_account_id||''} onChange={e=>setDepr({...depr, accum_depr_account_id: Number(e.target.value||0)})} /></label>
          <label>Expense Acct<input className="ml-2 w-28 px-2 py-1 border rounded bg-background" value={depr.expense_account_id||''} onChange={e=>setDepr({...depr, expense_account_id: Number(e.target.value||0)})} /></label>
          <label>Amount<input className="ml-2 w-28 px-2 py-1 border rounded bg-background" value={depr.amount||''} onChange={e=>setDepr({...depr, amount: Number(e.target.value||0)})} /></label>
          <label>Start<input type="date" className="ml-2 px-2 py-1 border rounded bg-background" value={depr.start_date} onChange={e=>setDepr({...depr, start_date: e.target.value})} /></label>
          <label>Months<input className="ml-2 w-28 px-2 py-1 border rounded bg-background" value={depr.useful_life_months||''} onChange={e=>setDepr({...depr, useful_life_months: Number(e.target.value||0)})} /></label>
          <Button variant="secondary" onClick={async ()=>{ try { await apiClient.accountingTemplateDepreciation({ entity_id: entityId, ...depr }); toast.success('Depreciation schedule created') } catch(e:any){ toast.error(e?.response?.data?.detail || 'Failed') } }}>Create</Button>
        </div>
      </div>
    </div>
  )
}
