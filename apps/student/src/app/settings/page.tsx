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
  const [ucAcademy, setUcAcademy] = useState<'yes' | 'no' | ''>('');

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
        headers: { 'X-Student-Email': email }
      });
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
        
        // Handle UC Academy explicitly - don't use || which treats "no" as falsy
        setUcAcademy(data.uc_investments_academy !== null && data.uc_investments_academy !== undefined ? data.uc_investments_academy : '');
        
        console.log('[SETTINGS] UC Academy loaded:', data.uc_investments_academy);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
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
      
      // UC Academy - use empty string explicitly instead of null to differentiate from "not set"
      // Send the actual value, even if it's "no"
      const ucAcademyValue = ucAcademy || null;
      
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-base text-gray-600 dark:text-gray-400">
            Manage your profile and preferences
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
            <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-900 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-900 dark:text-green-200 text-sm">{success}</p>
          </div>
        )}

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading settings...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Resume Upload Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Resume
                </h2>
                <p className="text-sm text-blue-100 mt-1">Required for project applications</p>
              </div>
              
              <div className="p-6 space-y-4">
                {profile?.resume_url ? (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-green-900 dark:text-green-100">Resume Uploaded</p>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            Your resume is ready for project applications
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={profile.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          title="View Resume"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <button
                          onClick={handleDeleteResume}
                          className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          title="Delete Resume"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <Upload className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-900 dark:text-amber-100">No Resume Uploaded</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          Upload your resume to apply for projects
                        </p>
                      </div>
                    </div>
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
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all cursor-pointer
                      ${uploading
                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30'
                      }`}
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        {profile?.resume_url ? 'Replace Resume' : 'Upload Resume'}
                      </>
                    )}
                  </label>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  PDF only, max 10MB
                </p>
              </div>
            </div>

            {/* Profile Information */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </h2>
                <p className="text-sm text-blue-100 mt-1">Your personal and academic details</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="John"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Last Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                </div>

                {/* Academic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      School
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={school}
                        onChange={e => setSchool(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="UC Berkeley"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Major/Program
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={program}
                        onChange={e => setProgram(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Computer Science"
                      />
                    </div>
                  </div>
                </div>

                {/* Graduation Year & GPA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Graduation Year
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        value={gradYear}
                        onChange={e => setGradYear(e.target.value ? Number(e.target.value) : '')}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="2026"
                        min="2020"
                        max="2030"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      GPA (Optional)
                    </label>
                    <div className="relative">
                      <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="4"
                        value={gpa}
                        onChange={e => setGpa(e.target.value ? Number(e.target.value) : '')}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="3.75"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="(123) 456-7890"
                        maxLength={14}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="San Francisco, CA"
                      />
                    </div>
                  </div>
                </div>

                {/* LinkedIn */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    LinkedIn URL (Optional)
                  </label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={linkedin}
                      onChange={e => setLinkedin(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>
                </div>

                {/* UC Investments Academy */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    UC Investments Academy
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                    <select
                      value={ucAcademy}
                      onChange={e => setUcAcademy(e.target.value as 'yes' | 'no' | '')}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Are you part of the UC Investments Academy program?
                  </p>
                </div>

                {/* Save Button */}
                <button
                  onClick={saveProfileDetails}
                  disabled={savingProfile}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-lg transition-all
                    ${savingProfile
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-600/30'
                    }`}
                >
                {savingProfile ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </div>

            {/* Theme Preferences */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Appearance
                </h2>
                <p className="text-sm text-blue-100 mt-1">Choose your preferred theme</p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      theme === 'light'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                    }`}
                  >
                    <Sun className={`w-8 h-8 mx-auto mb-2 ${theme === 'light' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <p className={`text-sm font-semibold text-center ${theme === 'light' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`}>
                      Light
                    </p>
                  </button>

                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      theme === 'dark'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                    }`}
                  >
                    <Moon className={`w-8 h-8 mx-auto mb-2 ${theme === 'dark' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <p className={`text-sm font-semibold text-center ${theme === 'dark' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`}>
                      Dark
                    </p>
                  </button>

                  <button
                    onClick={() => handleThemeChange('system')}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      theme === 'system'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                    }`}
                  >
                    <Monitor className={`w-8 h-8 mx-auto mb-2 ${theme === 'system' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <p className={`text-sm font-semibold text-center ${theme === 'system' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`}>
                      System
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
