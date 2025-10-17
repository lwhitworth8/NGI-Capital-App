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
      <div className="flex items-center justify-between h-24 px-8 pt-6">
        <div className="flex flex-col">
          <div className="pb-2">
            <h1 className="text-5xl font-bold text-foreground tracking-tight leading-tight">{title}</h1>
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {rightContent && <div className="flex items-center">{rightContent}</div>}
      </div>
    </div>
  )
}

