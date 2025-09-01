'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/ui/LoadingSpinner';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Defer auth handling to Clerk middleware; always route to dashboard.
    // If not signed in, middleware will redirect to /sign-in.
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <LoadingState text="Redirecting..." />
    </div>
  );
}
