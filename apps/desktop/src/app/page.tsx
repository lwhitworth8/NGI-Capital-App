'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/ui/LoadingSpinner';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user has a token in localStorage
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      // If token exists, redirect to dashboard
      router.replace('/dashboard');
    } else {
      // If no token, redirect to login
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <LoadingState text="Redirecting..." />
    </div>
  );
}