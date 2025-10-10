'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/lib/context/AppContext';
import { LoadingState } from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { state } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  // Show loading while checking authentication
  if (state.authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingState text="Checking authentication..." />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!state.isAuthenticated) {
    // Store the intended destination
    if (typeof window !== 'undefined') {
      localStorage.setItem('redirect_after_login', pathname);
    }
    const marketing = (process.env.NEXT_PUBLIC_STUDENT_BASE_URL || 'http://localhost:3001') as string;
    router.replace(marketing);
    return null;
  }

  return <>{children}</>;
}

