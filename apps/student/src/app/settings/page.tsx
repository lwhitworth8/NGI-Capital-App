"use client";

import { useState, useEffect } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useTheme } from 'next-themes';
import { useUser } from '@clerk/nextjs';
import { ModuleHeader } from '@ngi/ui/components/layout';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
  Trash2,
  User,
  GraduationCap,
  Phone,
  MapPin,
  Linkedin,
  Award,
  Briefcase,
  Save
} from 'lucide-react';

type Profile = { 
  resume_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  school?: string | null;
  program?: string | null;
  grad_year?: number | null;
  phone?: string | null;
  linkedin_url?: string | null;
  gpa?: number | null;
  location?: string | null;
  theme?: string | null;
  uc_investments_academy?: string | null;
  profile_color?: string | null;
  profile_photo_url?: string | null;
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
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileColor, setProfileColor] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string>("");

  // Editable fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [school, setSchool] = useState('');
  const [program, setProgram] = useState('');
  const [gradYear, setGradYear] = useState<number | ''>('');
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [gpa, setGpa] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  const [ucAcademy, setUcAcademy] = useState<'yes' | 'no' | 'none'>('none');

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
      
      console.log('[SETTINGS] Loading profile for:', email);
      
      const res = await fetch('/api/public/profile', {
        headers: {
          'X-Student-Email': email
        }
      }); 
      try { window.dispatchEvent(new CustomEvent('avatar-updated')); } catch {}
      if (res.ok) {
        const data = await res.json();
        console.log('[SETTINGS] Profile loaded:', data);
        
        setProfile(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setSchool(data.school || '');
        setProgram(data.program || '');
        setGradYear(data.grad_year || '');
        setPhone(formatPhoneForDisplay(data.phone || ''));
        setLinkedin(data.linkedin_url || '');
        setGpa((typeof data.gpa === 'number' ? data.gpa : null) ?? '');
        setLocation(data.location || '');
        setProfileColor((data.profile_color || '#0066FF') as string);
        setPhotoUrl((data.profile_photo_url || '') as string);
        
        // Handle UC Academy explicitly - convert null/undefined to "none"
        setUcAcademy(data.uc_investments_academy !== null && data.uc_investments_academy !== undefined ? data.uc_investments_academy : 'none');
        
        console.log('[SETTINGS] UC Academy loaded:', data.uc_investments_academy);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const colorOptions = [
    '#0066FF', // NGI Capital Primary Blue
    '#FF6B35', // Orange
    '#32CD32', // Lime Green
    '#9B59B6', // Purple
    '#E74C3C', // Red
    '#F39C12', // Gold
    '#FF69B4'  // Pink
  ];

  const selectColor = async (hex: string) => {
    try {
      setProfileColor(hex);
      const email = user?.primaryEmailAddress?.emailAddress;
      if (email) {
        await fetch('/api/public/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Student-Email': email
          },
          body: JSON.stringify({ profile_color: hex })
        }); 
        try { window.dispatchEvent(new CustomEvent('avatar-updated')); } catch {}
      }
    } catch {}
  };

  const uploadPhoto = async (file: File) => {
    try {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return;
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/public/profile/photo', { method: 'POST', headers: { 'X-Student-Email': email }, body: fd });
      if (!res.ok) return;
      const r = await res.json();
      if (r?.profile_photo_url) setPhotoUrl(r.profile_photo_url);
      setSuccess('Profile photo updated'); setTimeout(() => setSuccess(null), 2000); try { window.dispatchEvent(new CustomEvent('avatar-updated')); } catch {} } catch (e: any) { setError('Upload failed'); setTimeout(() => setError(null), 2500); }
  };

  const removePhoto = async () => {
    try {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return;
      let ok = false;
      const del = await fetch('/api/public/profile/photo', { method: 'DELETE', headers: { 'X-Student-Email': email } });
      if (!del.ok) {
        const alt = await fetch('/api/public/profile/photo/delete', { method: 'POST', headers: { 'X-Student-Email': email } });
        ok = alt.ok;
      } else { ok = true }
      if (ok) { setPhotoUrl(''); setSuccess('Profile photo removed'); setTimeout(() => setSuccess(null), 1500); try { window.dispatchEvent(new CustomEvent('avatar-updated')); } catch {} }
    } catch { setError('Failed to remove photo'); setTimeout(() => setError(null), 2500); }
  };

  const formatPhoneForDisplay = (value: string) => {
    // Format stored phone for display
    // Remove +1 prefix if present and format
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      // Has +1 prefix, remove it
      const phoneDigits = digits.slice(1);
      return `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`;
    } else if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return value;
  };

  const formatPhoneInput = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (xxx) xxx-xxxx
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setPhone(formatted);
  };

  const saveProfileDetails = async () => {
    setSavingProfile(true);
    setError(null);
    setSuccess(null);
    
    try {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) throw new Error('No email found');
      
      // Clean phone for storage
      // Remove all non-digits first
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Only add +1 if we have 10 digits (US number)
      let phoneForStorage = '';
      if (cleanPhone.length === 10) {
        phoneForStorage = `+1${cleanPhone}`;
      } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
        // Already has country code, just add +
        phoneForStorage = `+${cleanPhone}`;
      } else if (cleanPhone.length > 0) {
        // Some other format, store as-is with +
        phoneForStorage = `+${cleanPhone}`;
      }
      
      // UC Academy - convert "none" to null for API
      const ucAcademyValue = ucAcademy === 'none' ? null : ucAcademy;
      
      const payload = {
        first_name: firstName,
        last_name: lastName,
        school,
        program,
        grad_year: gradYear || null,
        phone: phoneForStorage,
        linkedin_url: linkedin,
        gpa: gpa || null,
        location,
        uc_investments_academy: ucAcademyValue
      };
      
      console.log('[SETTINGS] Saving profile with payload:', payload);
      console.log('[SETTINGS] Phone clean:', cleanPhone, '-> storage:', phoneForStorage);
      console.log('[SETTINGS] UC Academy:', ucAcademy, '-> sending:', ucAcademyValue);
      
      const res = await fetch('/api/public/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Email': email
        },
        body: JSON.stringify(payload)
      }); 
      try { window.dispatchEvent(new CustomEvent('avatar-updated')); } catch {}
      
      if (!res.ok) {
        const text = await res.text();
        console.error('[SETTINGS] Save failed:', text);
        throw new Error(text || 'Failed to save');
      }
      
      const result = await res.json();
      console.log('[SETTINGS] Save response:', result);
      
      setSuccess('Profile saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Reload to verify
      await loadProfile();
    } catch (err) {
      console.error('[SETTINGS] Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    
    // Save theme preference to profile
    const email = user?.primaryEmailAddress?.emailAddress;
    if (email) {
      fetch('/api/public/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Email': email
        },
        body: JSON.stringify({ theme: newTheme })
      }).catch(err => console.error('Failed to save theme:', err));
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
      setSuccess('Resume uploaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) { 
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally { 
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteResume = async () => {
    if (!confirm('Are you sure you want to delete your resume?')) return;
    
    try {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) throw new Error('No email found');
      
      const res = await fetch('/api/public/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Email': email
        },
        body: JSON.stringify({ resume_url: null })
      }); 
      try { window.dispatchEvent(new CustomEvent('avatar-updated')); } catch {}
      
      if (!res.ok) throw new Error('Delete failed');
      
      setProfile(p => ({ ...(p || {}), resume_url: null }));
      setSuccess('Resume deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Animated Header - consistent with admin module headers */}
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Loading settings...</span>
          </div>
        ) : (
          <div className="pb-12 space-y-6">
            {/* Profile Information (with integrated resume + avatar + appearance) */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-6 space-y-6">
                {/* Avatar + upload + color */}
                <div className="flex items-center gap-4">
                  {/* Profile Avatar - larger but proportional to sidebar */}
                  <div className="h-16 w-16 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden"
                    style={{ background: photoUrl ? 'transparent' : (profileColor || '#0066FF') }}>
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl} alt="Profile" className="h-16 w-16 rounded-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold">{(firstName || user?.firstName || 'S').toString().slice(0,1).toUpperCase()}{(lastName || user?.lastName || '').toString().slice(0,1).toUpperCase()}</span>
                    )}
                  </div>
                  
                  {/* Upload and color controls */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent transition-colors">
                        Upload photo
                        <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
                      </label>
                      {photoUrl && (
                        <button type="button" onClick={removePhoto} className="text-sm text-muted-foreground hover:text-foreground underline">Remove photo</button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map(c => (
                        <button key={c} type="button" onClick={() => selectColor(c)} aria-label={`Color ${c}`} className="h-6 w-6 rounded-full border-2 border-border hover:border-primary transition-colors" style={{ background: c, boxShadow: profileColor === c ? '0 0 0 2px #2563EB inset' : undefined }} />
                      ))}
                    </div>
                  </div>
                </div>
                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                {/* Academic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="school">Institution</Label>
                    <Input
                      id="school"
                      type="text"
                      value={school}
                      onChange={e => setSchool(e.target.value)}
                      placeholder="University Name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="program">Major/Program</Label>
                    <Input
                      id="program"
                      type="text"
                      value={program}
                      onChange={e => setProgram(e.target.value)}
                      placeholder="Field of Study"
                    />
                  </div>
                </div>

                {/* Graduation Year & GPA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gradYear">Graduation Year</Label>
                    <Input
                      id="gradYear"
                      type="number"
                      value={gradYear}
                      onChange={e => setGradYear(e.target.value ? Number(e.target.value) : '')}
                      placeholder="2026"
                      min="2020"
                      max="2030"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gpa">GPA</Label>
                    <Input
                      id="gpa"
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      value={gpa}
                      onChange={e => setGpa(e.target.value ? Number(e.target.value) : '')}
                      placeholder="3.75"
                    />
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="(123) 456-7890"
                      maxLength={14}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="City, State/Country"
                    />
                  </div>
                </div>

                {/* Resume Upload Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">Resume</h3>
                    {profile?.resume_url ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={profile.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md bg-muted text-muted-foreground hover:bg-accent transition-colors"
                          title="View Resume"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <button
                          onClick={handleDeleteResume}
                          className="p-1.5 rounded-md bg-muted text-muted-foreground hover:bg-accent transition-colors"
                          title="Delete Resume"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                  
                  {profile?.resume_url ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Check className="w-4 h-4" />
                      <span>Resume uploaded</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-amber-600">
                      <Upload className="w-4 h-4" />
                      <span>No resume uploaded</span>
                    </div>
                  )}
                  
                  <label className="block">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={onUpload}
                      disabled={uploading}
                      className="hidden"
                      id="resume-upload"
                    />
                    <label
                      htmlFor="resume-upload"
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer
                        ${uploading
                          ? 'bg-muted text-muted-foreground cursor-not-allowed'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          {profile?.resume_url ? 'Replace Resume' : 'Upload Resume'}
                        </>
                      )}
                    </label>
                  </label>
                  <p className="text-xs text-muted-foreground">
                    PDF only, max 10MB
                  </p>
                </div>

                {/* LinkedIn */}
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn URL</Label>
                  <Input
                    id="linkedin"
                    type="url"
                    value={linkedin}
                    onChange={e => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                {/* UC Investments Academy */}
                <div className="space-y-2">
                  <Label htmlFor="ucAcademy">UC Investments Academy</Label>
                  <Select value={ucAcademy} onValueChange={(v: any) => setUcAcademy(v as 'yes'|'no'|'none')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select...</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Are you part of the UC Investments Academy program?
                  </p>
                </div>

                {/* Appearance */}
                <div className="space-y-2">
                  <Label>Appearance</Label>
                  <div className="flex gap-2">
                    {(['light','dark'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleThemeChange(opt)}
                        aria-pressed={theme === opt}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                          theme === opt 
                            ? 'border-primary text-primary bg-primary/10' 
                            : 'border-border text-foreground hover:bg-accent'
                        }`}
                      >
                        {opt === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        <span className="capitalize">{opt}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4">
                  <button
                    onClick={saveProfileDetails}
                    disabled={savingProfile}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      savingProfile
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {savingProfile ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}