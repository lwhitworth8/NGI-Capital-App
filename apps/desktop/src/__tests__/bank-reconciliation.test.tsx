import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import BankReconciliationPage from '@/app/accounting/bank-reconciliation/page'

// Mock useEntityContext hook
jest.mock('@/hooks/useEntityContext', () => ({
  useEntityContext: () => ({
    selectedEntityId: 1,
    setSelectedEntityId: jest.fn(),
  }),
  EntityProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock EntitySelector to avoid fetch issues
jest.mock('@/components/accounting/EntitySelector', () => ({
  EntitySelector: ({ value, onChange }: any) => (
    <div data-testid="entity-selector">Entity Selector Mock</div>
  ),
}));

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
  it('renders bank reconciliation page', async () => {
    render(<BankReconciliationPage />)
    expect(await screen.findByText('Bank Reconciliation')).toBeInTheDocument()
    expect(await screen.findByText('Select bank account')).toBeInTheDocument()
    expect(await screen.findByText('Total Transactions')).toBeInTheDocument()
  })
})

