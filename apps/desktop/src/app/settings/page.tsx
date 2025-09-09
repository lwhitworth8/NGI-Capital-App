'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { useUser } from '@clerk/nextjs';
import { apiClient } from '@/lib/api';
import { Moon, Sun, Monitor, Check, X } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    (async () => {
      try {
        const prefs = await apiClient.getPreferences();
        if (prefs?.theme) setTheme(prefs.theme);
      } catch (e) {
        // non-fatal
      } finally { setLoading(false); }
    })();
  }, [setTheme]);

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    try {
      setTheme(newTheme);
      setSuccess('Theme updated');
      setTimeout(() => setSuccess(null), 2000);
      // Save in background
      await apiClient.setPreferences({ theme: newTheme });
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to save theme');
      setTimeout(() => setError(null), 3000);
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  const display = useMemo(() => {
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
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) { df = parts[0]; dl = parts[parts.length - 1]; }
      else if (parts.length === 1) { df = parts[0]; }
    } else { df = firstNameParts[0] || ''; dl = rawLastName; }
    const name = (df && dl) ? `${df} ${dl}` : (df || user?.primaryEmailAddress?.emailAddress || 'User');
    return { name };
  }, [user]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your account preferences and profile</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-600">{success}</span>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
            <X className="h-5 w-5 text-red-600" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Theme Preferences */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
              <p className="text-sm text-muted-foreground mt-1">Customize how NGI Capital looks on your device</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = mounted && theme === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleThemeChange(option.value)}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all duration-200
                      ${isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'}
                    `}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Icon className={`h-6 w-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>{option.label}</span>
                    </div>
                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Profile Information */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">Profile Information</h2>
              <p className="text-sm text-muted-foreground mt-1">Your account details</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="text-sm font-medium text-foreground">{display.name}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium text-foreground">{user?.primaryEmailAddress?.emailAddress || 'Not set'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
