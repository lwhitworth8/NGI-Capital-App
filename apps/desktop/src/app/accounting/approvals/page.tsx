"use client";
import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { SidePanel } from "@/components/common/SidePanel";
import { notify } from "@/components/common/Toast";

type Row = { id: number; type: string; refId: string; amount: number; createdAt: string; requestedBy?: string; requiredApprovers: string[]; approvals: {email:string;at:string}[]; status: string; summary?: string };

export default function ApprovalsPage(){
  const [entityId, setEntityId] = useState<number>(6);
  const [tab, setTab] = useState<'pending'|'approved'|'rejected'>('pending');
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [comment, setComment] = useState<string>("");
  async function load(){ const r = await fetch(`/api/accounting/approvals?entity_id=${entityId}&status=${tab}`); setRows(await r.json()); }
  useEffect(()=>{ load() }, [entityId, tab]);
  const approve = async (r: Row, approve: boolean) => {
    try {
      await fetch(`/api/accounting/journal-entries/${r.id}/approve`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ approve, approval_notes: comment }) });
      notify.success(approve?'Approved':'Rejected'); load();
    } catch (err) { notify.error('Action failed'); }
  };
  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Approvals" rightSlot={<input className="border px-2 py-1 rounded w-24" type="number" value={entityId} onChange={e=>setEntityId(parseInt(e.target.value||"0"))} />} />
      <div className="flex gap-2">
        {(['pending','approved','rejected'] as const).map(s => (
          <button key={s} className={`px-3 py-1 rounded border ${tab===s?'bg-primary text-primary-foreground':''}`} onClick={()=>setTab(s)}>{s[0].toUpperCase()+s.slice(1)}</button>
        ))}
      </div>
      <DataTable<Row>
        columns={[
          { key: 'type', header: 'Type' },
          { key: 'refId', header: 'Ref' },
          { key: 'amount', header: 'Amount', render: (r)=> Number(r.amount||0).toLocaleString(undefined,{style:'currency',currency:'USD'}), className: 'text-right' },
          { key: 'createdAt', header: 'Date' },
          { key: 'status', header: 'Status' },
          { key: 'actions', header: 'Actions', render: (r)=> (
            <div className="flex gap-2 text-sm">
              <button className="px-2 py-1 border rounded" onClick={()=>{ setSelected(r); setOpen(true); }}>Open</button>
              {tab==='pending' && (<>
                <button className="px-2 py-1 border rounded" onClick={()=>approve(r,true)}>Approve</button>
                <button className="px-2 py-1 border rounded" onClick={()=>approve(r,false)}>Reject</button>
              </>)}
            </div>
          )},
        ]}
        rows={rows}
      />
      <SidePanel open={open} onClose={()=>setOpen(false)} title={`Approval - ${selected?.refId || ''}`}>
        {selected && (
          <div className="text-sm space-y-2">
            <div>Summary: {selected.summary || '-'}</div>
            <div>Amount: <span className="tabular-nums">${selected.amount.toFixed(2)}</span></div>
            <div>Required: {selected.requiredApprovers?.join(', ') || '-'}</div>
            <div>Approvals: {selected.approvals?.map(a=>a.email).join(', ') || '-'}</div>
            <div>
              <div className="text-xs text-muted-foreground">Comment</div>
              <textarea className="mt-1 w-full border rounded p-2" rows={3} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Add approval/rejection note" />
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}
