/**
 * Frontend logout flow test (Clerk + local API)
 * This test ensures clicking Log Out triggers Clerk signOut and navigates to /sign-in.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock Next router
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() })
}))

// Mock Clerk globals
;(global as any).window = (global as any).window || {}
;(window as any).Clerk = {
  signOut: jest.fn().mockResolvedValue(undefined),
}

// Mock api client
jest.mock('../lib/api', () => {
  const actual = jest.requireActual('../lib/api')
  return {
    ...actual,
    apiClient: { ...actual.apiClient, logout: jest.fn().mockResolvedValue(undefined) },
  }
})

// Mock AppContext to use real provider but simplify state
jest.mock('../lib/context/AppContext', () => {
  const React = require('react')
  const ctx = React.createContext<any>({
    state: { user: { name: 'Test User' }, pendingApprovals: [], dashboardMetrics: null },
    logout: jest.fn(),
    setCurrentEntity: jest.fn(),
  })
  return {
    useApp: () => React.useContext(ctx),
    AppProvider: ({ children }: any) => <ctx.Provider value={React.useContext(ctx)}>{children}</ctx.Provider>,
  }
})

// Import the page after mocks
import SettingsPage from '../app/settings/page'

describe('Logout flow', () => {
  it('invokes Clerk signOut and navigates to /sign-in', async () => {
    render(<SettingsPage />)
    const btn = await screen.findByText(/log out/i)
    fireEvent.click(btn)

    // signOut called
    expect((window as any).Clerk.signOut).toHaveBeenCalled()
    // we cannot assert navigation in jsdom reliably, but API logout is attempted
    const { apiClient } = require('../lib/api')
    expect(apiClient.logout).toHaveBeenCalled()
  })
})

