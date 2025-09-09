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
  it('links to student /sign-in on port 3001', () => {
    render(<MarketingHome />)
    const link = screen.getByRole('link', { name: /sign in/i }) as HTMLAnchorElement
    expect(link).toBeTruthy()
    expect(link.href).toBe('http://localhost:3001/sign-in')
  })
})

