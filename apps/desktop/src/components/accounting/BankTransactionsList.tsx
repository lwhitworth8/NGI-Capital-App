"use client";

import { format } from "date-fns";
import { CheckCircle, AlertCircle, Link as LinkIcon, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";

interface BankTransaction {
  id: number;
  transaction_date: string;
  description: string;
  amount: number;
  merchant_name: string | null;
  merchant_category: string | null;
  is_matched: boolean;
  status: string;
  confidence_score: number | null;
  suggested_account_id: number | null;
  suggested_account_name: string | null;
}

interface BankTransactionsListProps {
  transactions: BankTransaction[];
  showSelection?: boolean;
  selectedIds?: Set<number>;
  onSelectTransaction?: (id: number, selected: boolean) => void;
  onMatch?: (transaction: BankTransaction) => void;
  onUnmatch?: (id: number) => void;
}

export function BankTransactionsList({
  transactions,
  showSelection = false,
  selectedIds = new Set(),
  onSelectTransaction,
  onMatch,
  onUnmatch,
}: BankTransactionsListProps) {
  const getStatusBadge = (status: string, isMatched: boolean, confidence: number | null) => {
    if (isMatched || status === "matched") {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1 w-fit">
          <CheckCircle className="h-3 w-3" />
          Matched
          {confidence && confidence < 1 && (
            <span className="text-xs">({Math.round(confidence * 100)}%)</span>
          )}
        </Badge>
      );
    }

    if (status === "suggested") {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1 w-fit">
          <AlertCircle className="h-3 w-3" />
          Suggested
        </Badge>
      );
    }

    return (
      <Badge className="bg-gray-100 text-gray-800 flex items-center gap-1 w-fit">
        <AlertCircle className="h-3 w-3" />
        Unmatched
      </Badge>
    );
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No transactions found</h3>
        <p className="text-muted-foreground">Sync with Mercury to import transactions</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showSelection && <TableHead className="w-12"></TableHead>}
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Merchant</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Suggested Account</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((txn) => (
          <TableRow key={txn.id}>
            {showSelection && (
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(txn.id)}
                  onCheckedChange={(checked) =>
                    onSelectTransaction?.(txn.id, checked as boolean)
                  }
                />
              </TableCell>
            )}
            <TableCell>{format(new Date(txn.transaction_date), "MMM d, yyyy")}</TableCell>
            <TableCell>
              <div className="max-w-md truncate">{txn.description}</div>
            </TableCell>
            <TableCell>
              <div className="text-sm">
                {txn.merchant_name || "-"}
                {txn.merchant_category && (
                  <div className="text-xs text-muted-foreground">{txn.merchant_category}</div>
                )}
              </div>
            </TableCell>
            <TableCell
              className={`text-right font-mono font-medium ${
                txn.amount > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {txn.amount > 0 ? "+" : ""}$
              {Math.abs(txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </TableCell>
            <TableCell>{getStatusBadge(txn.status, txn.is_matched, txn.confidence_score)}</TableCell>
            <TableCell>
              {txn.suggested_account_name ? (
                <div className="text-sm">
                  <div className="font-medium">{txn.suggested_account_name}</div>
                  <Badge variant="outline" className="mt-1 text-xs">
                    AI Suggestion
                  </Badge>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">-</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              {txn.is_matched ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUnmatch?.(txn.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Unlink className="mr-1 h-4 w-4" />
                  Unmatch
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => onMatch?.(txn)}>
                  <LinkIcon className="mr-1 h-4 w-4" />
                  Match
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

