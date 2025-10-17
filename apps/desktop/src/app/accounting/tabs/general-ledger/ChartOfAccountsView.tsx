"use client"

import { useEffect, useState, useCallback } from "react"
import { useEntity } from "@/lib/context/UnifiedEntityContext"
import { EntitySelector } from "@/components/accounting/EntitySelector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Download, Plus, Search, ChevronRight, ChevronDown, 
  FileSpreadsheet, Loader2, CheckCircle2 
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Account {
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
  current_balance: number
  ytd_activity: number
  has_children: boolean
  level: number
}

interface AccountTreeNode {
  account: Account
  children: AccountTreeNode[]
}

export default function ChartOfAccountsView() {
  const { selectedEntity } = useEntity()
  const selectedEntityId = selectedEntity?.id
  const [accounts, setAccounts] = useState<Account[]>([])
  const [treeData, setTreeData] = useState<AccountTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [newOpen, setNewOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newNumber, setNewNumber] = useState("")
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState("Asset")
  const [newParentId, setNewParentId] = useState<string>("__NONE__")
  const [newBalance, setNewBalance] = useState("Debit")
  const [newAllowPosting, setNewAllowPosting] = useState(true)
  const [newRequireProject, setNewRequireProject] = useState(false)
  const [newDesc, setNewDesc] = useState("")

  // Build tree structure - memoized with useCallback (Context7 pattern)
  const buildTree = useCallback((accounts: Account[]): AccountTreeNode[] => {
    const accountMap = new Map<number, AccountTreeNode>()
    const roots: AccountTreeNode[] = []

    accounts.forEach(account => {
      accountMap.set(account.id, { account, children: [] })
    })

    accounts.forEach(account => {
      const node = accountMap.get(account.id)!
      if (account.parent_account_id && accountMap.has(account.parent_account_id)) {
        const parent = accountMap.get(account.parent_account_id)!
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots
  }, [])

  // Fetch accounts - memoized with useCallback (Context7 pattern)
  const fetchAccounts = useCallback(async () => {
    console.log("fetchAccounts called with selectedEntityId:", selectedEntityId)
    if (!selectedEntityId) {
      console.log("No selectedEntityId, returning early")
      return
    }
    
    try {
      setLoading(true)
      console.log("Making API call to:", `/api/accounting/coa?entity_id=${selectedEntityId}`)

      const response = await fetch(`/api/accounting/coa?entity_id=${selectedEntityId}`, {
        credentials: "include",
      })

      console.log("API Response status:", response.status)
      if (response.ok) {
        const data = await response.json()
        console.log("Accounts data received:", data.length, "accounts")
        setAccounts(data)
        
        // Build tree structure
        const tree = buildTree(data)
        setTreeData(tree)
      } else {
        console.error("Failed to load accounts:", response.status, response.statusText)
        toast.error("Failed to load accounts")
      }
    } catch (error) {
      console.error("Error loading accounts:", error)
      toast.error("Error loading accounts")
    } finally {
      setLoading(false)
    }
  }, [selectedEntityId, buildTree])

  // Removed auto-refresh - data loads once and stays loaded

  // Seed chart of accounts
  const seedChartOfAccounts = async () => {
    if (!selectedEntityId) {
      toast.error("Please select an entity first")
      return
    }

    try {
      setSeeding(true)
      
      const response = await fetch(`/api/accounting/coa/seed/${selectedEntityId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })

      if (response.ok) {
        toast.success("Chart of accounts seeded successfully!")
        fetchAccounts()
      } else {
        const error = await response.json()
        toast.error(error.detail || "Failed to seed chart of accounts")
      }
    } catch (error) {
      console.error("Error seeding COA:", error)
      toast.error("Error seeding chart of accounts")
    } finally {
      setSeeding(false)
    }
  }

  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  // Render tree node with animation
  const renderTreeNode = (node: AccountTreeNode, level: number = 0) => {
    const { account, children } = node
    const isExpanded = expandedNodes.has(account.id.toString())
    const hasChildren = children.length > 0

    return (
      <motion.div
        key={account.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="border-b last:border-b-0"
        style={{ paddingLeft: `${level * 20}px` }}
      >
        <div className="flex items-center py-3 hover:bg-accent/50 transition-colors">
          {hasChildren && (
            <button
              onClick={() => toggleNode(account.id.toString())}
              className="mr-2 p-1 hover:bg-accent rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-9" />}
          
          <div className="flex-1 grid grid-cols-12 gap-4 items-center">
            <div className="col-span-2">
              <span className="font-mono text-sm">{account.account_number}</span>
            </div>
            <div className="col-span-4">
              <span className="font-medium">{account.account_name}</span>
            </div>
            <div className="col-span-2">
              <Badge variant="outline">{account.account_type}</Badge>
            </div>
            <div className="col-span-2 text-right">
              <span className="font-mono text-sm">
                ${account.current_balance.toLocaleString()}
              </span>
            </div>
            <div className="col-span-2 flex justify-end">
              {account.is_active ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <span className="text-xs text-muted-foreground">Inactive</span>
              )}
            </div>
          </div>
        </div>

        {isExpanded && children.length > 0 && (
          <div>
            {children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </motion.div>
    )
  }

  // Filter accounts
  const filteredTree = treeData.filter(node => {
    if (selectedType !== "all" && node.account.account_type !== selectedType) {
      return false
    }
    if (searchQuery && !node.account.account_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !node.account.account_number.includes(searchQuery)) {
      return false
    }
    return true
  })

  useEffect(() => {
    console.log("ChartOfAccountsView useEffect - selectedEntityId:", selectedEntityId)
    if (selectedEntityId) {
      fetchAccounts()
    }
  }, [selectedEntityId, fetchAccounts])

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

  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Chart of Accounts Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This entity doesn't have a chart of accounts yet. Seed the default US GAAP chart to get started.
          </p>
          <p className="text-xs text-muted-foreground">
            Debug: selectedEntityId = {selectedEntityId}, loading = {loading.toString()}, accounts.length = {accounts.length}
          </p>
          <Button onClick={seedChartOfAccounts} disabled={seeding}>
            {seeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Seed Chart of Accounts
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Account Tree */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <CardTitle>Chart of Accounts</CardTitle>
            <div className="flex items-center gap-3 mt-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search accounts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="asset">Assets</SelectItem>
                  <SelectItem value="liability">Liabilities</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button size="sm" onClick={() => setNewOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Account
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Header */}
          <div className="flex items-center py-3 border-b font-medium text-sm">
            <div className="w-9" />
            <div className="flex-1 grid grid-cols-12 gap-4">
              <div className="col-span-2">Number</div>
              <div className="col-span-4">Name</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2 text-right">Balance</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
          </div>

          {/* Tree */}
          <div>
            {filteredTree.map(node => renderTreeNode(node))}
          </div>
        </CardContent>
      </Card>

      {/* New Account Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Account</DialogTitle>
            <DialogDescription>Create a posting or summary account.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Number</Label>
              <Input value={newNumber} onChange={(e) => setNewNumber(e.target.value)} placeholder="5-digit code" />
            </div>
            <div>
              <Label>Normal Balance</Label>
              <Select value={newBalance} onValueChange={setNewBalance}>
                <SelectTrigger><SelectValue placeholder="Debit/Credit" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Debit">Debit</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Account name" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asset">Asset</SelectItem>
                  <SelectItem value="Liability">Liability</SelectItem>
                  <SelectItem value="Equity">Equity</SelectItem>
                  <SelectItem value="Revenue">Revenue</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Parent (optional)</Label>
              <Select value={newParentId} onValueChange={setNewParentId}>
                <SelectTrigger><SelectValue placeholder="No parent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__NONE__">No parent</SelectItem>
                  {accounts
                    .sort((a,b)=> a.account_number.localeCompare(b.account_number))
                    .map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        <span className="font-mono mr-2">{a.account_number}</span>{a.account_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Description (optional)</Label>
              <Input value={newDesc} onChange={(e)=>setNewDesc(e.target.value)} placeholder="Description" />
            </div>
            <div className="col-span-2 flex items-center gap-4 mt-1">
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={newAllowPosting} onChange={(e)=>setNewAllowPosting(e.target.checked)} /> Allow posting</label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={newRequireProject} onChange={(e)=>setNewRequireProject(e.target.checked)} /> Require project</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setNewOpen(false)}>Cancel</Button>
            <Button onClick={async ()=>{
              if (!selectedEntityId){ toast.error('Select an entity'); return }
              if (!newNumber || newNumber.length < 4 || !newName){ toast.error('Enter number and name'); return }
              try {
                setCreating(true)
                const body = {
                  entity_id: selectedEntityId,
                  account_number: newNumber,
                  account_name: newName,
                  account_type: newType,
                  parent_account_id: newParentId !== '__NONE__' ? Number(newParentId) : undefined,
                  description: newDesc || undefined,
                  allow_posting: newAllowPosting,
                  require_project: newRequireProject,
                }
                const res = await fetch('/api/accounting/coa/', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body), credentials:'include' })
                if (!res.ok){ throw new Error(await res.text()) }
                toast.success('Account created')
                setNewOpen(false)
                setNewNumber(''); setNewName(''); setNewType('Asset'); setNewParentId('__NONE__'); setNewBalance('Debit'); setNewAllowPosting(true); setNewRequireProject(false); setNewDesc('')
                await fetchAccounts()
              } catch (e:any) {
                toast.error(e?.message || 'Failed to create account')
              } finally { setCreating(false) }
            }} disabled={creating}>
              {creating ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/> Creating...</>) : (<><CheckCircle2 className="h-4 w-4 mr-2"/> Create</>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}



