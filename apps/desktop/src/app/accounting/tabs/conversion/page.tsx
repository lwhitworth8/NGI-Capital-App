"use client"

import { useEffect, useMemo, useState } from "react"
import { useEntity } from '@/lib/context/UnifiedEntityContext'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, CheckCircle2, Loader2, Lock, ShieldCheck } from "lucide-react"

interface PrereqStatus {
  ok: boolean
  blockers: {
    bank_unreconciled?: boolean
    drafts_unapproved?: boolean
    unposted_docs?: boolean
    trial_balance_unbalanced?: boolean
  }
  details?: Record<string, any>
}

interface ExecutePayload {
  entity_id: number
  effective_date: string
  ein: string
  formation_state?: string
  formation_date?: string
  par_value: number
  authorized_shares?: number
  issued_shares: number
  document_ids?: number[]
}

export default function ConversionPage() {
  const { selectedEntity } = useEntity()
  const entityId = useMemo(() => selectedEntity?.id || 1, [selectedEntity])

  const [effectiveDate, setEffectiveDate] = useState<string>('2025-09-12')
  const [ein, setEin] = useState<string>('')
  const [formationState, setFormationState] = useState<string>('DE')
  const [formationDate, setFormationDate] = useState<string>('2025-09-12')
  const [parValue, setParValue] = useState<string>('0.0001')
  const [authorizedShares, setAuthorizedShares] = useState<string>('10000000')
  const [issuedShares, setIssuedShares] = useState<string>('1000000')

  const [loading, setLoading] = useState<boolean>(false)
  const [checking, setChecking] = useState<boolean>(false)
  const [prereq, setPrereq] = useState<PrereqStatus | null>(null)
  const [approvers, setApprovers] = useState<string[]>([])
  const [required, setRequired] = useState<string[]>([])
  const [isApproved, setIsApproved] = useState<boolean>(false)
  const [executing, setExecuting] = useState<boolean>(false)
  const [result, setResult] = useState<any>(null)

  const canExecute = prereq?.ok && isApproved

  async function refreshPrereq() {
    setChecking(true)
    try {
      const res = await apiClient.request<PrereqStatus>('POST', '/accounting/conversion/prerequisites', {
        entity_id: entityId,
        effective_date: effectiveDate,
      })
      setPrereq(res)
    } catch (e) {
      setPrereq({ ok: false, blockers: { drafts_unapproved: true }, details: { error: 'Failed to check' } })
    } finally {
      setChecking(false)
    }
  }

  async function refreshApproval() {
    try {
      const res = await apiClient.request<any>('GET', '/accounting/conversion/approval/status', undefined, {
        params: { entity_id: entityId, effective_date: effectiveDate }
      })
      setApprovers(res?.approvers || [])
      setRequired(res?.required || [])
      setIsApproved(!!res?.is_approved)
    } catch (e) {
      setApprovers([]); setRequired([]); setIsApproved(false)
    }
  }

  useEffect(() => {
    refreshPrereq()
    refreshApproval()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, effectiveDate])

  const handleApprove = async () => {
    setLoading(true)
    try {
      await apiClient.request('POST', '/accounting/conversion/approval/approve', {
        entity_id: entityId,
        effective_date: effectiveDate,
        approve: true,
      })
      await refreshApproval()
    } finally { setLoading(false) }
  }

  const handleExecute = async () => {
    setExecuting(true)
    try {
      const payload: ExecutePayload = {
        entity_id: entityId,
        effective_date: effectiveDate,
        ein,
        formation_state: formationState,
        formation_date: formationDate,
        par_value: parseFloat(parValue || '0'),
        authorized_shares: parseInt(authorizedShares || '0'),
        issued_shares: parseInt(issuedShares || '0'),
      }
      const res = await apiClient.request('POST', '/accounting/conversion/execute-inplace', payload)
      setResult(res)
      await refreshPrereq(); await refreshApproval()
    } catch (e) {
      setResult({ error: 'Execution failed' })
    } finally { setExecuting(false) }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Entity Conversion (LLC to C-Corp)</CardTitle>
          <CardDescription>
            In-place conversion for NGI Capital: reclass members' equity to Common Stock + APIC. Dual approval required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label>Effective Date</Label>
              <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
            </div>
            <div>
              <Label>EIN</Label>
              <Input placeholder="XX-XXXXXXX" value={ein} onChange={e => setEin(e.target.value)} />
            </div>
            <div>
              <Label>Formation State</Label>
              <Input placeholder="DE" value={formationState} onChange={e => setFormationState(e.target.value)} />
            </div>
            <div>
              <Label>Formation Date</Label>
              <Input type="date" value={formationDate} onChange={e => setFormationDate(e.target.value)} />
            </div>
            <div>
              <Label>Authorized Shares</Label>
              <Input type="number" value={authorizedShares} onChange={e => setAuthorizedShares(e.target.value)} />
            </div>
            <div>
              <Label>Par Value (USD)</Label>
              <Input type="number" step="0.0001" value={parValue} onChange={e => setParValue(e.target.value)} />
            </div>
            <div>
              <Label>Issued Shares</Label>
              <Input type="number" value={issuedShares} onChange={e => setIssuedShares(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={refreshPrereq} disabled={checking}>
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Check Prerequisites
            </Button>
            {prereq?.ok ? (
              <span className="text-green-600 text-sm flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Ready</span>
            ) : (
              <span className="text-orange-600 text-sm flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Not ready</span>
            )}
          </div>

          {prereq && !prereq.ok && (
            <div className="text-sm text-muted-foreground">
              <ul className="list-disc pl-5">
                {prereq.blockers.bank_unreconciled && <li>Bank transactions unreconciled</li>}
                {prereq.blockers.drafts_unapproved && <li>Draft or unapproved journal entries exist</li>}
                {prereq.blockers.unposted_docs && <li>Unposted documents exist</li>}
                {prereq.blockers.trial_balance_unbalanced && <li>Trial balance not balanced</li>}
              </ul>
            </div>
          )}

          <Separator />

          <div className="flex items-center gap-3">
            <Button onClick={handleApprove} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Approve Conversion
            </Button>
            <div className="text-sm text-muted-foreground">
              Approvers: {approvers.length > 0 ? approvers.join(', ') : 'None'}
              {required.length > 0 && (
                <span className="ml-2">Required: {required.join(', ')}</span>
              )}
              {isApproved && <span className="ml-2 text-green-600">(Dual approval met)</span>}
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-3">
            <Button onClick={handleExecute} disabled={!canExecute || executing}>
              {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Execute Conversion
            </Button>
            {!canExecute && <span className="text-sm text-muted-foreground">Complete prerequisites and approvals first</span>}
          </div>

          {result && (
            <div className="text-sm text-muted-foreground">
              <pre className="whitespace-pre-wrap bg-muted p-3 rounded-md overflow-auto max-h-64">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

