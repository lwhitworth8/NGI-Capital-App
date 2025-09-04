"use client"

import { useTheme } from 'next-themes'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="rounded-xl border border-border bg-card p-4 w-full max-w-md">
        <div className="text-sm font-medium mb-2">Appearance</div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="theme" className="accent-primary" checked={theme !== 'dark'} onChange={()=>setTheme('light')} />
            Light
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="theme" className="accent-primary" checked={theme === 'dark'} onChange={()=>setTheme('dark')} />
            Dark
          </label>
        </div>
      </div>
    </div>
  )
}
