import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ApprovalsPage from '@/app/accounting/approvals/page'

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

describe('ApprovalsPage', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (url.includes('/api/accounting/approvals')) {
        return Promise.resolve({ json: () => Promise.resolve([]) }) as any
      }
      return Promise.resolve({ json: () => Promise.resolve({}) }) as any
    })
  })

  it('renders approvals page with empty state', async () => {
    render(<ApprovalsPage />)
    expect(await screen.findByText('Approvals')).toBeInTheDocument()
    expect(await screen.findByText('Pending Approval')).toBeInTheDocument()
    expect(await screen.findByText('No pending approvals')).toBeInTheDocument()
  })
})