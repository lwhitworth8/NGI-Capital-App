"use client"

import React from 'react'

export type NGINavItem = { name: string; href: string; badgeCount?: number }

type Props = {
  brand: string
  items: NGINavItem[]
  activePath: string
  LinkComponent: any
  user?: { initials?: string; displayName?: string; color?: string; photoUrl?: string }
  onSettings?: () => void
  onSignOut?: () => void | Promise<void>
}

export default function NGICapitalSidebar({ brand, items, activePath, LinkComponent, user, onSettings, onSignOut }: Props) {
  return (
    <aside className="w-56 bg-card border-r border-border h-screen sticky top-0 flex flex-col">
      <div className="px-4 py-4 border-b border-border font-bold text-base">{brand}</div>
      {user && (
        <div className="px-4 py-3 flex items-center gap-3 border-b border-border">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: user.color || '#1f2937' }}>
            {user.photoUrl ? <img src={user.photoUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" /> : (user.initials || 'U')}
          </div>
          <div className="text-xs">
            <div className="font-medium">{user.displayName || 'User'}</div>
          </div>
        </div>
      )}
      <nav className="flex-1 overflow-auto py-2">
        {items.map((item) => {
          const active = activePath === item.href || activePath.startsWith(item.href + '/');
          return (
            <LinkComponent key={item.href} href={item.href} className={`flex items-center justify-between px-4 py-2 text-sm hover:bg-accent ${active ? 'bg-accent' : ''}`}>
              <span>{item.name}</span>
              {item.badgeCount ? (
                <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                  {item.badgeCount}
                </span>
              ) : null}
            </LinkComponent>
          )
        })}
      </nav>
      <div className="p-3 border-t border-border space-y-2">
        {onSettings && (
          <button className="w-full text-left text-sm px-3 py-2 rounded bg-secondary hover:bg-secondary/80" onClick={onSettings}>Settings</button>
        )}
        {onSignOut && (
          <button className="w-full text-left text-sm px-3 py-2 rounded bg-destructive text-white hover:bg-destructive/90" onClick={() => void onSignOut()}>Sign Out</button>
        )}
      </div>
    </aside>
  )
}

