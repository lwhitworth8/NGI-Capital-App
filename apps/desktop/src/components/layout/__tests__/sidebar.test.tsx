/**
 * Sidebar nav tests: ensure core entries render and navigate
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
  it('renders Finance and Tax nav entries', () => {
    render(<Sidebar />)
    expect(screen.getByText('Finance')).toBeInTheDocument()
    expect(screen.getByText('Tax')).toBeInTheDocument()
  })

  it('navigates to /finance when clicking Finance', () => {
    render(<Sidebar />)
    const btn = screen.getByText('Finance')
    const originalHref = window.location.href
    Object.defineProperty(window, 'location', {
      value: { href: originalHref },
      writable: true,
    })
    fireEvent.click(btn)
    expect((window as any).location.href).toContain('/finance')
  })
})

