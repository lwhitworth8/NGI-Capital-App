'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/theme-toggle';

// Hardcode for now to ensure it works
const API_URL = '/api';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

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
      const loginUrl = `${API_URL}/api/auth/login`;
      console.log('Attempting login for:', email);
      console.log('Full login URL:', loginUrl);
      console.log('Request body:', JSON.stringify({ email, password }));
      
      // Direct fetch call
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      console.log('Response received:', response);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);

      if (data.access_token) {
        // Store user data
        // Legacy token storage removed in Clerk-only mode
        localStorage.setItem('user_name', data.partner_name || 'Partner');
        localStorage.setItem('user_email', email);
        localStorage.setItem('ownership_percentage', String(data.ownership_percentage || 50));
        
        // Redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        setLoginError(data.detail || 'Invalid credentials. Please try again.');
      }
    } catch (error) {
      console.error('Login error full details:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        setLoginError('Cannot connect to backend server. Please ensure the backend is running on port 8001.');
      } else if (error instanceof Error) {
        setLoginError(`Login failed: ${error.message}`);
      } else {
        setLoginError('An unexpected error occurred during login');
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
                    Accessing...
                  </div>
                ) : (
                  <span className="flex items-center justify-center">
                    Access Dashboard
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

