"use client"

import * as React from "react"

interface DropdownMenuProps {
  children: React.ReactNode
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface DropdownMenuContentProps {
  children: React.ReactNode
  align?: "start" | "center" | "end"
  className?: string
}

interface DropdownMenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

interface DropdownMenuSeparatorProps {
  className?: string
}

interface DropdownMenuLabelProps {
  children: React.ReactNode
  className?: string
}

interface DropdownMenuCheckboxItemProps {
  children: React.ReactNode
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  return <div className="relative">{children}</div>
}

export function DropdownMenuTrigger({ children, asChild }: DropdownMenuTriggerProps) {
  return <div className="cursor-pointer">{children}</div>
}

export function DropdownMenuContent({ children, align = "start", className }: DropdownMenuContentProps) {
  return (
    <div className={`absolute z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md ${align === "end" ? "right-0" : "left-0"} ${className || ""}`}>
      {children}
    </div>
  )
}

export function DropdownMenuItem({ children, onClick, className }: DropdownMenuItemProps) {
  return (
    <div
      className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground ${className || ""}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return <div className={`-mx-1 my-1 h-px bg-muted ${className || ""}`} />
}

export function DropdownMenuLabel({ children, className }: DropdownMenuLabelProps) {
  return (
    <div className={`px-2 py-1.5 text-sm font-semibold ${className || ""}`}>
      {children}
    </div>
  )
}

export function DropdownMenuCheckboxItem({ children, checked, onCheckedChange, className }: DropdownMenuCheckboxItemProps) {
  return (
    <div
      className={`relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground ${className || ""}`}
      onClick={() => onCheckedChange?.(!checked)}
    >
      <div className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && <div className="h-2 w-2 bg-current rounded-sm" />}
      </div>
      {children}
    </div>
  )
}


