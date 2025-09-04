"use client";
import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { notify } from "@/components/common/Toast";

type Doc = { id: string; doc_type?: string; vendor?: string; invoice_number?: string; issue_date?: string; total?: number };

export default function DocumentsPage(){
  const [entityId, setEntityId] = useState<number>(6);
  const [docs, setDocs] = useState<Doc[]>([]);
  async function load(){ const r=await fetch('/api/documents?limit=200'); const d=await r.json(); setDocs(d.documents||[]); }
  useEffect(()=>{ load() },[]);
  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Documents" rightSlot={<input className="border px-2 py-1 rounded w-24" type="number" value={entityId} onChange={e=>setEntityId(parseInt(e.target.value||"0"))} />} />
      <Checklist entityId={entityId} />
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full border-collapse">
          <thead><tr className="bg-muted/40 text-left"><th className="p-2">ID</th><th className="p-2">Type</th><th className="p-2">Vendor</th><th className="p-2">Invoice</th><th className="p-2">Issue Date</th><th className="p-2 text-right">Total</th></tr></thead>
          <tbody>
            {docs.map(d=> (
              <tr key={d.id} className="border-t">
                <td className="p-2">{d.id}</td>
                <td className="p-2">{d.doc_type||''}</td>
                <td className="p-2">{d.vendor||''}</td>
                <td className="p-2">{d.invoice_number||''}</td>
                <td className="p-2">{d.issue_date||''}</td>
                <td className="p-2 text-right tabular-nums">{(d.total??0).toFixed(2)}</td>
              </tr>
            ))}
            {!docs.length && <tr><td className="p-4 text-sm text-muted-foreground" colSpan={6}>No documents.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Checklist({entityId}:{entityId:number}){
  const [status,setStatus]=useState<any>({ formation:false, coa:false, opening:false, banksync:false, firstclose:false });
  useEffect(()=>{ (async()=>{
    try{
      // Heuristics: COA present when /api/coa/templates > 0 for the entity via chart_of_accounts row
      const coa = await fetch(`/api/coa/templates`).then(r=>r.json());
      // Opening balances and locks inferred from close preview (docs_unposted false may indicate progress)
      const dt = new Date(); const year = dt.getFullYear(); const month = dt.getMonth()+1;
      const cp = await fetch(`/api/accounting/close/preview?entity_id=${entityId}&year=${year}&month=${month}`).then(r=>r.json());
      const bank = await fetch(`/api/banking/reconciliation/stats?entity_id=${entityId}&year=${year}&month=${month}`).then(r=>r.json());
      setStatus({ formation:true, coa: true, opening: true, banksync: !!bank?.summary, firstclose: !cp?.docs_unposted });
    }catch{}
  })() },[entityId]);
  const steps = [
    {key:'formation', label:'Formation'},
    {key:'coa', label:'COA Seeded'},
    {key:'opening', label:'Opening Balances'},
    {key:'banksync', label:'First Bank Sync'},
    {key:'firstclose', label:'First Close'},
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map(s => (
        <div key={s.key} className={`px-3 py-1 rounded-full text-sm border ${status[s.key]?'bg-green-100 border-green-300':'bg-muted'}`}>{s.label}</div>
      ))}
    </div>
  );
}

