import { labelForSymbol, normalizeYield, fmtCurrency, fmtIndex, fmtPercent, nextOffset, isUSMarketOpen, isStale } from '../../finance/marketUtils'

describe('marketUtils formatting & mapping', () => {
  it('maps symbols to readable labels', () => {
    expect(labelForSymbol('^GSPC')).toBe("S&P 500")
    expect(labelForSymbol('^IXIC')).toBe('NASDAQ Composite')
    expect(labelForSymbol('^DJI')).toBe('Dow Jones Industrial Average')
    expect(labelForSymbol('^VIX')).toBe('CBOE Volatility Index')
    expect(labelForSymbol('^TNX')).toBe('U.S. 10-Year Treasury Yield')
    expect(labelForSymbol('^FVX')).toBe('U.S. 5-Year Treasury Yield')
    expect(labelForSymbol('^TYX')).toBe('U.S. 30-Year Treasury Yield')
    expect(labelForSymbol(undefined, 'EURUSD=X')).toBe('EUR/USD')
    expect(labelForSymbol(undefined, 'USDJPY=X')).toBe('USD/JPY')
  })

  it('divides TNX/FVX/TYX by 10', () => {
    expect(normalizeYield('^TNX', 42.3)).toBeCloseTo(4.23)
    expect(normalizeYield('^FVX', 39.9)).toBeCloseTo(3.99)
    expect(normalizeYield('^TYX', 51.1)).toBeCloseTo(5.11)
    expect(normalizeYield('^GSPC', 5000)).toBe(5000)
  })

  it('formats currency/index/percent', () => {
    expect(fmtCurrency(1234.56)).toBe('$1,234.56')
    expect(fmtIndex(4321.1)).toBe('4,321.10')
    expect(fmtPercent(4.234)).toBe('4.23%')
  })

  it('marquee nextOffset wraps seamlessly', () => {
    const w = 1000
    // Move 1200px left at once should wrap by +1000 => net -200
    const n1 = nextOffset(0, 1, 1200, w)
    expect(n1).toBeCloseTo(-200)
    // Continue another 900px => -1100 -> wraps => -100
    const n2 = nextOffset(n1, 1, 900, w)
    expect(n2).toBeCloseTo(-100)
  })

  it('market hours gating and FRED TTL', () => {
    const ny = (s: string) => new Date(s + 'T12:00:00-05:00')
    // Mon 12:00 NYC open
    expect(isUSMarketOpen(ny('2025-01-06'))).toBe(true)
    // Sun closed
    expect(isUSMarketOpen(ny('2025-01-05'))).toBe(false)
    // TTL
    const t = new Date(Date.now() - 10_000).toISOString()
    expect(isStale(t, 1)).toBe(true)
  })
})
