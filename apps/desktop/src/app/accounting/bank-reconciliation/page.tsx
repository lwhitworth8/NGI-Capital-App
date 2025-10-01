"use client";
import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { DatePeriodPicker } from "@/components/common/DatePeriodPicker";
import { ProgressBar } from "@/components/common/ProgressBar";
import { notify } from "@/components/common/Toast";

export default function BankReconciliationPage(){
  const [entityId, setEntityId] = useState<number>(6);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth()+1);
  const [feed, setFeed] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [sugs, setSugs] = useState<{documents:any[]; journal_entries:any[]}>({documents:[],journal_entries:[]});
  const [stats, setStats] = useState<any>({});
  const [statementEnd, setStatementEnd] = useState<string>("");

  async function load(){
    const f = await (await fetch(`/api/banking/feed?entity_id=${entityId}&year=${year}&month=${month}`)).json(); setFeed(f);
    const s = await (await fetch(`/api/banking/reconciliation/stats?entity_id=${entityId}&year=${year}&month=${month}`)).json(); setStats(s.summary||{});
  }
  useEffect(()=>{ load() }, [entityId, year, month]);
  useEffect(()=>{ if(selected){ fetch(`/api/banking/reconciliation/suggestions?txn_id=${selected.id}`).then(r=>r.json()).then(setSugs)} }, [selected]);

  const clearedPct = Number(stats?.cleared_percent ?? 0);
  const canFinalize = clearedPct >= Number(process.env.NEXT_PUBLIC_BANK_REC_THRESHOLD_PERCENT || 100);

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Bank Reconciliation" rightSlot={<DatePeriodPicker value={{year,month}} onChange={(v)=>{setYear(v.year); setMonth(v.month)}}/>} />
      <div className="rounded-xl border bg-card p-3 flex items-center gap-6 tabular-nums">
        <div>Cleared %: <b>{clearedPct.toFixed(1)}%</b></div>
        <div>Cleared Balance: <b>${Number(stats?.cleared_balance||0).toFixed(2)}</b></div>
        {typeof stats?.difference === 'number' && <div>Difference: <b>${Number(stats?.difference||0).toFixed(2)}</b></div>}
        <div className="flex items-center gap-2">Statement Ending Balance <input className="border px-2 py-1 rounded w-28" value={statementEnd} onChange={e=>setStatementEnd(e.target.value)} placeholder="0.00"/></div>
        <div className="flex-1"><ProgressBar percent={clearedPct}/></div>
        <button className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50" disabled={!canFinalize} onClick={async()=>{
          try{
            await fetch('/api/banking/reconciliation/finalize', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ entity_id: entityId, year, month, bank_end_balance: parseFloat(statementEnd||'0') }) });
            notify.success('Reconciliation finalized'); load();
          }catch{ notify.error('Finalize failed'); }
        }}>Finalize</button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-2 font-semibold border-b">Bank Feed</div>
          <ul>
            {feed.map(t=> (
              <li key={t.id} className={`p-2 border-t cursor-pointer ${selected?.id===t.id?'bg-blue-50':''}`} onClick={()=>setSelected(t)}>
                <div className="flex justify-between tabular-nums"><span>{t.date} - {t.description}</span><span>${t.amount.toFixed(2)}</span></div>
                <div className="text-xs text-muted-foreground">{t.status}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-card">
          <div className="p-2 font-semibold border-b">Suggestions</div>
          <div className="p-2 space-y-3">
            <div>
              <div className="text-sm font-medium mb-1">Documents</div>
              <ul className="text-sm">{sugs.documents?.map((d:any)=>(<li key={d.id} className="tabular-nums">#{d.id} - {d.vendor} - ${Number(d.total||0).toFixed(2)}</li>))}</ul>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Journal Entries</div>
              <ul className="text-sm">{sugs.journal_entries?.map((j:any)=>(<li key={j.id} className="tabular-nums">{j.entry_number} - ${Number(j.total||0).toFixed(2)}</li>))}</ul>
            </div>
            {selected && (
              <div className="flex gap-2">
                <button className="px-2 py-1 border rounded" onClick={async()=>{ if(!sugs.journal_entries?.length) return; const top=sugs.journal_entries[0]; await fetch('/api/banking/reconciliation/match',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ txn_id: selected.id, journal_entry_id: top.id })}); notify.success('Matched'); load(); }}>
                  Match Top Suggestion
                </button>
                <button className="px-2 py-1 border rounded" onClick={async()=>{ // simple split into 2 for demo
                  const half = Math.round(Math.abs(selected.amount)/2*100)/100; const rest = Math.abs(selected.amount)-half;
                  await fetch('/api/banking/reconciliation/split',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ txn_id: selected.id, splits:[{amount:half, description:selected.description+' (1)'},{amount:rest, description:selected.description+' (2)'}] })}); notify.success('Split'); load(); }}>
                  Split 2 Parts
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
