"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  advisoryListCoffeeRequests,
  advisoryAcceptCoffeeRequest,
  advisoryProposeCoffeeRequest,
  advisoryCancelCoffeeRequest,
  advisoryCompleteCoffeeRequest,
  advisoryNoShowCoffeeRequest,
  advisoryExpireCoffeeRequests,
} from '@/lib/api'
import type { AdvisoryCoffeeRequest } from '@/types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'

export default function AdvisoryCoffeeRequestsPage() {
  const { loading } = useAuth()
  const [items, setItems] = useState<AdvisoryCoffeeRequest[]>([])
  const [filter, setFilter] = useState<{ status?: string }>({})
  const [busy, setBusy] = useState(false)
  const [propose, setPropose] = useState<{ id: number; start_ts: string; end_ts: string } | null>(null)

  const load = async () => {
    const list = await advisoryListCoffeeRequests({ status: filter.status })
    setItems(list)
  }

  useEffect(() => { load() }, [])

  const act = async (fn: () => Promise<any>) => { setBusy(true); try { await fn(); await load() } finally { setBusy(false) } }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Coffee Chat Requests</CardTitle>
            <CardDescription>Manage student requests and admin availability</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter.status || ''} onValueChange={(v)=>setFilter(f=>({ ...f, status: v || undefined }))}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {['pending','accepted','completed','canceled','no_show','expired'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={load}>Apply</Button>
            <Button variant="outline" onClick={()=>act(advisoryExpireCoffeeRequests)}>Run Expiry</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(i => (
                <TableRow key={i.id}>
                  <TableCell>{i.student_email}</TableCell>
                  <TableCell>{new Date(i.start_ts).toLocaleString()}</TableCell>
                  <TableCell>{new Date(i.end_ts).toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{i.status}</TableCell>
                  <TableCell>{i.claimed_by || '-'}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={busy} onClick={()=>act(()=>advisoryAcceptCoffeeRequest(i.id))}>Accept</Button>
                    <Button variant="outline" size="sm" disabled={busy} onClick={()=>setPropose({ id: i.id, start_ts: i.start_ts, end_ts: i.end_ts })}>Propose</Button>
                    <Button variant="outline" size="sm" disabled={busy} onClick={()=>act(()=>advisoryCancelCoffeeRequest(i.id))}>Cancel</Button>
                    <Button variant="outline" size="sm" disabled={busy} onClick={()=>act(()=>advisoryCompleteCoffeeRequest(i.id))}>Complete</Button>
                    <Button variant="outline" size="sm" disabled={busy} onClick={()=>act(()=>advisoryNoShowCoffeeRequest(i.id))}>No-show</Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">No requests.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {propose && (
        <Card>
          <CardHeader>
            <CardTitle>Propose New Time</CardTitle>
            <CardDescription>Update the requested time window</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input type="datetime-local" className="px-3 py-2 border rounded bg-background text-sm" value={propose.start_ts}
                onChange={e=>setPropose(p=>p ? ({ ...p, start_ts: e.target.value }) : p)} />
              <input type="datetime-local" className="px-3 py-2 border rounded bg-background text-sm" value={propose.end_ts}
                onChange={e=>setPropose(p=>p ? ({ ...p, end_ts: e.target.value }) : p)} />
              <Button onClick={()=>propose && act(()=>advisoryProposeCoffeeRequest(propose.id, { start_ts: propose.start_ts, end_ts: propose.end_ts })).then(()=>setPropose(null))} disabled={busy}>Save</Button>
              <Button variant="outline" onClick={()=>setPropose(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

