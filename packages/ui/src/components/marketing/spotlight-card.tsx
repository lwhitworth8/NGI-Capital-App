import * as React from 'react'
import { cn } from '../../lib/utils'

export function SpotlightCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('relative rounded-2xl border bg-card p-6 shadow-sm overflow-hidden group', className)}>
      <div className='pointer-events-none absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300' style={{
        background: 'radial-gradient(600px circle at var(--x,50%) var(--y,50%), hsl(var(--primary)/.12), transparent 40%)'
      }} />
      <div className='relative'>{children}</div>
    </div>
  )}

// Optional mouse spotlight interaction
export function useSpotlightRef<T extends HTMLElement>(){
  const ref = React.useRef<T | null>(null)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width) * 100
      const y = ((e.clientY - r.top) / r.height) * 100
      el.style.setProperty('--x', `${x}%`)
      el.style.setProperty('--y', `${y}%`)
    }
    el.addEventListener('mousemove', onMove)
    return () => el.removeEventListener('mousemove', onMove)
  }, [])
  return ref
}

