"use client"

import * as React from 'react'
import { X, RefreshCcw, Users } from 'lucide-react'
import { apiClient } from '@/lib/api'

type Application = { id:number; first_name?:string; last_name?:string; email:string; status:string; created_at:string; target_project_id?:number; reviewer_email?:string }

export function ApplicationsPanel({ projectId, onClose }: { projectId?: number; onClose: () => void }){
  const [loading, setLoading] = React.useState(false)
  const [items, setItems] = React.useState<Application[]>([])
  const [error, setError] = React.useState<string|undefined>()
  const [status, setStatus] = React.useState<string>('new')

  const load = React.useCallback(async ()=>{
    setLoading(true); setError(undefined)
    try{
      const params: any = {}
      if (projectId) params.project_id = projectId
      if (status) params.status = status
      const res = await apiClient.request<Application[]>('GET','/advisory/applications', undefined, { params })
      setItems(res || [])
    }catch(e){ setError('Failed to load applications') }
    finally{ setLoading(false) }
  },[projectId, status])

  React.useEffect(()=>{ load() },[load])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 font-semibold"><Users className="w-4 h-4"/> Applications</div>
          <div className="flex items-center gap-2">
            <select className="text-sm border rounded px-2 py-1 bg-background" value={status} onChange={e=> setStatus(e.target.value)}>
              <option value="new">New</option>
              <option value="reviewing">Reviewing</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="joined">Joined</option>
              <option value="rejected">Rejected</option>
            </select>
            <button className="text-sm inline-flex items-center gap-1 px-2 py-1 border rounded" onClick={load}><RefreshCcw className="w-3 h-3"/> Refresh</button>
            <button className="p-1 rounded hover:bg-accent" onClick={onClose}><X className="w-4 h-4"/></button>
          </div>
        </div>
        <div className="p-5">
          {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
          {error && <div className="text-sm text-red-500">{error}</div>}
          {!loading && !error && (
            <div className="space-y-2 max-h-[70vh] overflow-auto">
              {(items||[]).map(a => (
                <div key={a.id} className="p-3 rounded border border-border text-sm">
                  <div className="font-medium">{a.first_name || ''} {a.last_name || ''} <span className="text-muted-foreground">({a.email})</span></div>
                  <div className="text-xs text-muted-foreground">Status: {a.status} • {new Date(a.created_at).toLocaleString()}</div>
                </div>
              ))}
              {(items||[]).length===0 && <div className="text-sm text-muted-foreground">No applications in this view.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

