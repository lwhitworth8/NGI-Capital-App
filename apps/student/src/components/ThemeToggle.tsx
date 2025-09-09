"use client"
import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun } from 'lucide-react'

export function ThemeToggle({ compact=false }: { compact?: boolean }){
  const { theme, setTheme } = useTheme()
  const btn = 'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm'
  return (
    <div className={compact ? 'flex' : 'flex items-center gap-2'}>
      <button className={btn + (theme==='light'?' bg-muted':'')} onClick={()=>setTheme('light')}><Sun className="h-4 w-4"/>{!compact && 'Light'}</button>
      <button className={btn + (theme==='dark'?' bg-muted':'')} onClick={()=>setTheme('dark')}><Moon className="h-4 w-4"/>{!compact && 'Dark'}</button>
      <button className={btn + (theme==='system'?' bg-muted':'')} onClick={()=>setTheme('system')}><Monitor className="h-4 w-4"/>{!compact && 'System'}</button>
    </div>
  )
}

