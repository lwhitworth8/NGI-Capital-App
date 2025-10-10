"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Calendar,
  DollarSign,
  User,
  Clock,
  ChevronRight,
  Loader2
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface JournalEntryLine {
  account_number: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
}

interface JournalEntry {
  id: number;
  entry_number: string;
  entry_date: string;
  memo: string;
  status: string;
  workflow_stage: number;
  total_debits: number;
  total_credits: number;
  created_by_email?: string;
  created_at: string;
  first_approved_by_email?: string;
  first_approved_at?: string;
  final_approved_by_email?: string;
  final_approved_at?: string;
  rejection_reason?: string;
  lines: JournalEntryLine[];
  agent_validation_score?: number;
  agent_validation_notes?: string;
}

interface JournalEntryApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  journalEntry: JournalEntry | null;
  onApprove: (entryId: number, notes: string) => Promise<void>;
  onReject: (entryId: number, reason: string) => Promise<void>;
  onSubmit?: (entryId: number) => Promise<void>;
  onPost?: (entryId: number) => Promise<void>;
  isLoading?: boolean;
  currentUserEmail?: string;
}

export function JournalEntryApprovalModal({
  isOpen,
  onClose,
  journalEntry,
  onApprove,
  onReject,
  onSubmit,
  onPost,
  isLoading = false,
  currentUserEmail = "lwhitworth@ngicapitaladvisory.com" // TODO: Get from auth context
}: JournalEntryApprovalModalProps) {
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setNotes("");
      setRejectionReason("");
      setShowRejectForm(false);
    }
  }, [isOpen]);

  if (!journalEntry) return null;

  const isBalanced = Math.abs(journalEntry.total_debits - journalEntry.total_credits) < 0.01;
  const agentScore = journalEntry.agent_validation_score;
  const agentNotes = journalEntry.agent_validation_notes;

  // Workflow stages
  const workflowStages = [
    { stage: 0, label: "Draft", status: "draft" },
    { stage: 1, label: "Pending 1st", status: "pending_first_approval" },
    { stage: 2, label: "Pending Final", status: "pending_final_approval" },
    { stage: 3, label: "Approved", status: "approved" },
    { stage: 4, label: "Posted", status: "posted" }
  ];

  const currentStageIndex = workflowStages.findIndex(ws => ws.status === journalEntry.status);

  // Determine available actions
  const canSubmit = journalEntry.status === "draft" && isBalanced;
  const canApprove = (
    journalEntry.status === "pending_first_approval" || 
    journalEntry.status === "pending_final_approval"
  ) && journalEntry.created_by_email !== currentUserEmail;
  const canReject = (
    journalEntry.status === "pending_first_approval" || 
    journalEntry.status === "pending_final_approval"
  );
  const canPost = journalEntry.status === "approved";

  const handleApprove = async () => {
    if (!journalEntry) return;
    
    setIsSubmitting(true);
    try {
      await onApprove(journalEntry.id, notes);
      setNotes("");
      onClose();
    } catch (error) {
      console.error("Error approving journal entry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!journalEntry || !rejectionReason.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onReject(journalEntry.id, rejectionReason);
      setRejectionReason("");
      setShowRejectForm(false);
      onClose();
    } catch (error) {
      console.error("Error rejecting journal entry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!journalEntry || !onSubmit) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(journalEntry.id);
      onClose();
    } catch (error) {
      console.error("Error submitting journal entry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePost = async () => {
    if (!journalEntry || !onPost) return;
    
    setIsSubmitting(true);
    try {
      await onPost(journalEntry.id);
      onClose();
    } catch (error) {
      console.error("Error posting journal entry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-500";
      case "pending_first_approval": return "bg-yellow-500";
      case "pending_final_approval": return "bg-orange-500";
      case "approved": return "bg-blue-500";
      case "posted": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <DialogTitle className="text-2xl">
                  {journalEntry.entry_number}
                </DialogTitle>
                <DialogDescription>
                  Review journal entry details and workflow status
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className={`${getStatusColor(journalEntry.status)} text-white`}>
              {journalEntry.status.replace(/_/g, ' ').toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Workflow Progress Indicator */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="text-sm font-semibold mb-3">Workflow Progress</h3>
            <div className="flex items-center justify-between">
              {workflowStages.map((stage, index) => (
                <React.Fragment key={stage.stage}>
                  <div className="flex flex-col items-center gap-2">
                    <div 
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        ${index <= currentStageIndex 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                        }
                      `}
                    >
                      {index < currentStageIndex ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : index === currentStageIndex ? (
                        <Clock className="h-5 w-5" />
                      ) : (
                        <span className="text-sm">{stage.stage}</span>
                      )}
                    </div>
                    <span className="text-xs text-center font-medium">{stage.label}</span>
                  </div>
                  {index < workflowStages.length - 1 && (
                    <ChevronRight className={`h-5 w-5 ${index < currentStageIndex ? 'text-primary' : 'text-muted-foreground'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Entry Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Entry Date</span>
              </div>
              <p className="text-sm font-semibold">
                {new Date(journalEntry.entry_date).toLocaleDateString()}
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Total Amount</span>
              </div>
              <p className="text-sm font-semibold font-mono">
                ${journalEntry.total_debits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Created By</span>
              </div>
              <p className="text-sm font-semibold truncate" title={journalEntry.created_by_email}>
                {journalEntry.created_by_email?.split('@')[0] || 'Unknown'}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Memo</span>
              </div>
              <p className="text-sm font-semibold truncate" title={journalEntry.memo}>
                {journalEntry.memo || 'No memo'}
              </p>
            </div>
          </div>

          {/* Balance Validation */}
          <div className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
            isBalanced 
              ? 'border-green-500 bg-green-50 dark:bg-green-950' 
              : 'border-red-500 bg-red-50 dark:bg-red-950'
          }`}>
            {isBalanced ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                    Entry is Balanced
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Debits: ${journalEntry.total_debits.toFixed(2)} = Credits: ${journalEntry.total_credits.toFixed(2)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                    Entry is Out of Balance
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Difference: ${Math.abs(journalEntry.total_debits - journalEntry.total_credits).toFixed(2)}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Agent Validation (if available) */}
          {agentScore !== undefined && (
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-semibold">AI Agent Validation</h3>
                <Badge variant="outline" className="ml-auto">
                  Score: {(agentScore * 100).toFixed(0)}%
                </Badge>
              </div>
              {agentNotes && (
                <p className="text-sm text-muted-foreground">{agentNotes}</p>
              )}
            </div>
          )}

          {/* Approval History */}
          {(journalEntry.first_approved_by_email || journalEntry.final_approved_by_email) && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Approval History</h3>
              <div className="space-y-2">
                {journalEntry.first_approved_by_email && (
                  <div className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-950 rounded">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">First Approval</p>
                      <p className="text-xs text-muted-foreground">
                        {journalEntry.first_approved_by_email} on {new Date(journalEntry.first_approved_at!).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                {journalEntry.final_approved_by_email && (
                  <div className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-950 rounded">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Final Approval</p>
                      <p className="text-xs text-muted-foreground">
                        {journalEntry.final_approved_by_email} on {new Date(journalEntry.final_approved_at!).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rejection Reason (if rejected) */}
          {journalEntry.rejection_reason && (
            <div className="p-4 border-2 border-red-500 rounded-lg bg-red-50 dark:bg-red-950">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">Rejection Reason</h3>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">{journalEntry.rejection_reason}</p>
            </div>
          )}

          {/* Line Items Table */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Journal Entry Lines</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Account #</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right w-32">Debit</TableHead>
                    <TableHead className="text-right w-32">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntry.lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{line.account_number}</TableCell>
                      <TableCell className="font-medium">{line.account_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{line.description}</TableCell>
                      <TableCell className="text-right font-mono">
                        {line.debit_amount > 0 ? `$${line.debit_amount.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {line.credit_amount > 0 ? `$${line.credit_amount.toFixed(2)}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={3} className="text-right">Total:</TableCell>
                    <TableCell className="text-right font-mono">
                      ${journalEntry.total_debits.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${journalEntry.total_credits.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Reject Form */}
          {showRejectForm && (
            <div className="space-y-3 p-4 border-2 border-red-300 rounded-lg bg-red-50 dark:bg-red-950">
              <Label htmlFor="rejection-reason" className="text-red-900 dark:text-red-100">
                Rejection Reason *
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please provide a detailed reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          )}

          {/* Approval Notes (optional) */}
          {canApprove && !showRejectForm && (
            <div className="space-y-3">
              <Label htmlFor="approval-notes">
                Approval Notes (Optional)
              </Label>
              <Textarea
                id="approval-notes"
                placeholder="Add any notes or comments about this approval..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}
        </div>

        <Separator className="my-4" />

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </Button>

          {canSubmit && onSubmit && (
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !isBalanced}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit for Approval'
              )}
            </Button>
          )}

          {canReject && (
            <>
              {showRejectForm ? (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectionReason("");
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel Rejection
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isSubmitting || !rejectionReason.trim()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Rejecting...
                      </>
                    ) : (
                      'Confirm Rejection'
                    )}
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isSubmitting}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              )}
            </>
          )}

          {canApprove && !showRejectForm && (
            <Button 
              onClick={handleApprove}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </>
              )}
            </Button>
          )}

          {canPost && onPost && (
            <Button 
              onClick={handlePost}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                'Post to General Ledger'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


