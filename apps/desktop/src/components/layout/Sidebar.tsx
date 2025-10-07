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
  ChevronRight,
  FileText,
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
  BookOpen,
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
  // 3. Accounting - Modern Tabbed Interface (includes Taxes tab)
  { name: 'Accounting', href: '/accounting', icon: Calculator },
  // 4. Finance
  { name: 'Finance', href: '/finance', icon: DollarSign },
  // 5. Employees
  { name: 'Employees', href: '/employees', icon: Users },
  // 6. Investor Management
  { name: 'Investor Management', href: '/investor-relations', icon: TrendingUp },
  // 7. NGI Capital Advisory
  {
    name: 'NGI Capital Advisory', href: '/ngi-advisory', icon: Briefcase,
    children: [
      { name: 'Projects', href: '/ngi-advisory/projects' },
      { name: 'Students', href: '/ngi-advisory/students' },
      { name: 'Onboarding', href: '/ngi-advisory/onboarding' },
      { name: 'Project Center', href: '/ngi-advisory/lead-manager' },
    ]
  },
  // 8. Learning Center
  { name: 'Learning Center', href: '/learning', icon: BookOpen },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);

  useEffect(() => {
    // Auto-expand parent if child is active
    navigation.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => 
          pathname === child.href || pathname.startsWith(child.href + '/')
        );
        if (hasActiveChild && !expandedItems.includes(item.name)) {
          setExpandedItems([...expandedItems, item.name]);
        }
      }
    });
  }, [pathname]);

  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const apps = await advisoryListApplications();
        const pending = apps.filter((a: any) => a.status === 'pending').length;
        setPendingApplicationsCount(pending);
      } catch (error) {
        console.error('Failed to load pending applications:', error);
      }
    };
    loadPendingCount();
  }, []);

  const toggleExpanded = (itemName: string) => {
    if (expandedItems.includes(itemName)) {
      setExpandedItems(expandedItems.filter(name => name !== itemName));
    } else {
      setExpandedItems([...expandedItems, itemName]);
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-screen">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <h2 className="text-xl font-bold text-foreground tracking-tight">NGI Capital</h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems.includes(item.name);
          const isItemActive = isActive(item.href);

          return (
            <div key={item.name}>
              <Link
                href={item.href}
                onClick={(e) => {
                  if (hasChildren) {
                    e.preventDefault();
                    toggleExpanded(item.name);
                  }
                }}
                className={`
                  flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200
                  ${isItemActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground hover:bg-muted'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                  <span>{item.name}</span>
                  {item.name === 'NGI Capital Advisory' && pendingApplicationsCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                      {pendingApplicationsCount}
                    </span>
                  )}
                </div>
                {hasChildren && (
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                )}
              </Link>

              {/* Children */}
              {hasChildren && isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-4">
                  {item.children!.map((child) => (
                    <Link
                      key={child.name}
                      href={child.href}
                      className={`
                        block px-3 py-2 text-sm rounded-lg transition-colors
                        ${isActive(child.href)
                          ? 'bg-muted text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }
                      `}
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
            {user?.firstName?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
