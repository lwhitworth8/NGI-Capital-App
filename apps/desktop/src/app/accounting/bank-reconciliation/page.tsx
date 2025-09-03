"use client"

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

export default function BankReconciliationPage(){
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAcc, setSelectedAcc] = useState<number|undefined>(undefined)
  const [txns, setTxns] = useState<any[]>([])
  const [unmatched, setUnmatched] = useState<any[]>([])
  const [matchForm, setMatchForm] = useState<{ txnId?: number; jeId?: number }>({})
  const [createForm, setCreateForm] = useState<{ txnId?: number; entityId?: number; dr?: number; cr?: number; desc?: string }>({})
  const [splits, setSplits] = useState<{ amount?: number; description?: string }[]>([{},{},{}])
  const [stats, setStats] = useState<any[]>([])

  const load = async () => {
    try {
      const ac = await apiClient.request<any>('GET', '/banking/accounts'); setAccounts(ac.accounts||[])
      const ux = await apiClient.bankingListUnmatched(); setUnmatched(ux||[])
      try { setStats(await apiClient.bankingReconciliationStats()) } catch {}
      if (ac.accounts && ac.accounts[0]){
        setSelectedAcc(ac.accounts[0].id)
        const tx = await apiClient.request<any>('GET', '/banking/transactions', undefined, { params: { account_id: ac.accounts[0].id } })
        setTxns(tx.transactions||[])
      }
    } catch {}
  }
  useEffect(()=>{ load() }, [])

  const onMatch = async () => {
    if (!matchForm.txnId || !matchForm.jeId) return
    try { await apiClient.bankingManualMatch(matchForm.txnId, matchForm.jeId); toast.success('Matched'); await load() } catch (e:any){ toast.error(e?.response?.data?.detail || 'Match failed') }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bank Reconciliation</h1>
        <Button variant="secondary" onClick={async ()=>{ try { await apiClient.bankingMercurySync('ngi-capital-llc'); await load() } catch {} }}>Sync Mercury</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1">
          <div className="mb-3">
            <h2 className="font-semibold mb-2">Cleared %</h2>
            <div className="border rounded divide-y">
              {stats.map(s => (
                <div key={s.bank_account_id} className="p-2 text-sm flex items-center justify-between">
                  <span>{s.account_name}</span><span className="tabular-nums">{s.percent}% ({s.cleared}/{s.total})</span>
                </div>
              ))}
              {stats.length===0 && (<div className="p-2 text-sm text-muted-foreground">No stats yet</div>)}
            </div>
          </div>
          <h2 className="font-semibold mb-2">Accounts</h2>
          <div className="border rounded divide-y">
            {accounts.map(a => (
              <button key={a.id} onClick={async ()=>{ setSelectedAcc(a.id); const tx = await apiClient.request<any>('GET','/banking/transactions', undefined, { params: { account_id: a.id } }); setTxns(tx.transactions||[]) }} className={`w-full text-left p-2 ${selectedAcc===a.id?'bg-muted':''}`}>
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-muted-foreground">{a.account_number} • ${Number(a.current_balance||0).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2 space-y-4">
          <div>
            <h2 className="font-semibold mb-2">Transactions</h2>
            <div className="border rounded max-h-64 overflow-auto divide-y">
              {txns.map(t => (
                <div key={t.id} className={`p-2 text-sm flex items-center justify-between ${t.is_reconciled?'opacity-60':''}`}>
                  <div>
                    <div className="font-medium">{t.description || '-'}</div>
                    <div className="text-xs text-muted-foreground">{t.transaction_date}</div>
                  </div>
                  <div className="tabular-nums">${Number(t.amount||0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Unmatched</h2>
            <div className="border rounded max-h-64 overflow-auto divide-y">
              {unmatched.map(u => (
                <button key={u.id} className="p-2 text-sm w-full text-left hover:bg-muted" onClick={()=>{ setMatchForm({ txnId: u.id, jeId: undefined }); setCreateForm({ txnId: u.id, entityId: undefined, dr: undefined, cr: undefined, desc: u.description }) }}>
                  <div className="flex items-center justify-between">
                    <div>{u.transaction_date} • {u.description}</div>
                    <div className="tabular-nums">${Number(u.amount||0).toLocaleString()}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-end gap-2">
              <label className="text-sm">Txn ID
                <input className="ml-2 px-2 py-1 border rounded bg-background w-28" value={matchForm.txnId ?? ''} onChange={e=>setMatchForm({...matchForm, txnId: Number(e.target.value||0)})} />
              </label>
              <label className="text-sm">JE ID
                <input className="ml-2 px-2 py-1 border rounded bg-background w-28" value={matchForm.jeId ?? ''} onChange={e=>setMatchForm({...matchForm, jeId: Number(e.target.value||0)})} />
              </label>
              <Button variant="primary" onClick={onMatch}>Match</Button>
            </div>
            <div className="mt-4 p-3 border rounded space-y-2">
              <div className="font-medium text-sm">Create JE from selected</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label>Entity ID<input className="ml-2 px-2 py-1 border rounded bg-background w-28" value={createForm.entityId ?? ''} onChange={e=>setCreateForm({...createForm, entityId: Number(e.target.value||0)})} /></label>
                <label>Debit Account<input className="ml-2 px-2 py-1 border rounded bg-background w-28" value={createForm.dr ?? ''} onChange={e=>setCreateForm({...createForm, dr: Number(e.target.value||0)})} /></label>
                <label>Credit Account<input className="ml-2 px-2 py-1 border rounded bg-background w-28" value={createForm.cr ?? ''} onChange={e=>setCreateForm({...createForm, cr: Number(e.target.value||0)})} /></label>
                <label className="col-span-2">Description<input className="ml-2 px-2 py-1 border rounded bg-background w-full" value={createForm.desc ?? ''} onChange={e=>setCreateForm({...createForm, desc: e.target.value})} /></label>
              </div>
              <Button variant="secondary" onClick={async ()=>{ try { if (!createForm.txnId || !createForm.entityId || !createForm.dr || !createForm.cr) return; await apiClient.bankingCreateJEFromTxn({ txn_id: createForm.txnId, entity_id: createForm.entityId, debit_account_id: createForm.dr, credit_account_id: createForm.cr, description: createForm.desc }); toast.success('JE created'); await load() } catch (e:any){ toast.error(e?.response?.data?.detail || 'Create JE failed') } }}>Create JE</Button>
            </div>
            <div className="mt-4 p-3 border rounded space-y-2">
              <div className="font-medium text-sm">Split Selected Transaction</div>
              <div className="space-y-1">
                {splits.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input placeholder="Amount" className="px-2 py-1 border rounded bg-background w-28" value={s.amount ?? ''} onChange={e=>{ const v=[...splits]; v[idx] = { ...v[idx], amount: Number(e.target.value||0) }; setSplits(v) }} />
                    <input placeholder="Description" className="px-2 py-1 border rounded bg-background flex-1" value={s.description ?? ''} onChange={e=>{ const v=[...splits]; v[idx] = { ...v[idx], description: e.target.value }; setSplits(v) }} />
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={()=> setSplits([...splits, {}])}>Add Row</Button>
                  <Button variant="secondary" onClick={async ()=>{ try { if (!matchForm.txnId) return; const parts = splits.filter(s=> (s.amount||0)!==0); if (!parts.length) return; await apiClient.bankingSplitTxn({ txn_id: matchForm.txnId, splits: parts as any }); toast.success('Split saved'); setSplits([{},{}]); await load() } catch (e:any){ toast.error(e?.response?.data?.detail || 'Split failed') } }}>Split</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
