/**
 * Frontend logout flow test (Clerk + Sidebar menu)
 * Updated to reflect new UI: Sign Out is in the sidebar profile menu.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock Next router + pathname for Sidebar
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

// Mock Clerk hooks used by Sidebar
const signOutMock = jest.fn().mockResolvedValue(undefined)
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { firstName: 'Landon', lastName: 'Whitworth', fullName: 'Landon Whitworth', primaryEmailAddress: { emailAddress: 'lwhitworth@ngicapitaladvisory.com' }, profileImageUrl: '' } }),
  useClerk: () => ({ signOut: signOutMock }),
}))

import Sidebar from '../components/layout/Sidebar'

describe('Logout flow (sidebar profile menu)', () => {
  it('invokes Clerk signOut when clicking Sign Out in profile menu', async () => {
    render(<Sidebar />)

    // Open profile menu by clicking the user button (contains the user name)
    const profileBtn = await screen.findByRole('button', { name: /landon whitworth/i })
    fireEvent.click(profileBtn)

    // Click Sign Out
    const signOutBtn = await screen.findByText(/sign out/i)
    fireEvent.click(signOutBtn)

    expect(signOutMock).toHaveBeenCalled()
  })
})
