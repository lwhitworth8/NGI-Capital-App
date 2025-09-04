"use client"

import { UserButton, useUser } from '@clerk/nextjs'

export default function SidebarProfile() {
  const { user } = useUser()
  const name = user?.fullName || user?.username || 'User'
  const email = user?.primaryEmailAddress?.emailAddress || ''

  return (
    <div className="border-t border-border p-4 mt-auto">
      <div className="flex items-center gap-3">
        <UserButton afterSignOutUrl="/sign-in" appearance={{ elements: { userButtonAvatarBox: { width: 36, height: 36 } } }}>
          <UserButton.MenuItems>
            <UserButton.Link label="Settings" href="/settings" />
            <UserButton.Action label="Sign out" action="signOut" />
          </UserButton.MenuItems>
        </UserButton>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{name}</div>
          {email ? <div className="text-xs text-muted-foreground truncate">{email}</div> : null}
        </div>
      </div>
    </div>
  )
}
