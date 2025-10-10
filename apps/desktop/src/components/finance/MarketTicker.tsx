'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Label mapping
const LABELS: Record<string, string> = {
  '^GSPC': 'S&P 500',
  '^IXIC': 'NASDAQ',
  '^DJI': 'Dow Jones',
  '^VIX': 'VIX',
  '^TNX': '10Y Treasury',
  '^FVX': '5Y Treasury',
  '^TYX': '30Y Treasury',
  'DX-Y.NYB': 'DXY',
  'EURUSD=X': 'EUR/USD',
  'GBPUSD=X': 'GBP/USD',
  'USDJPY=X': 'USD/JPY',
  'USDCAD=X': 'USD/CAD',
  'USDCHF=X': 'USD/CHF',
  'AUDUSD=X': 'AUD/USD',
  'CL=F': 'Oil',
  'GC=F': 'Gold',
};

function prettyLabel(id: string): string {
  return LABELS[id] ?? id;
}

function formatMetric(value: number, id: string): string {
  if (!Number.isFinite(value)) return '';
  
  // Treasury yields - divide by 10
  if (id === '^TNX' || id === '^FVX' || id === '^TYX') {
    return `${(value / 10).toFixed(2)}%`;
  }
  
  // Commodities
  if (id === 'CL=F' || id === 'GC=F') {
    return `$${value.toFixed(2)}`;
  }
  
  // Everything else
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type IndexItem = { name: string; value: string; changePct: string; symbol?: string };
type YieldItem = { name: string; value: string; changePct: string; symbol?: string };
type FxItem = { pair: string; value: string; changePct: string };

// Ticker Item Component
function TickerItem({ 
  label, 
  value, 
  change, 
  onClick 
}: { 
  label: string; 
  value: string; 
  change: string; 
  onClick?: () => void;
}) {
  const changeNum = Number(change);
  const isPositive = changeNum > 0;
  const isNegative = changeNum < 0;
  
  return (
    <button 
      onClick={onClick}
      className="inline-flex items-center gap-3 px-4 py-2 hover:bg-accent/50 rounded-lg transition-colors group"
    >
      <span className="font-medium text-foreground whitespace-nowrap group-hover:text-primary transition-colors">
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground whitespace-nowrap tabular-nums">
        {value}
      </span>
      <div className={`flex items-center gap-1 text-xs font-medium whitespace-nowrap ${
        isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'
      }`}>
        {isPositive && <TrendingUp className="w-3 h-3" />}
        {isNegative && <TrendingDown className="w-3 h-3" />}
        <span>{changeNum.toFixed(2)}%</span>
      </div>
    </button>
  );
}

// Chart Modal Component
function ChartModal({ 
  open, 
  onClose, 
  title, 
  symbol, 
  asOf 
}: { 
  open: boolean; 
  onClose: () => void; 
  title: string; 
  symbol?: string;
  asOf?: string;
}) {
  const [series, setSeries] = useState<{ t: string; v: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !symbol) return;

    const loadData = async () => {
      setLoading(true);
      setSeries([]);

      try {
        const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') ? '/admin' : '';
        const url = `${basePath}/api/finance/getMarketHistory?symbol=${encodeURIComponent(symbol)}`;
        console.log(`[ChartModal] Loading data for ${symbol} from ${url}`);
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`[ChartModal] API error: ${response.status}`);
          setLoading(false);
          return;
        }

        const data = await response.json();
        console.log(`[ChartModal] Received ${data.series?.length || 0} data points`);

        if (data.series && Array.isArray(data.series)) {
          // Normalize treasury yields (Yahoo returns them 10x the actual value)
          const needsNormalization = symbol === '^TNX' || symbol === '^FVX' || symbol === '^TYX';
          const normalizedSeries = needsNormalization
            ? data.series.map((p: any) => ({ t: p.t, v: p.v / 10 }))
            : data.series;

          setSeries(normalizedSeries);
        }
      } catch (error) {
        console.error('[ChartModal] Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, symbol]);

  const downloadCSV = () => {
    if (series.length === 0) return;

    const csv = 'date,value\n' + series.map(p => `${p.t},${p.v}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_historical_data.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl w-[85vw] h-[75vh] max-h-[700px] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Historical price data from Yahoo Finance
                {asOf && (
                  <span className="ml-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    LIVE
                  </span>
                )}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadCSV}
              disabled={series.length === 0}
              className="ml-4"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 overflow-hidden">
          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground">Loading historical data...</p>
            </div>
          ) : series.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-xl text-muted-foreground font-medium">No data available</p>
                <p className="text-sm text-muted-foreground/60 mt-2">
                  Unable to load historical data for this symbol
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-card rounded-xl border p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="t"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                    }}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    minTickGap={50}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    width={80}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      padding: '8px 12px',
                    }}
                    labelFormatter={(value) => formatDate(value)}
                    formatter={(value: any) => [
                      Number(value).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }),
                      title,
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#colorValue)"
                    animationDuration={300}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Market session hook
function useUSMarketSession() {
  const [open, setOpen] = useState(true);
  
  useEffect(() => {
    const check = () => {
      const fmt = new Intl.DateTimeFormat('en-US', { 
        timeZone: 'America/New_York', 
        hour12: false, 
        weekday: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value])) as any;
      const wd = parts.weekday as string;
      const hm = `${parts.hour}:${parts.minute}`;
      const isWeekend = wd === 'Sat' || wd === 'Sun';
      const marketOpen = !isWeekend && hm >= '09:30' && hm <= '16:00';
      setOpen(marketOpen);
    };
    
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  
  return open;
}

// Main Market Ticker Component
export default function MarketTicker() {
  const marketOpen = useUSMarketSession();
  const [indices, setIndices] = useState<IndexItem[]>([]);
  const [yields, setYields] = useState<YieldItem[]>([]);
  const [fx, setFx] = useState<FxItem[]>([]);
  const [asOf, setAsOf] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ title: string; symbol: string } | null>(null);
  const [paused, setPaused] = useState(false);
  
  const trackRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const speed = 40; // pixels per second

  // Load market data
  const load = async () => {
    try {
      // Detect if we're in admin section
      const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') ? '/admin' : '';
      console.log('[MarketTicker] Fetching market data from:', `${basePath}/api/finance/getMarketMetrics`);
      
      const response = await fetch(`${basePath}/api/finance/getMarketMetrics`);
      const marketData = await response.json();
      
      console.log('[MarketTicker] Received data:', {
        indices: marketData.indices?.length,
        yields: marketData.yields?.length,
        fx: marketData.fx?.length,
        raw: marketData
      });

      const processedIndices = (marketData.indices || []).map((q: any) => ({
        name: prettyLabel(q.symbol || q.name),
        value: formatMetric(Number(q.value ?? 0), q.symbol || q.name),
        changePct: String(q.changePct ?? '0'),
        symbol: q.symbol,
      }));

      const processedYields = (marketData.yields || []).map((q: any) => ({
        name: prettyLabel(q.symbol),
        value: formatMetric(Number(q.value ?? 0), q.symbol),
        changePct: String(q.changePct ?? '0'),
        symbol: q.symbol,
      }));

      const processedFx = (marketData.fx || []).map((q: any) => ({
        pair: q.symbol,
        value: formatMetric(Number(q.value ?? 0), q.symbol),
        changePct: String(q.changePct ?? '0'),
      }));

      console.log('[MarketTicker] Processed:', {
        indices: processedIndices,
        yields: processedYields,
        fx: processedFx
      });

      setIndices(processedIndices);
      setYields(processedYields as any);
      setFx(processedFx);
      setAsOf(marketData.asOf || new Date().toISOString());
      
      console.log('[MarketTicker] State updated, hasData will be:', [...processedIndices, ...processedYields, ...processedFx].length > 0);
    } catch (error) {
      console.error('[MarketTicker] Error loading data:', error);
    }
  };

  useEffect(() => {
    load();
    const interval = marketOpen ? 15_000 : 5 * 60_000;
    const id = setInterval(() => load(), interval);
    return () => clearInterval(id);
  }, [marketOpen]);

  // Smooth marquee animation
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let currentOffset = offset;

    const step = (t: number) => {
      const list = listRef.current;
      if (!list) {
        raf = requestAnimationFrame(step);
        return;
      }

      const dt = (t - last) / 1000;
      last = t;

      if (!paused && dt < 0.1) {
        const w = list.offsetWidth || 1;
        currentOffset = currentOffset - speed * dt;

        if (currentOffset <= -w) {
          currentOffset = currentOffset + w;
        }

        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(${currentOffset}px)`;
        }
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      setOffset(currentOffset);
    };
  }, [paused, speed]);

  const allItems = [...indices, ...yields, ...fx];
  const hasData = allItems.length > 0;

  const handleItemClick = (title: string, symbol: string) => {
    setSelectedItem({ title, symbol });
    setModalOpen(true);
  };

  return (
    <>
      <div 
        className="relative w-full overflow-hidden bg-card/30 backdrop-blur-sm"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {!hasData ? (
          <div className="flex items-center justify-center py-3">
            <div className="animate-pulse text-sm text-muted-foreground">
              Loading market data...
            </div>
          </div>
        ) : (
          <div ref={trackRef} className="flex whitespace-nowrap will-change-transform">
            <div ref={listRef} className="flex">
              {allItems.map((item: any, i: number) => (
                <TickerItem
                  key={`a-${i}`}
                  label={item.name || prettyLabel(item.symbol || item.pair)}
                  value={item.value || ''}
                  change={item.changePct || '0'}
                  onClick={() => handleItemClick(
                    item.name || prettyLabel(item.symbol || item.pair),
                    item.symbol || item.pair
                  )}
                />
              ))}
            </div>
            <div className="flex" aria-hidden="true">
              {allItems.map((item: any, i: number) => (
                <TickerItem
                  key={`b-${i}`}
                  label={item.name || prettyLabel(item.symbol || item.pair)}
                  value={item.value || ''}
                  change={item.changePct || '0'}
                  onClick={() => handleItemClick(
                    item.name || prettyLabel(item.symbol || item.pair),
                    item.symbol || item.pair
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedItem && (
        <ChartModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setPaused(false);
          }}
          title={selectedItem.title}
          symbol={selectedItem.symbol}
          asOf={asOf}
        />
      )}
    </>
  );
}
