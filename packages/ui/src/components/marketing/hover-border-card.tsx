import * as React from 'react'
import { cn } from '../../lib/utils'

export function HoverBorderCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('relative rounded-2xl p-[1px] overflow-hidden group', className)}>
      <div className='absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,hsl(var(--primary)/.6),transparent_30%,transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-500' />
      <div className='relative rounded-2xl border bg-card p-6'>{children}</div>
    </div>
  )
}

