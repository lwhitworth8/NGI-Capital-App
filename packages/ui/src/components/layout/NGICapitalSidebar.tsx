"use client";

import React, { useEffect, useMemo, useState } from "react";

export type NGINavChild = {
  name: string;
  href: string;
};

export type NGINavItem = {
  name: string;
  href: string;
  children?: NGINavChild[];
  badgeCount?: number;
};

export type LinkLikeProps = {
  href: string;
  className?: string;
  onClick?: (e: React.MouseEvent<any>) => void;
  children: React.ReactNode;
};

export type NGICapitalSidebarProps = {
  brand?: string;
  items: NGINavItem[];
  activePath?: string;
  isActiveHref?: (path: string, href: string) => boolean;
  onNavClick?: (href: string) => void;
  LinkComponent?: React.ComponentType<LinkLikeProps>;
  user?: { initials: string; displayName: string; color?: string; photoUrl?: string } | null;
  onSettings?: () => void;
  onSignOut?: () => void;
  // Optional sizing overrides (pixels). Defaults mirror admin.
  widthPx?: number;          // default 240
  baseFontPx?: number;       // default 16
  brandFontPx?: number;      // default 24
  linkFontPx?: number;       // default 16
};

export default function NGICapitalSidebar({
  brand = "NGI Capital",
  items,
  activePath = "/",
  isActiveHref,
  onNavClick,
  LinkComponent,
  user,
  onSettings,
  onSignOut,
  widthPx,
  baseFontPx,
  brandFontPx,
  linkFontPx,
}: NGICapitalSidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const _width = typeof widthPx === 'number' ? widthPx : 240;
  const _baseFont = typeof baseFontPx === 'number' ? baseFontPx : 16;
  // Larger brand for stronger hierarchy in 64px header
  const _brandFont = typeof brandFontPx === 'number' ? brandFontPx : 32;
  // Slight bump for nav legibility
  const _linkFont = typeof linkFontPx === 'number' ? linkFontPx : 18;
  // Profile menu text slightly smaller than main nav
  const _menuFont = Math.max(12, _linkFont - 2);

  const isActive = (href: string) => {
    if (isActiveHref) return isActiveHref(activePath, href);
    if (href === "/dashboard") return activePath === "/dashboard";
    return activePath === href || activePath.startsWith(href + "/");
  };

  useEffect(() => {
    // Auto-expand parent if child is active
    items.forEach((item) => {
      if (item.children && item.children.length > 0) {
        const hasActiveChild = item.children.some(
          (child) => activePath === child.href || activePath.startsWith(child.href + "/")
        );
        if (hasActiveChild && !expandedItems.includes(item.name)) {
          setExpandedItems((prev) => [...prev, item.name]);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath, items]);

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const A: React.ComponentType<LinkLikeProps> =
    LinkComponent || ((props: LinkLikeProps) => (
      <a href={props.href} className={props.className} onClick={props.onClick}>
        {props.children}
      </a>
    ));

  return (
    <div
      className="w-60 w-[240px] flex-none bg-card border-r border-border flex flex-col h-screen text-[16px]"
      style={{ width: _width, flex: `0 0 ${_width}px`, fontSize: _baseFont }}
      data-sidebar="ngi-shared"
    >
      {/* Brand */}
      <div className="h-16 flex items-center px-[24px] border-b border-border" style={{ paddingLeft: 24, paddingRight: 24 }}>
        <h2
          className="font-bold text-foreground tracking-tight leading-none select-none"
          style={{ fontSize: _brandFont }}
        >
          {brand}
        </h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-[12px] py-[16px] space-y-[6px] overflow-y-auto">
        {items.map((item) => {
          const hasChildren = !!(item.children && item.children.length > 0);
          const expanded = expandedItems.includes(item.name);
          const active = isActive(item.href);
          return (
            <div key={item.name}>
              <A
                href={item.href}
                onClick={(e) => {
                  if (hasChildren) {
                    e.preventDefault();
                    toggleExpanded(item.name);
                  }
                  onNavClick?.(item.href);
                }}
                aria-current={active ? "page" : undefined}
                className={`
                  group relative w-full flex items-center px-[12px] py-[8px] text-[16px] font-medium tracking-[-0.006em] rounded-lg
                  text-foreground transition-all duration-200 ease-out
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30
                `}
                style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: _linkFont, letterSpacing: '-0.006em' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`relative inline-block whitespace-nowrap
                      after:content-[''] after:absolute after:left-0 after:-right-1 after:-bottom-1 after:h-[3px]
                      after:bg-primary after:origin-left after:scale-x-0 after:transition-transform after:duration-200 after:ease-out
                      ${active ? 'after:scale-x-100' : 'group-hover:after:scale-x-100'}`}
                  >
                    <span className="truncate">{item.name}</span>
                  </span>
                  {typeof item.badgeCount === "number" && item.badgeCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                      {item.badgeCount}
                    </span>
                  )}
                </div>
              </A>
              {hasChildren && expanded && (
                <div className="mt-2 space-y-1 ml-0 pl-3">
                  {item.children!.map((child) => (
                    <A
                      key={child.name}
                      href={child.href}
                      onClick={() => onNavClick?.(child.href)}
                      aria-current={isActive(child.href) ? "page" : undefined}
                      className={`
                        group relative block px-[12px] py-[8px] text-[16px] rounded-lg text-foreground
                        transition-all duration-200 ease-out
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30
                      `}
                      style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: _linkFont }}
                    >
                      <span
                        className={`relative inline-block whitespace-nowrap
                          after:content-[''] after:absolute after:left-0 after:-right-1 after:-bottom-1 after:h-[3px]
                          after:bg-primary after:origin-left after:scale-x-0 after:transition-transform after:duration-200 after:ease-out
                          ${isActive(child.href) ? 'after:scale-x-100' : 'group-hover:after:scale-x-100'}`}
                      >
                        <span className="truncate">{child.name}</span>
                      </span>
                    </A>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-border p-3 relative">
        <button
          onClick={() => setShowProfileMenu((v) => !v)}
          className="w-full flex items-center gap-3 text-left hover:bg-muted p-2 rounded-lg transition-colors"
          aria-haspopup="menu"
          aria-expanded={showProfileMenu}
        >
          {user?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoUrl} alt="Profile" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold" style={{ background: user?.color || '#0066FF' }}>
              {(user?.initials || "U").toString().slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium truncate">
              {user?.displayName || "User"}
            </p>
          </div>
        </button>

        {showProfileMenu && (
          <div className="absolute bottom-14 left-4 right-4 bg-card border border-border rounded-xl shadow-lg z-50">
            <div className="py-2">
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onSettings?.();
                }}
                className="group w-full px-4 py-2 rounded-lg text-foreground text-left flex items-center gap-2 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                style={{ fontSize: _menuFont }}
                role="menuitem"
              >
                <span
                  className="relative inline-block whitespace-nowrap after:content-[''] after:absolute after:left-0 after:-right-1 after:-bottom-1 after:h-[3px] after:bg-primary after:origin-left after:scale-x-0 group-hover:after:scale-x-100 after:transition-transform after:duration-200 after:ease-out"
                >
                  Settings
                </span>
              </button>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onSignOut?.();
                }}
                className="group w-full px-4 py-2 rounded-lg text-foreground text-left flex items-center gap-2 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                style={{ fontSize: _menuFont }}
                role="menuitem"
              >
                <span
                  className="relative inline-block whitespace-nowrap after:content-[''] after:absolute after:left-0 after:-right-1 after:-bottom-1 after:h-[3px] after:bg-primary after:origin-left after:scale-x-0 group-hover:after:scale-x-100 after:transition-transform after:duration-200 after:ease-out"
                >
                  Sign Out
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
