"use client"

import { AppLayout } from '@/components/layout/AppLayout'

export default function AdvisoryLayout({ children }: { children: React.ReactNode }) {
  // Use the global AppLayout so the left sidebar + subnav (NGI Capital Advisory children) are always visible
  return (
    <AppLayout>
      {children}
    </AppLayout>
  )
}
