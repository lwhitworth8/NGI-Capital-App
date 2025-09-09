"use client";

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useUser } from '@clerk/nextjs';
import { 
  Moon, 
  Sun, 
  Monitor,
  Upload,
  FileText,
  Check,
  X,
  Eye,
  Download,
  Trash2
} from 'lucide-react';

type Profile = { 
  resume_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  school?: string | null;
  program?: string | null;
  theme?: string | null;
}

export default function Settings() {
  const { user } = useUser();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load user email when available
  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      loadProfile();
    }
  }, [user?.primaryEmailAddress?.emailAddress]);

  const loadProfile = async () => {
    try {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return;
      
      const res = await fetch('/api/public/profile', {
        headers: { 'X-Student-Email': email }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    // Apply theme immediately
    setTheme(newTheme);
    setError(null);
    setSuccess('Theme updated');
    setTimeout(() => setSuccess(null), 2000);
    
    // Save to backend in background
    const email = user?.primaryEmailAddress?.emailAddress;
    if (email) {
      fetch('/api/public/profile', { 
        method: 'PATCH', 
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Email': email
        }, 
        body: JSON.stringify({ theme: newTheme }) 
      }).catch(err => {
        console.error('Failed to save theme preference:', err);
      });
    }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError(null);
    setSuccess(null);
    
    // Validate file
    if (file.type !== 'application/pdf') { 
      setError('Please upload a PDF file'); 
      return;
    }
    if (file.size > 10 * 1024 * 1024) { 
      setError('File size must be less than 10MB'); 
      return;
    }
    
    setUploading(true);
    try {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) throw new Error('No email found');
      
      const fd = new FormData();
      fd.append('file', file);
      
      const res = await fetch('/api/public/profile/resume', { 
        method: 'POST', 
        body: fd,
        headers: {
          'X-Student-Email': email
        }
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Upload failed');
      }
      
      const data = await res.json();
      setProfile(p => ({ ...(p || {}), resume_url: data?.resume_url }));
      setSuccess('Resume uploaded successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) { 
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally { 
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDeleteResume = async () => {
    if (!confirm('Are you sure you want to delete your resume?')) return;
    
    try {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return;
      
      const res = await fetch('/api/public/profile', { 
        method: 'PATCH', 
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Email': email
        }, 
        body: JSON.stringify({ resume_url: null }) 
      });
      
      if (res.ok) {
        setProfile(p => ({ ...(p || {}), resume_url: null }));
        setSuccess('Resume deleted');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to delete resume');
    }
  };

  if (!mounted) return null;

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ];

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
              <p className="text-sm text-muted-foreground mt-1">
                Customize how NGI Capital looks on your device
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = mounted && theme === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleThemeChange(option.value as 'light' | 'dark' | 'system')}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all duration-200
                      ${isActive 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
                      }
                    `}
                    disabled={!mounted}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Icon className={`h-6 w-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>
                        {option.label}
                      </span>
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

          {/* Resume Upload */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">Resume</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Upload your resume to use when applying to projects
              </p>
            </div>

            {profile?.resume_url ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {profile.resume_url.split('/').pop()?.replace(/^resume-/, '') || 'Resume.pdf'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          PDF Document
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/${profile.resume_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Preview resume"
                      >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </a>
                      <a
                        href={`/${profile.resume_url}`}
                        download
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Download resume"
                      >
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </a>
                      <button
                        onClick={handleDeleteResume}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete resume"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={onUpload}
                    disabled={uploading}
                    className="hidden"
                    id="resume-replace"
                  />
                  <label
                    htmlFor="resume-replace"
                    className={`
                      inline-flex items-center gap-2 px-4 py-2 rounded-lg
                      text-sm font-medium transition-colors cursor-pointer
                      ${uploading 
                        ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }
                    `}
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading...' : 'Replace Resume'}
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-8 border-2 border-dashed border-border rounded-xl text-center">
                  <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-3">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">No resume uploaded</p>
                  <p className="text-xs text-muted-foreground">Upload a PDF file (max 10MB)</p>
                </div>

                <div className="relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={onUpload}
                    disabled={uploading}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label
                    htmlFor="resume-upload"
                    className={`
                      inline-flex items-center gap-2 px-4 py-2 rounded-lg
                      text-sm font-medium transition-colors cursor-pointer
                      ${uploading 
                        ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }
                    `}
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading...' : 'Upload Resume'}
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Profile Information */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">Profile Information</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your account details from Google
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="text-sm font-medium text-foreground">
                  {user?.fullName || user?.firstName || 'Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium text-foreground">
                  {user?.primaryEmailAddress?.emailAddress || 'Not set'}
                </span>
              </div>
              {profile?.school && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">School</span>
                  <span className="text-sm font-medium text-foreground">{profile.school}</span>
                </div>
              )}
              {profile?.program && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Program</span>
                  <span className="text-sm font-medium text-foreground">{profile.program}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}