'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, ArrowUpRight, ArrowDownRight, Loader2, Maximize, Sigma, Minus,
  Crosshair as CrosshairIcon, Lock, Unlock, BarChart4, Sparkles, TrendingUp, TrendingDown,
} from 'lucide-react';
import CandlestickChart from '@/components/dashboard/CandlestickChart';
import type { OHLCVPoint, PatternInfo, TrendLine } from '@/components/dashboard/CandlestickChart';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SearchResult {
  symbol: string;
  short_symbol: string;
  exchange: string;
  company_name: string;
  price: number | null;
  change_percent: number | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const TIMEFRAMES = ['1D', '5D', '1M', '6M', '1Y', '5Y', 'MAX'] as const;

const SERIF = { fontFamily: 'var(--nx-serif-font), Georgia, serif' };

function ExchangeBadge({ exchange }: { exchange: string }) {
  return (
    <span className="inline-flex items-center rounded-[3px] border border-[#1B2438] bg-[#0B111C] px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#5C6883]">
      {exchange}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChartsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedInfo, setSelectedInfo] = useState<SearchResult | null>(null);
  const [ohlcv, setOhlcv] = useState<OHLCVPoint[]>([]);
  const [patterns, setPatterns] = useState<PatternInfo[]>([]);
  const [timeframe, setTimeframe] = useState('1M');
  const [chartLoading, setChartLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [autoScale, setAutoScale] = useState(0);

  const [scaleMode, setScaleMode] = useState<'linear' | 'log'>('linear');
  const [trendLineMode, setTrendLineMode] = useState(false);
  const [verticalLock, setVerticalLock] = useState(false);
  const [crosshairEnabled, setCrosshairEnabled] = useState(true);
  const [trendLines, setTrendLines] = useState<TrendLine[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  /* ---- Debounced search via API ---- */
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data);
      setSelectedIndex(-1);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 150);
  };

  /* ---- Keyboard nav ---- */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      selectStock(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setQuery('');
      setResults([]);
      inputRef.current?.blur();
    }
  };

  /* ---- Close dropdown on outside click ---- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ---- Fetch OHLCV + patterns on select ---- */
  useEffect(() => {
    if (!selectedSymbol) return;
    const load = async () => {
      setAutoScale(0);
      setChartLoading(true);
      setOhlcv([]);
      setPatterns([]);
      setTrendLines([]);

      try {
        const [o, p] = await Promise.all([
          fetch(`/api/stocks/${encodeURIComponent(selectedSymbol)}/ohlcv?timeframe=${timeframe}`).then((r) => r.json()),
          fetch(`/api/stocks/${encodeURIComponent(selectedSymbol)}/patterns?timeframe=${timeframe}`).then((r) => r.json()),
        ]);
        if (o.ohlcv) setOhlcv(o.ohlcv);
        if (p.patterns) setPatterns(p.patterns);
      } catch {
        // ignore load errors; empty chart is shown
      }
      setChartLoading(false);
    };
    load();
  }, [selectedSymbol, timeframe]);

  const selectStock = useCallback((item: SearchResult) => {
    setSelectedSymbol(item.symbol);
    setSelectedInfo(item);
    setQuery('');
    setResults([]);
  }, []);

  const up = selectedInfo?.change_percent != null ? selectedInfo.change_percent >= 0 : true;

  return (
    <div className="rounded-[4px] border border-[#1B2438] bg-[#0B111C] px-4 py-8 md:px-8 lg:py-10">
      {/* ──── HEADER ──── */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[3px] border border-[#D4A657]/30 bg-[#D4A657]/10 text-[#D4A657]">
            <BarChart4 className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl md:text-3xl font-medium text-[#EBEEF4]" style={SERIF}>Chart Analysis</h1>
            <p className="text-sm text-[#8E9AB5]">Advanced candlestick charting with pattern detection</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-[#5C6883]">
          <Sparkles className="w-3.5 h-3.5 text-[#D4A657]" />
          <span>Powered by Yahoo Finance</span>
        </div>
      </header>

      {/* ──── SEARCH ──── */}
      <div ref={wrapperRef} className="mb-10">
        <div className={`flex items-center gap-4 rounded-[4px] border bg-[#121B2C] px-5 py-4 transition-all duration-300 ${
          focused
            ? 'border-[#D4A657]/60 shadow-[0_0_18px_rgba(212,166,87,0.10)]'
            : 'border-[#26314A] hover:border-[#26314A] bg-[#121B2C]'
        }`}>
          <Search className={`w-5 h-5 shrink-0 transition-colors duration-300 ${focused ? 'text-[#D4A657]' : 'text-[#5C6883]'}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search stocks, e.g. TCS, RELIANCE, INFY..."
            className="flex-1 bg-transparent text-base text-[#EBEEF4] placeholder-[#5C6883] outline-none"
            suppressHydrationWarning
          />
          <div className="flex items-center gap-2 shrink-0">
            {loading && <Loader2 className="w-4 h-4 animate-spin text-[#D4A657]" />}
            {query && (
              <button
                onClick={() => { setQuery(''); setResults([]); }}
                className="rounded-full p-1 text-[#5C6883] transition hover:bg-[#1B2438] hover:text-[#EBEEF4]"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded-[3px] border border-[#1B2438] bg-[#0B111C] px-1.5 py-0.5 text-[10px] font-mono text-[#5C6883]">⌘K</kbd>
          </div>
        </div>

        {query.length > 0 && results.length === 0 && !loading && (
          <p className="py-6 text-center text-sm text-[#5C6883]">No stocks found for &quot;{query}&quot;</p>
        )}

        {results.length > 0 && (
          <div className="overflow-hidden rounded-b-[4px] border border-t-0 border-[#26314A] bg-[#0B111C]">
            <div className="max-h-64 divide-y divide-[#1B2438] overflow-y-auto">
              {results.map((item, i) => {
                const isSelected = i === selectedIndex;
                const cp = item.change_percent;
                return (
                  <button
                    key={item.symbol}
                    onClick={() => selectStock(item)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left transition-all duration-150 ${
                      isSelected
                        ? 'border-l-[#D4A657] bg-[#D4A657]/8'
                        : 'border-l-transparent hover:bg-[#1B2438]/40'
                    }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border text-xs font-bold ${
                      isSelected ? 'border-[#D4A657]/40 bg-[#D4A657]/15 text-[#D4A657]' : 'border-[#1B2438] bg-[#0B111C] text-[#5C6883]'
                    }`}>
                      {item.short_symbol?.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#EBEEF4]">{item.short_symbol}</span>
                        <ExchangeBadge exchange={item.exchange} />
                      </div>
                      {item.company_name && <p className="truncate text-xs text-[#8E9AB5]">{item.company_name}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      {item.price != null && (
                        <p className="text-sm font-semibold text-[#EBEEF4]">
                          ₹{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      )}
                      {cp != null && (
                        <p className={`flex items-center justify-end gap-0.5 text-xs font-medium ${cp >= 0 ? 'text-[#39B58C]' : 'text-[#DD6455]'}`}>
                          {cp >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(cp).toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ──── CHART AREA ──── */}
      {selectedSymbol && selectedInfo && (
        <div className="rounded-[4px] border border-[#1B2438] bg-[#121B2C]">
          {/* Stock identity strip */}
          <div className="flex flex-wrap items-center gap-4 border-b border-[#1B2438] px-6 md:px-8 py-4">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-[3px] border ${up ? 'border-[#39B58C]/30 bg-[#39B58C]/10 text-[#39B58C]' : 'border-[#DD6455]/30 bg-[#DD6455]/10 text-[#DD6455]'}`}>
                {up ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#EBEEF4]">{selectedInfo.short_symbol}</h2>
                  <ExchangeBadge exchange={selectedInfo.exchange} />
                </div>
                {selectedInfo.company_name && (
                  <p className="text-xs text-[#8E9AB5]">{selectedInfo.company_name}</p>
                )}
              </div>
            </div>
            {selectedInfo.price != null && (
              <div className="ml-auto text-right">
                <p className="text-xl font-medium text-[#EBEEF4]" style={SERIF}>
                  ₹{selectedInfo.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {selectedInfo.change_percent != null && (
                  <p className={`flex items-center justify-end gap-1 text-sm font-medium ${up ? 'text-[#39B58C]' : 'text-[#DD6455]'}`}>
                    {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {up ? '+' : ''}{selectedInfo.change_percent.toFixed(2)}%
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Toolbar + Timeframe */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#1B2438] bg-[#0B111C] px-6 md:px-8 py-3">
            <div className="flex flex-wrap gap-1">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`rounded-[3px] border px-3 py-1.5 text-xs font-medium transition-all ${
                    timeframe === tf
                      ? 'border-[#D4A657]/60 bg-[#D4A657]/10 text-[#D4A657] shadow-[0_0_12px_rgba(212,166,87,0.12)]'
                      : 'border-transparent text-[#5C6883] hover:bg-[#1B2438]/50 hover:text-[#EBEEF4]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setAutoScale(n => n + 1)}
                title="Auto-scale"
                className="rounded-[3px] p-2 text-[#5C6883] transition hover:bg-[#1B2438] hover:text-[#EBEEF4]"
              >
                <Maximize className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setScaleMode(s => s === 'linear' ? 'log' : 'linear')}
                title={`Toggle ${scaleMode === 'linear' ? 'log' : 'linear'} scale`}
                className={`rounded-[3px] p-2 transition ${
                  scaleMode === 'log' ? 'bg-[#D4A657]/15 text-[#D4A657] ring-1 ring-[#D4A657]/30' : 'text-[#5C6883] hover:bg-[#1B2438] hover:text-[#EBEEF4]'
                }`}
              >
                <Sigma className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCrosshairEnabled(c => !c)}
                title="Toggle crosshair"
                className={`rounded-[3px] p-2 transition ${
                  crosshairEnabled ? 'bg-[#39B58C]/15 text-[#39B58C] ring-1 ring-[#39B58C]/30' : 'text-[#5C6883] hover:bg-[#1B2438] hover:text-[#EBEEF4]'
                }`}
              >
                <CrosshairIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setVerticalLock(v => !v)}
                title="Toggle vertical lock"
                className={`rounded-[3px] p-2 transition ${
                  verticalLock ? 'bg-[#D4A657]/15 text-[#D4A657] ring-1 ring-[#D4A657]/30' : 'text-[#5C6883] hover:bg-[#1B2438] hover:text-[#EBEEF4]'
                }`}
              >
                {verticalLock ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setTrendLineMode(t => !t)}
                title="Trend line mode"
                className={`rounded-[3px] p-2 transition ${
                  trendLineMode ? 'bg-[#DD6455]/15 text-[#DD6455] ring-1 ring-[#DD6455]/30' : 'text-[#5C6883] hover:bg-[#1B2438] hover:text-[#EBEEF4]'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Chart */}
          <div className="relative" style={{ height: 'calc(100vh - 420px)', minHeight: '400px' }}>
            {chartLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0B111C]/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[#D4A657]" />
                  <p className="text-xs text-[#5C6883]">Loading chart data...</p>
                </div>
              </div>
            )}
            {!chartLoading && (
              <CandlestickChart
                key={selectedSymbol + timeframe + autoScale}
                data={ohlcv}
                patterns={patterns}
                symbol={selectedSymbol}
                timeframe={timeframe}
                className="h-full w-full"
                liveInterval={timeframe === '1D' ? 30 : 60}
                scaleMode={scaleMode}
                trendLines={trendLines}
                onTrendLinesChange={setTrendLines}
                crosshairEnabled={crosshairEnabled}
              />
            )}
          </div>
        </div>
      )}

      {/* ──── EMPTY STATE ──── */}
      {!selectedSymbol && (
        <div className="flex flex-col items-center justify-center rounded-[4px] border border-[#1B2438] bg-[#0B111C] py-24 px-6">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[4px] border border-[#D4A657]/20 bg-[#D4A657]/5">
            <BarChart4 className="h-8 w-8 text-[#D4A657]/70" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-[#EBEEF4]">No Stock Selected</h3>
          <p className="max-w-md text-center text-sm text-[#5C6883]">
            Search for a stock above to view its interactive candlestick chart with pattern detection, trend lines, and multiple timeframe analysis.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[{ sym: 'RELIANCE.NS', label: 'RELIANCE' }, { sym: 'TCS.NS', label: 'TCS' }, { sym: 'INFY.NS', label: 'INFY' }, { sym: 'HDFCBANK.NS', label: 'HDFCBANK' }].map(({ sym, label }) => (
              <button
                key={sym}
                onClick={() => {
                  const pick = (data: SearchResult[]) => {
                    const match = data.find((d) => d.symbol === sym) ?? data.find((d) => d.short_symbol === label);
                    if (match) selectStock(match);
                  };
                  fetch(`/api/stocks/search?q=${encodeURIComponent(label)}`)
                    .then((r) => r.json())
                    .then(pick)
                    .catch(() => {});
                }}
                className="rounded-[3px] border border-[#1B2438] bg-[#121B2C] px-3 py-1.5 text-xs text-[#8E9AB5] transition-all hover:border-[#D4A657]/50 hover:text-[#EBEEF4]"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}