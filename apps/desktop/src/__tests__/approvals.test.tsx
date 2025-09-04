import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ApprovalsPage from '@/app/accounting/approvals/page'

describe('ApprovalsPage', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (url.includes('/api/accounting/approvals')) {
        return Promise.resolve({ json: () => Promise.resolve([{ id: 1, type: 'JE', refId: 'JE-001', amount: 100, createdAt: '2025-01-01', requiredApprovers: ['a@x.com','b@y.com'], approvals: [], status: 'pending' }]) }) as any
      }
      if (url.includes('/api/accounting/journal-entries/1/approve')) {
        return Promise.resolve({ json: () => Promise.resolve({ message: 'ok' }) }) as any
      }
      return Promise.resolve({ json: () => Promise.resolve({}) }) as any
    })
  })

  it('renders and approves', async () => {
    render(<ApprovalsPage />)
    expect(await screen.findByText('Approvals')).toBeInTheDocument()
    expect(await screen.findByText('JE-001')).toBeInTheDocument()
    const openBtn = screen.getAllByText('Open')[0]
    fireEvent.click(openBtn)
    const approveBtn = screen.getAllByText('Approve')[0]
    fireEvent.click(approveBtn)
    await waitFor(() => expect((global.fetch as any).mock.calls.some((c: any[]) => (c[0] as string).includes('/approve'))).toBe(true))
  })
})

