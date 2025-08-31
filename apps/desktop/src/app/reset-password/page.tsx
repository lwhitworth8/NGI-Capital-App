'use client';

import React, { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const initialToken = useMemo(() => params.get('token') || '', [params]);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      await apiClient.requestPasswordReset(email);
      setMessage('If that email exists, a reset link has been sent.');
      toast.success('Reset link sent if email exists');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not request password reset');
    } finally { setBusy(false); }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(''); setMessage('');
    if (!token) { setError('Reset token is required'); setBusy(false); return; }
    if (!newPassword || newPassword !== confirmPassword) { setError('Passwords do not match'); setBusy(false); return; }
    try {
      await apiClient.resetPassword(token, newPassword);
      setMessage('Password reset successful. You may now log in.');
      toast.success('Password reset successful');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not reset password');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl grid gap-6">
        <Card className="ngi-card-elevated p-6">
          <h2 className="text-xl font-semibold mb-4">Request Password Reset</h2>
          {message && <p className="text-sm text-emerald-600 mb-3">{message}</p>}
          {error && <p className="text-sm text-destructive mb-3">{error}</p>}
          <form onSubmit={requestReset} className="grid gap-3">
            <input
              type="email"
              placeholder="your.email@ngicapitaladvisory.com"
              className="px-3 py-2 rounded-md border bg-background text-foreground"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
            <button
              disabled={busy}
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-medium rounded-md text-center w-auto max-w-max"
            >
              Send Reset Link
            </button>
          </form>
        </Card>

        <Card className="ngi-card-elevated p-6">
          <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
          <form onSubmit={submitReset} className="grid gap-3">
            <input
              type="text"
              placeholder="Paste reset token"
              className="px-3 py-2 rounded-md border bg-background text-foreground"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={busy}
            />
            <input
              type="password"
              placeholder="New password"
              className="px-3 py-2 rounded-md border bg-background text-foreground"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={busy}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              className="px-3 py-2 rounded-md border bg-background text-foreground"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={busy}
            />
            <button
              disabled={busy}
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-medium rounded-md text-center w-auto max-w-max"
            >
              Reset Password
            </button>
          </form>
        </Card>
        <div className="flex items-center justify-start">
          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-medium rounded-md text-center w-auto max-w-max"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
