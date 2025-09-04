import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import BankReconciliationPage from '@/app/accounting/bank-reconciliation/page'

describe('Bank Reconciliation', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/banking/feed')) {
        return Promise.resolve({ json: () => Promise.resolve([{ id: 1, date: '2025-01-02', description: 'Deposit', amount: 100, status: 'unmatched' }]) }) as any
      }
      if (url.includes('/api/banking/reconciliation/stats')) {
        return Promise.resolve({ json: () => Promise.resolve({ summary: { cleared_percent: 0, cleared_balance: 0 } }) }) as any
      }
      if (url.includes('/api/banking/reconciliation/suggestions')) {
        return Promise.resolve({ json: () => Promise.resolve({ documents: [], journal_entries: [] }) }) as any
      }
      return Promise.resolve({ json: () => Promise.resolve({}) }) as any
    })
  })
  it('renders feed and suggestions', async () => {
    render(<BankReconciliationPage />)
    expect(await screen.findByText('Bank Reconciliation')).toBeInTheDocument()
    expect(await screen.findByText(/Deposit/)).toBeInTheDocument()
    await waitFor(() => expect((global.fetch as any).mock.calls.some((c: any[]) => (c[0] as string).includes('/reconciliation/stats'))).toBe(true))
  })
})

