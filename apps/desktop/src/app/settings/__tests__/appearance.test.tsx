/**
 * Admin Settings appearance tests
 * Ensures clicking Light/Dark/System triggers theme changes without being overridden.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock api client preferences
jest.mock('@/lib/api', () => {
  return {
    apiClient: {
      getPreferences: jest.fn().mockResolvedValue({ theme: 'system' }),
      setPreferences: jest.fn().mockResolvedValue({ message: 'Preferences updated' }),
    },
  }
})

// Mock next-themes useTheme to observe setTheme calls
const setThemeMock = jest.fn()
jest.mock('next-themes', () => {
  const actual = jest.requireActual('next-themes')
  return {
    ...actual,
    useTheme: () => ({ theme: 'system', setTheme: setThemeMock }),
  }
})

// Mock Clerk user hook used for name display
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { firstName: 'Landon', lastName: 'Whitworth', primaryEmailAddress: { emailAddress: 'lwhitworth@ngicapitaladvisory.com' } } }),
}))

import SettingsPage from '../page'

describe('Admin appearance settings', () => {
  beforeEach(() => {
    setThemeMock.mockClear()
    // Clear local storage theme to simulate fresh load
    try { localStorage.removeItem('theme_preference') } catch {}
  })

  it('sets light theme when clicking Light', async () => {
    render(<SettingsPage />)
    const lightBtn = await screen.findByText('Light')
    fireEvent.click(lightBtn)
    await waitFor(() => expect(setThemeMock).toHaveBeenCalledWith('light'))
  })

  it('sets dark theme when clicking Dark', async () => {
    render(<SettingsPage />)
    const darkBtn = await screen.findByText('Dark')
    fireEvent.click(darkBtn)
    await waitFor(() => expect(setThemeMock).toHaveBeenCalledWith('dark'))
  })
})

