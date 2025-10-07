"use client"

import * as React from "react"

interface SheetProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface SheetTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface SheetContentProps {
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left" | "center"
  className?: string
}

interface SheetHeaderProps {
  children: React.ReactNode
  className?: string
}

interface SheetTitleProps {
  children: React.ReactNode
  className?: string
}

interface SheetDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function Sheet({ children, open, onOpenChange }: SheetProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* Backdrop layer */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => onOpenChange?.(false)} />
      {/* Slot for content; SheetContent renders absolute/fixed positioned box and stops propagation */}
      {children}
    </div>
  )
}

export function SheetTrigger({ children }: SheetTriggerProps) {
  return <>{children}</>
}

export function SheetContent({ children, side = "right", className }: SheetContentProps) {
  const sideClasses = {
    top: "inset-x-0 top-0 border-b",
    right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-lg",
    bottom: "inset-x-0 bottom-0 border-t",
    left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-lg",
    center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-3xl border rounded-xl",
  }

  return (
    <div
      className={`absolute flex ${side === 'center' ? 'h-auto' : 'h-full'} ${side === 'center' ? 'w-auto' : 'w-full'} flex-col bg-background shadow-lg ${sideClasses[side]} ${className || ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

export function SheetHeader({ children, className }: SheetHeaderProps) {
  return (
    <div className={`flex flex-col space-y-2 p-6 ${className || ""}`}>
      {children}
    </div>
  )
}

export function SheetTitle({ children, className }: SheetTitleProps) {
  return (
    <h2 className={`text-lg font-semibold text-foreground ${className || ""}`}>
      {children}
    </h2>
  )
}

export function SheetDescription({ children, className }: SheetDescriptionProps) {
  return (
    <p className={`text-sm text-muted-foreground ${className || ""}`}>
      {children}
    </p>
  )
}


