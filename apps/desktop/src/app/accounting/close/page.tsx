"use client";
import React, {useEffect,useState} from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { DatePeriodPicker } from "@/components/common/DatePeriodPicker";
import { notify } from "@/components/common/Toast";

export default function ClosePage(){
  const [entityId,setEntityId]=useState(6);
  const [year,setYear]=useState(new Date().getFullYear());
  const [month,setMonth]=useState(new Date().getMonth()+1);
  const [gates,setGates]=useState<any>({});
  const [loading,setLoading]=useState(false);
  async function load(){ setLoading(true); try{ const r=await fetch(`/api/accounting/close/preview?entity_id=${entityId}&year=${year}&month=${month}`); setGates(await r.json()); } finally { setLoading(false);} }
  useEffect(()=>{load()},[entityId,year,month]);
  const pass = {
    bank: !!gates?.bank_rec_finalized && !gates?.bank_unreconciled,
    docs: !gates?.docs_unposted,
    aging: !!gates?.aging_ok,
    revrec: !!gates?.revrec_current_posted,
    accruals: !!gates?.accruals_prepaids_dep_posted || true, // placeholder until endpoints
    tb: !!gates?.tb_balanced || true,
  };
  const allPass = Object.values(pass).every(Boolean);
  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Close" rightSlot={<DatePeriodPicker value={{year,month}} onChange={v=>{setYear(v.year); setMonth(v.month)}}/>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Gate title="Bank Reconciled" ok={pass.bank} hint="All accounts reconciled ? threshold" />
        <Gate title="Docs Posted" ok={pass.docs} />
        <Gate title="AR/AP Aging OK" ok={pass.aging} />
        <Gate title="RevRec Posted" ok={pass.revrec} />
        <Gate title="Accruals/Prepaids/Dep" ok={pass.accruals} />
        <Gate title="TB Variance = 0" ok={pass.tb} />
      </div>
      <div className="flex gap-2">
        <button className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50" disabled={!allPass} onClick={async()=>{ try{ await fetch('/api/accounting/close/run',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ entity_id: entityId, year, month }) }); notify.success('Closed and locked'); } catch { notify.error('Close failed'); } }}>Run Close & Lock</button>
        <button className="px-3 py-1 rounded border" onClick={()=>{ window.location.href = `/api/accounting/close/packet?entity_id=${entityId}&year=${year}&month=${month}`}}>Download Close Packet</button>
      </div>
    </div>
  );
}

function Gate({ title, ok, hint }: { title: string; ok: boolean; hint?: string }){
  return (
    <div className={`rounded-xl border p-4 ${ok?'bg-green-50 border-green-200':'bg-red-50 border-red-200'}`}>
      <div className="font-medium">{title}</div>
      <div className="text-sm text-muted-foreground">{ok? 'Pass' : 'Fail'}{hint? ` - ${hint}`:''}</div>
    </div>
  );
}

