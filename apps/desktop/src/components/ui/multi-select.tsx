"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown } from 'lucide-react'

type MultiSelectProps = {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  ariaLabel?: string
  maxHeight?: number
}

export function MultiSelect({ options, selected, onChange, placeholder = 'Select...', searchPlaceholder = 'Search...', ariaLabel, maxHeight = 280 }: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return options
    return options.filter(o => o.toLowerCase().includes(qq))
  }, [options, q])

  // Reset search when dropdown closes
  React.useEffect(() => {
    if (!open) {
      setQ('')
    }
  }, [open])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label={ariaLabel} className="justify-between w-56">
          <span className="truncate text-left">
            {selected.length === 0 ? placeholder : `${selected.length} selected`}
          </span>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-2">
        <Input
          placeholder={searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={`${ariaLabel || 'filter'} search input`}
          className="mb-2"
        />
        <div className="overflow-auto" style={{ maxHeight }}>
          {filtered.map(opt => {
            const checked = selected.includes(opt)
            return (
              <label key={opt} className="flex items-center space-x-2 px-2 py-1 cursor-pointer hover:bg-muted/50 rounded">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => {
                    const isChecked = !!v
                    if (isChecked && !checked) {
                      const newSelected = [...selected, opt]
                      onChange(newSelected)
                    }
                    if (!isChecked && checked) {
                      const newSelected = selected.filter(s => s !== opt)
                      onChange(newSelected)
                    }
                  }}
                  aria-label={opt}
                />
                <span className="text-sm">{opt}</span>
              </label>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground px-2 py-1">No results</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


