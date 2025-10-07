"use client";

import { format } from "date-fns";
import { FileText, Download, Eye, Check, X, Clock, CheckCircle, FileCheck } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Document {
  id: number;
  entity_name: string;
  filename: string;
  file_size_bytes: number;
  category: string;
  upload_date: string;
  uploaded_by_name: string;
  workflow_status: string;
  processing_status: string;
  extraction_confidence: number;
}

interface DocumentsTableProps {
  documents: Document[];
  onViewDetails: (doc: Document) => void;
  onDownload: (id: number, filename: string) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

const CATEGORIES: Record<string, string> = {
  formation: "Formation",
  legal: "Legal",
  banking: "Banking",
  invoices: "Invoices",
  bills: "Bills",
  receipts: "Receipts",
  tax: "Tax",
  internal_controls: "Controls",
};

export function DocumentsTable({
  documents,
  onViewDetails,
  onDownload,
  onApprove,
  onReject,
}: DocumentsTableProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; icon: any }> = {
      pending: { className: "bg-yellow-100 text-yellow-800", icon: Clock },
      approved: { className: "bg-green-100 text-green-800", icon: CheckCircle },
      rejected: { className: "bg-red-100 text-red-800", icon: X },
    };

    const { className, icon: Icon } = config[status] || config.pending;

    return (
      <Badge className={`${className} flex items-center gap-1 w-fit`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getProcessingBadge = (status: string, confidence: number) => {
    if (status === "failed") {
      return <Badge variant="destructive">Failed</Badge>;
    }
    if (status === "extracted") {
      return (
        <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1 w-fit">
          <FileCheck className="h-3 w-3" />
          {(confidence * 100).toFixed(0)}%
        </Badge>
      );
    }
    if (status === "processing") {
      return <Badge variant="outline">Processing...</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No documents found</h3>
        <p className="text-muted-foreground">Upload your first document to get started</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Document</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Uploaded</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Processing</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell>
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{doc.filename}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatFileSize(doc.file_size_bytes)}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{CATEGORIES[doc.category] || doc.category}</Badge>
            </TableCell>
            <TableCell>{doc.entity_name}</TableCell>
            <TableCell>
              <div>
                <div className="text-sm">
                  {format(new Date(doc.upload_date), "MMM d, yyyy")}
                </div>
                <div className="text-xs text-muted-foreground">by {doc.uploaded_by_name}</div>
              </div>
            </TableCell>
            <TableCell>{getStatusBadge(doc.workflow_status)}</TableCell>
            <TableCell>
              {getProcessingBadge(doc.processing_status, doc.extraction_confidence)}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onViewDetails(doc)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDownload(doc.id, doc.filename)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {doc.workflow_status === "pending" && (
                    <>
                      <DropdownMenuItem
                        onClick={() => onApprove(doc.id)}
                        className="text-green-600"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Approve
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onReject(doc.id)}
                        className="text-red-600"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Reject
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

