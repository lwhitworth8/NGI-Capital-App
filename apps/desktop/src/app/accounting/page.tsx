'use client'

import { useState } from 'react'
import { useEntity } from '@/lib/context/UnifiedEntityContext'
import { EntitySelector } from '@/components/common/EntitySelector'
import { AccountingTabs } from './components/AccountingTabs'
import { ModuleHeader } from '@ngi/ui/components/layout'

const TABS = [
  { id: 'gl', label: 'General Ledger' },
  { id: 'ar', label: 'Accounts Receivable' },
  { id: 'ap', label: 'Accounts Payable' },
  { id: 'fixed-assets', label: 'Fixed Assets' },
  { id: 'expenses', label: 'Expenses & Payroll' },
  { id: 'banking', label: 'Banking' },
  { id: 'reporting', label: 'Reporting' },
  { id: 'taxes', label: 'Taxes' },
  { id: 'period-close', label: 'Period Close' },
  { id: 'documents', label: 'Documents' },
];

export default function AccountingPage() {
  const { selectedEntity, loading } = useEntity()
  const [activeTab, setActiveTab] = useState('gl')

  // Show loading state while entity is being loaded
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="text-center">
            <p className="text-lg font-medium">Loading Accounting Module</p>
            <p className="text-sm text-muted-foreground">Initializing entities and data...</p>
          </div>
        </div>
      </div>
    )
  }

  // If no entity after loading, something went wrong - but still show the module
  // The entity selector in the header will allow selection

  const currentTab = TABS.find(tab => tab.id === activeTab)
  const currentTitle = currentTab ? currentTab.label : 'Accounting'

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Fixed header - dynamic title based on selected tab */}
      <ModuleHeader 
        title={currentTitle}
        rightContent={<EntitySelector />}
      />
      
      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <AccountingTabs onTabChange={setActiveTab} />
        </div>
      </div>
    </div>
  )
}
