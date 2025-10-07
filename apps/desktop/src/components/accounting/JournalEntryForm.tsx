"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Account {
  id: number;
  account_number: string;
  account_name: string;
  account_type: string;
}

interface JournalLine {
  line_number: number;
  account_id: number | null;
  debit_amount: string;
  credit_amount: string;
  description: string;
}

interface JournalEntryFormProps {
  entityId: number;
  accounts: Account[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function JournalEntryForm({ entityId, accounts, onSuccess, onCancel }: JournalEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [entryType, setEntryType] = useState("Standard");
  const [memo, setMemo] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([
    { line_number: 1, account_id: null, debit_amount: "", credit_amount: "", description: "" },
    { line_number: 2, account_id: null, debit_amount: "", credit_amount: "", description: "" },
  ]);

  const addLine = () => {
    setLines([
      ...lines,
      {
        line_number: lines.length + 1,
        account_id: null,
        debit_amount: "",
        credit_amount: "",
        description: "",
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      toast.error("Journal entry must have at least 2 lines");
      return;
    }
    const newLines = lines.filter((_, i) => i !== index);
    // Renumber lines
    newLines.forEach((line, idx) => {
      line.line_number = idx + 1;
    });
    setLines(newLines);
  };

  const updateLine = (index: number, field: keyof JournalLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };

    // Clear opposite amount when entering one
    if (field === "debit_amount" && value) {
      newLines[index].credit_amount = "";
    } else if (field === "credit_amount" && value) {
      newLines[index].debit_amount = "";
    }

    setLines(newLines);
  };

  const calculateTotals = () => {
    const totalDebits = lines.reduce(
      (sum, line) => sum + (parseFloat(line.debit_amount) || 0),
      0
    );
    const totalCredits = lines.reduce(
      (sum, line) => sum + (parseFloat(line.credit_amount) || 0),
      0
    );
    return { totalDebits, totalCredits, difference: totalDebits - totalCredits };
  };

  const { totalDebits, totalCredits, difference } = calculateTotals();
  const isBalanced = Math.abs(difference) < 0.01 && totalDebits > 0;

  const handleSubmit = async () => {
    // Validate
    if (!isBalanced) {
      toast.error("Journal entry must be balanced (debits = credits)");
      return;
    }

    // Check all lines have accounts
    if (lines.some((line) => !line.account_id)) {
      toast.error("All lines must have an account selected");
      return;
    }

    // Check all lines have amount
    if (
      lines.some(
        (line) => !line.debit_amount && !line.credit_amount
      )
    ) {
      toast.error("All lines must have a debit or credit amount");
      return;
    }

    try {
      setLoading(true);

      const date = new Date(entryDate);
      const payload = {
        entity_id: entityId,
        entry_date: entryDate,
        fiscal_year: date.getFullYear(),
        fiscal_period: date.getMonth() + 1,
        entry_type: entryType,
        memo: memo || undefined,
        reference: reference || undefined,
        lines: lines.map((line) => ({
          line_number: line.line_number,
          account_id: line.account_id,
          debit_amount: parseFloat(line.debit_amount) || 0,
          credit_amount: parseFloat(line.credit_amount) || 0,
          description: line.description || undefined,
        })),
      };

      const response = await fetch("/api/accounting/journal-entries/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Journal entry created successfully");
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to create journal entry");
      }
    } catch (error) {
      toast.error("Error creating journal entry");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Entry Date *</Label>
          <Input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Entry Type *</Label>
          <Select value={entryType} onValueChange={setEntryType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Standard">Standard</SelectItem>
              <SelectItem value="Adjusting">Adjusting</SelectItem>
              <SelectItem value="Closing">Closing</SelectItem>
              <SelectItem value="Reversing">Reversing</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Reference</Label>
          <Input
            placeholder="Reference number"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label>Memo</Label>
        <Textarea
          placeholder="Description of this journal entry"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
        />
      </div>

      {/* Lines */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Journal Entry Lines</h3>
          <Button onClick={addLine} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Line
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-2 grid grid-cols-12 gap-2 text-sm font-medium">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Account</div>
            <div className="col-span-2 text-right">Debit</div>
            <div className="col-span-2 text-right">Credit</div>
            <div className="col-span-2">Description</div>
            <div className="col-span-1"></div>
          </div>

          {lines.map((line, index) => (
            <div key={index} className="px-4 py-3 grid grid-cols-12 gap-2 items-center border-t">
              <div className="col-span-1 text-sm text-muted-foreground">
                {line.line_number}
              </div>

              <div className="col-span-4">
                <Select
                  value={line.account_id?.toString() || ""}
                  onValueChange={(value) => updateLine(index, "account_id", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.account_number} - {account.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={line.debit_amount}
                  onChange={(e) => updateLine(index, "debit_amount", e.target.value)}
                  className="text-right"
                  disabled={!!line.credit_amount}
                />
              </div>

              <div className="col-span-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={line.credit_amount}
                  onChange={(e) => updateLine(index, "credit_amount", e.target.value)}
                  className="text-right"
                  disabled={!!line.debit_amount}
                />
              </div>

              <div className="col-span-2">
                <Input
                  placeholder="Optional"
                  value={line.description}
                  onChange={(e) => updateLine(index, "description", e.target.value)}
                />
              </div>

              <div className="col-span-1 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLine(index)}
                  disabled={lines.length <= 2}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Totals */}
          <div className="px-4 py-3 bg-muted/50 grid grid-cols-12 gap-2 border-t font-semibold">
            <div className="col-span-5 flex items-center">
              <Calculator className="mr-2 h-4 w-4" />
              Totals
            </div>
            <div className="col-span-2 text-right">
              ${totalDebits.toFixed(2)}
            </div>
            <div className="col-span-2 text-right">
              ${totalCredits.toFixed(2)}
            </div>
            <div className="col-span-3 flex items-center justify-end">
              {isBalanced ? (
                <Badge className="bg-green-100 text-green-800">Balanced</Badge>
              ) : (
                <Badge variant="destructive">
                  Out of balance: ${Math.abs(difference).toFixed(2)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={loading || !isBalanced}>
          {loading ? "Creating..." : "Create Entry"}
        </Button>
      </div>
    </div>
  );
}

