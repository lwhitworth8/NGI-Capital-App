"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, Search, Filter, Download, Users, CheckCircle, Clock, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { AdvisoryStudent } from "@/types"

interface StudentsDataTableProps {
  data: AdvisoryStudent[]
  loading?: boolean
  onStudentSelect?: (student: AdvisoryStudent) => void
  onBulkAction?: (action: string, students: AdvisoryStudent[]) => void
  hideToolbar?: boolean
  learningByEmail?: Record<string, { completion: number; talent?: number }>
}

export function StudentsDataTable({ data, loading, onStudentSelect, onBulkAction, hideToolbar, learningByEmail }: StudentsDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const parentRef = React.useRef<HTMLDivElement | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [cardHeight, setCardHeight] = React.useState<number>(0)
  const [focusedIndex, setFocusedIndex] = React.useState<number>(-1)

  const columns: ColumnDef<AdvisoryStudent>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "first_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const student = row.original
        const firstName = student.first_name || ''
        const lastName = student.last_name || ''
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U'

        return (
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8 bg-blue-600 text-white">
              <AvatarFallback className="bg-blue-600 text-white text-[10px] font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-medium text-sm">
                {firstName} {lastName}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {student.email}
              </div>
            </div>
          </div>
        )
      },

    },

    {
      accessorKey: "school",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            School
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const school = row.getValue("school") as string
        return <div className="text-sm">{school || "Not specified"}</div>
      },
    },

    {
      accessorKey: "program",
      header: "Program",
      cell: ({ row }) => {
        const program = row.getValue("program") as string
        return <div className="text-sm">{program || "Not specified"}</div>
      },
    },
    {
      accessorKey: "grad_year",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Grad Year
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const year = row.getValue("grad_year") as number
        return <div className="text-sm">{year || "Not specified"}</div>
      },
    },
    {
      accessorKey: "status_effective",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status_effective") as string
        const getStatusBadge = (status: string) => {
          switch (status?.toLowerCase()) {
            case 'active':
              return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>
            case 'alumni':
              return <Badge variant="secondary">Alumni</Badge>
            case 'paused':
              return <Badge variant="outline">Paused</Badge>
            case 'prospect':
              return <Badge variant="outline">Prospect</Badge>
            default:
              return <Badge variant="outline">{status}</Badge>
          }
        }
        return getStatusBadge(status)
      },
    },
    {
      accessorKey: "profile_completeness",
      header: "Profile",
      cell: ({ row }) => {
        const completeness = row.original.profile_completeness
        if (!completeness) return <div className="text-sm text-muted-foreground">Not available</div>

        return (
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Progress value={completeness.percentage} className="w-16 h-2" />
            </div>
            <span className="text-xs text-muted-foreground">
              {completeness.percentage}%
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "applications_count",
      header: "Apps",
      cell: ({ row }) => {
        const count = row.getValue("applications_count") as number
        return <div className="text-sm font-mono">{count || 0}</div>
      },
    },
    {
      accessorKey: "last_activity_at",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Last Activity
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue("last_activity_at") as string
        if (!date) return <div className="text-sm text-muted-foreground">Never</div>

        const activityDate = new Date(date)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24))

        let color = "text-muted-foreground"
        if (diffDays <= 7) color = "text-green-600"
        else if (diffDays <= 30) color = "text-yellow-600"
        else color = "text-red-600"

        return (
          <div className={`text-sm ${color}`}>
            {diffDays === 0 ? 'Today' : `${diffDays}d ago`}
          </div>
        )
      },
    },
    // Row actions are handled in the detail sheet; no dropdown in table to avoid clipping/overflow
  ]

  // Fixed widths to avoid horizontal scroll
  const headClass = (id: string) => {
    switch (id) {
      case 'first_name': return 'w-[260px]'
      case 'school': return 'w-[160px]'
      
      case 'program': return 'w-[220px]'
      case 'grad_year': return 'w-[110px] text-center'
      case 'status_effective': return 'w-[120px]'
      case 'profile_completeness': return 'w-[140px]'
      case 'applications_count': return 'w-[100px] text-right'
      case 'last_activity_at': return 'w-[130px]'
      default: return ''
    }
  }
  const cellClass = (id: string) => {
    switch (id) {
      case 'grad_year': return 'w-[110px] text-center'
      case 'applications_count': return 'w-[100px] text-right'
      default: return ''
    }
  }

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  })

  const selectedStudents = table.getFilteredSelectedRowModel().rows.map(row => row.original)
  const rows = table.getRowModel().rows
  const useVirtual = true
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 12,
    getItemKey: (index) => rows[index]?.id ?? index,
  })

  // Size table card to fill viewport and keep pagination visible without page scroll
  React.useLayoutEffect(() => {
    const update = () => {
      if (!containerRef.current) return
      const top = containerRef.current.getBoundingClientRect().top
      const margin = 24
      const h = Math.max(360, Math.floor(window.innerHeight - top - margin))
      setCardHeight(h)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const handleKeyNav = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!rows.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(i => Math.min(rows.length - 1, Math.max(0, i + 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(i => Math.max(0, i === -1 ? rows.length - 1 : i - 1))
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      onStudentSelect?.(rows[focusedIndex].original)
    }
  }

  return (
    <div className="w-full space-y-4 overflow-x-hidden">
      {/* Toolbar */}
      {!hideToolbar && (
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={globalFilter}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-8 w-80"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={(table.getColumn("status_effective")?.getFilterValue() as string) ?? ""}
            onValueChange={(value) =>
              table.getColumn("status_effective")?.setFilterValue(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="alumni">Alumni</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
            </SelectContent>
          </Select>

          {/* School Filter */}
          <Select
            value={(table.getColumn("school")?.getFilterValue() as string) ?? ""}
            onValueChange={(value) =>
              table.getColumn("school")?.setFilterValue(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="School" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Schools</SelectItem>
              {Array.from(new Set(data.map(s => s.school).filter(Boolean))).map(school => (
                <SelectItem key={school} value={school!}>{school}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          {selectedStudents.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {selectedStudents.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkAction?.("export", selectedStudents)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkAction?.("email", selectedStudents)}
              >
                Email
              </Button>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                View
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      )}

      {/* Table */}
      <div ref={containerRef} tabIndex={0} onKeyDown={handleKeyNav} className="rounded-md border flex flex-col focus:outline-none overflow-x-hidden" style={{ height: cardHeight || undefined }}>
        <Table className="min-w-full table-fixed">
          <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={`whitespace-nowrap text-xs font-medium ${headClass(header.column.id)}`}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
        </Table>
        <div ref={parentRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          {!rows.length ? (
            <Table className="min-w-full table-fixed">
              <TableBody>
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    {loading ? 'Loading...' : 'No students found.'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : useVirtual ? (
            <Table className="min-w-full table-fixed">
              <TableBody style={{ position: 'relative', height: rowVirtualizer.getTotalSize() }}>
                {rowVirtualizer.getVirtualItems().map(virtualRow => {
                  const row = rows[virtualRow.index]
                  return (
                    <TableRow
                      key={row.id}
                      data-index={virtualRow.index}
                      data-state={row.getIsSelected() && 'selected'}
                      className={`cursor-pointer hover:bg-muted/50 text-sm [&>td]:py-2 ${focusedIndex===virtualRow.index ? 'ring-2 ring-ring' : ''}`}
                      style={{ position: 'absolute', top: 0, left: 0, transform: `translateY(${virtualRow.start}px)`, width: '100%' }}
                      ref={(el) => { if (el) rowVirtualizer.measureElement(el) }}
                      tabIndex={0}
                      role="row"
                      onKeyDown={(e) => { if (e.key === 'Enter') onStudentSelect?.(row.original) }}
                      onClick={() => onStudentSelect?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className={`${cellClass(cell.column.id)} truncate`}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <Table className="min-w-full table-fixed">
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={`cursor-pointer hover:bg-muted/50 text-sm [&>td]:py-2 ${focusedIndex===idx ? 'ring-2 ring-ring' : ''}`}
                    tabIndex={0}
                    role="row"
                    onKeyDown={(e) => { if (e.key === 'Enter') onStudentSelect?.(row.original) }}
                    onClick={() => onStudentSelect?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={`${cellClass(cell.column.id)} truncate`}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-auto">
        <div className="text-sm text-muted-foreground">
          Showing {table.getFilteredRowModel().rows.length} of {data.length} students
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, table.getPageCount()) }, (_, i) => {
              const pageIndex = Math.max(0, Math.min(table.getPageCount() - 5, table.getState().pagination.pageIndex - 2)) + i
              return (
                <Button
                  key={pageIndex}
                  variant={pageIndex === table.getState().pagination.pageIndex ? "primary" : "outline"}
                  size="sm"
                  onClick={() => table.setPageIndex(pageIndex)}
                  className="w-8 h-8 p-0"
                >
                  {pageIndex + 1}
                </Button>
              )
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}