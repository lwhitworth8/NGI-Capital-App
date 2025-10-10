# Stock Ticker Feature - Setup and Usage

## Overview

The animated stock ticker bar displays real-time market data including:
- Major indices (S&P 500, NASDAQ, Dow Jones, VIX)
- Treasury yields (10Y, 5Y, 30Y)
- Currency pairs (EUR/USD, GBP/USD, USD/JPY, etc.)
- Commodities (Gold, Oil)
- Economic indicators (CPI, Unemployment, GDP, etc.)

## Features

- **Auto-updating**: Refreshes every 15 seconds during market hours (9:30 AM - 4:00 PM ET), every 5 minutes outside market hours
- **Pause on hover**: Animation stops when you hover over it
- **Interactive**: Click any ticker to view historical chart data
- **Historical charts**: Modal window shows 50 years of historical data from Yahoo Finance
- **CSV export**: Download historical data from the chart modal

## Location

The ticker bar is located in the Finance module:
- Below the "Finance Dashboard" header and entity selector
- Above the Dashboard/Forecasting/Investors tabs

## Backend Setup

### 1. Environment Variables

Optional: Set FRED API key for economic data (free from https://fred.stlouisfed.org/docs/api/api_key.html)

```bash
# .env file
FRED_API_KEY=your_fred_api_key_here
```

### 2. Backfill Historical Data (Recommended)

Populate the database with historical data for better chart performance:

```bash
# From project root
npm run backfill:metrics
```

This will:
- Download 50 years of historical data from Yahoo Finance and FRED
- Store it in the SQLite database under `metrics` tables
- Enable instant chart loading when clicking tickers

Data sources backfilled:
- **Yahoo Finance**: Stock indices, FX pairs, commodities, treasury yields
- **FRED**: Economic indicators (CPI, unemployment, GDP, etc.)

### 3. Backend API Endpoints

The ticker uses these API routes:

**Frontend (Next.js API routes):**
- `GET /api/finance/getMarketMetrics` - Live market data (indices, yields, FX)
- `GET /api/finance/getEconomicMetrics` - Economic data from FRED
- `GET /api/finance/getMarketHistory?symbol=^GSPC` - Historical data for a symbol
- `GET /api/finance/getMarketHistory?fred=UNRATE` - Historical FRED data

**Backend (FastAPI):**
- `GET /api/metrics/{metric_id}/history` - Historical data from database (faster)
- `POST /api/metrics/admin/append` - Admin endpoint to add/update data

## How It Works

### Data Flow

1. **Live Data**: Ticker polls `/api/finance/getMarketMetrics` every 15s (market hours) or 5 min (off hours)
2. **Historical Data**: When user clicks a ticker:
   - First tries backend database (`/api/metrics/{id}/history`)
   - Falls back to Yahoo Finance API if no DB data
   - Displays in modal with Recharts area chart
3. **Updates**: Market session detection via US Eastern Time (9:30 AM - 4:00 PM ET, Mon-Fri)

### Animation

- CSS transform-based marquee using `requestAnimationFrame`
- Seamless loop with duplicated ticker items
- Pauses on hover via state management
- Speed: 40px/second

### Color Coding

- **Green**: Positive change (price up)
- **Red**: Negative change (price down)
- **Gray**: No change

## Customization

### Add/Remove Tickers

Edit the symbols in:

**Market Data** (`apps/desktop/src/app/api/finance/getMarketMetrics/route.ts`):
```typescript
const indexSymbols = ['^GSPC', '^IXIC', '^DJI', '^VIX', 'DX-Y.NYB', 'GC=F', 'CL=F']
const yieldSymbols = ['^TNX', '^FVX', '^TYX']
const fxSymbols = ['EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCAD=X', 'USDCHF=X', 'AUDUSD=X']
```

**Backfill Registry** (`scripts/backfill_metrics.ts`):
```typescript
const REGISTRY: RegItem[] = [
  { id: '^GSPC', label: 'S&P 500', source: 'yfinance' },
  // Add more...
]
```

### Style Customization

Ticker styling is in `apps/desktop/src/components/finance/MarketTicker.tsx`:
- Background: `bg-card/30 backdrop-blur-sm`
- Animation speed: `speed = 40` (px/second)
- Polling intervals: `marketOpen ? 15_000 : 5 * 60_000` (ms)

## Troubleshooting

### No Data Showing

1. Check if Yahoo Finance API is accessible (may have rate limits)
2. Run backfill script to populate DB: `npm run backfill:metrics`
3. Check browser console for API errors

### Charts Not Loading

1. Verify historical data exists: Check `/api/metrics/^GSPC/history`
2. Fall back to Yahoo Finance: Charts will load from Yahoo if DB is empty
3. Check FRED_API_KEY if economic indicators fail

### Animation Stuttering

1. Reduce polling frequency: Edit `marketOpen ? 15_000 : 5 * 60_000` in MarketTicker.tsx
2. Reduce ticker items: Remove some symbols from API routes
3. Check browser performance (animation uses `requestAnimationFrame`)

## API Rate Limits

### Yahoo Finance
- No official limits, but aggressive polling may get throttled
- Recommend: 15s during market hours, 5 min off hours (current setup)
- Backfill once per day to avoid repeated historical data requests

### FRED
- Free tier: 1000 requests/day
- Economic data updates infrequently (monthly/quarterly), so caching is effective
- Current setup: 6 hour cache TTL

## Database Schema

```sql
CREATE TABLE metrics (
  id TEXT PRIMARY KEY,        -- Symbol or FRED series ID
  label TEXT,                 -- Display name
  unit TEXT,                  -- Unit (USD, %, bp)
  source TEXT,                -- 'yfinance' or 'FRED'
  frequency TEXT,             -- 'daily', 'monthly', 'quarterly'
  transform TEXT              -- 'yoy' for year-over-year
);

CREATE TABLE metric_history (
  metric_id TEXT NOT NULL,
  ts TEXT NOT NULL,           -- ISO timestamp
  value REAL,
  PRIMARY KEY(metric_id, ts)
);

CREATE TABLE metric_latest (
  metric_id TEXT PRIMARY KEY,
  ts TEXT,
  value REAL,
  change_abs REAL,
  change_pct REAL
);
```

## Development

### Testing Locally

1. Start backend: `uvicorn src.api.main:app --reload`
2. Start frontend: `cd apps/desktop && npm run dev`
3. Open: `http://localhost:3001/admin/finance`
4. Hover over ticker to pause, click to see charts

### Add New Data Source

1. Create API route in `apps/desktop/src/app/api/finance/`
2. Add to MarketTicker component fetch logic
3. Add backfill logic to `scripts/backfill_metrics.ts`
4. Update labels in `apps/desktop/src/lib/metrics/labels.ts`

## Production Deployment

1. Set FRED_API_KEY in production environment
2. Run backfill: `DATABASE_PATH=/app/data/ngi_capital.db npm run backfill:metrics`
3. Schedule daily backfill via cron:
   ```bash
   0 6 * * * cd /app && npm run backfill:metrics >> /var/log/ticker_backfill.log 2>&1
   ```
4. Monitor API rate limits and adjust polling intervals if needed

## References

- Yahoo Finance 2 npm package: https://www.npmjs.com/package/yahoo-finance2
- FRED API docs: https://fred.stlouisfed.org/docs/api/
- Recharts documentation: https://recharts.org/

