"use client"

import React from 'react'

interface ModuleHeaderProps {
  title: string
  subtitle?: string
  rightContent?: React.ReactNode
  className?: string
}

export default function ModuleHeader({ title, subtitle, rightContent, className = '' }: ModuleHeaderProps) {
  return (
    <div className={`bg-background sticky top-0 z-10 ${className}`}>
      <div className="flex items-center justify-between h-20 px-6 pt-4">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-foreground tracking-tight leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {rightContent && <div className="flex items-center">{rightContent}</div>}
      </div>
    </div>
  )
}

