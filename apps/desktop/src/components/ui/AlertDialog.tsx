"use client"

import * as React from "react"

interface AlertDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface AlertDialogTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface AlertDialogContentProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogHeaderProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogTitleProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogFooterProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogCancelProps {
  children: React.ReactNode
  onClick?: () => void
}

interface AlertDialogActionProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

export function AlertDialog({ children, open, onOpenChange }: AlertDialogProps) {
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
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0" onClick={() => onOpenChange?.(false)}>
          <div className="flex min-h-full items-center justify-center p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export function AlertDialogTrigger({ children }: AlertDialogTriggerProps) {
  return <>{children}</>
}

export function AlertDialogContent({ children, className }: AlertDialogContentProps) {
  return (
    <div
      className={`relative max-w-lg rounded-lg border bg-background p-6 shadow-lg ${className || ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

export function AlertDialogHeader({ children, className }: AlertDialogHeaderProps) {
  return (
    <div className={`flex flex-col space-y-2 text-center sm:text-left ${className || ""}`}>
      {children}
    </div>
  )
}

export function AlertDialogTitle({ children, className }: AlertDialogTitleProps) {
  return (
    <h2 className={`text-lg font-semibold leading-none tracking-tight ${className || ""}`}>
      {children}
    </h2>
  )
}

export function AlertDialogDescription({ children, className }: AlertDialogDescriptionProps) {
  return (
    <p className={`text-sm text-muted-foreground ${className || ""}`}>
      {children}
    </p>
  )
}

export function AlertDialogFooter({ children, className }: AlertDialogFooterProps) {
  return (
    <div className={`flex flex-col-reverse gap-2 sm:flex-row sm:justify-end ${className || ""}`}>
      {children}
    </div>
  )
}

export function AlertDialogCancel({ children, onClick }: AlertDialogCancelProps) {
  return (
    <button
      className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function AlertDialogAction({ children, onClick, className }: AlertDialogActionProps) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className || ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}


