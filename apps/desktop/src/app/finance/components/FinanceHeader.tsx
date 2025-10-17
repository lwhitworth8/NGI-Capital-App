'use client'

import { EntitySelector } from '@/components/common/EntitySelector'
import { AnimatedText } from '@ngi/ui'

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
    <div className="bg-background sticky top-0 z-10">
      <div className="flex items-center justify-between h-24 px-8 pt-6">
        <div className="flex flex-col">
          {/* Animated Title - Lowered and Larger */}
          <div className="overflow-hidden" style={{ paddingBottom: '8px' }}>
            <AnimatedText 
              text={currentTitle} 
              as="h1" 
              className="text-5xl font-bold text-foreground tracking-tight leading-tight"
              delay={0.2}
              stagger={0.05}
            />
          </div>
        </div>
        
        <div className="flex items-center">
          <EntitySelector />
        </div>
      </div>
    </div>
  )
}

