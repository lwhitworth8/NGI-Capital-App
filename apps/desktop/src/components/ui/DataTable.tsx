'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableColumn } from '@/types';
import { Input } from './Input';
import { Button } from './Button';
import { LoadingSpinner, Skeleton } from './LoadingSpinner';

interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  emptyText?: string;
  className?: string;
  rowActions?: (item: T) => React.ReactNode;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchable = true,
  sortable = true,
  pagination = true,
  pageSize = 10,
  emptyText = 'No data available',
  className,
  rowActions,
  onRowClick,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter(item =>
      columns.some(column => {
        const value = item[column.key];
        return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;

      const comparison = aValue > bValue ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (columnKey: string, columnSortable = true) => {
    if (!sortable || !columnSortable) return;

    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const renderCellValue = (column: TableColumn<T>, item: T) => {
    const value = item[column.key];
    
    if (column.render) {
      return column.render(value, item);
    }
    
    if (value === null || value === undefined) {
      return <span className="text-gray-400">-</span>;
    }
    
    return value?.toString();
  };

  if (loading) {
    return (
      <div className={cn('w-full', className)}>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
          {/* Header skeleton */}
          {searchable && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <Skeleton className="w-64 h-10" />
            </div>
          )}
          
          {/* Table skeleton */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {columns.map((column, index) => (
                    <th key={index} className="px-6 py-3">
                      <Skeleton className="h-4" />
                    </th>
                  ))}
                  {rowActions && (
                    <th className="px-6 py-3">
                      <Skeleton className="h-4 w-8" />
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                    {columns.map((_, colIndex) => (
                      <td key={colIndex} className="px-6 py-4">
                        <Skeleton className="h-4" />
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-6 py-4">
                        <Skeleton className="h-4 w-8" />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        {/* Search */}
        {searchable && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              startIcon={<Search className="w-4 h-4" />}
              className="max-w-sm"
            />
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={cn(
                      'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
                      sortable && column.sortable !== false && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                    onClick={() => handleSort(String(column.key), column.sortable)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {sortable && column.sortable !== false && (
                        <div className="flex flex-col">
                          <ChevronUp
                            className={cn(
                              'w-3 h-3',
                              sortColumn === column.key && sortDirection === 'asc'
                                ? 'text-primary-600'
                                : 'text-gray-300'
                            )}
                          />
                          <ChevronDown
                            className={cn(
                              'w-3 h-3 -mt-1',
                              sortColumn === column.key && sortDirection === 'desc'
                                ? 'text-primary-600'
                                : 'text-gray-300'
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                {rowActions && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (rowActions ? 1 : 0)}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    {emptyText}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => (
                  <tr
                    key={index}
                    className={cn(
                      'hover:bg-gray-50 dark:hover:bg-gray-800',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                      >
                        {renderCellValue(column, item)}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {rowActions(item)}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && totalPages > 1 && (
          <div className="bg-white dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number = 0;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}