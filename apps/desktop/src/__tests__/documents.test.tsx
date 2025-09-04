import React from 'react'
import { render, screen } from '@testing-library/react'
import DocumentsPage from '@/app/accounting/documents/page'

describe('DocumentsPage', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/documents')) {
        return Promise.resolve({ json: () => Promise.resolve({ documents: [{ id: 'd1', doc_type: 'Invoice', vendor: 'Acme', invoice_number: 'I-1', issue_date: '2025-01-01', total: 10 }] }) }) as any
      }
      if (url.includes('/api/accounting/close/preview')) {
        return Promise.resolve({ json: () => Promise.resolve({ docs_unposted: false }) }) as any
      }
      if (url.includes('/api/banking/reconciliation/stats')) {
        return Promise.resolve({ json: () => Promise.resolve({ summary: {} }) }) as any
      }
      return Promise.resolve({ json: () => Promise.resolve({}) }) as any
    })
  })
  it('renders checklist and table', async () => {
    render(<DocumentsPage />)
    expect(await screen.findByText('Documents')).toBeInTheDocument()
    expect(await screen.findByText('Formation')).toBeInTheDocument()
    expect(await screen.findByText('Invoice')).toBeInTheDocument()
  })
})

