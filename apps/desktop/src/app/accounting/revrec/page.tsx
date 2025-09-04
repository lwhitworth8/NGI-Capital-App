"use client";
import React, { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { DatePeriodPicker } from "@/components/common/DatePeriodPicker";
import { notify } from "@/components/common/Toast";

type Schedule = { id: string; invoice_id?: string; method: string; start_date: string; months: number; total: number; posted_in_period?: boolean };

export default function RevRecPage(){
  const [entityId, setEntityId] = useState<number>(6);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth()+1);
  const period = useMemo(()=>`${year}-${String(month).padStart(2,'0')}`,[year,month]);
  const [rows, setRows] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  async function load(){ setLoading(true); try{ const r = await fetch(`/api/revrec/schedules?entity_id=${entityId}&period=${period}`); setRows(await r.json()); } finally { setLoading(false);} }
  useEffect(()=>{ load() }, [entityId, period]);
  return (
    <div className="p-6">
      <PageHeader title="Revenue Recognition" rightSlot={<div className="flex items-center gap-3"><DatePeriodPicker value={{year,month}} onChange={v=>{setYear(v.year); setMonth(v.month)}} /><button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={async()=>{ try{ await fetch(`/api/revrec/post-period?entity_id=${entityId}&year=${year}&month=${month}`,{method:'POST'}); notify.success('Posted'); load(); } catch{ notify.error('Failed to post'); } }}>Post Current Period</button></div>} />
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full border-collapse">
          <thead><tr className="bg-muted/40 text-left"><th className="p-2">Invoice</th><th className="p-2">Method</th><th className="p-2">Start</th><th className="p-2">Months</th><th className="p-2">Total</th><th className="p-2">Posted {period}</th></tr></thead>
          <tbody>
            {rows.map((r)=> (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.invoice_id || '—'}</td>
                <td className="p-2">{r.method}</td>
                <td className="p-2">{r.start_date}</td>
                <td className="p-2">{r.months}</td>
                <td className="p-2 tabular-nums">{(r.total ?? 0).toFixed(2)}</td>
                <td className="p-2">{r.posted_in_period ? 'Yes' : 'No'}</td>
              </tr>
            ))}
            {!rows.length && !loading && <tr><td className="p-4 text-sm text-muted-foreground" colSpan={6}>No schedules.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

