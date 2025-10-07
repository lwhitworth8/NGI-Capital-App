import React from 'react'
import { render, screen } from '@testing-library/react'
import DocumentsPage from '@/app/accounting/documents/page'

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

describe('DocumentsPage', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/documents')) {
        return Promise.resolve({ json: () => Promise.resolve({ documents: [] }) }) as any
      }
      return Promise.resolve({ json: () => Promise.resolve({}) }) as any
    })
  })
  
  it('renders documents page with upload area', async () => {
    render(<DocumentsPage />)
    expect(await screen.findByText('Documents Center')).toBeInTheDocument()
    expect(await screen.findByText('Total Documents')).toBeInTheDocument()
    expect(await screen.findByText('Drag and drop files here, or click to browse')).toBeInTheDocument()
  })
})