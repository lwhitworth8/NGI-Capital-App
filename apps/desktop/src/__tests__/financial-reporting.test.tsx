import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import FinancialReportingPage from '@/app/accounting/financial-reporting/page'

describe('FinancialReportingPage', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/reporting/financials/preview')) {
        return Promise.resolve({ json: () => Promise.resolve({ rows: [{ label: 'Net Income', level: 1, amount: 100 }] }) }) as any
      }
      return Promise.resolve({ json: () => Promise.resolve({}) }) as any
    })
  })
  it('renders tabs and preview rows', async () => {
    render(<FinancialReportingPage />)
    expect(await screen.findByText('Financial Reporting')).toBeInTheDocument()
    expect(await screen.findByText('Net Income')).toBeInTheDocument()
    const btn = screen.getByText('Export XLSX')
    fireEvent.click(btn)
  })
})

