"use client";

import { useState } from "react";
import { Calculator, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface ReconciliationData {
  beginning_balance: number;
  ending_balance_per_bank: number;
  ending_balance_per_books: number;
  cleared_deposits: number;
  cleared_withdrawals: number;
  outstanding_deposits: number;
  outstanding_checks: number;
  adjustments: number;
  difference: number;
  is_balanced: boolean;
}

interface ReconciliationFormProps {
  bankAccountId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReconciliationForm({
  bankAccountId,
  onSuccess,
  onCancel,
}: ReconciliationFormProps) {
  const [loading, setLoading] = useState(false);
  const [reconciliationDate, setReconciliationDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endingBalancePerBank, setEndingBalancePerBank] = useState("");
  const [notes, setNotes] = useState("");
  const [calculatedData, setCalculatedData] = useState<ReconciliationData | null>(null);

  const handleCalculate = async () => {
    if (!endingBalancePerBank) {
      toast.error("Please enter ending bank balance");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/accounting/bank-reconciliation/reconciliations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_account_id: bankAccountId,
          reconciliation_date: reconciliationDate,
          ending_balance_per_bank: parseFloat(endingBalancePerBank),
          notes: notes || undefined,
        }),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setCalculatedData(data);
        
        if (data.is_balanced) {
          toast.success("Reconciliation is balanced!");
        } else {
          toast.warning(`Out of balance by $${Math.abs(data.difference).toFixed(2)}`);
        }
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to calculate reconciliation");
      }
    } catch (error) {
      toast.error("Error calculating reconciliation");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!calculatedData) return;

    try {
      setLoading(true);

      const response = await fetch(
        `/api/accounting/bank-reconciliation/reconciliations/${calculatedData.id}/approve`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        toast.success("Reconciliation approved successfully");
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to approve reconciliation");
      }
    } catch (error) {
      toast.error("Error approving reconciliation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Details</CardTitle>
          <CardDescription>Enter your bank statement ending balance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Reconciliation Date *</Label>
              <Input
                type="date"
                value={reconciliationDate}
                onChange={(e) => setReconciliationDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Ending Balance per Bank Statement *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={endingBalancePerBank}
                onChange={(e) => setEndingBalancePerBank(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Add any notes about this reconciliation"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Button onClick={handleCalculate} disabled={loading} className="w-full">
            <Calculator className="mr-2 h-4 w-4" />
            {loading ? "Calculating..." : "Calculate Reconciliation"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {calculatedData && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Reconciliation Summary</CardTitle>
                <CardDescription>
                  {format(new Date(reconciliationDate), "MMMM d, yyyy")}
                </CardDescription>
              </div>
              {calculatedData.is_balanced ? (
                <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Balanced
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Out of Balance
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Beginning Balance */}
            <div className="flex justify-between items-center py-2">
              <span className="font-medium">Beginning Balance</span>
              <span className="font-mono">
                ${calculatedData.beginning_balance.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            <Separator />

            {/* Cleared Items */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Cleared Items</h4>
              <div className="flex justify-between items-center pl-4">
                <span>Cleared Deposits</span>
                <span className="font-mono text-green-600">
                  +${calculatedData.cleared_deposits.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center pl-4">
                <span>Cleared Withdrawals</span>
                <span className="font-mono text-red-600">
                  -${calculatedData.cleared_withdrawals.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <Separator />

            {/* Outstanding Items */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Outstanding Items</h4>
              <div className="flex justify-between items-center pl-4">
                <span>Outstanding Deposits</span>
                <span className="font-mono text-green-600">
                  +${calculatedData.outstanding_deposits.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center pl-4">
                <span>Outstanding Checks</span>
                <span className="font-mono text-red-600">
                  -${calculatedData.outstanding_checks.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <Separator />

            {/* Ending Balances */}
            <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between items-center font-semibold">
                <span>Ending Balance per Bank</span>
                <span className="font-mono">
                  ${calculatedData.ending_balance_per_bank.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center font-semibold">
                <span>Ending Balance per Books</span>
                <span className="font-mono">
                  ${calculatedData.ending_balance_per_books.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              {calculatedData.difference !== 0 && (
                <div className="flex justify-between items-center font-bold text-red-600 pt-2 border-t">
                  <span>Difference</span>
                  <span className="font-mono">
                    ${Math.abs(calculatedData.difference).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
              {calculatedData.is_balanced && (
                <Button onClick={handleApprove} disabled={loading} className="bg-green-600">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Reconciliation
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

