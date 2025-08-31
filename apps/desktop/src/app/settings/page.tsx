'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { useTheme } from 'next-themes';
import { apiClient } from '@/lib/api';
import { useApp } from '@/lib/context/AppContext';

export default function SettingsPage() {
  const { setTheme: applyTheme } = useTheme();
  const { logout } = useApp();
  const [theme, setTheme] = useState<'light'|'dark'|'system'>('system');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const prefs = await apiClient.getPreferences();
        setTheme(prefs.theme);
      } catch {}
    })();
  }, []);

  const savePrefs = async () => {
    setBusy(true); setMsg(''); setErr('');
    try {
      await apiClient.setPreferences({ theme });
      setMsg('Preferences saved');
      // Update local storage/theme toggle if present
      localStorage.setItem('theme_preference', theme);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Could not save preferences');
    } finally { setBusy(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(''); setErr('');
    if (newPassword !== confirmPassword) { setErr('Passwords do not match'); setBusy(false); return; }
    try {
      await apiClient.changePassword(currentPassword, newPassword);
      setMsg('Password updated');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Could not update password');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto grid gap-6">
        <Card className="ngi-card-elevated p-6">
          <h2 className="text-xl font-semibold mb-4">Appearance</h2>
          <div className="grid gap-2">
            <label className="text-sm">Theme Preference</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as any)}
              className="px-3 py-2 rounded-md border bg-background text-foreground w-60"
              disabled={busy}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <button
              onClick={async () => { await savePrefs(); applyTheme(theme); }}
              disabled={busy}
              className="mt-2 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-medium rounded-md text-center w-auto max-w-max justify-self-start"
            >
              Save
            </button>
          </div>
        </Card>

        <Card className="ngi-card-elevated p-6">
          <h2 className="text-xl font-semibold mb-4">Change Password</h2>
          {msg && <p className="text-sm text-emerald-600 mb-2">{msg}</p>}
          {err && <p className="text-sm text-destructive mb-2">{err}</p>}
          <form onSubmit={changePassword} className="grid gap-3 max-w-md">
            <input type="password" placeholder="Current password" className="px-3 py-2 rounded-md border bg-background text-foreground" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} disabled={busy} />
            <input type="password" placeholder="New password" className="px-3 py-2 rounded-md border bg-background text-foreground" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} disabled={busy} />
            <input type="password" placeholder="Confirm new password" className="px-3 py-2 rounded-md border bg-background text-foreground" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} disabled={busy} />
            <button
              disabled={busy}
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-medium rounded-md text-center w-auto max-w-max justify-self-start"
            >
              Update Password
            </button>
          </form>
        </Card>

        <Card className="ngi-card-elevated p-6">
          <h2 className="text-xl font-semibold mb-4">Account</h2>
          <button
            onClick={logout}
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-medium rounded-md text-center w-auto max-w-max"
          >
            Log Out
          </button>
        </Card>
      </div>
    </div>
  );
}
