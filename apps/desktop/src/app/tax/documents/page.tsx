"use client";
import React, {useEffect,useMemo,useState} from "react";
import { PageHeader } from "@/components/common/PageHeader";

export default function TaxDocumentsPage(){
  const [entityId,setEntityId]=useState(6);
  const [year,setYear]=useState(new Date().getFullYear());
  const [month,setMonth]=useState(new Date().getMonth()+1);
  const period = useMemo(()=>`${year}-${String(month).padStart(2,'0')}`,[year,month]);
  const [data,setData]=useState<any>({});
  useEffect(()=>{ fetch(`/api/tax/export?entity_id=${entityId}&period=${period}`).then(r=>r.json()).then(setData) },[entityId,period]);
  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Tax Documents" rightSlot={<div className="flex items-center gap-3"><input className="border px-2 py-1 rounded w-24" type="number" value={year} onChange={e=>setYear(parseInt(e.target.value||"0"))}/><input className="border px-2 py-1 rounded w-16" type="number" value={month} onChange={e=>setMonth(parseInt(e.target.value||"1"))}/></div>} />
      <div className="rounded-xl border bg-card p-4">
        <div className="text-sm font-medium mb-2">Closed Period</div>
        <div className="flex items-center gap-2"><a className="px-3 py-1 border rounded" href={`/api/accounting/close/packet?entity_id=${entityId}&year=${year}&month=${month}`} target="_blank">Download Financial Package</a></div>
      </div>
      <div className="rounded-xl border bg-card p-4 overflow-auto">
        <div className="text-sm font-medium mb-2">Tax Export (Book→Tax shell)</div>
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(data,null,2)}</pre>
      </div>
    </div>
  );
}

