/**
 * Sidebar nav tests: ensure Settings entry is present and navigates
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Sidebar from '../../layout/Sidebar'

// Mock next/navigation for router and pathname
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: jest.fn() })
}))

describe('Sidebar navigation', () => {
  it('renders Settings nav entry', () => {
    render(<Sidebar />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('navigates to /settings when clicking Settings', () => {
    render(<Sidebar />)
    const settingsButton = screen.getByText('Settings')
    // Clicking nav button should change window.location.href
    const originalHref = window.location.href
    Object.defineProperty(window, 'location', {
      value: { href: originalHref },
      writable: true,
    })
    fireEvent.click(settingsButton)
    expect((window as any).location.href).toContain('/settings')
  })
})

