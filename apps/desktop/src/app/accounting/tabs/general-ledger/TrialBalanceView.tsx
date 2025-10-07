"use client"

import { useEffect, useState, useCallback } from "react"
import { useEntityContext } from "@/hooks/useEntityContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Download, Loader2, Calendar, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { motion } from "framer-motion"

interface TrialBalanceRow {
  account_code: string
  account_name: string
  account_type: string
  debit: number
  credit: number
}

interface TrialBalanceSummary {
  total_debits: number
  total_credits: number
  difference: number
  is_balanced: boolean
}

export default function TrialBalanceView() {
  const { selectedEntityId } = useEntityContext()
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0])
  const [rows, setRows] = useState<TrialBalanceRow[]>([])
  const [summary, setSummary] = useState<TrialBalanceSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Fetch trial balance
  const fetchTrialBalance = useCallback(async () => {
    if (!selectedEntityId || !asOfDate) return

    try {
      setLoading(true)
      const response = await fetch(
        `/api/accounting/trial-balance?entity_id=${selectedEntityId}&as_of_date=${asOfDate}`,
        { credentials: "include" }
      )

      if (response.ok) {
        const data = await response.json()
        setRows(data.rows || [])
        setSummary(data.summary || null)
      } else {
        toast.error("Failed to load trial balance")
      }
    } catch (error) {
      console.error("Error loading trial balance:", error)
      toast.error("Error loading trial balance")
    } finally {
      setLoading(false)
    }
  }, [selectedEntityId, asOfDate])

  // Download trial balance
  const handleDownload = useCallback(async () => {
    if (!selectedEntityId || !asOfDate) return

    try {
      setDownloading(true)
      const response = await fetch(
        `/api/accounting/trial-balance/export?entity_id=${selectedEntityId}&as_of_date=${asOfDate}`,
        { credentials: "include" }
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `trial-balance-${asOfDate}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success("Trial balance downloaded")
      } else {
        toast.error("Failed to download trial balance")
      }
    } catch (error) {
      console.error("Error downloading trial balance:", error)
      toast.error("Error downloading trial balance")
    } finally {
      setDownloading(false)
    }
  }, [selectedEntityId, asOfDate])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(amount)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Trial Balance</h3>
        <p className="text-sm text-muted-foreground">Verify that debits equal credits</p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Trial Balance</CardTitle>
          <CardDescription>Select a date to view the trial balance as of that date</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="as_of_date">As of Date</Label>
              <Input
                id="as_of_date"
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
              />
            </div>
            <Button onClick={fetchTrialBalance} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={downloading || rows.length === 0}
            >
              {downloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-8 w-8 text-primary" />
            </motion.div>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Data</h3>
            <p className="text-sm text-muted-foreground">
              Click Generate to view the trial balance.
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Summary */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Debits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summary.total_debits)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Credits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summary.total_credits)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Difference
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      summary.difference === 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(Math.abs(summary.difference))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {summary.is_balanced ? (
                    <div className="flex items-center text-green-600">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <CheckCircle2 className="h-6 w-6 mr-2" />
                      </motion.div>
                      <span className="text-xl font-bold">Balanced</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <XCircle className="h-6 w-6 mr-2" />
                      <span className="text-xl font-bold">Unbalanced</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Account Balances as of {new Date(asOfDate).toLocaleDateString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <motion.tr
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className="border-b"
                    >
                      <TableCell className="font-mono">{row.account_code}</TableCell>
                      <TableCell>{row.account_name}</TableCell>
                      <TableCell>{row.account_type}</TableCell>
                      <TableCell className="text-right font-mono">
                        {row.debit > 0 ? formatCurrency(row.debit) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.credit > 0 ? formatCurrency(row.credit) : "-"}
                      </TableCell>
                    </motion.tr>
                  ))}
                  {summary && (
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(summary.total_debits)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(summary.total_credits)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}