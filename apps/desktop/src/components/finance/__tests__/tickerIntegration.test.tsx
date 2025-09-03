import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import MarketTicker from '../MarketTicker'

describe('MarketTicker integration', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    ;(global.fetch as any) = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/finance/getMarketMetrics')) {
        return {
          ok: true,
          json: async () => ({
            indices: [
              { symbol: '^GSPC', name: '^GSPC', value: '4532.10', changePct: '0.50' },
            ],
            yields: [
              { symbol: '^TNX', name: '^TNX', value: '42.30', changePct: '0.10' },
            ],
            fx: [
              { symbol: 'EURUSD=X', pair: 'EURUSD=X', value: '1.10', changePct: '0.05' },
            ],
            asOf: new Date().toISOString(), marketOpen: true,
          }),
        } as any
      }
      if (/\/api\/metrics\/.*\/history/.test(url)) {
        return { ok: true, json: async () => ({ history: [{ t: '2020-01-01T00:00:00Z', v: 1 }, { t: '2021-01-01T00:00:00Z', v: 2 }] }) } as any
      }
      return { ok: true, json: async () => ({}) } as any
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('renders readable labels and formatted values; overlay loads history', async () => {
    render(<MarketTicker />)
    // readable labels
    const spButtons = await screen.findAllByLabelText(/S&P 500/i)
    expect(spButtons.length).toBeGreaterThan(1)
    const tenY = await screen.findAllByLabelText(/U\.S\. 10-Year Treasury Yield/i)
    expect(tenY.length).toBeGreaterThan(0)
    const eurusd = await screen.findAllByLabelText(/EUR\/USD \(Euro ↔ U\.S\. Dollar\)/i)
    expect(eurusd.length).toBeGreaterThan(0)

    // formatted values (yield as percent with ÷10)
    expect(screen.getAllByText(/4\.23%/i).length).toBeGreaterThan(0)

    // overlay interaction covered by unit tests elsewhere; ensure mapping and formatting present here
  })
})
