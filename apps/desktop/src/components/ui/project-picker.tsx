"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ChevronDown } from 'lucide-react'

type Project = { id: number; project_name: string }

type Props = {
  projects: Project[]
  value: number | null
  onChange: (id: number | null) => void
  placeholder?: string
  ariaLabel?: string
}

export function ProjectPicker({ projects, value, onChange, placeholder = 'Applied Project', ariaLabel }: Props) {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const items = React.useMemo(() => {
    const s = q.trim().toLowerCase()
    const list = projects || []
    if (!s) return list.slice(0, 50)
    return list.filter(p => (p.project_name || '').toLowerCase().includes(s)).slice(0, 50)
  }, [projects, q])
  const current = projects.find(p => p.id === value) || null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label={ariaLabel} className="justify-between w-56" onClick={() => setOpen(o=>!o)}>
          <span className="truncate text-left">{current ? current.project_name : placeholder}</span>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      {open && (
      <DropdownMenuContent align="start" className="w-80 p-2">
        <div className="flex items-center gap-2 mb-2">
          <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search projects..." aria-label="Search projects" />
          {value !== null && (
            <Button size="sm" variant="outline" onClick={() => { onChange(null); setOpen(false) }}>Clear</Button>
          )}
        </div>
        <div className="max-h-64 overflow-auto">
          {items.map(p => (
            <div key={p.id} className="px-2 py-1 text-sm hover:bg-muted rounded cursor-pointer" onClick={()=>{ onChange(p.id); setOpen(false) }}>
              {p.project_name}
            </div>
          ))}
          {items.length === 0 && (
            <div className="px-2 py-1 text-sm text-muted-foreground">No results</div>
          )}
        </div>
      </DropdownMenuContent>
      )}
    </DropdownMenu>
  )
}


