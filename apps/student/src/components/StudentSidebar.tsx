'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { 
  FolderOpen, 
  FileText, 
  Briefcase, 
  BookOpen, 
  Settings,
  LogOut
} from 'lucide-react'

type Membership = { id:number; project_id:number; role?:string; hours_planned?:number; active:boolean }

interface NavItem {
  name: string
  href: string
  icon?: any
}

export default function StudentSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [hasActiveProject, setHasActiveProject] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const email = user?.primaryEmailAddress?.emailAddress
        if (!email) return
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

  const items = useMemo(() => {
    const baseItems: NavItem[] = [
      { name: 'Projects', href: '/projects', icon: FolderOpen },
      { name: 'Applications', href: '/applications', icon: FileText },
      { name: 'Coffee Chats', href: '/coffeechats', icon: Briefcase },
    ]
    
    if (hasActiveProject) {
      baseItems.push({ name: 'My Projects', href: '/my-projects', icon: Briefcase })
    }
    
    baseItems.push(
      { name: 'Learning', href: '/learning', icon: BookOpen }
    )
    
    return baseItems
  }, [hasActiveProject])

  const isActive = (href: string) => pathname === href

  // Parse name to exclude middle names
  // Sometimes Google OAuth puts full name in firstName field
  const rawFirstName = user?.firstName || ''
  const rawLastName = user?.lastName || ''
  
  let displayFirstName = ''
  let displayLastName = ''
  
  // Check if firstName contains multiple words (Google sometimes puts full name there)
  const firstNameParts = rawFirstName.trim().split(/\s+/)
  if (firstNameParts.length > 1 && !rawLastName) {
    // firstName has multiple parts and no lastName - parse it
    displayFirstName = firstNameParts[0]
    displayLastName = firstNameParts[firstNameParts.length - 1]
  } else if (rawFirstName && rawLastName) {
    // We have both - use only the first word of firstName
    displayFirstName = firstNameParts[0]
    displayLastName = rawLastName.trim().split(/\s+/)[0] // Also take first word of lastName in case it has middle
  } else if (user?.fullName) {
    // Fall back to parsing fullName
    const nameParts = user.fullName.trim().split(/\s+/)
    if (nameParts.length >= 2) {
      displayFirstName = nameParts[0]
      displayLastName = nameParts[nameParts.length - 1]
    } else if (nameParts.length === 1) {
      displayFirstName = nameParts[0]
    }
  } else {
    // Use whatever we have
    displayFirstName = firstNameParts[0] || ''
    displayLastName = rawLastName
  }
  
  // Build display name - first and last only, no middle names
  const userName = (displayFirstName && displayLastName) 
    ? `${displayFirstName} ${displayLastName}`
    : displayFirstName || user?.primaryEmailAddress?.emailAddress || 'Student'
  
  // Get initials from first and last name only
  const userInitials = (displayFirstName && displayLastName)
    ? `${displayFirstName[0]}${displayLastName[0]}`.toUpperCase()
    : displayFirstName 
      ? displayFirstName[0].toUpperCase()
      : 'S'

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-screen fixed left-0 top-0">
      {/* Logo - matching desktop exactly */}
      <div className="h-16 flex items-center px-6 border-b border-border flex-shrink-0">
        <h2 className="text-xl font-bold text-foreground tracking-tight">NGI Capital</h2>
      </div>

      {/* Navigation - matching desktop style exactly */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.name}
              onClick={() => {
                window.location.href = item.href
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200
                ${isActive(item.href)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-foreground hover:bg-muted'
                }
              `}
            >
              {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
              <span className="flex-1 text-left">{item.name}</span>
            </button>
          )
        })}
      </nav>

      {/* User Profile Section - fixed at bottom */}
      <div className="border-t border-border p-4 relative flex-shrink-0">
        <button
          onClick={() => setShowProfileMenu((v) => !v)}
          className="w-full flex items-center gap-3 text-left hover:bg-muted p-2 rounded-xl transition-colors"
          aria-haspopup="menu"
          aria-expanded={showProfileMenu}
        >
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground text-sm font-semibold">
              {userInitials}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {userName}
            </p>
          </div>
        </button>

        {showProfileMenu && (
          <div className="absolute bottom-16 left-4 right-4 bg-card border border-border rounded-xl shadow-lg z-50">
            <div className="py-2">
              <button
                onClick={() => { setShowProfileMenu(false); router.push('/settings'); }}
                className="w-full px-4 py-2 text-sm text-foreground hover:bg-muted text-left flex items-center gap-2"
                role="menuitem"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <button
                onClick={() => {
                  setShowProfileMenu(false)
                  signOut({ redirectUrl: '/' })
                }}
                className="w-full px-4 py-2 text-sm text-foreground hover:bg-muted text-left flex items-center gap-2"
                role="menuitem"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}

        {showProfileMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowProfileMenu(false)}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}
