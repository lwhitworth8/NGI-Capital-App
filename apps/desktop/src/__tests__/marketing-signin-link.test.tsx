import React from 'react'
import { render, screen } from '@testing-library/react'
import MarketingHome from '@/components/marketing/MarketingHome'

describe('Marketing sign-in link', () => {
  const orig = process.env.NEXT_PUBLIC_STUDENT_BASE_URL
  beforeAll(() => {
    process.env.NEXT_PUBLIC_STUDENT_BASE_URL = 'http://localhost:3001/'
  })
  afterAll(() => {
    process.env.NEXT_PUBLIC_STUDENT_BASE_URL = orig
  })
  it('links to /sign-in (student portal is mounted at root in dev)', () => {
    render(<MarketingHome />)
    const link = screen.getByRole('link', { name: /sign in/i }) as HTMLAnchorElement
    expect(link).toBeTruthy()
    const url = new URL(link.href)
    expect(url.pathname).toBe('/sign-in')
  })
})
