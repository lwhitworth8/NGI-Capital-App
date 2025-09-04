import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import RevRecPage from '@/app/accounting/revrec/page'

describe('RevRecPage', () => {
  const origError = console.error
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
      const msg = args?.[0]?.toString?.() || ''
      if (msg.includes('wrapped in act')) return
      // @ts-ignore
      origError.apply(console, args)
    })
  })
  afterAll(() => {
    ;(console.error as any).mockRestore?.()
  })
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (url.includes('/api/revrec/schedules')) {
        return Promise.resolve({ json: () => Promise.resolve([{ id: 's1', invoice_id: 'INV-R1', method: 'over_time', start_date: '2025-01-01', months: 12, total: 1200, posted_in_period: false }]) }) as any
      }
      if (url.includes('/api/revrec/post-period')) {
        return Promise.resolve({ json: () => Promise.resolve({ posted: 1 }) }) as any
      }
      return Promise.resolve({ json: () => Promise.resolve({}) }) as any
    })
  })
  it('renders schedules and posts current period', async () => {
    render(<RevRecPage />)
    expect(await screen.findByText('Revenue Recognition')).toBeInTheDocument()
    const btn = await screen.findByText('Post Current Period')
    fireEvent.click(btn)
    expect((global.fetch as any).mock.calls.some((c: any[]) => (c[0] as string).includes('/post-period'))).toBe(true)
  })
})
