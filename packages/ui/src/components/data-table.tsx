import * as React from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { cn } from '../lib/utils'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from 'lucide-react'
import { Button } from './button'

export type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageSize?: number
  className?: string
}

export function DataTable<TData, TValue>({ columns, data, pageSize = 10, className }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize } },
  })

  return (
    <div className={cn('w-full', className)}>
      <div className='overflow-x-auto rounded-md border'>
        <table className='w-full caption-bottom text-sm'>
          <thead className='bg-muted'>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className='border-b'>
                {hg.headers.map(header => {
                  return (
                    <th key={header.id} className='h-10 px-3 text-left align-middle font-medium text-muted-foreground'>
                      {header.isPlaceholder ? null : (
                        header.column.getCanSort() ? (
                          <button
                            className='inline-flex items-center gap-1 hover:text-foreground'
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <ArrowUpDown className='h-3.5 w-3.5 opacity-60' />
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className='border-b last:border-0'>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className='p-3 align-middle'>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className='p-6 text-center text-sm text-muted-foreground'>No results.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <DataTablePagination table={table} className='mt-3' />
    </div>
  )
}

export function DataTablePagination({ table, className }: { table: ReturnType<typeof useReactTable<any>>; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <div className='text-xs text-muted-foreground'>
        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
      </div>
      <div className='flex items-center gap-1'>
        <Button variant='outline' size='sm' onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
          <ChevronsLeft className='h-4 w-4' />
        </Button>
        <Button variant='outline' size='sm' onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          <ChevronLeft className='h-4 w-4' />
        </Button>
        <Button variant='outline' size='sm' onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          <ChevronRight className='h-4 w-4' />
        </Button>
        <Button variant='outline' size='sm' onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
          <ChevronsRight className='h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}

