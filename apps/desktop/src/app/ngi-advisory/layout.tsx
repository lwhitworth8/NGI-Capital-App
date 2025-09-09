"use client"

import { usePathname } from 'next/navigation'

export default function AdvisoryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const tabs = [
    { name: 'Dashboard', href: '/ngi-advisory/dashboard' },
    { name: 'Projects', href: '/ngi-advisory/projects' },
    { name: 'Applications', href: '/ngi-advisory/applications' },
  ]
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        {tabs.map(t => (
          <a key={t.href} href={t.href} className={`px-3 py-2 rounded-md border ${isActive(t.href) ? 'bg-muted' : ''}`}>{t.name}</a>
        ))}
      </div>
      <div>{children}</div>
    </div>
  )
}

