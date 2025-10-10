'use client';

import React, { useState } from 'react';
import {
  Bell,
  Search,
  Sun,
  Moon,
  Menu,
  X,
  Building2,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useApp } from '@/lib/context/AppContext';
import { useTheme } from '@/lib/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface HeaderProps {
  onSidebarToggle?: () => void;
  sidebarCollapsed?: boolean;
}

export function Header({ onSidebarToggle, sidebarCollapsed }: HeaderProps) {
  const { state, setCurrentEntity } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const pendingCount = state.pendingApprovals.length;

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          {/* Mobile sidebar toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="md:hidden"
          >
            {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </Button>

          {/* Search */}
          <div className="hidden md:block">
            <Input
              placeholder="Search transactions, entities..."
              startIcon={<Search className="w-4 h-4" />}
              className="w-80"
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-4">
          {/* Entity Selector */}
          {state.entities.length > 0 && (
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowEntityDropdown(!showEntityDropdown)}
                className="flex items-center space-x-2"
              >
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {state.currentEntity?.legal_name || 'Select Entity'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </Button>

              {showEntityDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-1">
                    {state.entities.map((entity) => (
                      <button
                        key={entity.id}
                        onClick={() => {
                          setCurrentEntity(entity);
                          setShowEntityDropdown(false);
                        }}
                        className={cn(
                          'block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                          state.currentEntity?.id === entity.id &&
                            'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        )}
                      >
                        <div className="font-medium">{entity.legal_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {entity.entity_type} - {entity.state}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cash Position Display */}
          {state.dashboardMetrics && (
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">
              <span className="text-xs text-gray-500 dark:text-gray-400">Cash:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatCurrency(
                  state.dashboardMetrics.cash_position?.reduce((sum, pos) => sum + pos.balance, 0) || 0
                )}
              </span>
            </div>
          )}

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <Bell className="w-5 h-5" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </Button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                </div>
                <div className="py-2">
                  {pendingCount === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      No new notifications
                    </div>
                  ) : (
                    state.pendingApprovals.slice(0, 5).map((approval) => (
                      <div
                        key={approval.id}
                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      >
                        <div className="text-sm text-gray-900 dark:text-white">
                          Pending Approval
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {approval.description} - {formatCurrency(approval.amount)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Created by {approval.created_by}
                        </div>
                      </div>
                    ))
                  )}
                  {pendingCount > 5 && (
                    <div className="px-4 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                      >
                        View all {pendingCount} notifications
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          {/* Settings */}
          {/* Settings cog removed; open settings from profile in sidebar */}

          {/* User Avatar */}
          {state.user && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {state.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {state.user.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Partner
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile search */}
      <div className="md:hidden mt-4">
        <Input
          placeholder="Search..."
          startIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Close dropdowns when clicking outside */}
      {(showEntityDropdown || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowEntityDropdown(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>
  );
}

