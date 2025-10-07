"use client";

import { format } from "date-fns";
import { FileText, Eye, CheckCircle, Clock, XCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface JournalEntry {
  id: number;
  entry_number: string;
  entry_date: string;
  entry_type: string;
  memo: string | null;
  status: string;
  workflow_stage: number;
  created_by_name: string;
  total_debits: number;
  total_credits: number;
  is_locked: boolean;
}

interface JournalEntriesTableProps {
  entries: JournalEntry[];
  onViewDetails: (entry: JournalEntry) => void;
}

export function JournalEntriesTable({ entries, onViewDetails }: JournalEntriesTableProps) {
  const getStatusBadge = (status: string, workflowStage: number, isLocked: boolean) => {
    if (isLocked) {
      return (
        <Badge className="bg-gray-100 text-gray-800 flex items-center gap-1 w-fit">
          <Lock className="h-3 w-3" />
          Posted
        </Badge>
      );
    }

    const config: Record<string, { className: string; icon: any }> = {
      draft: { className: "bg-gray-100 text-gray-800", icon: FileText },
      pending_approval: { className: "bg-yellow-100 text-yellow-800", icon: Clock },
      approved: { className: "bg-green-100 text-green-800", icon: CheckCircle },
      posted: { className: "bg-blue-100 text-blue-800", icon: Lock },
    };

    const { className, icon: Icon } = config[status] || config.draft;

    let displayText = status;
    if (status === "pending_approval" || status === "approved") {
      displayText = `${status} (${workflowStage}/3)`;
    }

    return (
      <Badge className={`${className} flex items-center gap-1 w-fit`}>
        <Icon className="h-3 w-3" />
        {displayText}
      </Badge>
    );
  };

  const getEntryTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      Standard: "bg-blue-100 text-blue-800",
      Adjusting: "bg-purple-100 text-purple-800",
      Closing: "bg-red-100 text-red-800",
      Reversing: "bg-orange-100 text-orange-800",
    };

    return <Badge className={colors[type] || colors.Standard}>{type}</Badge>;
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No journal entries found</h3>
        <p className="text-muted-foreground">Create your first journal entry to get started</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Entry Number</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Memo</TableHead>
          <TableHead>Created By</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="font-mono font-medium">{entry.entry_number}</TableCell>
            <TableCell>{format(new Date(entry.entry_date), "MMM d, yyyy")}</TableCell>
            <TableCell>{getEntryTypeBadge(entry.entry_type)}</TableCell>
            <TableCell>
              <div className="max-w-xs truncate text-sm text-muted-foreground">
                {entry.memo || "-"}
              </div>
            </TableCell>
            <TableCell className="text-sm">{entry.created_by_name}</TableCell>
            <TableCell className="text-right font-mono">
              ${entry.total_debits.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </TableCell>
            <TableCell>
              {getStatusBadge(entry.status, entry.workflow_stage, entry.is_locked)}
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" onClick={() => onViewDetails(entry)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

