"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { id: 'projects', label: 'Projects', href: '/ngi-advisory/projects' },
  { id: 'students', label: 'Students', href: '/ngi-advisory/students' },
  { id: 'onboarding', label: 'Onboarding', href: '/ngi-advisory/onboarding' },
  { id: 'project-center', label: 'Project Center', href: '/ngi-advisory/lead-manager' },
  { id: 'learning-center', label: 'Learning Center', href: '/learning' },
];

interface AdvisoryLayoutProps {
  children: React.ReactNode;
}

export function AdvisoryLayout({ children }: AdvisoryLayoutProps) {
  const pathname = usePathname();

  // Determine active tab based on current path
  const getActiveTab = () => {
    if (!pathname) return 'projects';
    
    if (pathname.startsWith('/ngi-advisory/projects')) {
      return 'projects';
    } else if (pathname.startsWith('/ngi-advisory/students')) {
      return 'students';
    } else if (pathname.startsWith('/ngi-advisory/onboarding')) {
      return 'onboarding';
    } else if (pathname.startsWith('/ngi-advisory/lead-manager')) {
      return 'project-center';
    } else if (pathname.startsWith('/learning')) {
      return 'learning-center';
    } else if (pathname === '/ngi-advisory') {
      return 'projects';
    }
    return 'projects';
  };

  const activeTab = getActiveTab();

  return (
    <div className="p-6 space-y-6">
      {/* Page Content with integrated tabs */}
      <div className="space-y-6">
        {/* Advisory Module Tabs - Moved to be above filters */}
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full">
          <div className="grid w-full grid-cols-5">
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'hover:bg-muted/50'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
        
        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}
