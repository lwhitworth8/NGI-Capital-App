"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SidebarProfile from '@/components/SidebarProfile'
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { FolderOpen, FileText, Briefcase, BookOpen } from 'lucide-react'

type Membership = { id:number; project_id:number; role?:string; hours_planned?:number; active:boolean }

export default function StudentSidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const [hasActiveProject, setHasActiveProject] = useState(false)

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const email = user?.primaryEmailAddress?.emailAddress
        const res = await fetch('/api/public/memberships/mine', {
          headers: email ? { 'X-Student-Email': email } : undefined,
        })
        if (!res.ok) return
        const data = (await res.json()) as Membership[]
        if (!ignore) setHasActiveProject(Array.isArray(data) && data.some(m => !!m.active))
      } catch {}
    }
    load()
    return () => { ignore = true }
  }, [user?.primaryEmailAddress?.emailAddress])

  const items = useMemo(() => (
    [
      { name: 'Projects', href: '/projects', icon: FolderOpen },
      { name: 'Applications', href: '/applications', icon: FileText },
      ...(hasActiveProject ? [{ name: 'My Projects', href: '/my-projects', icon: Briefcase }] : []),
      { name: 'Learning', href: '/learning', icon: BookOpen },
    ]
  ), [hasActiveProject])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <h2 className="text-xl font-bold tracking-tight text-foreground">NGI Capital Advisory</h2>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto select-none">
        {items.map((it) => {
          const Icon = it.icon
          return (
            <Link
              key={it.name}
              href={it.href}
              className={
                `w-full flex items-center gap-3 px-4 py-3 text-base font-medium rounded-xl transition-colors duration-150 ` +
                (isActive(it.href)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-foreground hover:bg-muted')
              }
              aria-current={isActive(it.href) ? 'page' : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left">{it.name}</span>
            </Link>
          )
        })}
      </nav>
      <SidebarProfile />
    </aside>
  )
}
