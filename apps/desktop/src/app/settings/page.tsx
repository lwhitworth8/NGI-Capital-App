"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { useUser } from "@clerk/nextjs";
import { apiClient } from "@/lib/api";
import { Moon, Sun, Check, X } from "lucide-react";
import { ModuleHeader } from "@ngi/ui/components/layout";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useEntity } from "@/lib/context/UnifiedEntityContext";

export default function SettingsPage() {
  const { user } = useUser();
  const { selectedEntity } = useEntity();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emp, setEmp] = useState<any | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [profileColor, setProfileColor] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [teams, setTeams] = useState<string[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    (async () => {
      try {
        const prefs = await apiClient.getPreferences();
        if (prefs?.theme && prefs.theme !== 'system') setTheme(prefs.theme);
      } catch {}
      try {
        const entityId = (() => {
          try { return (selectedEntity?.id as number) || undefined } catch { return undefined }
        })();
        const url = entityId ? `/me/profile?entity_id=${entityId}` : '/me/profile'
        const me = await apiClient.request<any>('GET', url);
        setEmp(me);
        setFullName((me?.name || '').toString());
        setProfileColor((me?.profile_color || '#0066FF') as string);
        setPhotoUrl((me?.profile_photo_url || '') as string);
        setTeams(Array.isArray(me?.team_names) ? me.team_names : []);
      } catch {}
      setLoading(false);
    })();
  }, [setTheme, selectedEntity?.id]);

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
  ] as const;

  const colorOptions = [
    '#0066FF', // NGI Capital Primary Blue
    '#FF6B35', // Orange
    '#32CD32', // Lime Green
    '#9B59B6', // Purple
    '#E74C3C', // Red
    '#F39C12', // Gold
    '#FF69B4'  // Pink
  ];

  const saveName = async () => {
    try {
      await apiClient.request('PATCH', '/me/profile', { full_name: fullName });
      setSuccess('Name updated');
      setTimeout(() => setSuccess(null), 1500);
      try { window.dispatchEvent(new CustomEvent('avatar-updated')); } catch {}
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to update name');
      setTimeout(() => setError(null), 2500);
    }
  };

  const selectColor = async (hex: string) => {
    try {
      setProfileColor(hex);
      console.log('[ADMIN SETTINGS] Saving color:', hex);
      await apiClient.request('PATCH', '/me/profile', { profile_color: hex });
      console.log('[ADMIN SETTINGS] Color saved successfully');
      try { window.dispatchEvent(new CustomEvent('avatar-updated')); } catch {}
    } catch (e: any) {
      console.error('[ADMIN SETTINGS] Color save failed:', e);
      setError(e?.response?.data?.detail || 'Failed to save color');
      setTimeout(() => setError(null), 3000);
    }
  };

  const uploadPhoto = async (file: File) => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.request<any>('POST', '/me/profile/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res?.profile_photo_url) setPhotoUrl(res.profile_photo_url);
      try { window.dispatchEvent(new CustomEvent('avatar-updated')); } catch {}
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Upload failed');
      setTimeout(() => setError(null), 2500);
    }
  };

  const removePhoto = async () => {
    try {
      try {
        await apiClient.request('DELETE', '/me/profile/photo');
      } catch (e: any) {
        // Fallback for environments that block DELETE: use POST /me/profile/photo/delete
        if (e?.response?.status === 405) {
          await apiClient.request('POST', '/me/profile/photo/delete');
        } else {
          throw e
        }
      }
      setPhotoUrl('');
      try { window.dispatchEvent(new CustomEvent('avatar-updated')); } catch {}
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to remove photo');
      setTimeout(() => setError(null), 2500);
    }
  }

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
    <div className="flex flex-col h-full bg-background">
      {/* Animated Header - consistent with module headers */}
      <ModuleHeader title="Settings" />
      <div className="flex-1 overflow-auto">
        <main className="max-w-5xl ml-3 mr-auto px-3 md:ml-6 md:px-6">

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

        <div className="pb-12 space-y-6">
          {/* Profile & Appearance combined */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">Profile Information</h2>
            </div>
            {/* Avatar block at the top */}
            <div className="flex flex-col gap-3 items-start">
                <div className="h-16 w-16 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden"
                  style={{ background: photoUrl ? 'transparent' : (profileColor || '#0066FF') }}>
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold">{display.name ? display.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : 'U'}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors">
                    Upload photo
                    <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
                  </label>
                  {photoUrl && (
                    <button type="button" onClick={removePhoto} className="text-sm text-muted-foreground hover:text-foreground underline">Remove photo</button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {colorOptions.map(c => (
                    <button key={c} type="button" onClick={() => selectColor(c)} aria-label={`Color ${c}`} className="h-6 w-6 rounded-full border" style={{ background: c, boxShadow: profileColor === c ? '0 0 0 2px hsl(var(--primary)) inset' : undefined }} />
                  ))}
                </div>
            </div>

            {/* Editable + readonly fields below avatar */}
            <div className="space-y-3 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.primaryEmailAddress?.emailAddress || emp?.email || "Not set"} readOnly className="bg-background" />
                  </div>
              </div>
              {/* Title/Role and Teams intentionally removed per request */}
              {/* Appearance (compact) */}
              <div className="mt-1">
                <Label className="mb-2 block">Appearance</Label>
                <div className="flex flex-wrap gap-2">
                  {themeOptions.map((option) => {
                    const Icon = option.icon; const isActive = mounted && theme === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleThemeChange(option.value)}
                        aria-pressed={isActive}
                        className={`
                          group inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all duration-150
                          ${isActive ? 'border-primary text-primary' : 'border-border text-foreground hover:border-muted-foreground/50'}
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30
                        `}
                      >
                        <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="inline-block">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 mb-4">
                  <button onClick={saveName} className="inline-flex items-center px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm">Save changes</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </main>
      </div>
    </div>
  );
}

