import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import MarketTicker from '../MarketTicker'

// Mock recharts to stabilise rendering in jsdom
jest.mock('recharts', () => {
  const Any = (props:any) => <div>{props.children}</div>
  return {
    ResponsiveContainer: Any,
    AreaChart: Any,
    Area: Any,
    XAxis: Any,
    YAxis: Any,
    Tooltip: Any,
    CartesianGrid: Any,
  }
})

// Mock api client for metrics history (axios-based calls inside overlay)
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api')
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      request: jest.fn(async (method: string, endpoint: string) => {
        if (/^\/metrics\/.+\/history$/.test(endpoint)) {
          return { history: [ { t: '2020-01-01T00:00:00Z', v: 1 }, { t: '2021-01-01T00:00:00Z', v: 2 } ] }
        }
        return {}
      })
    }
  }
})

describe('Ticker overlay history loads from DB', () => {
  jest.setTimeout(20000)
  beforeEach(() => {
    // Mock fetch for market metrics ticker base
    ;(global.fetch as any) = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/finance/getMarketMetrics')) {
        return {
          ok: true,
          json: async () => ({ indices: [{ symbol: '^GSPC', name: '^GSPC', value: '4500.00', changePct: '0.50' }], yields: [], fx: [] }),
        } as any
      }
      return { ok: true, json: async () => ({}) } as any
    })
  })

  it('clicking S&P 500 opens overlay and renders series', async () => {
    render(<MarketTicker />)
    const spx = await screen.findAllByLabelText(/S&P 500/i)
    fireEvent.click(spx[0])
    // Overlay visible
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    // Loading disappears and CSV button shown once series arrived
    await waitFor(() => expect(screen.queryByText(/Loading series\./i)).not.toBeInTheDocument())
    expect(screen.getByText(/Download CSV/i)).toBeInTheDocument()
  })
})
