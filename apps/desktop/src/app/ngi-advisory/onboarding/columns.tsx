"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, FileText, User, Building2, Calendar } from "lucide-react"
import { Flow } from "./helpers"
import { buildFlowChecklist, formatRelativeTime, formatShortDate } from "./helpers"

export const columns: ColumnDef<Flow>[] = [
  {
    accessorKey: "student_name",
    header: "Student",
    cell: ({ row }) => {
      const studentName = row.getValue("student_name") as string
      const studentEmail = row.original.student_email
      
      return (
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium">{studentName || "Unknown"}</div>
            <div className="text-sm text-muted-foreground">{studentEmail}</div>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "project_name",
    header: "Project",
    cell: ({ row }) => {
      const projectName = row.getValue("project_name") as string
      
      return (
        <div className="flex items-center space-x-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{projectName || "Unknown"}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      
      const getStatusStyle = (status: string) => {
        switch (status) {
          case "in_progress":
            return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-100 dark:border-blue-400/40"
          case "onboarded":
            return "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-100 dark:border-green-400/40"
          case "canceled":
            return "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-100 dark:border-red-400/40"
          default:
            return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-100 dark:border-gray-400/40"
        }
      }

      const getStatusLabel = (status: string) => {
        switch (status) {
          case "in_progress":
            return "In Progress"
          case "onboarded":
            return "Completed"
          case "canceled":
            return "Canceled"
          default:
            return status
        }
      }

      return (
        <Badge className={`${getStatusStyle(status || "in_progress")}`}>
          {getStatusLabel(status || "in_progress")}
        </Badge>
      )
    },
  },
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const flow = row.original
      const checklist = buildFlowChecklist(flow)
      const completedCount = checklist.filter(item => item.complete).length
      const totalCount = checklist.length
      const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
      
      return (
        <div className="flex items-center space-x-2">
          <div className="w-20 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                percentage === 100 ? 'bg-green-500' : 
                percentage > 0 ? 'bg-blue-500' : 'bg-gray-400'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground">{percentage}%</span>
        </div>
      )
    },
  },
  {
    accessorKey: "email_created",
    header: "Email Status",
    cell: ({ row }) => {
      const emailCreated = row.getValue("email_created") as boolean
      
      return (
        <div className="flex items-center space-x-2">
          {emailCreated ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">Created</span>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">Pending</span>
            </>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "documents",
    header: "Documents",
    cell: ({ row }) => {
      const flow = row.original
      const awaitingDocuments = !flow.intern_agreement_received || (flow.nda_required && !flow.nda_received)
      
      return (
        <div className="flex items-center space-x-2">
          {awaitingDocuments ? (
            <>
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-600">Awaiting</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">Complete</span>
            </>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => {
      const createdAt = row.getValue("created_at") as string
      
      return (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">{formatShortDate(createdAt)}</div>
            <div className="text-xs text-muted-foreground">{formatRelativeTime(createdAt)}</div>
          </div>
        </div>
      )
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const flow = row.original
      
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // This will be handled by the parent component
            console.log("View details for flow:", flow.id)
          }}
        >
          <FileText className="h-4 w-4 mr-2" />
          View Details
        </Button>
      )
    },
  },
]
