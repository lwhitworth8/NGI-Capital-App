import { prettyLabel, formatMetric } from '../labels'

describe('labels + formatMetric', () => {
  it('pretty labels map correctly', () => {
    expect(prettyLabel('^GSPC')).toBe("S&P 500")
    expect(prettyLabel('DX-Y.NYB')).toBe('U.S. Dollar Index (DXY)')
    expect(prettyLabel('EURUSD=X')).toBe('EUR/USD (Euro ↔ U.S. Dollar)')
  })

  it('formats yields by dividing by 10 with percent', () => {
    expect(formatMetric(42.3, '^TNX')).toBe('4.23%')
    expect(formatMetric(39.9, '^FVX')).toBe('3.99%')
  })

  it('formats spreads in whole bp with sign', () => {
    expect(formatMetric(-51.8, 'T10Y2Y')).toBe('-52 bp')
  })

  it('formats fx and indices with two decimals', () => {
    expect(formatMetric(106.234, 'DX-Y.NYB')).toBe('106.23')
    expect(formatMetric(4532.1, '^GSPC')).toBe('4,532.10')
  })

  it('formats commodities in USD with two decimals', () => {
    expect(formatMetric(78.345, 'CL=F')).toBe('$78.35')
  })
})

