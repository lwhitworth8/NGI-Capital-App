"use client"

import { useEffect, useState, useCallback } from "react"
import { useEntity } from "@/lib/context/UnifiedEntityContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  FileText, Search, CheckCircle2, Clock, AlertCircle, Loader2,
  ThumbsUp, ThumbsDown, Send, Lock, RefreshCw, Upload, FileIcon, Plus, X,
  ArrowUp, ArrowDown, Download as DownloadIcon, Paperclip, ChevronLeft, ChevronRight
} from "lucide-react"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

// Backward-compat guard for stale bundles referencing old dialog state
// @ts-ignore
var matchDialogOpen: any
// @ts-ignore
var bankMatchOpen: any
// @ts-ignore
var setMatchDialogOpen: any = () => {}
// @ts-ignore
var setBankMatchOpen: any = () => {}
// @ts-ignore
var setBankMatchModalOpen: any = () => {}
// Stale bundle guards for bank match internals
// @ts-ignore
var selectedBankAccountId: any
// @ts-ignore
var setSelectedBankAccountId: any = () => {}
// @ts-ignore
var matchDateFrom: any
// @ts-ignore
var matchDateTo: any
// @ts-ignore
var txnsLoading: any
// @ts-ignore
var setTxnsLoading: any = () => {}
// @ts-ignore
var loadBankTransactions: any = () => {}

interface JournalEntry {
  id: number
  entity_id: number
  entry_number: string
  entry_date: string
  fiscal_year: number
  fiscal_period: number
  entry_type: string
  memo: string
  status: string
  workflow_stage: number
  total_debits: number
  total_credits: number
  created_by_name: string
  created_at: string
  first_approved_by_name: string | null
  first_approved_at: string | null
  final_approved_by_name: string | null
  final_approved_at: string | null
  posted_at: string | null
  is_locked: boolean
  lines: JournalEntryLine[]
  reference?: string
  extracted_data?: {
    invoice_number?: string
    invoice_date?: string
    vendor_name?: string
    merchant?: string
    total_amount?: number
    transaction_date?: string
  }
  document_id?: number
}

interface JournalEntryLine {
  id: number
  line_number: number
  account_id: number
  account_number: string
  account_name: string
  debit_amount: number
  credit_amount: number
  description: string | null
  // XBRL fields removed from UI
}

interface PostingAccount {
  id: number
  entity_id: number
  account_number: string
  account_name: string
  account_type: string
  parent_account_id: number | null
  normal_balance: string
  description: string | null
  gaap_reference: string | null
  is_active: boolean
  allow_posting: boolean
  require_project: boolean
  require_cost_center: boolean
  current_balance: number
  ytd_activity: number
}

export default function JournalEntriesView() {
  const { selectedEntity } = useEntity()
  const selectedEntityId = selectedEntity?.id

  // State
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [uploadingDocument, setUploadingDocument] = useState(false)

  // Create JE modal state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createDate, setCreateDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [createType, setCreateType] = useState<string>("Standard")
  const [createMemo, setCreateMemo] = useState<string>("")
  // Reference field removed per US GAAP workflow simplification
  // US GAAP header metadata (create)
  const [createVendor, setCreateVendor] = useState<string>("")
  const [createInvoiceNumber, setCreateInvoiceNumber] = useState<string>("")
  const [createInvoiceDate, setCreateInvoiceDate] = useState<string>("")
  const [createDueDate, setCreateDueDate] = useState<string>("")
  // Currency/FX fields removed (default USD handled server-side)
  const [createReversing, setCreateReversing] = useState<boolean>(false)
  const [createReversalDate, setCreateReversalDate] = useState<string>("")
  const [createLines, setCreateLines] = useState<Array<{ account_id: number | null; description: string; debit: string; credit: string; q?: string }>>([
    { account_id: null, description: "", debit: "", credit: "" },
    { account_id: null, description: "", debit: "", credit: "" },
  ])
  const [postingAccounts, setPostingAccounts] = useState<PostingAccount[]>([])
  // removed global postingFilter
  const [creating, setCreating] = useState(false)

  // Create JE: document upload + viewer
  const [createDocId, setCreateDocId] = useState<number | null>(null)
  const [createDocName, setCreateDocName] = useState<string>("")
  const [createDocUploading, setCreateDocUploading] = useState(false)
  const [createDocViewerUrl, setCreateDocViewerUrl] = useState<string | null>(null)
  const [createViewerIndex, setCreateViewerIndex] = useState<number>(0)
  const [existingDocs, setExistingDocs] = useState<Array<{ id: number; filename: string; original_name: string; upload_date: string; category: string; file_type: string }>>([])
  const [existingDocsLoading, setExistingDocsLoading] = useState(false)
  const [existingDocsSearch, setExistingDocsSearch] = useState("")
  const [existingDocsCategory, setExistingDocsCategory] = useState<string>('all')
  const [existingDocsPage, setExistingDocsPage] = useState<number>(1)
  const [createSelectedDocs, setCreateSelectedDocs] = useState<number[]>([])

  // Edit draft modal state
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editDate, setEditDate] = useState<string>("")
  const [editType, setEditType] = useState<string>("Standard")
  const [editMemo, setEditMemo] = useState<string>("")
  // Reference field removed per US GAAP workflow simplification
  // US GAAP header metadata (edit)
  const [editVendor, setEditVendor] = useState<string>("")
  const [editInvoiceNumber, setEditInvoiceNumber] = useState<string>("")
  const [editInvoiceDate, setEditInvoiceDate] = useState<string>("")
  const [editDueDate, setEditDueDate] = useState<string>("")
  // Currency/FX fields removed (default USD handled server-side)
  const [editReversing, setEditReversing] = useState<boolean>(false)
  const [editReversalDate, setEditReversalDate] = useState<string>("")
  const [editLines, setEditLines] = useState<Array<{ account_id: number | null; description: string; debit: string; credit: string; q?: string }>>([])
  const [editingDraft, setEditingDraft] = useState(false)
  const [editDocViewerUrl, setEditDocViewerUrl] = useState<string | null>(null)
  const [editViewerIndex, setEditViewerIndex] = useState<number>(0)
  const [editDocUploading, setEditDocUploading] = useState(false)
  const [editExistingDocsSearch, setEditExistingDocsSearch] = useState("")
  const [editExistingDocsCategory, setEditExistingDocsCategory] = useState<string>('all')
  const [editExistingDocsPage, setEditExistingDocsPage] = useState<number>(1)
  // Removed multi-select in Edit flow
  // Bank matching state
  const [bankMatchOpen, setBankMatchOpen] = useState(false)
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: number; account_name: string; bank_name: string }>>([])
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | null>(null)
  const [matchDateFrom, setMatchDateFrom] = useState<string>("")
  const [matchDateTo, setMatchDateTo] = useState<string>("")
  const [txns, setTxns] = useState<Array<{ id: number; transaction_date: string; description: string; amount: number; is_matched: boolean }>>([])
  const [txnsLoading, setTxnsLoading] = useState(false)

  // Back-compat alias to avoid ReferenceErrors from stale bundles
  // These provide old names that forward to the live state
  // @ts-ignore
  const bankMatchModalOpen = bankMatchOpen;
  // @ts-ignore
  const setBankMatchModalOpen = setBankMatchOpen;

  // Helper function to determine if a card should be highlighted
  const isHighlighted = (tabName: string) => {
    return hoveredTab === tabName || (hoveredTab === null && activeTab === tabName)
  }

  // Fetch journal entries
  const fetchEntries = useCallback(async () => {
    if (!selectedEntityId) return

    try {
      setLoading(true)
      const { apiClient } = await import('@/lib/api')
      const data = await apiClient.getJournalEntries({ entity_id: selectedEntityId })
      console.log('[JE] Journal Entries Received:', data?.length || 0)
      if (data && data.length > 0) {
        console.log('[JE] First entry sample:', {
          id: data[0].id,
          status: data[0].status,
          workflow_stage: data[0].workflow_stage,
          entry_number: data[0].entry_number
        })
      }
      setEntries(data || [])
    } catch (error) {
      console.error("Error loading entries:", error)
      toast.error("Error loading journal entries")
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [selectedEntityId])

  useEffect(() => {
    if (selectedEntityId) {
      fetchEntries()
    }
  }, [selectedEntityId, fetchEntries])

  // Fetch posting accounts for create dialog
  const loadPostingAccounts = useCallback(async () => {
    if (!selectedEntityId) return
    try {
      const res = await fetch(`/api/accounting/coa/posting-accounts?entity_id=${selectedEntityId}`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setPostingAccounts(data || [])
    } catch (e) {
      console.error('Failed to load posting accounts', e)
    }
  }, [selectedEntityId])

  useEffect(() => {
    if (showCreateDialog) {
      loadPostingAccounts()
      loadExistingDocuments()
    }
  }, [showCreateDialog, loadPostingAccounts])

  // Cleanup viewer URL on close
  useEffect(() => {
    if (!showCreateDialog && createDocViewerUrl) {
      try { URL.revokeObjectURL(createDocViewerUrl) } catch {}
      setCreateDocViewerUrl(null)
    }
  }, [showCreateDialog, createDocViewerUrl])


  // Document categories (dynamic from loaded docs)
  const existingDocCategories = Array.from(new Set((existingDocs || []).map(d => d.category || 'other')))
  const formatCategory = (c: string) => {
    const clean = (c || 'other').replace(/[_-]+/g, ' ').trim().toLowerCase()
    return clean.split(' ').map(w => w ? (w[0].toUpperCase() + w.slice(1)) : '').join(' ')
  }

  const loadExistingDocuments = async () => {
    if (!selectedEntityId) return
    try {
      setExistingDocsLoading(true)
      const res = await fetch(`/api/accounting/documents/?entity_id=${selectedEntityId}`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const docs = (Array.isArray(data) ? data : (data.documents || [])) as any[]
      setExistingDocs(docs.map(d => ({
        id: Number(d.id),
        filename: d.filename || d.original_name,
        original_name: d.original_name || d.filename,
        upload_date: d.upload_date || d.created_at,
        category: d.category || 'other',
        file_type: d.file_type || d.mime_type || 'application/octet-stream'
      })))
      setExistingDocsPage(1)
      setEditExistingDocsPage(1)
    } catch (e) {
      console.error('Failed to load existing documents', e)
    } finally {
      setExistingDocsLoading(false)
    }
  }

  const selectExistingDocForCreate = async (docId: number) => {
    // Add to selection if missing and show in viewer
    setCreateSelectedDocs(prev => (prev.includes(docId) ? prev : [...prev, docId]))
    try {
      const doc = (existingDocs || []).find(d => Number(d.id) === Number(docId))
      if (doc) setCreateDocName(doc.original_name || doc.filename)
    } catch {}
    try {
      const ids = [
        ...(createDocId ? [createDocId] : []),
        ...createSelectedDocs.filter(id => id !== createDocId),
      ]
      const finalIds = ids.includes(docId) ? ids : [...ids, docId]
      const idx = Math.max(0, finalIds.findIndex(id => id === docId))
      await loadCreateViewerByIndex(idx, finalIds)
    } catch {}
  }

  const removeCurrentCreateViewerDoc = async () => {
    const ids = [
      ...(createDocId ? [createDocId] : []),
      ...createSelectedDocs.filter(id => id !== createDocId),
    ]
    if (ids.length === 0) return
    const currentId = ids[Math.max(0, Math.min(createViewerIndex, ids.length - 1))]
    // Remove current from selection
    if (createDocId && currentId === createDocId) {
      setCreateDocId(null)
    } else {
      setCreateSelectedDocs(prev => prev.filter(id => id !== currentId))
    }
    const remaining = ids.filter(id => id !== currentId)
    if (remaining.length > 0) {
      const nextIdx = Math.max(0, Math.min(createViewerIndex, remaining.length - 1))
      await loadCreateViewerByIndex(nextIdx, remaining)
    } else {
      try { if (createDocViewerUrl) URL.revokeObjectURL(createDocViewerUrl) } catch {}
      setCreateDocViewerUrl(null)
      setCreateViewerIndex(0)
    }
  }

  const setLineField = (idx: number, field: 'account_id'|'description'|'debit'|'credit', value: any) => {
    setCreateLines(prev => prev.map((ln, i) => i === idx ? { ...ln, [field]: value } : ln))
  }

  const addLine = () => setCreateLines(prev => [...prev, { account_id: null, description: "", debit: "", credit: "" }])
  const removeLine = (idx: number) => setCreateLines(prev => prev.filter((_, i) => i !== idx))
  const setEditLineField = (idx: number, field: 'account_id'|'description'|'debit'|'credit', value: any) => {
    setEditLines(prev => prev.map((ln, i) => i === idx ? { ...ln, [field]: value } : ln))
  }
  const addEditLine = () => setEditLines(prev => [...prev, { account_id: null, description: "", debit: "", credit: "" }])
  const removeEditLine = (idx: number) => setEditLines(prev => prev.filter((_, i) => i !== idx))

  const lineAmount = (s: string) => {
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : 0
  }

  const totals = createLines.reduce((acc, ln) => {
    acc.debits += lineAmount(ln.debit)
    acc.credits += lineAmount(ln.credit)
    return acc
  }, { debits: 0, credits: 0 })
  const editTotals = editLines.reduce((acc, ln) => {
    acc.debits += lineAmount(ln.debit)
    acc.credits += lineAmount(ln.credit)
    return acc
  }, { debits: 0, credits: 0 })

  const canCreate = (
    !!selectedEntityId &&
    createLines.length >= 2 &&
    createLines.every(ln => (ln.account_id && ((lineAmount(ln.debit) > 0) !== (lineAmount(ln.credit) > 0)))) &&
    Math.abs(totals.debits - totals.credits) < 0.000001 &&
    totals.debits > 0
  )

  const canSaveDraft = (
    !!selectedEntityId &&
    showEditDialog &&
    editLines.length >= 2 &&
    editLines.every(ln => (ln.account_id && ((lineAmount(ln.debit) > 0) !== (lineAmount(ln.credit) > 0)))) &&
    Math.abs(editTotals.debits - editTotals.credits) < 0.000001 &&
    editTotals.debits > 0
  )

  const openEditDraft = async () => {
    if (!selectedEntry) return
    setEditDate(selectedEntry.entry_date?.slice(0,10) || new Date().toISOString().split('T')[0])
    setEditType((selectedEntry as any).entry_type || 'Standard')
    setEditMemo(selectedEntry.memo || '')
    // Reference removed from edit form
    try {
      const meta: any = (selectedEntry as any).extracted_data || {}
      setEditVendor(meta.vendor_name || meta.merchant || '')
      setEditInvoiceNumber(meta.invoice_number || '')
      setEditInvoiceDate((meta.invoice_date || '').slice ? (meta.invoice_date || '').slice(0,10) : (meta.invoice_date || ''))
      setEditDueDate((meta.due_date || '').slice ? (meta.due_date || '').slice(0,10) : (meta.due_date || ''))
      // Currency/FX fields removed
      setEditReversing(!!meta.reversing)
      setEditReversalDate((meta.reversal_date || '').slice ? (meta.reversal_date || '').slice(0,10) : (meta.reversal_date || ''))
    } catch {}
    const mapped = (selectedEntry.lines || []).map(l => ({
      account_id: l.account_id,
      description: l.description || '',
      debit: l.debit_amount > 0 ? l.debit_amount.toFixed(2) : '',
      credit: l.credit_amount > 0 ? l.credit_amount.toFixed(2) : ''
    }))
    setEditLines(mapped)
    setShowEditDialog(true)
    try { await loadPostingAccounts() } catch {}
    // Load current document preview if present
    try {
      await loadEditViewerByIndex(0)
    } catch {}
    // Prefill match date window +/- 10 days around entry date
    try {
      const d = selectedEntry.entry_date?.slice(0,10)
      if (d) {
        const dt = new Date(d)
        const from = new Date(dt); from.setDate(from.getDate() - 10)
        const to = new Date(dt); to.setDate(to.getDate() + 10)
        setMatchDateFrom(from.toISOString().slice(0,10))
        setMatchDateTo(to.toISOString().slice(0,10))
      }
    } catch {}
  }

  const submitSaveDraft = async () => {
    if (!selectedEntry || !canSaveDraft) return
    try {
      setEditingDraft(true)
      const { apiClient } = await import('@/lib/api')
      const payload: any = {
        entry_date: editDate,
        entry_type: editType,
        memo: editMemo || undefined,
        vendor_name: editVendor || undefined,
        invoice_number: editInvoiceNumber || undefined,
        invoice_date: editInvoiceDate || undefined,
        due_date: editDueDate || undefined,
        // Currency/FX removed
        reversing: editReversing || undefined,
        reversal_date: editReversalDate || undefined,
        lines: editLines.map(ln => ({
          account_id: ln.account_id as number,
          debit_amount: lineAmount(ln.debit) || 0,
          credit_amount: lineAmount(ln.credit) || 0,
          description: ln.description || undefined,
        }))
      }
      await apiClient.request('PUT', `/accounting/journal-entries/${selectedEntry.id}`, payload)
      toast.success('Draft saved')
      setShowEditDialog(false)
      await fetchEntries()
      try {
        const updated = await apiClient.request('GET', `/accounting/journal-entries/${selectedEntry.id}`)
        setSelectedEntry(updated)
      } catch {}
    } catch (e: any) {
      console.error('Save draft failed', e)
      toast.error(e?.message || 'Failed to save draft')
    } finally {
      setEditingDraft(false)
    }
  }

  // Bank matching helpers
  const loadBankAccounts = async () => {
    if (!selectedEntityId) return
    try {
      const res = await fetch(`/api/accounting/bank-reconciliation/accounts?entity_id=${selectedEntityId}`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setBankAccounts((data || []).map((a: any) => ({ id: a.id, account_name: a.account_name, bank_name: a.bank_name })))
      if ((data || []).length > 0 && !selectedBankAccountId) setSelectedBankAccountId((data[0] || {}).id)
    } catch {}
  }

  const loadBankTransactions = async () => {
    if (!selectedBankAccountId) return
    try {
      setTxnsLoading(true)
      const params = new URLSearchParams({ bank_account_id: String(selectedBankAccountId) })
      if (matchDateFrom) params.set('date_from', matchDateFrom)
      if (matchDateTo) params.set('date_to', matchDateTo)
      params.set('status', 'unmatched')
      const res = await fetch(`/api/accounting/bank-reconciliation/transactions?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setTxns((data || []).map((t: any) => ({ id: t.id, transaction_date: t.transaction_date, description: t.description, amount: Number(t.amount), is_matched: t.is_matched })))
    } catch {}
    finally { setTxnsLoading(false) }
  }

  useEffect(() => {
    if (bankMatchOpen) {
      loadBankAccounts()
      // delay transactions load until account is set
      setTimeout(() => { loadBankTransactions() }, 50)
    }
  }, [bankMatchOpen])

  useEffect(() => {
    if (bankMatchOpen && selectedBankAccountId) loadBankTransactions()
  }, [bankMatchOpen, selectedBankAccountId, matchDateFrom, matchDateTo])

  const matchTxnToJE = async (txnId: number) => {
    if (!selectedEntry) return
    try {
      const res = await fetch('/api/accounting/bank-reconciliation/transactions/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bank_transaction_id: txnId, journal_entry_id: selectedEntry.id })
      })
      if (!res.ok) throw new Error('Match failed')
      toast.success('Matched bank transaction to entry')
      await loadBankTransactions()
    } catch (e: any) {
      console.error('Match failed', e)
      toast.error('Failed to match transaction')
    }
  }

  const handleEditDocUpload = async (file: File) => {
    if (!selectedEntityId || !selectedEntry) return
    try {
      setEditDocUploading(true)
      const form = new FormData()
      form.append('file', file)
      form.append('entity_id', String(selectedEntityId))
      form.append('category', 'supporting_document')
      const resp = await fetch('/api/accounting/documents/upload', { method: 'POST', body: form, credentials: 'include' })
      if (!resp.ok) throw new Error('Upload failed')
      const doc = await resp.json()
      const { apiClient } = await import('@/lib/api')
      await apiClient.request('POST', `/accounting/journal-entries/${selectedEntry.id}/attachments`, { document_ids: [Number(doc.id)] })
      // Refresh selected entry and update viewer state to the newly added document
      let updated: any = null
      try {
        updated = await apiClient.request('GET', `/accounting/journal-entries/${selectedEntry.id}`)
        setSelectedEntry(updated)
      } catch {}
      try { if (editDocViewerUrl) URL.revokeObjectURL(editDocViewerUrl) } catch {}
      // Determine index of newly added doc in updated attachments and load it
      const atts = (updated?.attachments || []).sort((a:any,b:any)=> (a.display_order - b.display_order) || (a.attachment_id - b.attachment_id))
      const idx = Math.max(0, atts.findIndex((a: any) => a.document_id === Number(doc.id)))
      setEditViewerIndex(idx)
      try {
        const v = await fetch(`/api/accounting/documents/view/${doc.id}`, { credentials: 'include' })
        if (v.ok) {
          const blob = await v.blob()
          const url = URL.createObjectURL(blob)
          setEditDocViewerUrl(url)
        }
      } catch {}
      toast.success('Document uploaded, linked, and loaded')
    } catch (e: any) {
      console.error('Edit upload failed', e)
      toast.error('Failed to upload document')
    } finally {
      setEditDocUploading(false)
    }
  }

  const handleEditDocSelect: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const list = Array.from(files)
    ;(async () => { for (const f of list) { await handleEditDocUpload(f) } })()
  }

  const linkExistingDocForEdit = async (docId: number) => {
    if (!selectedEntry) return
    try {
      const { apiClient } = await import('@/lib/api')
      await apiClient.request('POST', `/accounting/journal-entries/${selectedEntry.id}/attachments`, { document_ids: [docId] })
      // Refresh selected entry and load the linked document into the viewer
      let updated: any = null
      try {
        updated = await apiClient.request('GET', `/accounting/journal-entries/${selectedEntry.id}`)
        setSelectedEntry(updated)
      } catch {}
      const atts = (updated?.attachments || []).sort((a:any,b:any)=> (a.display_order - b.display_order) || (a.attachment_id - b.attachment_id))
      const idx = Math.max(0, atts.findIndex((a: any) => a.document_id === docId))
      setEditViewerIndex(idx)
      try { if (editDocViewerUrl) URL.revokeObjectURL(editDocViewerUrl) } catch {}
      try {
        const v = await fetch(`/api/accounting/documents/view/${docId}`, { credentials: 'include' })
        if (v.ok) {
          const blob = await v.blob()
          const url = URL.createObjectURL(blob)
          setEditDocViewerUrl(url)
        }
      } catch {}
      toast.success('Linked document and loaded in viewer')
    } catch (e: any) {
      console.error('Link existing failed', e)
      toast.error('Failed to link document')
    }
  }

  const loadEditViewerByIndex = async (idx: number) => {
    if (!selectedEntry) return
    const atts = (selectedEntry.attachments || []).sort((a:any,b:any)=> (a.display_order - b.display_order) || (a.attachment_id - b.attachment_id))
    if (atts.length === 0) return
    const safeIdx = Math.max(0, Math.min(idx, atts.length - 1))
    setEditViewerIndex(safeIdx)
    const docId = atts[safeIdx].document_id
    try { if (editDocViewerUrl) URL.revokeObjectURL(editDocViewerUrl) } catch {}
    try {
      const v = await fetch(`/api/accounting/documents/view/${docId}`, { credentials: 'include' })
      if (v.ok) {
        const blob = await v.blob()
        const url = URL.createObjectURL(blob)
        setEditDocViewerUrl(url)
      }
    } catch {}
  }

  // Create viewer navigation helper
  const loadCreateViewerByIndex = async (idx: number, idsParam?: number[]) => {
    const ids = (idsParam && idsParam.length ? idsParam : [
      ...(createDocId ? [createDocId] : []),
      ...createSelectedDocs.filter(id => id !== createDocId)
    ].map(Number)).filter(Boolean)
    if (ids.length === 0) return
    const safeIdx = Math.max(0, Math.min(idx, ids.length - 1))
    setCreateViewerIndex(safeIdx)
    try { if (createDocViewerUrl) URL.revokeObjectURL(createDocViewerUrl) } catch {}
    try {
      const v = await fetch(`/api/accounting/documents/view/${ids[safeIdx]}`, { credentials: 'include' })
      if (v.ok) {
        const blob = await v.blob()
        const url = URL.createObjectURL(blob)
        setCreateDocViewerUrl(url)
      }
    } catch {}
  }

  // Create-side document upload + selector
  const handleCreateDocUpload = async (file: File) => {
    if (!selectedEntityId) {
      try { toast.error('Select an entity first') } catch {}
      return
    }
    try {
      setCreateDocUploading(true)
      const form = new FormData()
      form.append('file', file)
      form.append('entity_id', String(selectedEntityId))
      form.append('category', 'supporting_document')
      const resp = await fetch('/api/accounting/documents/upload', {
        method: 'POST',
        body: form,
        credentials: 'include'
      })
      if (!resp.ok) throw new Error('Upload failed')
      const doc = await resp.json()
      setCreateDocId(Number(doc.id))
      setCreateDocName(doc.original_name || doc.filename)
      const newIds = [
        Number(doc.id),
        ...(createDocId ? [createDocId] : []),
        ...createSelectedDocs.filter(id => id !== Number(doc.id) && id !== createDocId)
      ]
      await loadCreateViewerByIndex(0, newIds)
    } catch (e) {
      console.error('Upload supporting document failed', e)
      try { toast.error('Failed to upload supporting document') } catch {}
    } finally {
      setCreateDocUploading(false)
    }
  }

  const handleCreateDocSelect: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const list = Array.from(files)
    ;(async () => { for (const f of list) { await handleCreateDocUpload(f) } })()
  }

  // Submit create JE
  const submitCreate = async () => {
    if (!canCreate || !selectedEntityId) return
    try {
      setCreating(true)
      const { apiClient } = await import('@/lib/api')
      const payload = {
        entity_id: selectedEntityId,
        entry_date: createDate,
        entry_type: createType,
        memo: createMemo || undefined,
        vendor_name: createVendor || undefined,
        invoice_number: createInvoiceNumber || undefined,
        invoice_date: createInvoiceDate || undefined,
        due_date: createDueDate || undefined,
        reversing: createReversing || undefined,
        reversal_date: createReversalDate || undefined,
        lines: createLines.map(ln => ({
          account_id: ln.account_id as number,
          debit_amount: parseFloat(ln.debit || '0') || 0,
          credit_amount: parseFloat(ln.credit || '0') || 0,
          description: ln.description || undefined,
        })),
      }
      const newEntry = await apiClient.request('POST', '/accounting/journal-entries', payload)
      if (newEntry?.id) {
        const toAttach: number[] = []
        if (createDocId) toAttach.push(createDocId)
        for (const id of createSelectedDocs) if (!toAttach.includes(id)) toAttach.push(id)
        if (toAttach.length > 0) {
          try {
            await apiClient.request('POST', `/accounting/journal-entries/${newEntry.id}/attachments`, {
              document_ids: toAttach,
              set_primary_document_id: createDocId || toAttach[0],
            })
          } catch (e) {
            console.warn('JE created but failed to attach selected documents', e)
          }
        }
      }
      toast.success('Journal entry created')
      setShowCreateDialog(false)
      // Reset form
      setCreateLines([
        { account_id: null, description: '', debit: '', credit: '' },
        { account_id: null, description: '', debit: '', credit: '' },
      ])
      setCreateMemo('')
      setCreateType('Standard')
      setCreateDate(new Date().toISOString().split('T')[0])
      setCreateDocId(null)
      setCreateDocName('')
      setCreateSelectedDocs([])
      try { if (createDocViewerUrl) URL.revokeObjectURL(createDocViewerUrl) } catch {}
      setCreateDocViewerUrl(null)
      await fetchEntries()
      setActiveTab('draft')
    } catch (e: any) {
      console.error('Create JE failed', e)
      toast.error(e?.message || 'Failed to create journal entry')
    } finally {
      setCreating(false)
    }
  }

  // removed leftover XBRL mapping function

  // Filter entries by status
  const getFilteredEntries = useCallback(() => {
    let filtered = entries

    // Filter by tab
    if (activeTab === "draft") {
      // Draft: workflow_stage = 0 and status = "draft"
      filtered = entries.filter(e => e.workflow_stage === 0 && e.status === "draft")
    } else if (activeTab === "pending") {
      // Pending: standardized workflow_stage = 1
      filtered = entries.filter(e => e.workflow_stage === 1)
    } else if (activeTab === "posted") {
      // Posted: standardized workflow_stage = 2 or is_locked/status posted
      filtered = entries.filter(e =>
        e.workflow_stage === 2 ||
        e.is_locked === true ||
        e.status === "posted"
      )
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(entry =>
        entry.entry_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.memo.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered
  }, [entries, activeTab, searchQuery])

  const filteredEntries = getFilteredEntries()

  // Stats
  const stats = {
    total: entries.length,
    draft: entries.filter(e => e.workflow_stage === 0 && e.status === "draft").length,
    pending: entries.filter(e => e.workflow_stage === 1).length,
    posted: entries.filter(e =>
      e.workflow_stage === 2 ||
      e.is_locked === true ||
      e.status === "posted"
    ).length,
  }

  // Debug logging
  if (entries.length > 0 && stats.draft === 0) {
    console.log('[JE] WARNING: DRAFT FILTER ISSUE - All entries:', entries.map(e => ({
      id: e.id,
      status: e.status,
      status_type: typeof e.status,
      workflow_stage: e.workflow_stage,
      workflow_stage_type: typeof e.workflow_stage,
      passes_filter: e.workflow_stage === 0 && e.status === "draft"
    })))
  }

  // Workflow actions
  const submitForApproval = useCallback(async (entryId: number) => {
    try {
      setActionLoading(true)
      const { apiClient } = await import('@/lib/api')
      await apiClient.request('POST', `/accounting/journal-entries/${entryId}/submit`)
      toast.success("Journal entry submitted for approval")
      await fetchEntries()
    } catch (error) {
      console.error("Error submitting:", error)
      toast.error("Error submitting journal entry")
    } finally {
      setActionLoading(false)
    }
  }, [fetchEntries])

  const handleApprove = useCallback(async () => {
    if (!selectedEntry) return

    try {
      setActionLoading(true)
      const { apiClient } = await import('@/lib/api')
      await apiClient.request('POST', `/accounting/journal-entries/${selectedEntry.id}/approve`, {
        approver_email: "lwhitworth@ngicapitaladvisory.com", // TODO: Get from auth
        notes: approvalNotes
      })
      toast.success("Journal entry approved successfully")
      setShowApprovalDialog(false)
      setApprovalNotes("")
      await fetchEntries()
    } catch (error) {
      console.error("Error approving:", error)
      toast.error("Error approving journal entry")
    } finally {
      setActionLoading(false)
    }
  }, [selectedEntry, approvalNotes, fetchEntries])

  const handleReject = useCallback(async () => {
    if (!selectedEntry || !approvalNotes) {
      toast.error("Please provide a rejection reason")
      return
    }

    try {
      setActionLoading(true)
      const { apiClient } = await import('@/lib/api')
      await apiClient.request('POST', `/accounting/journal-entries/${selectedEntry.id}/reject`, {
        reason: approvalNotes,
        rejected_by_email: "lwhitworth@ngicapitaladvisory.com" // TODO: Get from auth
      })
      toast.success("Journal entry rejected")
      setShowApprovalDialog(false)
      setApprovalNotes("")
      await fetchEntries()
    } catch (error) {
      console.error("Error rejecting:", error)
      toast.error("Error rejecting journal entry")
    } finally {
      setActionLoading(false)
    }
  }, [selectedEntry, approvalNotes, fetchEntries])

  const handlePost = useCallback(async (entryId: number) => {
    try {
      setActionLoading(true)
      const { apiClient } = await import('@/lib/api')
      await apiClient.request('POST', `/accounting/journal-entries/${entryId}/post`, {
        posted_by_email: "system@ngicapitaladvisory.com"
      })
      toast.success("Journal entry posted to general ledger")
      await fetchEntries()
    } catch (error) {
      console.error("Error posting:", error)
      toast.error("Error posting journal entry")
    } finally {
      setActionLoading(false)
    }
  }, [fetchEntries])

  // View entry details
  const viewEntry = useCallback(async (entry: JournalEntry) => {
    try {
      const { apiClient } = await import('@/lib/api')
      const fullEntry = await apiClient.request('GET', `/accounting/journal-entries/${entry.id}`)
      setSelectedEntry(fullEntry)
      setShowDetailModal(true)

      // Prefer attachments for viewer
      const atts = (fullEntry as any).attachments as any[] | undefined
      if (atts && atts.length > 0) {
        const primaryIdx = Math.max(0, atts.findIndex(a => a.is_primary))
        const idx = primaryIdx >= 0 ? primaryIdx : 0
        try {
          const v = await fetch(`/api/accounting/documents/view/${atts[idx].document_id}`, { credentials: 'include' })
          if (v.ok) {
            const blob = await v.blob()
            try { if (documentUrl) URL.revokeObjectURL(documentUrl) } catch {}
            const url = URL.createObjectURL(blob)
            setDocumentUrl(url)
          } else {
            setDocumentUrl(null)
          }
        } catch {
          setDocumentUrl(null)
        }
        return
      }

      // Legacy fallback
      if (fullEntry.document_id) {
        try {
          const v = await fetch(`/api/accounting/documents/view/${fullEntry.document_id}`, { credentials: 'include' })
          if (v.ok) {
            const blob = await v.blob()
            try { if (documentUrl) URL.revokeObjectURL(documentUrl) } catch {}
            const url = URL.createObjectURL(blob)
            setDocumentUrl(url)
          } else {
            setDocumentUrl(null)
          }
        } catch {
          setDocumentUrl(null)
        }
      } else {
        setDocumentUrl(null)
      }
    } catch (error) {
      console.error("Error loading entry details:", error)
      toast.error("Error loading entry details")
    }
  }, [])

  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState<number>(0)
  const loadAttachmentByIndex = useCallback(async (idx: number) => {
    if (!selectedEntry || !selectedEntry.attachments || selectedEntry.attachments.length === 0) return
    const n = selectedEntry.attachments.length
    const bounded = ((idx % n) + n) % n
    setCurrentAttachmentIndex(bounded)
    try {
      const docId = selectedEntry.attachments[bounded].document_id
      const v = await fetch(`/api/accounting/documents/view/${docId}`, { credentials: 'include' })
      if (v.ok) {
        const blob = await v.blob()
        try { if (documentUrl) URL.revokeObjectURL(documentUrl) } catch {}
        const url = URL.createObjectURL(blob)
        setDocumentUrl(url)
      }
    } catch {}
  }, [selectedEntry, documentUrl])

  const detachAttachment = useCallback(async (docId: number) => {
    if (!selectedEntry) return
    try {
      const res = await fetch(`/api/accounting/journal-entries/${selectedEntry.id}/attachments/${docId}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Failed to detach')
      const { apiClient } = await import('@/lib/api')
      const updated = await apiClient.request('GET', `/accounting/journal-entries/${selectedEntry.id}`)
      setSelectedEntry(updated)
      if ((updated.attachments || []).length > 0) {
        await loadAttachmentByIndex(Math.min(currentAttachmentIndex, (updated.attachments || []).length - 1))
      } else {
        try { if (documentUrl) URL.revokeObjectURL(documentUrl) } catch {}
        setDocumentUrl(null)
      }
      toast.success('Attachment removed')
    } catch (e) {
      console.error('Detach failed', e)
      toast.error('Failed to remove attachment')
    }
  }, [selectedEntry, currentAttachmentIndex, documentUrl, loadAttachmentByIndex])

  const setPrimaryAttachment = useCallback(async (docId: number) => {
    if (!selectedEntry) return
    try {
      const orderedIds = (selectedEntry.attachments || []).sort((a,b)=>a.display_order-b.display_order).map(a=>a.document_id)
      const res = await fetch(`/api/accounting/journal-entries/${selectedEntry.id}/attachments/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ordered_document_ids: orderedIds, primary_document_id: docId })
      })
      if (!res.ok) throw new Error('Failed to set primary')
      const { apiClient } = await import('@/lib/api')
      const updated = await apiClient.request('GET', `/accounting/journal-entries/${selectedEntry.id}`)
      setSelectedEntry(updated)
      const idx = Math.max(0, (updated.attachments || []).findIndex((a: any) => a.document_id === docId))
      await loadAttachmentByIndex(idx)
      toast.success('Primary attachment set')
    } catch (e) {
      console.error('Set primary failed', e)
      toast.error('Failed to set primary')
    }
  }, [selectedEntry, loadAttachmentByIndex])

  // Handle document upload
  const handleDocumentUpload = useCallback(async (file: File) => {
    if (!selectedEntry) return

    try {
      setUploadingDocument(true)
      const { apiClient } = await import('@/lib/api')

      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entity_id', selectedEntry.entity_id.toString())
      formData.append('category', 'supporting_document')

      // Upload document
      const uploadResponse = await fetch('/api/accounting/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      if (!uploadResponse.ok) {
        throw new Error('Upload failed')
      }

      const uploadedDoc = await uploadResponse.json()

      // Link document to journal entry (attachments API)
      await apiClient.request('POST', `/accounting/journal-entries/${selectedEntry.id}/attachments`, {
        document_ids: [uploadedDoc.id]
      })

      toast.success("Document uploaded and linked successfully")

      // Refresh entry details
      const updatedEntry = await apiClient.request('GET', `/accounting/journal-entries/${selectedEntry.id}`)
      setSelectedEntry(updatedEntry)
      // If attachments exist, load the last added
      if ((updatedEntry.attachments || []).length > 0) {
        const last = (updatedEntry.attachments || []).length - 1
        await loadAttachmentByIndex(last)
      }
    } catch (error) {
      console.error("Error uploading document:", error)
      toast.error("Failed to upload document")
    } finally {
      setUploadingDocument(false)
    }
  }, [selectedEntry])

  // Open approval dialog
  const openApprovalDialog = useCallback((entry: JournalEntry) => {
    setSelectedEntry(entry)
    setShowApprovalDialog(true)
    setApprovalNotes("")
  }, [])

  // Status badge
  const getStatusBadge = (entry: JournalEntry) => {
    // Posted: workflow_stage = 3 OR is_locked = true OR status = "posted"
    if (entry.workflow_stage === 3 || entry.is_locked || entry.status === "posted") {
      return (
        <Badge variant="default" className="bg-green-600">
          <Lock className="h-3 w-3 mr-1" />
          Posted
        </Badge>
      )
    }

    // Pending Approval: workflow_stage = 1 (first approval) or 2 (second approval)
    if (entry.workflow_stage === 1 || entry.workflow_stage === 2) {
      return (
        <Badge variant="default" className="bg-yellow-600">
          <Clock className="h-3 w-3 mr-1" />
          Pending Approval
        </Badge>
      )
    }

    // Draft: workflow_stage = 0 AND status = "draft"
    if (entry.workflow_stage === 0 && entry.status === "draft") {
      return (
        <Badge variant="secondary">
          <FileText className="h-3 w-3 mr-1" />
          Draft
        </Badge>
      )
    }

    // Fallback for any unexpected status
    return <Badge variant="outline">{entry.status}</Badge>
  }

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

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
      className="space-y-4 no-scrollbar overflow-y-auto max-h-[80vh]"
    >
      {/* Actions + Stats */}
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={() => setShowCreateDialog(true)} disabled={!selectedEntityId}>
          <Plus className="h-4 w-4 mr-2" />
          New Journal Entry
        </Button>
      </div>

      {/* Stats Cards - Clickable */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md hover:scale-105 ${isHighlighted('all') ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setActiveTab('all')}
          onMouseEnter={() => setHoveredTab('all')}
          onMouseLeave={() => setHoveredTab(null)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Journal Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All journal entries</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md hover:scale-105 ${isHighlighted('draft') ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setActiveTab('draft')}
          onMouseEnter={() => setHoveredTab('draft')}
          onMouseLeave={() => setHoveredTab(null)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md hover:scale-105 ${activeTab === 'pending' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Needs approval</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md hover:scale-105 ${activeTab === 'posted' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setActiveTab('posted')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Posted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.posted}</div>
            <p className="text-xs text-muted-foreground mt-1">Posted to GL</p>
          </CardContent>
        </Card>
      </div>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {activeTab === 'all' && 'Total Journal Entries'}
              {activeTab === 'draft' && 'Draft Entries'}
              {activeTab === 'pending' && 'Pending Approval'}
              {activeTab === 'posted' && 'Posted Entries'}
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No journal entries found</p>
              <p className="text-sm text-muted-foreground">
                {entries.length === 0
                  ? "Upload documents to automatically generate journal entries"
                  : `No entries in ${activeTab} status`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debits</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Attch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => viewEntry(entry)}
                  >
                    <TableCell className="font-mono text-sm">
                      {entry.entry_number}
                    </TableCell>
                    <TableCell>{formatDate(entry.entry_date)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {entry.memo || "No description"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${entry.total_debits?.toFixed(2) || "0.00"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${entry.total_credits?.toFixed(2) || "0.00"}
                    </TableCell>
                    <TableCell>{getStatusBadge(entry)}</TableCell>
                    <TableCell className="text-right">
                      {(entry as any).attachments && (entry as any).attachments.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Paperclip className="h-3 w-3" />
                          {(entry as any).attachments.length}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </CardContent>
    </Card>

    {/* Create JE Dialog */}
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto no-scrollbar">
        <DialogHeader>
          <DialogTitle>Create Journal Entry</DialogTitle>
          <DialogDescription>Enter header and lines. Entry must be balanced.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Supporting Document + Viewer + Link Existing */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5 space-y-2">
              <Label>Supporting Document</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleCreateDocSelect} disabled={createDocUploading || !selectedEntityId} />
                <Button variant="outline" disabled>{createDocUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : 'Upload'}</Button>
              </div>
              {createDocName && <div className="text-xs text-muted-foreground truncate">{createDocName}</div>}
              <p className="text-xs text-muted-foreground">Upload a PDF or image to reference while creating the entry. It will be linked to the JE automatically.</p>

              <div className="mt-3 space-y-2">
                <Label>Or Link Existing</Label>
                <div className="flex items-center gap-2">
                  <Select value={existingDocsCategory} onValueChange={setExistingDocsCategory}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="All Categories" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {existingDocCategories.map(c => (
                        <SelectItem key={c} value={c}>{formatCategory(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Search in category" value={existingDocsSearch} onChange={(e) => { setExistingDocsSearch(e.target.value); setExistingDocsPage(1) }} />
                </div>
                <div className="border rounded-md max-h-48 overflow-auto no-scrollbar">
                  {existingDocsLoading ? (
                    <div className="p-3 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                  ) : (
                    (() => {
                      const filtered = existingDocs
                        .filter(d => existingDocsCategory === 'all' ? true : (d.category || 'other') === existingDocsCategory)
                        .filter(d => {
                          if (!existingDocsSearch) return true
                          const q = existingDocsSearch.toLowerCase()
                          return (d.original_name || '').toLowerCase().includes(q)
                        })
                      const pageSize = 25
                      const slice = filtered.slice(0, existingDocsPage * pageSize)
                      return (
                        <>
                          {(() => {
                            const currentIds = [
                              ...(createDocId ? [createDocId] : []),
                              ...createSelectedDocs.filter(id => id !== createDocId),
                            ]
                            const currentId = currentIds.length ? currentIds[Math.max(0, Math.min(createViewerIndex, currentIds.length - 1))] : null
                            return slice.map(d => (
                              <div key={d.id} className={`w-full px-2 py-1 rounded flex items-center justify-between ${currentId === d.id ? 'bg-accent/20 border border-accent' : 'hover:bg-muted'}`}>
                                <button className="truncate text-sm text-left flex-1" onClick={() => selectExistingDocForCreate(d.id)} title={d.original_name}>
                                  {d.original_name}
                                </button>
                                <span className="text-xs text-muted-foreground ml-2">{new Date(d.upload_date).toLocaleDateString()}</span>
                              </div>
                            ))
                          })()}
                          {slice.length < filtered.length && (
                            <div className="p-2">
                              <Button variant="outline" size="sm" className="w-full" onClick={() => setExistingDocsPage(p => p + 1)}>Load more</Button>
                            </div>
                          )}
                        </>
                      )
                    })()
                  )}
                </div>
                {/* Multi-select indicator removed */}
              </div>
            </div>
            <div className="col-span-7">
              <div className="h-[60vh] bg-muted rounded-md overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-2 border-b text-xs">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => loadCreateViewerByIndex(createViewerIndex - 1)} disabled={((createDocId ? 1 : 0) + createSelectedDocs.length) <= 1 || createViewerIndex <= 0}><ChevronLeft className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => loadCreateViewerByIndex(createViewerIndex + 1)} disabled={((createDocId ? 1 : 0) + createSelectedDocs.length) <= 1 || createViewerIndex >= (((createDocId ? 1 : 0) + createSelectedDocs.length) - 1)}><ChevronRight className="h-3 w-3" /></Button>
                    <span className="text-muted-foreground">{((createDocId ? 1 : 0) + createSelectedDocs.length) > 0 ? `${createViewerIndex + 1} / ${((createDocId ? 1 : 0) + createSelectedDocs.length)}` : '0 / 0'}</span>
                    <Button variant="ghost" size="sm" onClick={removeCurrentCreateViewerDoc} disabled={((createDocId ? 1 : 0) + createSelectedDocs.length) === 0}><X className="h-3 w-3" /></Button>
                  </div>
                  <div className="truncate text-muted-foreground">
                    {(() => {
                      const ids = [ ...(createDocId ? [createDocId] : []), ...createSelectedDocs.filter(id => id !== createDocId) ]
                      const id = ids[createViewerIndex]
                      const doc = (existingDocs || []).find(d => Number(d.id) === Number(id))
                      return doc ? (doc.original_name || doc.filename) : (createDocName || '')
                    })()}
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  {createDocViewerUrl ? (
                    <iframe key={createViewerIndex} src={createDocViewerUrl} className="w-full h-full border-0" title="Supporting Document" />
                  ) : (
                    <div className="text-sm text-muted-foreground">No document selected</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <Label>Date</Label>
              <Input type="date" value={createDate} onChange={(e) => setCreateDate(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Type</Label>
              <Select value={createType} onValueChange={setCreateType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Adjusting">Adjusting</SelectItem>
                  <SelectItem value="Closing">Closing</SelectItem>
                  <SelectItem value="Reversing">Reversing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-4">
              <Label>Memo</Label>
              <Input value={createMemo} onChange={(e) => setCreateMemo(e.target.value)} placeholder="Description" />
            </div>
            {/* Reference removed per US GAAP workflow simplification */}
            {/* US GAAP Header Metadata */}
            <div className="col-span-2">
              <Label>Vendor/Merchant</Label>
              <Input value={createVendor} onChange={(e) => setCreateVendor(e.target.value)} placeholder="Counterparty name" />
            </div>
            <div className="col-span-2">
              <Label>Invoice Number</Label>
              <Input value={createInvoiceNumber} onChange={(e) => setCreateInvoiceNumber(e.target.value)} placeholder="Invoice #" />
            </div>
            <div className="col-span-2">
              <Label>Invoice Date</Label>
              <Input type="date" value={createInvoiceDate} onChange={(e) => setCreateInvoiceDate(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Due Date</Label>
              <Input type="date" value={createDueDate} onChange={(e) => setCreateDueDate(e.target.value)} />
            </div>
            {/* Currency and FX Rate removed (always USD) */}
            <div className="col-span-2 flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={createReversing} onChange={(e)=> setCreateReversing(e.target.checked)} /> Auto-reverse</label>
              <Input type="date" value={createReversalDate} onChange={(e)=> setCreateReversalDate(e.target.value)} placeholder="YYYY-MM-DD" />
            </div>
          </div>

          <div className="border rounded-md">
            <div className="flex items-center justify-between p-2 border-b bg-muted/40">
              <div className="text-sm font-medium">Lines</div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">Debits: ${totals.debits.toFixed(2)} | Credits: ${totals.credits.toFixed(2)} {Math.abs(totals.debits - totals.credits) < 0.000001 ? <span className="text-green-600 ml-2">Balanced</span> : <span className="text-red-600 ml-2">Not Balanced</span>}</div>
                <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Add Line</Button>
              </div>
            </div>
            <div className="p-2 space-y-3 max-h-[50vh] overflow-auto no-scrollbar">
              <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
                <div className="col-span-4">Account</div>
                <div className="col-span-3">Description</div>
                <div className="col-span-2 text-right">Debit</div>
                <div className="col-span-2 text-right">Credit</div>
                <div className="col-span-1"></div>
              </div>
              {createLines.map((ln, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4">
                    <Select value={ln.account_id ? String(ln.account_id) : undefined} onValueChange={(val) => { const id = Number(val); setLineField(idx, 'account_id', id); }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select account" /></SelectTrigger>
                      <SelectContent>
                        <div className="p-2 sticky top-0 bg-background">
                          <Input autoFocus placeholder="Search accounts" value={ln.q || ""} onChange={(e) => setCreateLines(prev => prev.map((l, i) => i === idx ? { ...l, q: e.target.value } : l))} />
                        </div>
                        {(postingAccounts.filter(a => { const q = (ln.q || "").toLowerCase(); if (!q) return true; return a.account_number.includes(ln.q || "") || a.account_name.toLowerCase().includes(q) })).map(acc => (
                          <SelectItem key={acc.id} value={String(acc.id)}>
                            <span className="font-mono mr-2">{acc.account_number}</span>
                            {acc.account_name}
                          </SelectItem>
                        ))}
                        {(postingAccounts.filter(a => { const q = (ln.q || "").toLowerCase(); if (!q) return true; return a.account_number.includes(ln.q || "") || a.account_name.toLowerCase().includes(q) })).length === 0 && (
                          <div className="px-3 py-2 text-xs text-muted-foreground">No matching accounts</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input value={ln.description} onChange={(e) => setLineField(idx, 'description', e.target.value)} placeholder="Line description" />
                  </div>
                  <div className="col-span-2">
                    <Input inputMode="decimal" value={ln.debit} onChange={(e) => setLineField(idx, 'debit', e.target.value)} placeholder="0.00" className="text-right" />
                  </div>
                  <div className="col-span-2">
                    <Input inputMode="decimal" value={ln.credit} onChange={(e) => setLineField(idx, 'credit', e.target.value)} placeholder="0.00" className="text-right" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => removeLine(idx)} disabled={createLines.length <= 2}><X className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={!canCreate || creating}>
              {creating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Create Entry</>
              )}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>

    </motion.div>
  )
}







