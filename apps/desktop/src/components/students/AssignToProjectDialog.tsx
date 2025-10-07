"use client"

import React, { useMemo, useState } from "react"
import { Modal, ModalFooter } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import type { AdvisoryProject, AdvisoryStudent } from "@/types"
import { AlertCircle } from "lucide-react"

type Props = {
  open: boolean
  onClose: () => void
  student: AdvisoryStudent | null
  projects: AdvisoryProject[]
  onConfirm: (data: { project_id: number; hours_planned?: number; override?: { proceed: boolean; reason?: string } }) => Promise<void> | void
}

export function AssignToProjectDialog({ open, onClose, student, projects, onConfirm }: Props) {
  const [projectId, setProjectId] = useState<number | null>(null)
  const [hours, setHours] = useState<number | "">(8)
  const [overrideProceed, setOverrideProceed] = useState(false)
  const [overrideReason, setOverrideReason] = useState("")
  const selectedProject = useMemo(() => projects.find(p => p.id === projectId) || null, [projects, projectId])

  const openRoles = useMemo(() => {
    const team = Number(selectedProject?.team_size || 0)
    const assigned = Number((selectedProject as any)?.assigned_count || (selectedProject as any)?.open_roles || 0)
    if (!selectedProject) return null
    if (!team && team !== 0) return null
    const rem = team - (isNaN(assigned) ? 0 : assigned)
    return rem
  }, [selectedProject])

  const capacityBlocked = typeof openRoles === 'number' && openRoles <= 0

  const handleConfirm = async () => {
    if (!projectId) return
    if (capacityBlocked && !overrideProceed) return
    await onConfirm({ project_id: projectId, hours_planned: hours === "" ? undefined : Number(hours), override: capacityBlocked ? { proceed: true, reason: overrideReason } : undefined })
    setProjectId(null)
    setHours(8)
    setOverrideProceed(false)
    setOverrideReason("")
    onClose()
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={`Assign ${student ? (student.first_name || '') + ' ' + (student.last_name || '') : 'Student'}`} size="lg">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Project</label>
          <Select value={projectId ? String(projectId) : ""} onValueChange={(v) => setProjectId(Number(v))}>
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.project_name || `Project ${p.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProject && (
          <div className="text-sm text-muted-foreground">
            {typeof openRoles === 'number' ? (
              <>
                Open analyst roles: <span className={openRoles > 0 ? 'text-green-600' : 'text-red-600'}>{openRoles}</span>
              </>
            ) : (
              <>Open roles unknown</>
            )}
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Planned hours/week (optional)</label>
          <Input
            type="number"
            min={0}
            value={hours as any}
            onChange={(e) => {
              const v = e.target.value
              if (v === '') setHours("")
              else setHours(Number(v))
            }}
            className="mt-1 w-40"
          />
        </div>

        {capacityBlocked && (
          <div className="p-3 rounded-md border bg-amber-50 text-amber-900">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div>
                <div className="font-medium">No open analyst roles available for this project.</div>
                <div className="text-sm">You can proceed anyway with an override and provide a short rationale for audit.</div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <label className="inline-flex items-center space-x-2">
                <input type="checkbox" checked={overrideProceed} onChange={(e) => setOverrideProceed(e.target.checked)} />
                <span className="text-sm">Proceed anyway</span>
              </label>
              {overrideProceed && (
                <div>
                  <label className="text-sm">Override rationale</label>
                  <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Why proceed without capacity?" />
                </div>
              )}
            </div>
          </div>
        )}

        <ModalFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!projectId || (capacityBlocked && !overrideProceed)}>
            Assign
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  )
}

