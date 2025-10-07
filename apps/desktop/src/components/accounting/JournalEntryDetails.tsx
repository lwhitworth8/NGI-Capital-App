"use client";

import { format } from "date-fns";
import { CheckCircle, XCircle, Lock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

interface JournalEntryLine {
  id: number;
  line_number: number;
  account_number: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  description: string | null;
}

interface JournalEntry {
  id: number;
  entry_number: string;
  entry_date: string;
  entry_type: string;
  memo: string | null;
  reference: string | null;
  status: string;
  workflow_stage: number;
  created_by_name: string;
  created_at: string;
  first_approved_by_name: string | null;
  first_approved_at: string | null;
  final_approved_by_name: string | null;
  final_approved_at: string | null;
  is_locked: boolean;
  lines: JournalEntryLine[];
  total_debits: number;
  total_credits: number;
}

interface JournalEntryDetailsProps {
  entry: JournalEntry;
  currentUserName: string;
  onUpdate: () => void;
}

export function JournalEntryDetails({
  entry,
  currentUserName,
  onUpdate,
}: JournalEntryDetailsProps) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const canSubmitForApproval = entry.status === "draft" && entry.created_by_name === currentUserName;
  const canApprove = entry.status === "pending_approval" || entry.status === "approved";
  const canReject = entry.status === "pending_approval" || entry.status === "approved";
  const canPost = entry.status === "approved" && entry.workflow_stage === 3 && !entry.is_locked;

  const handleSubmitForApproval = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/accounting/journal-entries/${entry.id}/submit-for-approval`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        toast.success("Journal entry submitted for approval");
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to submit for approval");
      }
    } catch (error) {
      toast.error("Error submitting for approval");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/accounting/journal-entries/${entry.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", notes: notes || undefined }),
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to approve");
      }
    } catch (error) {
      toast.error("Error approving entry");
    } finally {
      setLoading(false);
      setNotes("");
    }
  };

  const handleReject = async () => {
    if (!notes) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/accounting/journal-entries/${entry.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", notes }),
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Journal entry rejected");
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to reject");
      }
    } catch (error) {
      toast.error("Error rejecting entry");
    } finally {
      setLoading(false);
      setNotes("");
    }
  };

  const handlePost = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/accounting/journal-entries/${entry.id}/post`, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Journal entry posted successfully");
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to post");
      }
    } catch (error) {
      toast.error("Error posting entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{entry.entry_number}</h2>
          <p className="text-sm text-muted-foreground">
            Created by {entry.created_by_name} on {format(new Date(entry.created_at), "PPP")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge
            className={
              entry.is_locked
                ? "bg-blue-100 text-blue-800"
                : entry.status === "approved"
                ? "bg-green-100 text-green-800"
                : entry.status === "pending_approval"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-800"
            }
          >
            {entry.is_locked ? "Posted" : entry.status}
          </Badge>
          <Badge variant="outline">{entry.entry_type}</Badge>
        </div>
      </div>

      <Separator />

      {/* Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm font-medium">Entry Date</p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(entry.entry_date), "MMM d, yyyy")}
          </p>
        </div>
        {entry.reference && (
          <div>
            <p className="text-sm font-medium">Reference</p>
            <p className="text-sm text-muted-foreground">{entry.reference}</p>
          </div>
        )}
        <div>
          <p className="text-sm font-medium">Total Amount</p>
          <p className="text-sm text-muted-foreground font-mono">
            ${entry.total_debits.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">Workflow Stage</p>
          <p className="text-sm text-muted-foreground">{entry.workflow_stage}/3</p>
        </div>
      </div>

      {entry.memo && (
        <div>
          <p className="text-sm font-medium mb-1">Memo</p>
          <p className="text-sm text-muted-foreground">{entry.memo}</p>
        </div>
      )}

      {/* Approval Timeline */}
      {(entry.first_approved_by_name || entry.final_approved_by_name) && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Approval History</p>
          <div className="space-y-2">
            {entry.first_approved_by_name && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>
                  First approval by {entry.first_approved_by_name} on{" "}
                  {format(new Date(entry.first_approved_at!), "PPP")}
                </span>
              </div>
            )}
            {entry.final_approved_by_name && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>
                  Final approval by {entry.final_approved_by_name} on{" "}
                  {format(new Date(entry.final_approved_at!), "PPP")}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <Separator />

      {/* Lines */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Journal Entry Lines</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entry.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell className="text-muted-foreground">{line.line_number}</TableCell>
                <TableCell>
                  <div className="font-mono text-sm">{line.account_number}</div>
                  <div className="text-sm text-muted-foreground">{line.account_name}</div>
                </TableCell>
                <TableCell className="text-sm">{line.description || "-"}</TableCell>
                <TableCell className="text-right font-mono">
                  {line.debit_amount > 0
                    ? `$${line.debit_amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}`
                    : "-"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {line.credit_amount > 0
                    ? `$${line.credit_amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}`
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold bg-muted/50">
              <TableCell colSpan={3} className="text-right">
                Total
              </TableCell>
              <TableCell className="text-right font-mono">
                ${entry.total_debits.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right font-mono">
                ${entry.total_credits.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Actions */}
      {!entry.is_locked && (canSubmitForApproval || canApprove || canReject || canPost) && (
        <>
          <Separator />
          <div className="space-y-4">
            {(canApprove || canReject) && (
              <div>
                <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
                <Textarea
                  placeholder="Add notes for this action..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            <div className="flex justify-end space-x-2">
              {canSubmitForApproval && (
                <Button onClick={handleSubmitForApproval} disabled={loading}>
                  <Send className="mr-2 h-4 w-4" />
                  Submit for Approval
                </Button>
              )}

              {canReject && (
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={loading || (canReject && !notes)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              )}

              {canApprove && (
                <Button onClick={handleApprove} disabled={loading}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              )}

              {canPost && (
                <Button onClick={handlePost} disabled={loading} className="bg-blue-600">
                  <Lock className="mr-2 h-4 w-4" />
                  Post Entry
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

