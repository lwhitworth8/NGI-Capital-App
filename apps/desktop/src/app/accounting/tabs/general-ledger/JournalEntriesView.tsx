"use client"

import { useEffect, useState, useCallback } from "react"
import { useEntityContext } from "@/hooks/useEntityContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Plus, Search, FileText, Calendar, DollarSign, 
  CheckCircle2, Clock, AlertCircle, Loader2, Edit, Trash2 
} from "lucide-react"
import { JournalEntryApprovalModal } from "./JournalEntryApprovalModal"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface JournalEntry {
  id: number
  entity_id: number
  entry_number: string
  entry_date: string
  fiscal_year: number
  fiscal_period: number
  description: string
  status: string
  workflow_stage: number
  total_debits: number
  total_credits: number
  created_by: number
  first_approved_by: number | null
  first_approved_at: string | null
  final_approved_by: number | null
  final_approved_at: string | null
  posted_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  // Agent validation fields
  agent_validated_at?: string | null
  agent_validation_score?: number | null
  agent_corrections_made?: boolean | null
  agent_validation_notes?: string | null
}

interface JournalEntryLine {
  id?: number
  account_number: string
  account_name?: string
  debit_amount: number
  credit_amount: number
  description: string
}

interface Account {
  id: number
  account_number: string
  account_name: string
  account_type: string
}

export default function JournalEntriesView() {
  const { selectedEntityId } = useEntityContext()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedPeriod, setSelectedPeriod] = useState("all")
  const [showNewEntryDialog, setShowNewEntryDialog] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedEntryForApproval, setSelectedEntryForApproval] = useState<JournalEntry | null>(null)
  const [newEntry, setNewEntry] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: "",
    lines: [] as JournalEntryLine[]
  })

  // Fetch journal entries
  const fetchEntries = useCallback(async () => {
    if (!selectedEntityId) return

    try {
      setLoading(true)
      const { apiClient } = await import('@/lib/api')
      const data = await apiClient.getJournalEntries({ entity_id: selectedEntityId })
      setEntries(data)
    } catch (error) {
      console.error("Error loading entries:", error)
      toast.error("Error loading journal entries")
    } finally {
      setLoading(false)
    }
  }, [selectedEntityId])

  // Removed auto-refresh - data loads once and stays loaded

  // Fetch accounts for dropdown
  const fetchAccounts = useCallback(async () => {
    if (!selectedEntityId) return

    try {
      const { apiClient } = await import('@/lib/api')
      const data = await apiClient.getChartOfAccounts(selectedEntityId)
      setAccounts(data.filter((acc: Account) => acc.account_type !== "Header"))
    } catch (error) {
      console.error("Error loading accounts:", error)
    }
  }, [selectedEntityId])

  useEffect(() => {
    if (selectedEntityId) {
      fetchEntries()
      fetchAccounts()
    }
  }, [selectedEntityId, fetchEntries, fetchAccounts])

  // Add new line to entry
  const addLine = useCallback(() => {
    setNewEntry(prev => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          account_number: "",
          debit_amount: 0,
          credit_amount: 0,
          description: ""
        }
      ]
    }))
  }, [])

  // Remove line from entry
  const removeLine = useCallback((index: number) => {
    setNewEntry(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }))
  }, [])

  // Workflow action functions
  const submitForApproval = useCallback(async (entryId: number) => {
    try {
      const { apiClient } = await import('@/lib/api')
      await apiClient.request('POST', `/accounting/journal-entries/${entryId}/submit-for-approval`)
      toast.success("Journal entry submitted for approval")
      fetchEntries() // Refresh the list
    } catch (error) {
      console.error("Error submitting for approval:", error)
      toast.error("Error submitting for approval")
    }
  }, [fetchEntries])

  const approveFirst = useCallback(async (entryId: number) => {
    try {
      const { apiClient } = await import('@/lib/api')
      await apiClient.request('POST', `/accounting/journal-entries/${entryId}/approve-first`)
      toast.success("Journal entry approved by first partner")
      fetchEntries() // Refresh the list
    } catch (error) {
      console.error("Error approving:", error)
      toast.error("Error approving journal entry")
    }
  }, [fetchEntries])

  const approveFinal = useCallback(async (entryId: number) => {
    try {
      const { apiClient } = await import('@/lib/api')
      await apiClient.request('POST', `/accounting/journal-entries/${entryId}/approve-final`)
      toast.success("Journal entry posted successfully")
      fetchEntries() // Refresh the list
    } catch (error) {
      console.error("Error posting:", error)
      toast.error("Error posting journal entry")
    }
  }, [fetchEntries])

  const rejectEntry = useCallback(async (entryId: number, reason: string) => {
    try {
      const { apiClient } = await import('@/lib/api')
      await apiClient.request('POST', `/accounting/journal-entries/${entryId}/reject`, { reason })
      toast.success("Journal entry rejected and returned to draft")
      fetchEntries() // Refresh the list
    } catch (error) {
      console.error("Error rejecting:", error)
      toast.error("Error rejecting journal entry")
    }
  }, [fetchEntries])

  const approveEntry = useCallback(async (entryId: number) => {
    try {
      const { apiClient } = await import('@/lib/api')
      await apiClient.request('POST', `/accounting/journal-entries/${entryId}/approve`)
      toast.success("Journal entry approved")
      fetchEntries() // Refresh the list
    } catch (error) {
      console.error("Error approving:", error)
      toast.error("Error approving journal entry")
    }
  }, [fetchEntries])

  const postEntry = useCallback(async (entryId: number) => {
    try {
      const { apiClient } = await import('@/lib/api')
      await apiClient.request('POST', `/accounting/journal-entries/${entryId}/post`)
      toast.success("Journal entry posted to general ledger")
      fetchEntries() // Refresh the list
    } catch (error) {
      console.error("Error posting:", error)
      toast.error("Error posting journal entry")
    }
  }, [fetchEntries])

  const reverseEntry = useCallback(async (entryId: number, reason: string) => {
    try {
      const { apiClient } = await import('@/lib/api')
      await apiClient.request('POST', `/accounting/journal-entries/${entryId}/reverse`, { reason })
      toast.success("Journal entry reversed")
      fetchEntries() // Refresh the list
    } catch (error) {
      console.error("Error reversing:", error)
      toast.error("Error reversing journal entry")
    }
  }, [fetchEntries])

  const revalidateEntry = useCallback(async (entryId: number) => {
    try {
      const { apiClient } = await import('@/lib/api')
      await apiClient.request('POST', `/accounting/journal-entries/${entryId}/revalidate`)
      toast.success("Journal entry re-validated with agent")
      fetchEntries() // Refresh the list
    } catch (error) {
      console.error("Error re-validating:", error)
      toast.error("Error re-validating journal entry")
    }
  }, [fetchEntries])

  // Get status badge and workflow actions for an entry
  const getStatusBadge = useCallback((entry: JournalEntry) => {
    const statusConfig = {
      'draft': { variant: 'secondary' as const, text: 'Draft', icon: Clock },
      'agent_review': { variant: 'outline' as const, text: 'Agent Review', icon: Loader2 },
      'pending_first_approval': { variant: 'default' as const, text: 'Pending First Approval', icon: AlertCircle },
      'pending_final_approval': { variant: 'default' as const, text: 'Pending Final Approval', icon: AlertCircle },
      'approved': { variant: 'default' as const, text: 'Approved', icon: CheckCircle2 },
      'posted': { variant: 'default' as const, text: 'Posted', icon: CheckCircle2 },
      'rejected': { variant: 'destructive' as const, text: 'Rejected', icon: AlertCircle }
    }
    
    const config = statusConfig[entry.status as keyof typeof statusConfig] || statusConfig.draft
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }, [])

  // Get agent validation badge
  const getAgentValidationBadge = useCallback((entry: JournalEntry) => {
    if (!entry.agent_validated_at) {
      return (
        <Badge variant="outline" className="text-xs">
          Not Validated
        </Badge>
      )
    }

    const score = entry.agent_validation_score || 0
    const variant = score >= 0.8 ? 'default' : score >= 0.6 ? 'secondary' : 'destructive'
    
    return (
      <Badge variant={variant} className="text-xs">
        Agent: {Math.round(score * 100)}%
      </Badge>
    )
  }, [])

  const getWorkflowActions = useCallback((entry: JournalEntry) => {
    const actions = []
    
    if (entry.status === 'draft') {
      actions.push(
        <Button
          key="submit"
          size="sm"
          variant="outline"
          onClick={() => submitForApproval(entry.id)}
        >
          Submit for Agent Review
        </Button>
      )
    }
    
    if (entry.status === 'agent_review') {
      actions.push(
        <Button
          key="revalidate"
          size="sm"
          variant="outline"
          onClick={() => revalidateEntry(entry.id)}
        >
          Re-validate
        </Button>
      )
    }
    
    if (entry.status === 'pending_first_approval') {
      actions.push(
        <Button
          key="approve"
          size="sm"
          variant="default"
          onClick={() => handleOpenApprovalModal(entry)}
        >
          First Approval
        </Button>
      )
    }
    
    if (entry.status === 'pending_final_approval') {
      actions.push(
        <Button
          key="approve-final"
          size="sm"
          variant="default"
          onClick={() => handleOpenApprovalModal(entry)}
        >
          Final Approval
        </Button>
      )
    }
    
    if (entry.status === 'approved') {
      actions.push(
        <Button
          key="post"
          size="sm"
          variant="default"
          onClick={() => postEntry(entry.id)}
        >
          Post to GL
        </Button>
      )
    }
    
    if (entry.status === 'posted') {
      actions.push(
        <Button
          key="reverse"
          size="sm"
          variant="destructive"
          onClick={() => {
            const reason = prompt("Reversal reason:")
            if (reason) reverseEntry(entry.id, reason)
          }}
        >
          Reverse
        </Button>
      )
    }
    
    return actions
  }, [submitForApproval, approveEntry, rejectEntry, postEntry, reverseEntry, revalidateEntry])

  // Update line data
  const updateLine = useCallback((index: number, field: keyof JournalEntryLine, value: any) => {
    setNewEntry(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      )
    }))
  }, [])

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const totalDebits = newEntry.lines.reduce((sum, line) => sum + (parseFloat(line.debit_amount.toString()) || 0), 0)
    const totalCredits = newEntry.lines.reduce((sum, line) => sum + (parseFloat(line.credit_amount.toString()) || 0), 0)
    return { totalDebits, totalCredits, difference: totalDebits - totalCredits }
  }, [newEntry.lines])

  // Create journal entry
  const handleCreateEntry = useCallback(async () => {
    if (!selectedEntityId) return

    const { totalDebits, totalCredits, difference } = calculateTotals()

    if (Math.abs(difference) > 0.01) {
      toast.error(`Entry is out of balance by $${Math.abs(difference).toFixed(2)}`)
      return
    }

    if (newEntry.lines.length < 2) {
      toast.error("Journal entry must have at least 2 lines")
      return
    }

    try {
      const { apiClient } = await import('@/lib/api')
      await apiClient.createJournalEntry({
        entity_id: selectedEntityId,
        entry_date: newEntry.entry_date,
        description: newEntry.description,
        lines: newEntry.lines.map(line => ({
          account_number: line.account_number,
          debit_amount: parseFloat(line.debit_amount.toString()) || 0,
          credit_amount: parseFloat(line.credit_amount.toString()) || 0,
          description: line.description
        }))
      })

      toast.success("Journal entry created successfully!")
      setShowNewEntryDialog(false)
      setNewEntry({
        entry_date: new Date().toISOString().split('T')[0],
        description: "",
        lines: []
      })
      await fetchEntries()
    } catch (error) {
      console.error("Error creating entry:", error)
      toast.error("Error creating journal entry")
    }
  }, [selectedEntityId, newEntry, calculateTotals, fetchEntries])

  // Approval handlers
  const handleOpenApprovalModal = (entry: JournalEntry) => {
    setSelectedEntryForApproval(entry)
    setShowApprovalModal(true)
  }

  const handleApproveEntry = async (entryId: number, notes: string) => {
    try {
      const { apiClient } = await import('@/lib/api')
      await apiClient.approveJournalEntry(entryId, notes)
      toast.success("Journal entry approved successfully!")
      await fetchEntries()
    } catch (error) {
      console.error("Error approving entry:", error)
      toast.error("Error approving journal entry")
      throw error
    }
  }

  const handleRejectEntry = async (entryId: number, notes: string) => {
    try {
      const { apiClient } = await import('@/lib/api')
      await apiClient.rejectJournalEntry(entryId, notes)
      toast.success("Journal entry rejected")
      await fetchEntries()
    } catch (error) {
      console.error("Error rejecting entry:", error)
      toast.error("Error rejecting journal entry")
      throw error
    }
  }

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = 
      entry.entry_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = selectedStatus === "all" || entry.status === selectedStatus
    const matchesPeriod = selectedPeriod === "all" || entry.fiscal_period.toString() === selectedPeriod
    
    return matchesSearch && matchesStatus && matchesPeriod
  })

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getMonthAndQuarter = (fiscalPeriod: number, fiscalYear: number): string => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]
    
    if (fiscalPeriod >= 1 && fiscalPeriod <= 12) {
      const month = months[fiscalPeriod - 1]
      const quarter = Math.ceil(fiscalPeriod / 3)
      return `${month} Q${quarter} ${fiscalYear}`
    }
    
    return `P${fiscalPeriod} ${fiscalYear}`
  }

  const entryStats = {
    total: entries.length,
    draft: entries.filter(e => e.status === "draft").length,
    posted: entries.filter(e => e.status === "posted").length,
    pending: entries.filter(e => e.status === "pending_approval" || e.status === "pending_final_approval").length,
  }

  const totals = calculateTotals()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Journal Entries</h3>
          <p className="text-sm text-muted-foreground">System-generated journal entries for review and approval</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entryStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{entryStats.draft}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{entryStats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Posted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{entryStats.posted}</div>
          </CardContent>
        </Card>
      </div>

      {/* Entries List */}
      <Card>
        <CardHeader>
          <CardTitle>All Journal Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending Approval">Pending</SelectItem>
                <SelectItem value="Posted">Posted</SelectItem>
                <SelectItem value="Reversed">Reversed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {month} Q{Math.ceil((i + 1) / 3)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No journal entries found</p>
              <p className="text-sm text-muted-foreground mb-6">
                {entries.length === 0 
                  ? "Create your first journal entry to get started" 
                  : "Try adjusting your filters"}
              </p>
              {entries.length === 0 && (
                <Button onClick={() => setShowNewEntryDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Entry
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Debits</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-sm">{entry.entry_number}</TableCell>
                    <TableCell>{formatDate(entry.entry_date)}</TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getMonthAndQuarter(entry.fiscal_period, entry.fiscal_year)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${entry.total_debits.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${entry.total_credits.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(entry)}
                    </TableCell>
                    <TableCell>
                      {getAgentValidationBadge(entry)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {getWorkflowActions(entry)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" disabled>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" disabled>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Entry Dialog */}
      <Dialog open={showNewEntryDialog} onOpenChange={setShowNewEntryDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Journal Entry</DialogTitle>
            <DialogDescription>
              Record a new accounting transaction with debits and credits
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entry_date">Entry Date</Label>
                <Input
                  id="entry_date"
                  type="date"
                  value={newEntry.entry_date}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, entry_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of the transaction"
                  value={newEntry.description}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Entry Lines</h4>
                <Button size="sm" variant="outline" onClick={addLine}>
                  <Plus className="mr-2 h-3 w-3" />
                  Add Line
                </Button>
              </div>

              {newEntry.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">Account</Label>
                    <Select
                      value={line.account_number}
                      onValueChange={(value) => updateLine(index, 'account_number', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.account_number}>
                            {acc.account_number} - {acc.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Debit</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={line.debit_amount || ""}
                      onChange={(e) => {
                        updateLine(index, 'debit_amount', parseFloat(e.target.value) || 0)
                        updateLine(index, 'credit_amount', 0)
                      }}
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Credit</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={line.credit_amount || ""}
                      onChange={(e) => {
                        updateLine(index, 'credit_amount', parseFloat(e.target.value) || 0)
                        updateLine(index, 'debit_amount', 0)
                      }}
                    />
                  </div>

                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Line Description</Label>
                    <Input
                      placeholder="Optional"
                      value={line.description}
                      onChange={(e) => updateLine(index, 'description', e.target.value)}
                    />
                  </div>

                  <div className="col-span-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeLine(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}

              {newEntry.lines.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No lines added yet. Click "Add Line" to start.
                </div>
              )}

              {newEntry.lines.length > 0 && (
                <div className="border-t pt-3 mt-3">
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium">
                    <div className="col-span-4 text-right">Totals:</div>
                    <div className={`col-span-2 text-right ${Math.abs(totals.difference) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                      ${totals.totalDebits.toFixed(2)}
                    </div>
                    <div className={`col-span-2 text-right ${Math.abs(totals.difference) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                      ${totals.totalCredits.toFixed(2)}
                    </div>
                    <div className="col-span-4">
                      {Math.abs(totals.difference) > 0.01 ? (
                        <Badge variant="destructive">
                          Out of balance by ${Math.abs(totals.difference).toFixed(2)}
                        </Badge>
                      ) : totals.totalDebits > 0 ? (
                        <Badge variant="default">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Balanced
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewEntryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEntry} disabled={newEntry.lines.length < 2 || Math.abs(totals.difference) > 0.01}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Create Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Modal */}
      <JournalEntryApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        journalEntry={selectedEntryForApproval}
        onApprove={handleApproveEntry}
        onReject={handleRejectEntry}
        isLoading={loading}
      />
    </motion.div>
  )
}
