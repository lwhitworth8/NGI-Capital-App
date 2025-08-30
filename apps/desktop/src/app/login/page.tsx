'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

// Use the apiClient for consistency
import { apiClient } from '@/lib/api';
import { useApp } from '@/lib/context/AppContext';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { login: appLogin } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password) {
      setLoginError('Please enter both email and password');
      return;
    }

    if (!email.endsWith('@ngicapitaladvisory.com')) {
      setLoginError('Must use @ngicapitaladvisory.com email');
      return;
    }

    setIsLoading(true);
    setLoginError('');

    try {
      console.log('Attempting login for:', email);

      // Use AppContext login to keep global auth state in sync
      await appLogin(email, password);

      // Optional: keep lightweight display values for dashboard header
      try {
        const me = await apiClient.getProfile();
        localStorage.setItem('user_name', me.name || 'Partner');
        localStorage.setItem('user_email', me.email || email);
        localStorage.setItem('ownership_percentage', String(me.ownership_percentage ?? 50));
      } catch {}

      // Redirect to intended page or dashboard
      const redirectTo = typeof window !== 'undefined' ? (localStorage.getItem('redirect_after_login') || '/dashboard') : '/dashboard';
      if (typeof window !== 'undefined') localStorage.removeItem('redirect_after_login');
      router.push(redirectTo);
    } catch (error: any) {
      console.error('Login error:', error);
      
      // The apiClient/AppContext already handle some errors; show a message too
      if (error?.response?.status === 401) {
        setLoginError('Invalid email or password');
      } else if (error?.response?.status === 422) {
        setLoginError('Invalid email format');
      } else if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network')) {
        setLoginError('Cannot connect to server. Please check if the backend is running.');
      } else {
        setLoginError(error?.response?.data?.detail || error?.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Theme Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Login Card */}
        <Card className="ngi-card-elevated">
          <div className="p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Secure Login</h1>
              <p className="text-muted-foreground">Access the NGI Capital dashboard</p>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{loginError}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partner@ngicapitaladvisory.com"
                  className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
                  disabled={isLoading}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your secure password"
                    className="w-full px-4 py-2.5 pr-12 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Logging in...
                  </div>
                ) : (
                  <span className="flex items-center justify-center">
                    Login
                    <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                )}
              </button>
            </form>

            {/* Test Credentials for Development */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-muted-foreground text-center">
                For testing: lwhitworth@ngicapitaladvisory.com / TempPassword123!
              </p>
            </div>
          </div>
        </Card>

        {/* Security Footer */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center text-xs text-muted-foreground">
            <Shield className="h-4 w-4 mr-1.5" />
            <span>Enterprise-grade Security</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            All access is monitored and logged for compliance
          </p>
        </div>
      </div>
    </div>
  );
}
