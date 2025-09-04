import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Unit under test
import FinanceDashboardPage from '../page'
import FinanceKPICards from '@/components/finance/FinanceKPICards'
import ForecastTool from '@/components/finance/ForecastTool'

// Mock useApp to avoid requiring the real AppProvider
jest.mock('@/lib/context/AppContext', () => ({
  useApp: () => ({ state: { currentEntity: { id: '1' } } })
}))

// Mock api client for KPI cards
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api')
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      request: jest.fn(),
    },
  }
})

describe('Finance Module - Frontend', () => {
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
    jest.clearAllMocks()
  })

  it('renders Finance Dashboard page with key sections', () => {
    render(<FinanceDashboardPage />)
    expect(screen.getByRole('heading', { name: 'Finance Dashboard' })).toBeInTheDocument()
    // Forecasting section header appears from ForecastTool
    expect(screen.getByText('Financial Forecasting')).toBeInTheDocument()
  })

  it('FinanceKPICards fetches KPIs and displays values', async () => {
    const { apiClient } = require('@/lib/api')
    ;(apiClient.request as jest.Mock).mockResolvedValue({
      asOf: '2025-01-01T00:00:00Z',
      cash_position: 2500,
      monthly_revenue: 10000,
      monthly_expenses: 7000,
      total_assets: 100000,
    })

    render(<FinanceKPICards entityId={1} />)

    // Shows placeholders first, then updated values
    await waitFor(() => {
      expect(apiClient.request).toHaveBeenCalledWith('GET', '/finance/kpis', undefined, { params: { entity_id: 1 } })
    })

    // The Cash card should display formatted value
    // We check for the currency string rather than exact formatting to keep locale-agnostic
    await waitFor(() => {
      expect(screen.getByText('Cash')).toBeInTheDocument()
      const anyCurrency = screen.getAllByText((_, node) => node?.textContent?.includes('$2,500') ?? false)
      expect(anyCurrency.length).toBeGreaterThan(0)
    })
  })

  it('ForecastTool renders and shows empty states', async () => {
    // Minimal fetch mock for scenarios/assumptions endpoints
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/api/finance/forecast/scenarios')) {
        return { ok: true, json: async () => [] } as any
      }
      if (url.includes('/api/finance/forecast/scenarios/') && url.endsWith('/assumptions')) {
        return { ok: true, json: async () => [] } as any
      }
      return { ok: true, json: async () => ({}) } as any
    }) as any

    render(<ForecastTool entityId={1} />)
    expect(await screen.findByText('No scenarios.')).toBeInTheDocument()
    expect(screen.getByText('No assumptions.')).toBeInTheDocument()
  })
})
