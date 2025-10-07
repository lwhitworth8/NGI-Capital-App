"use client"

import { useEffect, useState, useCallback } from "react"
import { useEntityContext } from "@/hooks/useEntityContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  RefreshCw, Zap, Building2, CheckCircle2, 
  Clock, Loader2 
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

interface BankAccount {
  id: number
  entity_id: number
  bank_name: string
  account_name: string
  account_number_masked: string
  account_type: string
  mercury_account_id: string | null
  auto_sync_enabled: boolean
  last_sync_at: string | null
  last_sync_status: string | null
  current_balance: number
  is_active: boolean
}

interface BankTransaction {
  id: number
  bank_account_id: number
  transaction_date: string
  description: string
  amount: number
  merchant_name: string | null
  merchant_category: string | null
  is_matched: boolean
  matched_journal_entry_id: number | null
  status: string
  confidence_score: number | null
  suggested_account_id: number | null
  suggested_account_name: string | null
  mercury_transaction_id: string | null
}

export default function BankReconciliationView() {
  const { selectedEntityId } = useEntityContext()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [autoMatching, setAutoMatching] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")

  // Fetch bank accounts
  const fetchAccounts = useCallback(async () => {
    if (!selectedEntityId) return

    try {
      setLoading(true)
      const response = await fetch(
        `/api/accounting/bank-reconciliation/accounts?entity_id=${selectedEntityId}`,
        { credentials: "include" }
      )

      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
        
        if (data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data[0].id)
        }
      } else {
        toast.error("Failed to load bank accounts")
      }
    } catch (error) {
      console.error("Error loading bank accounts:", error)
      toast.error("Error loading bank accounts")
    } finally {
      setLoading(false)
    }
  }, [selectedEntityId, selectedAccountId])

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    if (!selectedAccountId) return

    try {
      setLoading(true)
      let url = `/api/accounting/bank-reconciliation/transactions?bank_account_id=${selectedAccountId}`
      
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`
      }

      const response = await fetch(url, { credentials: "include" })

      if (response.ok) {
        const data = await response.json()
        setTransactions(data)
      } else {
        toast.error("Failed to load transactions")
      }
    } catch (error) {
      console.error("Error loading transactions:", error)
      toast.error("Error loading transactions")
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId, statusFilter])

  useEffect(() => {
    if (selectedEntityId) {
      fetchAccounts()
    }
  }, [selectedEntityId, fetchAccounts])

  useEffect(() => {
    if (selectedAccountId) {
      fetchTransactions()
    }
  }, [selectedAccountId, statusFilter, fetchTransactions])

  // Handle Mercury sync
  const handleSync = useCallback(async () => {
    if (!selectedAccountId) return

    try {
      setSyncing(true)
      const response = await fetch(
        `/api/accounting/bank-reconciliation/accounts/${selectedAccountId}/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ days_back: 30 }),
          credentials: "include",
        }
      )

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || "Sync completed successfully!")
        await fetchTransactions()
        await fetchAccounts()
      } else {
        const error = await response.json()
        toast.error(error.detail || "Sync failed")
      }
    } catch (error) {
      console.error("Error syncing transactions:", error)
      toast.error("Error syncing transactions")
    } finally {
      setSyncing(false)
    }
  }, [selectedAccountId, fetchTransactions, fetchAccounts])

  // Handle auto-match
  const handleAutoMatch = useCallback(async () => {
    if (!selectedAccountId) return

    try {
      setAutoMatching(true)
      const response = await fetch(
        `/api/accounting/bank-reconciliation/accounts/${selectedAccountId}/auto-match`,
        {
          method: "POST",
          credentials: "include",
        }
      )

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || "Auto-matching completed!")
        await fetchTransactions()
      } else {
        const error = await response.json()
        toast.error(error.detail || "Auto-match failed")
      }
    } catch (error) {
      console.error("Error auto-matching transactions:", error)
      toast.error("Error auto-matching transactions")
    } finally {
      setAutoMatching(false)
    }
  }, [selectedAccountId, fetchTransactions])

  // Handle unmatch transaction
  const handleUnmatch = useCallback(async (transactionId: number) => {
    try {
      const response = await fetch(
        `/api/accounting/bank-reconciliation/transactions/${transactionId}/unmatch`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )

      if (response.ok) {
        toast.success("Transaction unmatched successfully")
        await fetchTransactions()
      } else {
        toast.error("Failed to unmatch transaction")
      }
    } catch (error) {
      console.error("Error unmatching transaction:", error)
      toast.error("Error unmatching transaction")
    }
  }, [fetchTransactions])

  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId)

  const stats = {
    total: transactions.length,
    matched: transactions.filter((t) => t.is_matched).length,
    unmatched: transactions.filter((t) => !t.is_matched).length,
    deposits: transactions.filter((t) => t.amount > 0).length,
    withdrawals: transactions.filter((t) => t.amount < 0).length,
  }

  const matchRate = stats.total > 0 ? Math.round((stats.matched / stats.total) * 100) : 0

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading && accounts.length === 0) {
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
          <h3 className="text-lg font-semibold">Bank Reconciliation</h3>
          <p className="text-sm text-muted-foreground">Automated Mercury sync with smart transaction matching</p>
        </div>
        <Button onClick={handleSync} disabled={syncing || !selectedAccountId} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Mercury"}
        </Button>
      </div>

      {/* Bank Account Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Account</CardTitle>
          <CardDescription>Select a bank account to reconcile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Select
                value={selectedAccountId?.toString() || ""}
                onValueChange={(value) => setSelectedAccountId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>{account.bank_name} - {account.account_name}</span>
                        <span className="text-muted-foreground">({account.account_number_masked})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {accounts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No bank accounts found. Add a bank account to get started.
                </p>
              )}
            </div>

            {selectedAccount && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Balance:</span>
                        <span className="font-semibold">{formatCurrency(selectedAccount.current_balance)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Sync:</span>
                        <span className="text-sm">
                          {selectedAccount.last_sync_at ? formatDate(selectedAccount.last_sync_at) : "Never"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Mercury:</span>
                        {selectedAccount.mercury_account_id ? (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Not Connected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Matched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.matched}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unmatched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.unmatched}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Match Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{matchRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Button 
              onClick={handleAutoMatch} 
              disabled={autoMatching || !selectedAccountId || stats.unmatched === 0} 
              className="w-full"
            >
              {autoMatching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Matching...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Auto-Match
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>Review and match bank transactions</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="matched">Matched Only</SelectItem>
                <SelectItem value="unmatched">Unmatched Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="h-8 w-8 text-primary" />
              </motion.div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No transactions found</p>
              <p className="text-sm text-muted-foreground mb-6">
                {!selectedAccountId 
                  ? "Select a bank account to view transactions"
                  : "Sync your bank account to import transactions"}
              </p>
              {selectedAccountId && (
                <Button onClick={handleSync} disabled={syncing}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                  Sync Now
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Match Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn, index) => (
                  <motion.tr
                    key={txn.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="border-b"
                  >
                    <TableCell>{formatDate(txn.transaction_date)}</TableCell>
                    <TableCell className="max-w-xs truncate">{txn.description}</TableCell>
                    <TableCell>
                      {txn.merchant_name ? (
                        <div>
                          <div className="font-medium">{txn.merchant_name}</div>
                          {txn.merchant_category && (
                            <div className="text-xs text-muted-foreground">{txn.merchant_category}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={txn.amount >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(txn.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          txn.is_matched ? "default" :
                          txn.status === "Pending" ? "secondary" :
                          "outline"
                        }
                      >
                        {txn.is_matched && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {!txn.is_matched && <Clock className="mr-1 h-3 w-3" />}
                        {txn.is_matched ? "Matched" : txn.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {txn.confidence_score !== null && (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div 
                              className={`h-full ${
                                txn.confidence_score >= 0.8 ? 'bg-green-600' :
                                txn.confidence_score >= 0.5 ? 'bg-yellow-600' :
                                'bg-red-600'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${txn.confidence_score * 100}%` }}
                              transition={{ duration: 0.5, delay: index * 0.02 }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(txn.confidence_score * 100)}%
                          </span>
                        </div>
                      )}
                      {txn.suggested_account_name && (
                        <div className="text-xs text-muted-foreground mt-1">
                          â†’ {txn.suggested_account_name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {txn.is_matched ? (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleUnmatch(txn.id)}
                        >
                          Unmatch
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          Match
                        </Button>
                      )}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}






