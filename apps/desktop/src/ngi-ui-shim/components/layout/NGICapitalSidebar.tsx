"use client"

// Temporary pass-through to the original shared sidebar to fix
// any stale aliasing during hot-reload without requiring a server restart.
// This re-exports the real component and its types.
export { default } from '@ngi/ui/components/layout/NGICapitalSidebar'
export * from '@ngi/ui/components/layout/NGICapitalSidebar'

