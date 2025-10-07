import React from 'react'
import { render, screen } from '@testing-library/react'
import ClosePage from '@/app/accounting/close/page'

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

describe('ClosePage', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/accounting/periods')) {
        return Promise.resolve({ json: () => Promise.resolve([]) }) as any
      }
      return Promise.resolve({ json: () => Promise.resolve({}) }) as any
    })
  })
  
  it('renders close page with empty state', async () => {
    render(<ClosePage />)
    // The actual page has these headings/text
    expect(await screen.findByText(/Period Close/)).toBeInTheDocument()
    expect(await screen.findByText('No Periods Found')).toBeInTheDocument()
  })
})