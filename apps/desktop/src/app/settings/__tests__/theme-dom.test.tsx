/**
 * DOM-level theme test using real next-themes provider
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ThemeProvider } from 'next-themes'

// Mock API preferences to not fight with ThemeProvider
jest.mock('@/lib/api', () => ({
  apiClient: {
    getPreferences: jest.fn().mockResolvedValue({ theme: 'system' }),
    setPreferences: jest.fn().mockResolvedValue({ message: 'Preferences updated' }),
  },
}))

// Mock Clerk user hook used for display
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { firstName: 'Landon', lastName: 'Whitworth', primaryEmailAddress: { emailAddress: 'lwhitworth@ngicapitaladvisory.com' } } }),
}))

import SettingsPage from '../page'

describe('ThemeProvider integration', () => {
  beforeEach(() => {
    try { localStorage.removeItem('theme_preference') } catch {}
    document.documentElement.className = ''
  })

  it('applies light class on html after selecting Light', async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SettingsPage />
      </ThemeProvider>
    )
    const btn = await screen.findByText('Light')
    fireEvent.click(btn)
    await waitFor(() => expect(document.documentElement.className).toMatch(/\blight\b/))
  })
})

