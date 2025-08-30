'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApp } from '@/lib/context/AppContext'
import { irGetCapTable, irListOutreach, irCreateOutreach, irListComms, irCreateComm, irSummary, irKpis, irSchedule, irMarkReportSent } from '@/lib/investorRelations'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts'

export default function InvestorRelationsPage() {
  const { state } = useApp()
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
  const qc = useQueryClient()

  const cap = useQuery({ queryKey: ['ir-cap', entityId], queryFn: () => irGetCapTable(entityId || undefined) })
  const outreach = useQuery({ queryKey: ['ir-outreach'], queryFn: () => irListOutreach() })
  const comms = useQuery({ queryKey: ['ir-comms'], queryFn: () => irListComms() })
  const summary = useQuery({ queryKey: ['ir-summary'], queryFn: irSummary })
  const kpis = useQuery({ queryKey: ['ir-kpis'], queryFn: irKpis })
  const schedule = useQuery({ queryKey: ['ir-schedule', entityId], queryFn: () => irSchedule(entityId || undefined) })

  const [newOutreach, setNewOutreach] = useState({ name: '', email: '', firm: '', notes: '' })
  const [newComm, setNewComm] = useState({ investor_id: '', subject: '', message: '' })

  const createOutreach = useMutation({
    mutationFn: () => irCreateOutreach({ ...newOutreach, stage: 'sourced' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ir-outreach'] }); setNewOutreach({ name: '', email: '', firm: '', notes: '' }) }
  })
  const createCommunication = useMutation({
    mutationFn: () => irCreateComm({ investor_id: Number(newComm.investor_id), subject: newComm.subject, message: newComm.message }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ir-comms'] }); setNewComm({ investor_id: '', subject: '', message: '' }) }
  })

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Investor Relations</h1>
          <p className="text-sm text-muted-foreground">Cap table, outreach pipeline, communications, and summaries.</p>
        </div>
        <div className="text-sm text-muted-foreground">Entity: {state.currentEntity?.legal_name || 'All'}</div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="ngi-card-elevated p-5"><div className="text-xs text-muted-foreground">Investors</div><div className="text-3xl font-bold mt-1">{kpis.data?.investors ?? 0}</div></div>
        <div className="ngi-card-elevated p-5"><div className="text-xs text-muted-foreground">Comms (30d)</div><div className="text-3xl font-bold mt-1">{kpis.data?.communications_30 ?? 0}</div></div>
        <div className="ngi-card-elevated p-5"><div className="text-xs text-muted-foreground">Upcoming Actions (14d)</div><div className="text-3xl font-bold mt-1">{kpis.data?.upcoming_actions_14 ?? 0}</div></div>
        <div className="ngi-card-elevated p-5"><div className="text-xs text-muted-foreground">Active Pipeline</div><div className="text-3xl font-bold mt-1">{Object.values(kpis.data?.pipeline || {}).reduce((a:any,b:any)=>a+(b as number),0)}</div></div>
      </div>

      {/* Cap Table */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold mb-3">Cap Table</h2>
        {cap.isLoading ? (<p className="text-sm text-muted-foreground">Loading…</p>) : (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[cap.data] as any}>
                  <XAxis dataKey={() => 'Equity'} stroke="currentColor"/>
                  <YAxis stroke="currentColor" allowDecimals={false}/>
                  <Tooltip/>
                  <Legend/>
                  {Array.isArray(cap.data?.members) ? (
                    cap.data.members.map((m:any, idx:number)=> (
                      <Bar key={idx} dataKey={(d:any)=> m.equity} name={m.name} stackId="equity" fill={`url(#grad${idx%6})`} />
                    ))
                  ) : (
                    <>
                      <Bar dataKey={(d:any)=> cap.data?.common_equity || 0} name="Common" stackId="equity" fill="url(#grad0)"/>
                      {(cap.data?.instruments || []).map((ins:any, idx:number)=> (
                        <Bar key={idx} dataKey={(d:any)=> ins.amount} name={ins.type} stackId="equity" fill={`url(#grad${(idx+1)%6})`} />
                      ))}
                    </>
                  )}
                  <defs>
                    {[0,1,2,3,4,5].map(i=> (
                      <linearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1-(i*0.1)} />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity={1-(i*0.15)} />
                      </linearGradient>
                    ))}
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Computed from approved equity journal entries.</p>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">{JSON.stringify(cap.data, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Outreach pipeline - Notion-like columns */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold mb-3">Outreach</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Investor name" value={newOutreach.name} onChange={e => setNewOutreach({ ...newOutreach, name: e.target.value })} />
            <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Email" value={newOutreach.email} onChange={e => setNewOutreach({ ...newOutreach, email: e.target.value })} />
            <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Firm" value={newOutreach.firm} onChange={e => setNewOutreach({ ...newOutreach, firm: e.target.value })} />
            <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Notes" value={newOutreach.notes} onChange={e => setNewOutreach({ ...newOutreach, notes: e.target.value })} />
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md" onClick={() => createOutreach.mutate()} disabled={createOutreach.isPending}>Add</button>
          </div>
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            {['sourced','contacted','in_talks','due_diligence','committed','closed','lost'].slice(0,3).map((col, i)=> (
              <div key={col} className="bg-muted/30 rounded-lg p-3 min-h-[200px]">
                <div className="text-xs text-muted-foreground mb-2 uppercase">{col.replace('_',' ')}</div>
                {outreach.data?.filter((o:any)=>o.stage===col).map((o:any)=> (
                  <div key={o.id} className="bg-card border border-border rounded-md p-2 mb-2">
                    <div className="font-medium text-sm">{o.name}</div>
                    <div className="text-xs text-muted-foreground">{o.email}</div>
                    <div className="text-xs mt-1">{o.notes || '-'}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Communications */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold mb-3">Communications</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Investor ID" value={newComm.investor_id} onChange={e => setNewComm({ ...newComm, investor_id: e.target.value })} />
            <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Subject" value={newComm.subject} onChange={e => setNewComm({ ...newComm, subject: e.target.value })} />
            <textarea className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Message" value={newComm.message} onChange={e => setNewComm({ ...newComm, message: e.target.value })} />
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md" onClick={() => createCommunication.mutate()} disabled={createCommunication.isPending}>Send</button>
          </div>
          <div className="md:col-span-2">
            {comms.isLoading ? (<p className="text-sm text-muted-foreground">Loading…</p>) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-2 pr-4">Investor</th>
                      <th className="py-2 pr-4">Subject</th>
                      <th className="py-2 pr-4">Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comms.data?.map((m: any) => (
                      <tr key={m.id} className="border-t border-border">
                        <td className="py-2 pr-4">{m.investor_name}</td>
                        <td className="py-2 pr-4">{m.subject || '-'}</td>
                        <td className="py-2 pr-4">{m.sent_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reporting & Summary */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold mb-3">Reporting Timeline</h2>
        {schedule.isLoading ? (<p className="text-sm text-muted-foreground">Loading…</p>) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-4">Entity</th><th className="py-2 pr-4">Quarter End</th><th className="py-2 pr-4">Due</th><th className="py-2 pr-4">Action</th></tr></thead>
              <tbody>
                {schedule.data?.schedule?.map((s:any)=> (
                  <tr key={`${s.entity_id}-${s.quarter_end}`} className="border-t border-border">
                    <td className="py-2 pr-4">{s.entity_name}</td>
                    <td className="py-2 pr-4">{new Date(s.quarter_end).toLocaleDateString()}</td>
                    <td className="py-2 pr-4">{new Date(s.report_due).toLocaleDateString()}</td>
                    <td className="py-2 pr-4"><button className="px-3 py-1 text-xs rounded-md bg-blue-600 text-white" onClick={() => irMarkReportSent({ entity_id: s.entity_id, period_start: new Date(s.quarter_end).toISOString().slice(0,10), period_end: new Date(s.quarter_end).toISOString().slice(0,10), due_date: new Date(s.report_due).toISOString().slice(0,10)})}>Mark Sent</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Summary</h3>
          {summary.isLoading ? (<p className="text-sm text-muted-foreground">Loading…</p>) : (
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">{JSON.stringify(summary.data, null, 2)}</pre>
          )}
        </div>
      </div>
    </div>
  )
}
