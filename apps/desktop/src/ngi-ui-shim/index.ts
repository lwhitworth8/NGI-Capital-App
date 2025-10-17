"use client"

// Temporary pass-through to the shared UI package to satisfy stale
// dev resolver references to this shim path. This ensures the original
// sidebar and layout are used without changing imports.
export * from '@ngi/ui'
export { default as ModuleHeader } from '@ngi/ui/components/layout/ModuleHeader'
export { default as NGICapitalSidebar } from '@ngi/ui/components/layout/NGICapitalSidebar'

