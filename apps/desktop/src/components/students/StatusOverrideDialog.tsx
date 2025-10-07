"use client"

import React, { useState } from "react"
import { Modal, ModalFooter } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import type { AdvisoryStudent } from "@/types"

type Props = {
  open: boolean
  onClose: () => void
  student: AdvisoryStudent | null
  onConfirm: (data: { status: 'active' | 'alumni'; reason: string }) => Promise<void> | void
}

export function StatusOverrideDialog({ open, onClose, student, onConfirm }: Props) {
  const [status, setStatus] = useState<'active'|'alumni'>('active')
  const [reason, setReason] = useState('')

  const canConfirm = reason.trim().length >= 10

  const handleConfirm = async () => {
    if (!canConfirm) return
    await onConfirm({ status, reason })
    setReason('')
    onClose()
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={`Status Override — ${student ? (student.first_name || '') + ' ' + (student.last_name || '') : ''}`}>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-medium">Set status</div>
          <div className="flex items-center space-x-2">
            <button type="button" onClick={() => setStatus('active')} className={`px-3 py-1 rounded-md border ${status==='active' ? 'bg-green-600 text-white border-green-700' : 'hover:bg-green-50'}`}>
              Active
            </button>
            <button type="button" onClick={() => setStatus('alumni')} className={`px-3 py-1 rounded-md border ${status==='alumni' ? 'bg-gray-800 text-white border-gray-900' : 'hover:bg-gray-50'}`}>
              Alumni
            </button>
          </div>
          {student?.status_override && (
            <div className="text-xs text-muted-foreground">Currently overridden: <Badge variant="outline">{student.status_override}</Badge></div>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Reason (min 10 chars)</label>
          <textarea className="mt-1 w-full border rounded-md p-2 text-sm" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you overriding the status?" />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>Save Override</Button>
        </ModalFooter>
      </div>
    </Modal>
  )
}

