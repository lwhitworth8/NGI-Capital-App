'use client';

import { useEffect, useState } from 'react';
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
  FileSpreadsheet
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon?: any;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  { 
    name: 'Dashboard', 
    href: '/dashboard',
    icon: Home 
  },
  { 
    name: 'Entities', 
    href: '/entities',
    icon: Building2
  },
  { 
    name: 'Accounting', 
    href: '/accounting',
    icon: Calculator,
    children: [
      { name: 'Financial Reporting', href: '/accounting/financial-reporting', icon: FileBarChart },
      { name: 'Chart of Accounts', href: '/accounting/chart-of-accounts', icon: PieChart },
      { name: 'Journal Entries', href: '/accounting/journal-entries', icon: FileText },
      { name: 'Documents', href: '/accounting/documents', icon: FileText },
      { name: 'Internal Controls', href: '/accounting/internal-controls', icon: Shield },
    ]
  },
  { 
    name: 'Employees', 
    href: '/employees',
    icon: Users
  },
  { name: 'Investor Relations', href: '/investor-relations', icon: TrendingUp },
  { 
    name: 'NGI Advisory', 
    href: '/ngi-advisory',
    icon: Briefcase
  },
  // Settings moved to profile area at bottom
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [ownershipPct, setOwnershipPct] = useState<string>('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserName(localStorage.getItem('user_name') || '');
      setOwnershipPct(localStorage.getItem('ownership_percentage') || '');
    }
    
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

  const isActive = (href: string) => pathname === href;
  const isParentActive = (item: NavItem) => {
    if (pathname === item.href) return true;
    if (item.children) {
      return item.children.some(child => pathname.startsWith(child.href));
    }
    return false;
  };

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
                        <span>{child.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-border p-4 relative">
        <button
          onClick={() => setShowProfileMenu((v) => !v)}
          className="w-full flex items-center gap-3 text-left hover:bg-muted p-2 rounded-xl transition-colors"
          aria-haspopup="menu"
          aria-expanded={showProfileMenu}
        >
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-semibold">
              {(userName || 'User')
                .split(' ')
                .map(n => n && n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {userName || 'User'}
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
