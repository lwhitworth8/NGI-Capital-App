'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home,
  Building2,
  Calculator,
  Users,
  TrendingUp,
  Briefcase,
  Settings,
  ChevronRight,
  FileText,
  Shield,
  PieChart,
  Mail,
  FileBarChart,
  DollarSign,
  TrendingDown,
  Wallet,
  FileSpreadsheet,
  ClipboardList,
  BadgeCheck,
  Archive,
  LogOut,
} from 'lucide-react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useApp } from '@/lib/context/AppContext';
import { advisoryListApplications } from '@/lib/api';

interface NavItem {
  name: string;
  href: string;
  icon?: any;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  // 1. Dashboard
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  // 2. Entities
  { name: 'Entities', href: '/entities', icon: Building2 },
  // 3. Accounting modules
  {
    name: 'Accounting',
    href: '/accounting',
    icon: Calculator,
    children: [
      // Workflow order
      { name: 'Documents', href: '/accounting/documents', icon: FileText },
      { name: 'Journal Entries', href: '/accounting/journal-entries', icon: ClipboardList },
      { name: 'Approvals', href: '/accounting/approvals', icon: BadgeCheck },
      { name: 'Bank Reconciliation', href: '/accounting/bank-reconciliation', icon: Wallet },
      { name: 'Close', href: '/accounting/close', icon: Archive },
      { name: 'Financial Reporting', href: '/accounting/financial-reporting', icon: FileBarChart },
      { name: 'Chart of Accounts', href: '/accounting/chart-of-accounts', icon: PieChart },
      { name: 'Internal Controls', href: '/accounting/internal-controls', icon: Shield },
      { name: 'Settings', href: '/accounting/settings', icon: Settings },
    ],
  },
  // 4. Finance
  { name: 'Finance', href: '/finance', icon: DollarSign },
  // 5. Taxes
  { name: 'Taxes', href: '/tax', icon: FileSpreadsheet },
  // 6. Employees
  { name: 'Employees', href: '/employees', icon: Users },
  // 7. Investor Management (renamed from Investor Relations)
  { name: 'Investor Management', href: '/investor-relations', icon: TrendingUp },
  // 8. NGI Capital Advisory (renamed)
  {
    name: 'NGI Capital Advisory', href: '/ngi-advisory', icon: Briefcase,
    children: [
      { name: 'Projects', href: '/ngi-advisory/projects' },
      { name: 'Students', href: '/ngi-advisory/students' },
      { name: 'Coffee Chat Availability', href: '/ngi-advisory/availability' },
      { name: 'Coffee Chats (Requests)', href: '/ngi-advisory/coffeechats/requests' },
      { name: 'Applications', href: '/ngi-advisory/applications' },
      { name: 'Onboarding', href: '/ngi-advisory/onboarding' },
      { name: 'Student Project Lead Manager', href: '/ngi-advisory/lead-manager' },
    ]
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();
  const { state } = useApp();
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
  const [appsNewCount, setAppsNewCount] = useState(0)

  // Reviewer badge for Applications nav
  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const email = (user?.primaryEmailAddress?.emailAddress || '').toLowerCase()
        if (!email) return
        const lastSeenKey = `apps_last_seen_${email}`
        const sinceIso = (typeof window !== 'undefined') ? (localStorage.getItem(lastSeenKey) || '') : ''
        const since = sinceIso ? Date.parse(sinceIso) : 0
        const list = await advisoryListApplications({ entity_id: entityId })
        const cnt = (list||[]).filter(a => (a.reviewer_email||'').toLowerCase() === email && Date.parse(a.created_at||'') > since).length
        if (!ignore) setAppsNewCount(cnt)
      } catch {}
    }
    load();
    const id = setInterval(load, 60_000)
    return () => { ignore = true; clearInterval(id) }
  }, [user?.primaryEmailAddress?.emailAddress, entityId])

  useEffect(() => {
    // Auto-expand active parent items
    navigation.forEach(item => {
      if (item.children && item.children.some(child => pathname.startsWith(child.href))) {
        setExpandedItems(prev => Array.from(new Set([...prev, item.name])));
      }
    });
  }, [pathname]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  // Account for basePath '/admin' so matching works with child hrefs like '/ngi-advisory/projects'
  const pathNoBase = pathname.replace(/^\/admin(?![\w-])/i, '') || '/'
  const isActive = (href: string) => pathname === href || pathNoBase === href;
  const isParentActive = (item: NavItem) => {
    if (isActive(item.href)) return true;
    if (item.children) {
      return item.children.some(child => pathname.startsWith(child.href) || pathNoBase.startsWith(child.href));
    }
    return false;
  };

  // Compute display name matching student UI behavior (avoid middle names)
  const { displayFirstName, displayLastName, userName, userInitials, profileImageUrl } = useMemo(() => {
    const rawFirstName = user?.firstName || '';
    const rawLastName = user?.lastName || '';
    const fullName = user?.fullName || '';

    let df = '';
    let dl = '';
    const firstNameParts = rawFirstName.trim().split(/\s+/);
    if (firstNameParts.length > 1 && !rawLastName) {
      df = firstNameParts[0];
      dl = firstNameParts[firstNameParts.length - 1];
    } else if (rawFirstName && rawLastName) {
      df = firstNameParts[0];
      dl = rawLastName.trim().split(/\s+/)[0];
    } else if (fullName) {
      const nameParts = fullName.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        df = nameParts[0];
        dl = nameParts[nameParts.length - 1];
      } else if (nameParts.length === 1) {
        df = nameParts[0];
      }
    } else {
      df = firstNameParts[0] || '';
      dl = rawLastName;
    }
    const computedName = (df && dl) ? `${df} ${dl}` : (df || user?.primaryEmailAddress?.emailAddress || 'User');
    const initials = (df && dl) ? `${df[0]}${dl[0]}`.toUpperCase() : (df ? df[0].toUpperCase() : 'U');
    return { displayFirstName: df, displayLastName: dl, userName: computedName, userInitials: initials, profileImageUrl: user?.profileImageUrl };
  }, [user]);

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <h2 className="text-xl font-bold text-foreground tracking-tight">NGI Capital</h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isExpanded = expandedItems.includes(item.name);
          const isItemActive = isParentActive(item);
          
          return (
            <div key={item.name}>
              <button
                onClick={() => {
                  if (item.children) {
                    toggleExpanded(item.name);
                  } else {
                    window.location.href = item.href;
                  }
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200
                  ${isItemActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground hover:bg-muted'
                  }
                `}
              >
                {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                <span className="flex-1 text-left">{item.name}</span>
                {item.children && (
                  <ChevronRight 
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                )}
              </button>

              {/* Children items */}
                  {item.children && isExpanded && (
                    <div className="mt-1 ml-7 space-y-0.5">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    return (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={`
                          flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200
                          ${isActive(child.href)
                            ? 'bg-muted text-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }
                        `}
                      >
                        {ChildIcon && <ChildIcon className="h-3.5 w-3.5" />}
                        <span className="flex-1">
                          {child.name}
                        </span>
                        {child.href === '/ngi-advisory/applications' && appsNewCount > 0 && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white">{appsNewCount}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Profile Section (mirrors student UI) */}
      <div className="border-t border-border p-4 relative">
        <button
          onClick={() => setShowProfileMenu((v) => !v)}
          className="w-full flex items-center gap-3 text-left hover:bg-muted p-2 rounded-xl transition-colors"
          aria-haspopup="menu"
          aria-expanded={showProfileMenu}
        >
          {profileImageUrl ? (
            <img src={profileImageUrl} alt={userName} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground text-sm font-semibold">{userInitials}</span>
            </div>
          )}
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
                onClick={async () => {
                  setShowProfileMenu(false);
                  const marketing = (process.env.NEXT_PUBLIC_STUDENT_BASE_URL || 'http://localhost:3001') as string;
                  // Navigate first to avoid any basePath redirect races
                  try { window.location.replace(marketing) } catch { window.location.href = marketing }
                  // Best-effort sign-out in the background (student root also forces sign-out on load)
                  try { await signOut({ redirectUrl: undefined as any }); } catch {}
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
  );
}
