"use client";
import React, {useEffect,useMemo,useState} from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { DatePeriodPicker } from "@/components/common/DatePeriodPicker";

type StatementType = 'IS'|'BS'|'CF'|'EQUITY'|'NOTES';

export default function FinancialReportingPage(){
  const [entityId, setEntityId] = useState<number>(6);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth()+1);
  const [periodType, setPeriodType] = useState<'monthly'|'quarterly'|'annual'>('monthly');
  const [tab,setTab]=useState<StatementType>('IS');
  const period = useMemo(()=>`${year}-${String(month).padStart(2,'0')}`,[year,month]);
  const [rows, setRows] = useState<any[]>([]);
  useEffect(()=>{ fetch(`/api/reporting/financials/preview?entity_id=${entityId}&period=${period}&period_type=${periodType}&type=${tab}`).then(r=>r.json()).then(d=>setRows(d?.rows||[])); },[entityId, period, periodType, tab]);
  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Financial Reporting" rightSlot={<div className="flex items-center gap-3"><select className="border px-2 py-1 rounded" value={periodType} onChange={e=>setPeriodType(e.target.value as any)}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select><DatePeriodPicker value={{year,month}} onChange={v=>{setYear(v.year); setMonth(v.month)}} mode={periodType==='annual'?'annual':periodType}/><button className="px-3 py-1 rounded border" onClick={()=>{ window.location.href=`/api/reporting/financials/export?entity_id=${entityId}&period=${period}&period_type=${periodType}&format=pdf`}}>Export PDF</button><button className="px-3 py-1 rounded border" onClick={()=>{ window.location.href=`/api/reporting/financials/export?entity_id=${entityId}&period=${period}&period_type=${periodType}&format=xlsx`}}>Export XLSX</button></div>} />
      <div className="flex gap-2 text-sm">
        {(['IS','BS','CF','EQUITY','NOTES'] as StatementType[]).map(t=> (
          <button key={t} className={`px-3 py-1 rounded border ${tab===t?'bg-primary text-primary-foreground':''}`} onClick={()=>setTab(t)}>{t}</button>
        ))}
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full border-collapse">
          <thead><tr className="bg-muted/40 text-left"><th className="p-2">Label</th><th className="p-2 text-right">Amount</th></tr></thead>
          <tbody>
            {rows.map((r:any,i:number)=> (
              <tr key={i} className="border-t">
                <td className={`p-2 ${r.level===2?'pl-6':''}`}>{r.label}</td>
                <td className="p-2 tabular-nums text-right">{Number(r.amount||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>
              </tr>
            ))}
            {!rows.length && <tr><td className="p-4 text-sm text-muted-foreground" colSpan={2}>No data.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

