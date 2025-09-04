"use client";
import React, {useEffect,useState} from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { notify } from "@/components/common/Toast";

export default function SettingsPage(){
  const [entityId,setEntityId]=useState(6);
  const [tab,setTab]=useState<'mappings'|'fiscal'|'approvals'>('mappings');
  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Accounting Settings" rightSlot={<input className="border px-2 py-1 rounded w-24" type="number" value={entityId} onChange={e=>setEntityId(parseInt(e.target.value||"0"))} />} />
      <div className="flex gap-2">
        {(['mappings','fiscal','approvals'] as const).map(s=> (<button key={s} className={`px-3 py-1 rounded border ${tab===s?'bg-primary text-primary-foreground':''}`} onClick={()=>setTab(s)}>{s[0].toUpperCase()+s.slice(1)}</button>))}
      </div>
      {tab==='mappings' && <MappingsTab />}
      {tab==='fiscal' && <FiscalTab entityId={entityId} />}
      {tab==='approvals' && <ApprovalsTab entityId={entityId} />}
    </div>
  );
}

function MappingsTab(){
  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [vmap, setVmap] = useState<any[]>([]);
  const [cmap, setCmap] = useState<any[]>([]);
  async function load(){
    setVendors(await (await fetch('/api/mappings/vendors')).json());
    setCategories(await (await fetch('/api/mappings/categories')).json());
    setVmap(await (await fetch('/api/mappings/vendor-mappings')).json());
    setCmap(await (await fetch('/api/mappings/category-mappings')).json());
  }
  useEffect(()=>{ load() },[]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <div className="text-sm font-medium mb-2">Vendors</div>
        <DataTable columns={[{key:'name',header:'Name'},{key:'default_gl_account_id',header:'Default GL'},{key:'terms_days',header:'Terms'},{key:'tax_rate',header:'Tax %'}]} rows={vendors} />
      </div>
      <div>
        <div className="text-sm font-medium mb-2">Categories</div>
        <DataTable columns={[{key:'name',header:'Name'},{key:'keyword_pattern',header:'Pattern'},{key:'default_gl_account_id',header:'Default GL'}]} rows={categories} />
      </div>
      <div>
        <div className="text-sm font-medium mb-2">Vendor Aliases</div>
        <DataTable columns={[{key:'vendor_id',header:'Vendor ID'},{key:'pattern',header:'Pattern'},{key:'is_regex',header:'Regex'}]} rows={vmap} />
      </div>
      <div>
        <div className="text-sm font-medium mb-2">Category Mappings</div>
        <DataTable columns={[{key:'category_id',header:'Category'},{key:'keyword_pattern',header:'Pattern'},{key:'default_gl_account_id',header:'Default GL'}]} rows={cmap} />
      </div>
    </div>
  );
}

function FiscalTab({entityId}:{entityId:number}){
  const [fiscal, setFiscal] = useState<any>({ yearStartMonth: 1 });
  useEffect(()=>{ fetch(`/api/accounting/settings?entity_id=${entityId}`).then(r=>r.json()).then(s=> setFiscal(s?.fiscal||{yearStartMonth:1})) },[entityId]);
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="text-sm">Year Start Month</div>
      <input className="border px-2 py-1 rounded w-24" type="number" value={fiscal.yearStartMonth||1} onChange={e=> setFiscal({...fiscal, yearStartMonth: parseInt(e.target.value||'1')})} />
      <div>
        <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={async()=>{ await fetch(`/api/accounting/settings/fiscal?entity_id=${entityId}`,{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(fiscal) }); notify.success('Updated'); }}>Save</button>
      </div>
    </div>
  );
}

function ApprovalsTab({entityId}:{entityId:number}){
  const [policy, setPolicy] = useState<any>({ dual: true, approvers: [] });
  useEffect(()=>{ fetch(`/api/accounting/settings?entity_id=${entityId}`).then(r=>r.json()).then(s=> setPolicy(s?.approvals||{dual:true, approvers:[]})) },[entityId]);
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="text-sm">Dual Approval</div>
      <select className="border px-2 py-1 rounded w-32" value={policy.dual? 'yes':'no'} onChange={e=> setPolicy({...policy, dual: e.target.value==='yes'})}>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
      <div className="text-sm">Approvers (comma separated emails)</div>
      <input className="border px-2 py-1 rounded w-full" value={(policy.approvers||[]).join(', ')} onChange={e=> setPolicy({...policy, approvers: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
      <div>
        <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={async()=>{ await fetch(`/api/accounting/settings/approvals?entity_id=${entityId}`,{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(policy) }); notify.success('Updated'); }}>Save</button>
      </div>
      <div className="text-sm text-muted-foreground">Conversion: auto-detected from formation docs. See Documents.</div>
    </div>
  );
}

