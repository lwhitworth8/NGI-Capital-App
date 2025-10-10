'use client'

import { EntitySelector } from '@/components/common/EntitySelector'

interface FinanceHeaderProps {
  activeView: string
  setActiveView: (view: string) => void
}

// Map view names to display titles
const VIEW_TITLES: Record<string, string> = {
  dashboard: 'Finance Dashboard',
  forecasting: 'Financial Forecasting',
  investors: 'Investor Management'
}

export default function FinanceHeader({ activeView, setActiveView }: FinanceHeaderProps) {
  const currentTitle = VIEW_TITLES[activeView] || 'Finance'

  return (
    <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center justify-between h-16 px-8">
        <h1 className="text-2xl font-semibold">{currentTitle}</h1>
        
        <div className="flex items-center">
          <EntitySelector />
        </div>
      </div>
    </div>
  )
}

