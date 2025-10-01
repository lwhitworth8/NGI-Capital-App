"use client"

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context/AppContext'
import { Button } from '@/components/ui/Button'
import EntitySelectorInline from '@/components/finance/EntitySelectorInline'
import {
  invGetKpis, invGetPipeline, invUpsertPipeline, invPatchPipeline,
  invCreateInvestor, invGetReports, invCreateReport, invPatchReport,
  invListRounds, invCreateRound, invListContribs, invAddContrib, invListInvestors, invLinkInvestor, invSearchInvestors, invGetRaiseCosts
} from '@/lib/investors/api'
import { toast } from 'sonner'

export default function InvestorManagementPage() {
  const { state } = useApp()
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
  const entityName = state.currentEntity?.legal_name || ''

  const [kpis, setKpis] = useState<any | null>(null)
  const [pipeline, setPipeline] = useState<any[]>([])
  const [reports, setReports] = useState<any>({ current: null, past: [] })
  const [rounds, setRounds] = useState<any[]>([])
  const [selectedRoundId, setSelectedRoundId] = useState<string>('')
  const [contribs, setContribs] = useState<any[]>([])
  const [consolidated, setConsolidated] = useState(false)

  // Forms
  const [newInvestor, setNewInvestor] = useState({ legal_name: '', firm: '', email: '', type: 'Other' })
  const [newReport, setNewReport] = useState({ period: '', type: 'Quarterly', dueDate: '' })
  const [newRound, setNewRound] = useState({ roundType: 'Pre-Seed', targetAmount: 0, closeDate: '', description: '' })
  const [newContrib, setNewContrib] = useState({ investorId: '', amount: 0, status: 'Soft' })
  // Pipeline filters like Notion toolbar
  const [q, setQ] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('') // '', 'Won', 'Lost', 'in_progress'
  const [sort, setSort] = useState<string>('name')
  const [inlineStage, setInlineStage] = useState<string>('')
  const [inlineQuery, setInlineQuery] = useState('')
  const [inlineResults, setInlineResults] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      if (!entityId) return
      try {
        setKpis(await invGetKpis(entityId))
        setPipeline(await invGetPipeline(entityId))
        setReports(await invGetReports(entityId))
        const r = await invListRounds(consolidated ? undefined : entityId, consolidated)
        setRounds(r)
        if (r[0]?.id) {
          setSelectedRoundId(r[0].id)
          setContribs(await invListContribs(r[0].id))
        } else {
          setSelectedRoundId(''); setContribs([])
        }
      } catch (err: any) {
        try { toast.error(err?.response?.data?.detail || err?.message || 'Failed to load investor data') } catch {}
      }
    }
    load()
  }, [entityId, consolidated, q, stageFilter, sort])

  const refreshRounds = async () => {
    const r = await invListRounds(consolidated ? undefined : entityId, consolidated)
    setRounds(r)
    if (selectedRoundId) setContribs(await invListContribs(selectedRoundId))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Investor Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{entityName}</p>
        </div>
        <EntitySelectorInline />
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Total Investors" value={kpis?.total ?? 0} />
        <Kpi label="In Pipeline" value={kpis?.inPipeline ?? 0} />
        <Kpi label="Won" value={kpis?.won ?? 0} />
        <Kpi label="Active (30d)" value={kpis?.activeThis30d ?? 0} />
        <Kpi label="Avg Days Since Last" value={kpis?.lastContactAvgDays ?? 0} />
      </div>

      {/* Reporting */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
          <h2 className="font-semibold mb-3">Current Report</h2>
          {reports.current ? (
            <div className="space-y-2 text-sm">
              <div>Period: {reports.current.period}</div>
              <div>Status: {reports.current.status}</div>
              <div>Due: {reports.current.dueDate || '-'}</div>
              <div className="flex gap-2 mt-2">
                <Button variant="secondary" size="sm" onClick={async ()=>{ await invPatchReport(reports.current.id, { status: 'Ready' }); setReports(await invGetReports(entityId)) }}>Mark Ready</Button>
                <Button variant="primary" size="sm" onClick={async ()=>{ await invPatchReport(reports.current.id, { status: 'Submitted', submittedAt: new Date().toISOString() }); setReports(await invGetReports(entityId)) }}>Mark Submitted</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">No current report. Start one:</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input className="px-3 py-2 border rounded bg-background" placeholder="Period (e.g., 2025Q2)" value={newReport.period || currentQuarter()} onChange={e=>setNewReport({ ...newReport, period: e.target.value })} />
                <select className="px-3 py-2 border rounded bg-background" value={newReport.type} onChange={e=>setNewReport({ ...newReport, type: e.target.value })}>
                  <option>Quarterly</option>
                  <option>Monthly</option>
                  <option>Ad Hoc</option>
                </select>
                <input type="date" className="px-3 py-2 border rounded bg-background" value={newReport.dueDate} onChange={e=>setNewReport({ ...newReport, dueDate: e.target.value })} />
                <Button variant="primary" size="md" onClick={async ()=>{ await invCreateReport({ entityId, period: newReport.period || currentQuarter(), type: newReport.type || 'Quarterly', dueDate: newReport.dueDate }); setNewReport({ period: '', type: 'Quarterly', dueDate: '' }); setReports(await invGetReports(entityId)) }}>Start Report</Button>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold mb-3">Past Reports</h2>
          <div className="space-y-2 max-h-64 overflow-auto">
            {reports.past?.map((r:any)=> (
              <div key={r.id} className="border rounded p-2 text-sm flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.period} - {r.type}</div>
                  <div className="text-xs text-muted-foreground">{r.status} - {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '-'}</div>
                </div>
                {r.currentDocUrl && <a href={r.currentDocUrl} className="text-blue-600 text-xs hover:underline" target="_blank">Download</a>}
              </div>
            ))}
            {(!reports.past || reports.past.length===0) && <p className="text-sm text-muted-foreground">No past reports.</p>}
          </div>
        </div>
      </div>

      {/* Pipeline (Kanban - click to move stage) */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Investor Fundraising</h2>
          <div className="text-xs text-muted-foreground">Use "+ New investor" in any column (press N)</div>
        </div>
        <div className="flex items-center justify-between mb-2 text-sm">
          <div className="flex gap-2 items-center">
            <button className={`px-2 py-1 rounded border ${stageFilter===''?'bg-primary text-primary-foreground':''}`} onClick={()=>setStageFilter('')}>All Investors</button>
            <button className={`px-2 py-1 rounded border ${stageFilter==='in_progress'?'bg-primary text-primary-foreground':''}`} onClick={()=>setStageFilter('in_progress')}>In Progress</button>
            <button className={`px-2 py-1 rounded border ${stageFilter==='Won'?'bg-primary text-primary-foreground':''}`} onClick={()=>setStageFilter('Won')}>Won</button>
            <button className={`px-2 py-1 rounded border ${stageFilter==='Lost'?'bg-primary text-primary-foreground':''}`} onClick={()=>setStageFilter('Lost')}>Lost</button>
          </div>
          <div className="flex gap-2 items-center">
            <input className="px-2 py-1 border rounded bg-background" placeholder="Search" value={q} onChange={e=>setQ(e.target.value)} />
            <select className="px-2 py-1 border rounded bg-background" value={sort} onChange={e=>setSort(e.target.value)}>
              <option value="name">Sort: Name</option>
              <option value="lastActivity">Sort: Last Activity</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {pipeline.map((col: any) => (
            <div key={col.stage} className="bg-muted/30 rounded-lg p-3 min-h-[200px]"
                 onDragOver={(e)=>e.preventDefault()}
                 onDrop={async (e)=>{
                   const pid = e.dataTransfer.getData('text/pid');
                   if (!pid) return;
                   // optimistic move
                   setPipeline(prev => prev.map((c:any)=> ({...c, items: c.items.filter((x:any)=>x.pipelineId!==pid)})))
                   setPipeline(prev => prev.map((c:any)=> c.stage===col.stage ? ({...c, items: [...c.items, (window as any).__dragItem]}) : c))
                   try { await invPatchPipeline(pid, { stage: col.stage }); }
                   catch { /* on error we can reload */ setPipeline(await invGetPipeline(entityId)) }
                 }}>
              <div className="text-xs text-muted-foreground mb-2 uppercase flex items-center justify-between"
                   tabIndex={0}
                   onKeyDown={(e)=>{
                     if ((e.key==='n' || e.key==='N')) { setInlineStage(col.stage); setInlineQuery(''); setInlineResults([]) }
                   }}>
                <span>{col.stage}</span>
                <span className="text-[10px]">{col.items.length}</span>
              </div>
              {/* Inline new investor row */}
              <div className="mb-2">
                {inlineStage===col.stage ? (
                  <div className="border rounded p-2 bg-card">
                    <input autoFocus className="w-full mb-2 px-2 py-1 border rounded bg-background" placeholder="Search investors..." value={inlineQuery}
                      onChange={async (e)=>{ setInlineQuery(e.target.value); setInlineResults(await invSearchInvestors({ q: e.target.value, entityId })) }}
                      onKeyDown={(e)=>{ if(e.key==='Escape'){ setInlineStage(''); setInlineQuery(''); setInlineResults([]) } }} />
                    <div className="max-h-40 overflow-auto">
                      {inlineResults.map((r:any)=> (
                        <button key={r.id} className="block w-full text-left text-sm px-2 py-1 hover:bg-muted rounded"
                          onClick={async ()=>{
                            // optimistic add
                            const temp = { pipelineId: `tmp-${Date.now()}`, investor: { id:r.id, name:r.legal_name, firm:r.firm, email:r.email }, ownerUserId: undefined, lastActivityAt: undefined }
                            setPipeline(prev => prev.map((c:any)=> c.stage===col.stage ? ({...c, items:[temp,...c.items]}) : c))
                            try {
                              await invLinkInvestor({ entityId, investorId: r.id, stage: col.stage })
                              toast.success('Investor linked')
                            } catch (err:any){
                              toast.error(err?.message || 'Failed to link investor')
                            }
                            setInlineStage(''); setInlineQuery(''); setInlineResults([])
                            setPipeline(await invGetPipeline(entityId))
                          }}>
                          {r.legal_name} {r.firm ? `- ${r.firm}` : ''}
                        </button>
                      ))}
                      {inlineResults.length===0 && inlineQuery && (
                        <div className="text-xs text-muted-foreground px-2 py-1">No matches</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <button className="block w-full text-left text-xs text-blue-600" onClick={()=>{ setInlineStage(col.stage); setInlineQuery(''); setInlineResults([]) }}>+ New investor (N)</button>
                )}
              </div>
              {col.items.map((it:any)=> (
                <div key={it.pipelineId} className="bg-card border border-border rounded p-2 mb-2 text-sm"
                     draggable
                     onDragStart={(e)=>{ (window as any).__dragItem = it; e.dataTransfer.setData('text/pid', it.pipelineId) }}>
                  <div className="font-medium">{it.investor.name} - {it.investor.firm || '-'}</div>
                  <div className="text-xs text-muted-foreground">{it.investor.email || '-'}</div>
                  <div className="flex gap-1 mt-2">
                    {['Not Started','Diligence','Pitched','Won','Lost'].map(s=> (
                      <button key={s} className="px-2 py-0.5 text-xs rounded border" onClick={async ()=>{ await invPatchPipeline(it.pipelineId, { stage: s }); setPipeline(await invGetPipeline(entityId)) }}>{s.split(' ')[0]}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Capital Raise Goals Overview (Pie) */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Capital Raise Goals</h2>
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={consolidated} onChange={e=>setConsolidated(e.target.checked)} /> Consolidated (NGI Capital)</label>
        </div>
        <GoalsPie entityId={entityId} consolidated={consolidated} />
      </div>

      {/* Capital Raise Goals */}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: number }) {
  const [time, setTime] = useState<string>("")
  useEffect(() => {
    // Client-only to avoid hydration mismatch from server time/zone
    setTime(new Date().toLocaleTimeString())
  }, [])
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{Number(value || 0).toLocaleString()}</div>
      <div className="text-[10px] text-muted-foreground mt-1">as of {time || '-'}</div>
    </div>
  )
}

function GoalsPie({ entityId, consolidated }: { entityId: number; consolidated: boolean }) {
  const [data, setData] = useState<{ label: string; value: number }[]>([])
  useEffect(() => {
    (async ()=>{
      try {
        const r = await invGetRaiseCosts(consolidated ? undefined : entityId, consolidated)
        setData(r.segments || [])
      } catch {}
    })()
  }, [entityId, consolidated])
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground">No cost data.</p>
  const total = data.reduce((a,b)=>a+(b.value||0),0)
  const colors = ['#2563eb','#16a34a','#f59e0b','#ef4444','#7c3aed','#0ea5e9','#22c55e','#f43f5e']
  let acc = 0
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <svg width="200" height="200" viewBox="0 0 32 32" role="img" aria-label="Capital distribution">
          {data.map((s, idx) => {
            const frac = total>0 ? (s.value/total) : 0
            const dash = `${frac*100} ${100 - frac*100}`
            const r = 15.9
            const el = <circle key={idx} r={r} cx="16" cy="16" fill="transparent" strokeWidth="3.2" stroke={colors[idx%colors.length]} strokeDasharray={dash} strokeDashoffset={-acc*100}></circle>
            acc += frac
            return el
          })}
        </svg>
      </div>
      <div className="space-y-1 text-sm">
        {data.map((s, idx)=> (
          <div key={idx} className="flex items-center justify-between">
            <span className="truncate mr-2">{s.label}</span>
            <span className="tabular-nums">{total>0 ? ((s.value/total)*100).toFixed(1) : '0.0'}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function currentQuarter() {
  const d = new Date()
  const q = Math.floor(d.getMonth()/3) + 1
  return `${d.getFullYear()}Q${q}`
}

function daysToFyEnd() {
  const fy = (process.env.NEXT_PUBLIC_FISCAL_YEAR_END || '12-31')
  const [mm, dd] = fy.split('-').map(x=>parseInt(x,10))
  const now = new Date()
  let end = new Date(now.getFullYear(), (mm-1), dd)
  if (end < now) end = new Date(now.getFullYear()+1, (mm-1), dd)
  return Math.max(0, Math.ceil((end.getTime() - now.getTime())/86400000))
}
