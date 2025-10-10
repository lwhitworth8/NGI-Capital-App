'use client'

import React from 'react'

interface ModuleHeaderProps {
  title: string
  subtitle?: string
  rightContent?: React.ReactNode
  className?: string
}

/**
 * Consistent module header component that provides static title headers
 * aligned with the NGI Capital brand across all modules
 */
export default function ModuleHeader({ 
  title, 
  subtitle, 
  rightContent, 
  className = "" 
}: ModuleHeaderProps) {
  return (
    <div className={`border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 ${className}`}>
      <div className="flex items-center justify-between h-16 px-8">
        <div className="flex flex-col">
          <h1 className="text-[24px] font-bold text-foreground tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        
        {rightContent && (
          <div className="flex items-center">
            {rightContent}
          </div>
        )}
      </div>
    </div>
  )
}
