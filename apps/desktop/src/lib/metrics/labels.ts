export const LABELS: Record<string, string> = {
  '^GSPC': 'S&P 500',
  '^IXIC': 'NASDAQ Composite',
  '^DJI': 'Dow Jones Industrial Average',
  '^VIX': 'CBOE Volatility Index',
  '^TNX': 'U.S. 10-Year Treasury Yield',
  '^FVX': 'U.S. 5-Year Treasury Yield',
  '^TYX': 'U.S. 30-Year Treasury Yield',
  'DX-Y.NYB': 'U.S. Dollar Index (DXY)',
  'EURUSD=X': 'EUR/USD',
  'GBPUSD=X': 'GBP/USD',
  'USDJPY=X': 'USD/JPY',
  'USDCAD=X': 'USD/CAD',
  'USDCHF=X': 'USD/CHF',
  'AUDUSD=X': 'AUD/USD',
  'CL=F': 'WTI Crude',
  'GC=F': 'Gold',
  // FRED macros
  'DGS10': 'U.S. 10-Year Treasury Yield',
  'DGS2': 'U.S. 2-Year Treasury Yield',
  'T10Y2Y': '2s10s Spread',
  'UNRATE': 'Unemployment Rate',
  'CPIAUCSL': 'CPI (YoY)',
  'PCEPILFE': 'Core PCE (YoY)',
  'GDPC1': 'Real GDP (YoY)',
  'NAPM': 'ISM Manufacturing PMI',
  'HOUST': 'Housing Starts',
  // FRED 5y canonical
  'DGS5': 'U.S. 5-Year Treasury Yield',
  // App canonical id for 5y
  'ust_5y': 'U.S. 5-Year Treasury',
}

export function prettyLabel(id: string): string {
  return LABELS[id] ?? id
}

function divideTen(id: string): boolean {
  return id === '^TNX' || id === '^FVX' || id === '^TYX'
}

function isSpreadBp(id: string): boolean {
  return id === 'T10Y2Y'
}

function isCommodity(id: string): boolean {
  return id === 'CL=F' || id === 'GC=F'
}

function isFX(id: string): boolean {
  return /[A-Z]{3}[A-Z]{3}=X$/.test(id) || id === 'DX-Y.NYB'
}

export function formatMetric(value: number | string, id: string): string {
  const v = Number(value)
  if (!Number.isFinite(v)) return String(value ?? '')
  if (isSpreadBp(id)) {
    // whole basis points with sign
    const bps = Math.round(v)
    return `${bps} bp`
  }
  if (divideTen(id)) {
    return `${(v / 10).toFixed(2)}%`
  }
  if (id === 'UNRATE' || id === 'CPIAUCSL' || id === 'PCEPILFE' || id === 'GDPC1') {
    return `${v.toFixed(2)}%`
  }
  if (isCommodity(id)) {
    return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (isFX(id) || id === '^GSPC' || id === '^IXIC' || id === '^DJI' || id === '^VIX') {
    return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return v.toString()
}
