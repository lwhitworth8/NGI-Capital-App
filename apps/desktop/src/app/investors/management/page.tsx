"use client";
import React, { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { DatePeriodPicker } from "@/components/common/DatePeriodPicker";

export default function InvestorManagement(){
  const [entityId,setEntityId]=useState(6);
  const [year,setYear]=useState(new Date().getFullYear());
  const [quarter,setQuarter]=useState(1+Math.floor(new Date().getMonth()/3));
  const period = useMemo(()=>`${year}-${String((quarter-1)*3+1).padStart(2,'0')}`,[year,quarter]);
  const [kpis,setKpis]=useState<any>({ revenue:0, cash:0, gm:0, runway:0 });
  useEffect(()=>{ (async()=>{
    const isd = await fetch(`/api/reporting/financials/preview?entity_id=${entityId}&period=${period}&period_type=quarterly&type=IS`).then(r=>r.json());
    const bsd = await fetch(`/api/reporting/financials/preview?entity_id=${entityId}&period=${period}&period_type=quarterly&type=BS`).then(r=>r.json());
    const revenue = Number(isd?.rows?.find?.((r:any)=> r.label==='Total Revenue')?.amount||0);
    const cash = 0; // can compute from CF/BS by filtering cash codes if needed
    setKpis({ revenue, cash, gm: 0, runway: 0 });
  })() },[entityId,period]);
  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Investor Management" rightSlot={<div className="flex items-center gap-3"><div><label className="block text-xs text-muted-foreground">Quarter</label><select className="border px-2 py-1 rounded" value={quarter} onChange={e=>setQuarter(parseInt(e.target.value||'1'))}><option value={1}>Q1</option><option value={2}>Q2</option><option value={3}>Q3</option><option value={4}>Q4</option></select></div><input className="border px-2 py-1 rounded w-24" type="number" value={year} onChange={e=>setYear(parseInt(e.target.value||"0"))} /></div>} />
      <div className="rounded-xl border bg-card p-4">
        <div className="text-sm font-medium mb-2">Current Report</div>
        <div className="flex items-center gap-3">
          <button className="px-3 py-1 rounded border" onClick={()=>{ window.location.href = `/api/reporting/financials/export?entity_id=${entityId}&period=${period}&period_type=quarterly&format=pdf`}}>Download Financial Package (PDF)</button>
          <button className="px-3 py-1 rounded border" onClick={()=>{ window.location.href = `/api/reporting/financials/export?entity_id=${entityId}&period=${period}&period_type=quarterly&format=xlsx`}}>XLSX</button>
          <div className="text-sm tabular-nums">Revenue: ${kpis.revenue.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

