'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, TrendingUp, TrendingDown, Minus, Loader2,
  BarChart3, ArrowRight, X, Activity, Sparkles,
} from 'lucide-react';
import PageTransition from '@/components/dashboard/PageTransition';
import AnimatedNumber from '@/components/dashboard/AnimatedNumber';

interface StockResult {
  symbol: string;
  short_symbol: string;
  exchange: string;
  company_name: string;
  sector: string;
  industry: string;
  price: number | null;
  change_percent: number | null;
  volume: number | null;
  market_cap: number | null;
}

interface IndexData {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

const SECTORS = ['All', 'Banking', 'IT', 'Pharma', 'Auto', 'FMCG', 'Energy', 'Metal', 'Infrastructure', 'Telecom'];

const SERIF = { fontFamily: 'var(--nx-serif-font), Georgia, serif' };

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);
}

function fmtCompact(n: number): string {
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return fmt(n);
}

function fmtMarketCap(n: number | null): string {
  if (!n) return '—';
  if (n >= 1e12) return `₹${fmt(n / 1e12)}T`;
  if (n >= 1e9) return `₹${fmt(n / 1e9)}B`;
  if (n >= 1e7) return `₹${fmt(n / 1e7)}Cr`;
  return `₹${fmt(n)}`;
}

function getChangeColor(cp: number | null): string {
  if (cp === null) return 'text-[#5C6883]';
  return cp >= 0 ? 'text-[#39B58C]' : 'text-[#DD6455]';
}

function getChangeIcon(cp: number | null) {
  if (cp === null || cp === 0) return <Minus className="w-3.5 h-3.5" />;
  return cp > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />;
}

function SectorBadge({ sector }: { sector: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[3px] border border-[#26314A] bg-[#0B111C] px-2 py-0.5 text-[10px] font-medium text-[#8E9AB5]">
      {sector}
    </span>
  );
}

function ExchangeBadge({ exchange }: { exchange: string }) {
  return (
    <span className="inline-flex items-center rounded-[3px] border border-[#1B2438] bg-[#0B111C] px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#5C6883]">
      {exchange}
    </span>
  );
}

function StatCard({ icon, label, active, children, meta }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  children: React.ReactNode;
  meta?: React.ReactNode;
}) {
  const chip = active ? 'bg-[#39B58C]/15 text-[#39B58C]' : 'bg-[#D4A657]/10 text-[#D4A657]';
  return (
    <div className="nx-panel-card">
      <div className="flex items-start gap-2.5 p-4 pb-0.5">
        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] ${chip}`}>{icon}</span>
        <p className="nx-panel-symbol">{label}</p>
      </div>
      <div className="px-4 pb-4 pt-2">{children}</div>
      {meta && <div className="nx-panel-card-meta">{meta}</div>}
    </div>
  );
}

function StatValue({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[22px] font-medium leading-tight text-[#EBEEF4] whitespace-nowrap" style={SERIF}>
      {children}
    </p>
  );
}

export default function MarketsPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeSector, setActiveSector] = useState('');
  const [results, setResults] = useState<StockResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [popularStocks, setPopularStocks] = useState<StockResult[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [indicesData, setIndicesData] = useState<IndexData[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    fetch('/api/market/indices')
      .then(r => r.json())
      .then(d => { if (d?.indices) setIndicesData(d.indices); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/market/popular')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPopularStocks(d); })
      .catch(() => {})
      .finally(() => setPopularLoading(false));
  }, []);

  const isSearching = query.length > 0 || activeSector.length > 0;

  const doSearch = useCallback(async (q: string, sec: string) => {
    if (!q && !sec) { setResults([]); return; }
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (sec) params.set('sector', sec);
      const res = await fetch(`/api/stocks/search?${params}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
      setSelectedIndex(-1);
    } catch { setResults([]); }
    setSearchLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query, activeSector), 180);
    return () => clearTimeout(timer);
  }, [query, activeSector, doSearch]);

  const handleSectorClick = (sec: string) => {
    setActiveSector(sec === 'All' ? '' : sec);
    setQuery('');
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      router.push(`/dashboard/chart/${results[selectedIndex].symbol}`);
    } else if (e.key === 'Escape') {
      setQuery('');
      setActiveSector('');
      setResults([]);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (symbol: string) => {
    router.push(`/dashboard/chart/${symbol}`);
  };

  const nifty = indicesData.find(i => i.symbol === '^NSEI');
  const niftyUp = nifty?.changePercent != null ? nifty.changePercent >= 0 : true;
  let bestIndex: IndexData | null = null;
  if (indicesData.length) {
    bestIndex = indicesData.reduce((best, curr) => {
      if (best.changePercent === null) return curr;
      if (curr.changePercent === null) return best;
      return (curr.changePercent) > (best.changePercent) ? curr : best;
    });
  }
  const bestUp = bestIndex?.changePercent != null ? bestIndex.changePercent >= 0 : true;

  return (
    <PageTransition>
      <div className="rounded-[4px] border border-[#1B2438] bg-[#0B111C] px-4 py-8 md:px-8 lg:py-10">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-[#D4A657]/30 bg-[#D4A657]/10 text-[#D4A657]">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h1 className="text-2xl md:text-3xl font-medium text-[#EBEEF4]" style={SERIF}>
              Stock Screener
            </h1>
          </div>
          <p className="text-sm text-[#8E9AB5]">
            Discover &amp; analyze NSE &amp; BSE stocks by name, sector, or symbol
          </p>
        </header>

        {/* Market stat rack */}
        <div className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-5">
          <StatCard
            icon={niftyUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            label="NIFTY 50"
            active={niftyUp}
            meta={
              nifty?.changePercent != null ? (
                <>
                  <p className={`nx-panel-name ${niftyUp ? 'nx-up' : 'nx-down'}`}>{niftyUp ? 'Advancing' : 'Declining'}</p>
                  <p className={`nx-panel-chg ${niftyUp ? 'nx-up' : 'nx-down'}`}>{niftyUp ? '+' : ''}{fmt(nifty.changePercent)}% today</p>
                </>
              ) : null
            }
          >
            {nifty?.price != null ? (
              <StatValue><AnimatedNumber value={nifty.price} decimals={2} /></StatValue>
            ) : (
              <div className="h-[30px] flex items-center"><p className="text-sm text-[#5C6883]">Loading…</p></div>
            )}
          </StatCard>

          <StatCard
            icon={<Activity className="h-4 w-4" />}
            label="Stocks Tracked"
            active={false}
            meta={<span className="w-full text-center text-[12px] font-medium text-[#8E9AB5]">NSE &amp; BSE</span>}
          >
            <StatValue>2,000+</StatValue>
          </StatCard>

          <StatCard
            icon={<Activity className="h-4 w-4" />}
            label="Market Status"
            active={false}
            meta={<span className="w-full text-center text-[12px] font-medium text-[#8E9AB5]">9:15 AM – 3:30 PM IST</span>}
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="absolute inset-0 rounded-full bg-[#39B58C] animate-ping opacity-40" />
                <span className="relative w-3 h-3 rounded-full bg-[#39B58C]" />
              </span>
              <span className="text-lg font-bold text-[#EBEEF4]">Open</span>
            </div>
          </StatCard>

          <StatCard
            icon={bestUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            label="Top Sector"
            active={bestUp}
            meta={
              bestIndex?.changePercent != null ? (
                <>
                  <p className={`nx-panel-name ${bestUp ? 'nx-up' : 'nx-down'}`}>{bestUp ? 'Advancing' : 'Declining'}</p>
                  <p className={`nx-panel-chg ${bestUp ? 'nx-up' : 'nx-down'}`}>{bestUp ? '+' : ''}{fmt(bestIndex.changePercent)}%</p>
                </>
              ) : null
            }
          >
            {bestIndex ? (
              <StatValue>{bestIndex.label}</StatValue>
            ) : (
              <div className="h-[30px] flex items-center"><p className="text-sm text-[#5C6883]">Loading…</p></div>
            )}
          </StatCard>
        </div>

        {/* Screener panel */}
        <div className="rounded-[4px] border border-[#1B2438] bg-[#121B2C] p-5 md:p-8">
          {/* Sector chips */}
          <div className="mb-6 flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {SECTORS.map((sec) => {
              const isActive = (sec === 'All' && !activeSector) || sec === activeSector;
              return (
                <button
                  key={sec}
                  onClick={() => handleSectorClick(sec)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all duration-200 ${
                    isActive
                      ? 'border-[#D4A657]/60 bg-[#D4A657]/10 text-[#D4A657] shadow-[0_0_12px_rgba(212,166,87,0.15)]'
                      : 'border-[#1B2438] bg-[#0B111C] text-[#8E9AB5] hover:border-[#26314A] hover:text-[#EBEEF4]'
                  }`}
                >
                  {sec}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className={`relative transition-all duration-300 ${isFocused ? 'scale-[1.01]' : ''}`}>
            <div className={`flex items-center gap-4 rounded-[4px] border bg-[#0B111C] px-5 py-4 transition-all duration-300 ${
              results.length > 0 && isSearching
                ? 'rounded-b-none border-b-0'
                : 'rounded-[4px]'
            } ${
              isFocused
                ? 'border-[#D4A657]/60 shadow-[0_0_18px_rgba(212,166,87,0.10)]'
                : 'border-[#26314A] hover:border-[#26314A] bg-[#0B111C]'
            }`}>
              <Search className={`w-5 h-5 shrink-0 transition-colors duration-300 ${isFocused ? 'text-[#D4A657]' : 'text-[#5C6883]'}`} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setSelectedIndex(-1); }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder={activeSector ? `Search in ${activeSector}...` : 'Search stocks, e.g. TCS, RELIANCE, INFY...'}
                className="flex-1 bg-transparent text-base text-[#EBEEF4] placeholder-[#5C6883] outline-none"
                suppressHydrationWarning
              />
              <div className="flex items-center gap-2 shrink-0">
                {searchLoading && <Loader2 className="w-4 h-4 animate-spin text-[#D4A657]" />}
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 rounded-full hover:bg-[#1B2438] transition text-[#5C6883] hover:text-[#EBEEF4]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex items-center gap-1 rounded-[3px] border border-[#1B2438] bg-[#0B111C] px-1.5 py-0.5 text-[10px] font-mono text-[#5C6883]">
                  ⌘K
                </kbd>
              </div>
            </div>

            {results.length > 0 && isSearching && (
              <div className={`rounded-b-[4px] border border-t-0 border-[#26314A] bg-[#0B111C] overflow-hidden transition-all duration-300 ${
                isFocused ? 'border-[#D4A657]/60' : 'border-[#26314A]'
              }`}>
                <div className="flex items-center justify-between border-t border-[#1B2438] px-4 py-2">
                  <p className="text-[11px] text-[#5C6883]">
                    {searchLoading ? 'Searching...' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
                  </p>
                  {(query || activeSector) && (
                    <button
                      onClick={() => { setQuery(''); setActiveSector(''); }}
                      className="text-[11px] text-[#5C6883] hover:text-[#EBEEF4] transition flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
                <div className="divide-y divide-[#1B2438] max-h-[420px] overflow-y-auto">
                  {results.map((item, i) => {
                    const isSelected = i === selectedIndex;
                    const cp = item.change_percent;
                    return (
                      <motion.div
                        key={item.symbol}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.15 }}
                        onClick={() => handleSelect(item.symbol)}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 border-l-2 ${
                          isSelected
                            ? 'bg-[#D4A657]/8 border-l-[#D4A657]'
                            : 'border-l-transparent hover:bg-[#1B2438]/40'
                        }`}
                      >
                        <div className={`flex items-center justify-center w-9 h-9 rounded-[3px] shrink-0 text-xs font-bold border ${
                          isSelected ? 'border-[#D4A657]/40 bg-[#D4A657]/15 text-[#D4A657]' : 'border-[#1B2438] bg-[#0B111C] text-[#5C6883]'
                        }`}>
                          {item.short_symbol.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-[#EBEEF4]">{item.short_symbol}</span>
                            <ExchangeBadge exchange={item.exchange} />
                            <SectorBadge sector={item.sector || item.industry || 'N/A'} />
                          </div>
                          <p className="text-xs text-[#5C6883] mt-0.5 truncate">{item.company_name}</p>
                        </div>
                        <div className="text-right shrink-0 min-w-[100px]">
                          {item.price != null && (
                            <p className="text-sm font-semibold text-[#EBEEF4]">{fmt(item.price)}</p>
                          )}
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            {cp != null && (
                              <span className={`flex items-center gap-0.5 text-xs font-medium ${getChangeColor(cp)}`}>
                                {getChangeIcon(cp)}
                                {cp >= 0 ? '+' : ''}{fmt(cp)}%
                              </span>
                            )}
                            {item.volume != null && (
                              <span className="text-[10px] text-[#5C6883]">Vol: {fmtCompact(item.volume)}</span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className={`w-4 h-4 shrink-0 transition-opacity ${
                          isSelected ? 'opacity-100 text-[#D4A657]' : 'opacity-0'
                        }`} />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div ref={resultsRef}>
            <AnimatePresence mode="wait">
              {isSearching ? (
                results.length === 0 && !searchLoading ? (
                  <motion.div
                    key="no-results"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="py-14 text-center rounded-[4px] bg-[#0B111C] border border-[#1B2438]">
                      <BarChart3 className="mx-auto mb-3 h-8 w-8 text-[#5C6883]" />
                      <p className="text-sm text-[#8E9AB5]">
                        No stocks found{query ? ` for "${query}"` : ''}{activeSector ? ` in ${activeSector}` : ''}
                      </p>
                      <p className="text-xs text-[#5C6883] mt-1">Try a different search term or sector</p>
                    </div>
                  </motion.div>
                ) : null
              ) : (
                <motion.div
                  key="popular-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#D4A657]" />
                      <p className="text-xs font-bold uppercase tracking-wider text-[#8E9AB5]">Popular Stocks</p>
                    </div>
                    <p className="text-[10px] text-[#5C6883]">Click any stock for full analysis</p>
                  </div>

                  {popularLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-40 rounded-[4px] bg-[#1B2438]/60 animate-pulse" />
                      ))}
                    </div>
                  ) : popularStocks.length === 0 ? (
                    <div className="py-14 text-center rounded-[4px] bg-[#0B111C] border border-[#1B2438]">
                      <Activity className="mx-auto mb-3 h-8 w-8 text-[#5C6883]" />
                      <p className="text-sm text-[#8E9AB5]">Popular stocks unavailable</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {popularStocks.map((stock, i) => {
                        const cp = stock.change_percent;
                        const up = cp != null && cp >= 0;
                        return (
                          <motion.div
                            key={stock.symbol}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            onClick={() => handleSelect(stock.symbol)}
                            className="nx-panel-card group cursor-pointer p-4"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] text-xs font-bold border ${
                                    up ? 'border-[#39B58C]/30 bg-[#39B58C]/10 text-[#39B58C]' : 'border-[#DD6455]/30 bg-[#DD6455]/10 text-[#DD6455]'
                                  }`}>
                                    {stock.short_symbol.charAt(0)}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-[#EBEEF4] group-hover:text-[#D4A657] transition-colors truncate">{stock.short_symbol}</p>
                                    <p className="text-xs text-[#5C6883] truncate">{stock.company_name}</p>
                                  </div>
                                </div>
                              </div>
                              <span className={`flex shrink-0 items-center gap-1 rounded-[3px] border px-2 py-1 text-xs font-semibold ${
                                up ? 'border-[#39B58C]/30 bg-[#39B58C]/10 text-[#39B58C]' : 'border-[#DD6455]/30 bg-[#DD6455]/10 text-[#DD6455]'
                              }`}>
                                {getChangeIcon(cp)}
                                {cp != null ? `${cp >= 0 ? '+' : ''}${fmt(cp)}%` : '—'}
                              </span>
                            </div>

                            <div className="mt-4 flex items-end justify-between gap-2 border-t border-[#1B2438] pt-3">
                              <div>
                                <p className="text-[11px] text-[#5C6883]">Price</p>
                                <p className="mt-0.5 text-2xl font-medium text-[#EBEEF4] whitespace-nowrap" style={SERIF}>
                                  {stock.price != null ? <AnimatedNumber value={stock.price} prefix="₹" decimals={2} /> : '—'}
                                </p>
                              </div>
                              {stock.market_cap != null && (
                                <p className="text-[11px] text-[#5C6883]">MCap {fmtMarketCap(stock.market_cap)}</p>
                              )}
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <SectorBadge sector={stock.sector || stock.industry || 'N/A'} />
                              <span className="flex items-center gap-1 text-[11px] font-medium text-[#D4A657] opacity-0 group-hover:opacity-100 transition-all duration-300">
                                View Analysis <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}