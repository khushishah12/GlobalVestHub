'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, TrendingUp, TrendingDown, Loader2, ExternalLink,
  Clock, BookOpen, Newspaper, BarChart3, LineChart, Target,
  PieChart, Wallet, Info, Search, Shield, ShieldAlert,
  Building2, Globe, Activity, Zap, DollarSign, Percent,
  BarChartHorizontal, CheckCircle2, AlertTriangle, X,
} from 'lucide-react';
import PageTransition from '../../../../components/dashboard/PageTransition';
import GlassCard from '../../../../components/dashboard/GlassCard';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChartItem { timeframe: string; chartUrl: string | null }

interface Fundamentals {
  previous_close: number | null; open: number | null;
  day_range: { low: number | null; high: number | null };
  week_52_range: { low: number | null; high: number | null };
  volume: number | null; avg_volume: number | null;
  market_cap: number | null; beta: number | null;
  pe_ratio: number | null; eps: number | null;
  earnings_date: string | null; forward_dividend_yield: string | null;
  ex_dividend_date: string | null; target_est: number | null;
}

interface NewsItem { title: string; source: string; link: string; time: string | null; summary: string | null; type: string }
interface FilingItem { title: string; type: string; date: string | null; url: string | null }

interface AnalystData {
  price_target: { high: number | null; median: number | null; low: number | null };
  recommendation: { strong_buy: number; buy: number; hold: number; sell: number; strong_sell: number };
}

interface Statistics {
  market_cap: number | null; enterprise_value: number | null;
  trailing_pe: number | null; forward_pe: number | null;
  peg_ratio: number | null; price_sales: number | null;
  price_book: number | null; ev_revenue: number | null; ev_ebitda: number | null;
}

interface Financials {
  profit_margin: number | null; return_on_assets: number | null;
  return_on_equity: number | null; revenue: number | null;
  net_income: number | null; diluted_eps: number | null;
  total_cash: number | null; total_debt_equity: number | null;
  levered_free_cash_flow: number | null;
}

interface StockDetail {
  symbol: string; short_symbol: string; exchange: string;
  company_name: string; sector: string; industry: string;
  price: number | null; change: number | null; change_percent: number | null;
  market_status: string; description: string | null;
  charts: ChartItem[]; fundamentals: Fundamentals;
  news: NewsItem[]; filings: FilingItem[];
  performance: { week_52_high: number | null; week_52_low: number | null };
  earnings_charts: { eps_trend_url: string | null; revenue_vs_net_income_url: string | null };
  analysts: AnalystData; statistics: Statistics; financials: Financials;
}

type Tab = 'overview' | 'fundamentals' | 'analyst' | 'patterns' | 'news';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const TIMEFRAMES = ['1D', '5D', '1M', '6M', '1Y', '5Y', 'MAX'] as const;

function fmt(n: number | null, digits = 2): string {
  if (n == null) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtCurrency(n: number | null): string {
  if (n == null) return '—';
  if (Math.abs(n) >= 1e14) return `₹${(n / 1e14).toFixed(2)}T`;
  if (Math.abs(n) >= 1e12) return `₹${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `₹${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  return `₹${n.toLocaleString()}`;
}

function fmtVolume(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(2)}L`;
  return n.toLocaleString();
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function pctColor(v: number | null | undefined): string {
  if (v == null) return 'text-slate-400';
  return v >= 0 ? 'text-emerald-400' : 'text-rose-400';
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="group relative rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-4 hover:border-white/[0.12] transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="text-base font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, cls = '' }: { label: string; value: string; cls?: string }) {
  return (
    <div className={`flex justify-between border-b border-white/[0.04] py-2.5 text-sm ${cls}`}>
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function SectionHeader({ icon, label, badge }: { icon: React.ReactNode; label: string; badge?: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
        {icon}
      </div>
      <h2 className="text-base font-bold text-white">{label}</h2>
      {badge && (
        <span className="rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[11px] font-medium text-slate-400">{badge}</span>
      )}
    </div>
  );
}

function TabButton({ active, label, count, onClick }: { active: boolean; label: string; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
        active
          ? 'text-cyan-300'
          : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {label}
      {count != null && (
        <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
          active ? 'bg-cyan-500/15 text-cyan-300' : 'bg-white/[0.04] text-slate-500'
        }`}>
          {count}
        </span>
      )}
      {active && (
        <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-cyan-400" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ChartDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params?.symbol as string;

  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTf, setActiveTf] = useState('1D');
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  /* ---- Search ---- */
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* ---- Patterns ---- */
  const [patternsData, setPatternsData] = useState<{ patterns: any[]; timeframe_data: Record<string, { timestamps: string[]; close: number[] }> } | null>(null);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [showPatternOverlay, setShowPatternOverlay] = useState(false);
  const [overlayChartUrl, setOverlayChartUrl] = useState<string | null>(null);
  const [overlayLoading, setOverlayLoading] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 1) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
      if (res.ok) { const data = await res.json(); setSearchResults(data); setSelectedIdx(-1); }
    } catch { /* ignore */ }
    setSearchLoading(false);
  }, []);

  const navigateTo = (sym: string) => {
    setSearchQuery(''); setSearchResults([]);
    router.push(`/dashboard/chart/${sym}`);
  };

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((p) => Math.min(p + 1, searchResults.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((p) => Math.max(p - 1, -1)); }
    if (e.key === 'Enter' && selectedIdx >= 0 && searchResults[selectedIdx]) { navigateTo(searchResults[selectedIdx].symbol); }
    if (e.key === 'Escape') { setSearchResults([]); setSearchQuery(''); setIsFocused(false); }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(searchQuery), 150);
  }, [searchQuery, doSearch]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchResults([]);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    fetch(`/api/stocks/${encodeURIComponent(symbol)}/detail`)
      .then((r) => r.json())
      .then((data) => { if (data.error) throw new Error(data.error); setDetail(data); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    setPatternsLoading(true);
    fetch(`/api/stocks/${encodeURIComponent(symbol)}/patterns`)
      .then((r) => r.json())
      .then((data) => { if (data.patterns) setPatternsData(data); if (data.patterns && data.patterns.length > 0) setShowPatternOverlay(false); })
      .catch(() => {})
      .finally(() => setPatternsLoading(false));
  }, [symbol]);

  useEffect(() => {
    if (!showPatternOverlay || !symbol) { setOverlayChartUrl(null); return; }
    setOverlayLoading(true);
    const tfPatterns = patternsData?.patterns.filter((p) => p.detected_on_timeframe === activeTf) || [];
    const body: any = { timeframe: activeTf };
    if (tfPatterns.length > 0) body.patterns = tfPatterns;
    fetch(`/api/stocks/${encodeURIComponent(symbol)}/visualize`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((data) => { if (data.chart_url) setOverlayChartUrl(data.chart_url); })
      .catch(() => {})
      .finally(() => setOverlayLoading(false));
  }, [showPatternOverlay, symbol, activeTf, patternsData]);

  /* ---- Loading / Error ---- */
  if (loading) {
    return (
      <PageTransition>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
            <p className="text-sm text-slate-400">Generating report for {symbol}...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error || !detail) {
    return (
      <PageTransition>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
          <div className="rounded-full bg-rose-500/10 p-4"><AlertTriangle className="h-8 w-8 text-rose-400" /></div>
          <p className="text-rose-400">{error || 'Stock not found'}</p>
          <button onClick={() => router.back()} className="text-sm text-cyan-400 hover:underline">Go back</button>
        </div>
      </PageTransition>
    );
  }

  const { fundamentals: f, analysts: a, statistics: s, financials: fin } = detail;
  const isUp = (detail.change_percent ?? 0) >= 0;
  const isOpen = detail.market_status === 'OPEN';
  const activeChart = detail.charts.find((c) => c.timeframe === activeTf);

  const patternCount = patternsData?.patterns.length ?? 0;
  const newsCount = detail.news.length;
  const recTotal = Object.values(a.recommendation).reduce((sum, v) => sum + (v ?? 0), 0);

  return (
    <PageTransition>
      <div className="flex justify-center p-[10px]">
      <div style={{ width: '90%', maxWidth: '1400px' }}>
      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  SEARCH BAR (markets-page style)                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="h-[30px]" />
      <div className="mb-6 flex items-center gap-4" ref={searchRef}>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="relative flex-1 max-w-xl ml-auto">
          <div className={`flex items-center gap-4 px-5 py-3.5 border transition-all duration-300 rounded-xl ${
            isFocused
              ? 'border-cyan-500/40 bg-white/[0.06] shadow-[0_0_24px_rgba(0,229,255,0.08)] shadow-lg'
              : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.04]'
          } ${searchResults.length > 0 ? 'rounded-b-none border-b-0' : ''}`}>
            <Search className={`w-5 h-5 shrink-0 transition-colors duration-300 ${
              isFocused ? 'text-cyan-400' : 'text-slate-500'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleSearchKey}
              placeholder="Search stocks, e.g. TCS, RELIANCE, INFY..."
              className="flex-1 bg-transparent text-base text-white placeholder-slate-600 outline-none"
              suppressHydrationWarning
            />
            <div className="flex items-center gap-2 shrink-0">
              {searchLoading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 rounded-full hover:bg-white/[0.08] transition">
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] text-[10px] font-mono text-slate-600 border border-white/[0.06]">
                ⌘K
              </kbd>
            </div>
          </div>

          {searchResults.length > 0 && searchQuery && (
            <div className={`border border-t-0 rounded-b-2xl overflow-hidden transition-all duration-300 ${
              isFocused
                ? 'border-cyan-500/40 bg-white/[0.06] shadow-[0_8px_24px_rgba(0,229,255,0.06)]'
                : 'border-white/[0.08] bg-white/[0.03]'
            }`}>
              <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06]">
                <p className="text-[11px] text-slate-500">
                  {searchLoading ? 'Searching...' : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}
                </p>
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="text-[11px] text-slate-500 hover:text-slate-300 transition flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear
                </button>
              </div>
              <div className="divide-y divide-white/[0.04] max-h-[420px] overflow-y-auto">
                {searchResults.map((r, i) => {
                  const cp = r.change_percent;
                  const up = cp != null && cp >= 0;
                  return (
                    <button
                      key={r.symbol}
                      onClick={() => navigateTo(r.symbol)}
                      onMouseEnter={() => setSelectedIdx(i)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-150 ${
                        i === selectedIdx
                          ? 'bg-cyan-500/8 border-l-2 border-l-cyan-400'
                          : 'border-l-2 border-l-transparent hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 text-xs font-bold border ${
                        i === selectedIdx ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-300' : 'bg-white/[0.04] border-white/[0.06] text-slate-400'
                      }`}>
                        {r.short_symbol?.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">{r.short_symbol}</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.04] text-slate-500 border border-white/[0.06]">{r.exchange}</span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">{r.company_name}</p>
                      </div>
                      {cp != null && (
                        <div className={`text-right shrink-0 ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                          <p className="text-sm font-bold">{cp >= 0 ? '+' : ''}{cp.toFixed(2)}%</p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {searchResults.length === 0 && searchQuery && !searchLoading && (
            <div className="border border-t-0 rounded-b-2xl bg-white/[0.03] border-white/[0.08]">
              <p className="py-6 text-center text-xs text-slate-500">No stocks found</p>
            </div>
          )}
        </div>
      </div>
      <div className="h-[30px]" />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  HERO SECTION — Full-width strip with stock identity       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div
        className="relative mb-8 overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900"
      >
        {/* Decorative glow */}
        <div className={`pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full opacity-20 blur-[100px] ${
          isUp ? 'bg-emerald-500' : 'bg-rose-500'
        }`} />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-60 w-60 rounded-full bg-cyan-500/10 blur-[80px]" />

        <div className="relative mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            {/* Left: Identity */}
            <div className="flex items-center gap-5">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold shadow-lg ${
                isUp
                  ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-300'
                  : 'bg-gradient-to-br from-rose-500/20 to-rose-600/10 text-rose-300'
              }`}>
                {detail.short_symbol?.slice(0, 2)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{detail.short_symbol}</h1>
                  <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-slate-400">{detail.exchange}</span>
                  <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-slate-400">{detail.sector}</span>
                  <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                    isOpen
                      ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                      : 'border border-slate-500/20 bg-slate-500/10 text-slate-400'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                    {detail.market_status}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-400 md:text-base">{detail.company_name}</p>
              </div>
            </div>

            {/* Right: Price + Change */}
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-3">
                <p className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                  ₹{fmt(detail.price)}
                </p>
                <div className={`flex items-center gap-1 rounded-xl px-3 py-1.5 ${
                  isUp ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                }`}>
                  {isUp
                    ? <TrendingUp className="h-4 w-4 text-emerald-400" />
                    : <TrendingDown className="h-4 w-4 text-rose-400" />
                  }
                  <span className={`text-sm font-bold ${pctColor(detail.change_percent)}`}>
                    {detail.change != null && `${detail.change >= 0 ? '+' : ''}${detail.change.toFixed(2)}`}
                    {' '}
                    ({detail.change_percent != null ? `${detail.change_percent >= 0 ? '+' : ''}${detail.change_percent.toFixed(2)}%` : '—'})
                  </span>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {detail.industry} · {detail.exchange}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  KPI QUICK STATS ROW                                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<DollarSign className="h-4 w-4 text-emerald-300" />}
          label="Market Cap"
          value={fmtCurrency(f.market_cap)}
          accent="bg-emerald-500/10"
        />
        <KpiCard
          icon={<BarChartHorizontal className="h-4 w-4 text-cyan-300" />}
          label="P/E Ratio"
          value={f.pe_ratio != null ? fmt(f.pe_ratio) : '—'}
          accent="bg-cyan-500/10"
        />
        <KpiCard
          icon={<Activity className="h-4 w-4 text-violet-300" />}
          label="Volume"
          value={fmtVolume(f.volume)}
          accent="bg-violet-500/10"
        />
        <KpiCard
          icon={<Target className="h-4 w-4 text-amber-300" />}
          label="1Y Target Est."
          value={f.target_est != null ? fmtCurrency(f.target_est) : '—'}
          accent="bg-amber-500/10"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  TAB NAV                                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="mb-6 flex items-center gap-3 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-1">
        <TabButton active={activeTab === 'overview'} label="Overview" onClick={() => setActiveTab('overview')} />
        <TabButton active={activeTab === 'fundamentals'} label="Fundamentals" onClick={() => setActiveTab('fundamentals')} />
        <TabButton active={activeTab === 'analyst'} label="Analyst" onClick={() => setActiveTab('analyst')} />
        <TabButton active={activeTab === 'patterns'} label="Patterns" count={patternCount} onClick={() => setActiveTab('patterns')} />
        <TabButton active={activeTab === 'news'} label="News" count={newsCount} onClick={() => setActiveTab('news')} />
        <div className="ml-auto flex items-center gap-2 px-3">
          {detail.description && (
            <a href="#about" onClick={() => setActiveTab('overview')} className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">About</a>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  TAB: OVERVIEW                                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Chart */}
          <div className="h-[30px]" />
          <GlassCard accent="neutral">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <SectionHeader icon={<LineChart className="h-4 w-4 text-cyan-300" />} label="Price Chart" badge={activeTf} />
              <div className="flex flex-wrap items-center gap-1.5">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => { setActiveTf(tf); setShowPatternOverlay(false); }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      activeTf === tf && !showPatternOverlay
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
                {patternsData && patternsData.patterns.some((p) => p.detected_on_timeframe === activeTf) && (
                  <button
                    onClick={() => setShowPatternOverlay(!showPatternOverlay)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      showPatternOverlay
                        ? 'border border-amber-500/40 bg-amber-500/20 text-amber-300'
                        : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {showPatternOverlay ? 'Hide' : `Patterns (${patternsData.patterns.filter((p) => p.detected_on_timeframe === activeTf).length})`}
                  </button>
                )}
              </div>
            </div>
            <div className="flex min-h-[420px] items-center justify-center rounded-lg bg-slate-950/50 p-4">
              {(overlayLoading || patternsLoading) && <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />}
              {!overlayLoading && !patternsLoading && showPatternOverlay && overlayChartUrl && (
                <img src={overlayChartUrl} alt={`${symbol} ${activeTf} with patterns`} className="max-h-[500px] w-full rounded-lg object-contain" />
              )}
              {!overlayLoading && !patternsLoading && (!showPatternOverlay || !overlayChartUrl) && activeChart?.chartUrl && (
                <img src={activeChart.chartUrl} alt={`${detail.short_symbol} ${activeTf} chart`} className="max-h-[500px] w-full rounded-lg object-contain" />
              )}
              {!overlayLoading && !patternsLoading && (!activeChart?.chartUrl && !overlayChartUrl) && (
                <p className="text-sm text-slate-500">Chart not available for {activeTf}</p>
              )}
            </div>
          </GlassCard>
          <div className="h-[30px]" />

          {/* Key Fundamentals in a 2-col grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <GlassCard accent="neutral">
              <SectionHeader icon={<BookOpen className="h-4 w-4 text-cyan-300" />} label="Key Fundamentals" />
              <div>
                <InfoRow label="Previous Close" value={f.previous_close != null ? fmtCurrency(f.previous_close) : '—'} />
                <InfoRow label="Open" value={f.open != null ? fmtCurrency(f.open) : '—'} />
                <InfoRow label="Day's Range" value={f.day_range.low != null && f.day_range.high != null ? `${fmtCurrency(f.day_range.low)} — ${fmtCurrency(f.day_range.high)}` : '—'} />
                <InfoRow label="52 Week Range" value={f.week_52_range.low != null && f.week_52_range.high != null ? `${fmtCurrency(f.week_52_range.low)} — ${fmtCurrency(f.week_52_range.high)}` : '—'} />
                <InfoRow label="52W High/Low" value={detail.price != null && detail.performance.week_52_high != null && detail.performance.week_52_high > 0 ? `${((detail.price / detail.performance.week_52_high) * 100).toFixed(1)}% of 52W High` : '—'} />
              </div>
            </GlassCard>

            <GlassCard accent="neutral">
              <SectionHeader icon={<BarChart3 className="h-4 w-4 text-cyan-300" />} label="Valuation" />
              <div>
                <InfoRow label="Market Cap" value={fmtCurrency(s.market_cap)} />
                <InfoRow label="Enterprise Value" value={fmtCurrency(s.enterprise_value)} />
                <InfoRow label="Trailing P/E" value={s.trailing_pe != null ? fmt(s.trailing_pe) : '—'} />
                <InfoRow label="Forward P/E" value={s.forward_pe != null ? fmt(s.forward_pe) : '—'} />
                <InfoRow label="PEG Ratio (5yr)" value={s.peg_ratio != null ? fmt(s.peg_ratio) : '—'} />
              </div>
            </GlassCard>
          </div>

          {/* Earnings Charts */}
          <GlassCard accent="neutral">
            <SectionHeader icon={<LineChart className="h-4 w-4 text-cyan-300" />} label="Earnings Trends" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">EPS Trend</h3>
                <div className="flex min-h-[200px] items-center justify-center rounded-lg bg-slate-950/50">
                  {detail.earnings_charts.eps_trend_url
                    ? <img src={detail.earnings_charts.eps_trend_url} alt="EPS Trend" className="w-full rounded-lg" />
                    : <p className="text-xs text-slate-500">Not Provided</p>
                  }
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Revenue vs Net Income</h3>
                <div className="flex min-h-[200px] items-center justify-center rounded-lg bg-slate-950/50">
                  {detail.earnings_charts.revenue_vs_net_income_url
                    ? <img src={detail.earnings_charts.revenue_vs_net_income_url} alt="Revenue vs Net Income" className="w-full rounded-lg" />
                    : <p className="text-xs text-slate-500">Not Provided</p>
                  }
                </div>
              </div>
            </div>
          </GlassCard>

          {/* About */}
          {detail.description && (
            <GlassCard accent="neutral" id="about">
              <SectionHeader icon={<Info className="h-4 w-4 text-cyan-300" />} label="About" />
              <p className="text-sm leading-relaxed text-slate-300">{detail.description}</p>
            </GlassCard>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  TAB: FUNDAMENTALS                                        */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'fundamentals' && (
        <div className="space-y-6">
          <GlassCard accent="neutral">
            <SectionHeader icon={<BookOpen className="h-4 w-4 text-cyan-300" />} label="Trading Data" />
            <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
              <div>
                <InfoRow label="Previous Close" value={f.previous_close != null ? fmtCurrency(f.previous_close) : '—'} />
                <InfoRow label="Open" value={f.open != null ? fmtCurrency(f.open) : '—'} />
                <InfoRow label="Day's Range" value={f.day_range.low != null && f.day_range.high != null ? `${fmtCurrency(f.day_range.low)} — ${fmtCurrency(f.day_range.high)}` : '—'} />
                <InfoRow label="52 Week Range" value={f.week_52_range.low != null && f.week_52_range.high != null ? `${fmtCurrency(f.week_52_range.low)} — ${fmtCurrency(f.week_52_range.high)}` : '—'} />
              </div>
              <div>
                <InfoRow label="Volume" value={fmtVolume(f.volume)} />
                <InfoRow label="Avg. Volume" value={fmtVolume(f.avg_volume)} />
                <InfoRow label="Market Cap (intraday)" value={fmtCurrency(f.market_cap)} />
                <InfoRow label="Beta (5Y Monthly)" value={f.beta != null ? fmt(f.beta) : '—'} />
              </div>
            </div>
          </GlassCard>

          <GlassCard accent="neutral">
            <SectionHeader icon={<Percent className="h-4 w-4 text-cyan-300" />} label="Per Share Data" />
            <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
              <div>
                <InfoRow label="PE Ratio (TTM)" value={f.pe_ratio != null ? fmt(f.pe_ratio) : '—'} />
                <InfoRow label="EPS (TTM)" value={f.eps != null ? fmtCurrency(f.eps) : '—'} />
                <InfoRow label="Earnings Date (est.)" value={fmtDate(f.earnings_date)} />
              </div>
              <div>
                <InfoRow label="Forward Dividend &amp; Yield" value={f.forward_dividend_yield ?? '—'} />
                <InfoRow label="Ex-Dividend Date" value={fmtDate(f.ex_dividend_date)} />
                <InfoRow label="1y Target Est" value={f.target_est != null ? fmtCurrency(f.target_est) : '—'} />
              </div>
            </div>
          </GlassCard>

          <div className="grid gap-6 md:grid-cols-2">
            <GlassCard accent="neutral">
              <SectionHeader icon={<PieChart className="h-4 w-4 text-cyan-300" />} label="Statistics" />
              <div>
                <InfoRow label="Market Cap" value={fmtCurrency(s.market_cap)} />
                <InfoRow label="Enterprise Value" value={fmtCurrency(s.enterprise_value)} />
                <InfoRow label="Trailing P/E" value={s.trailing_pe != null ? fmt(s.trailing_pe) : '—'} />
                <InfoRow label="Forward P/E" value={s.forward_pe != null ? fmt(s.forward_pe) : '—'} />
                <InfoRow label="PEG Ratio (5yr)" value={s.peg_ratio != null ? fmt(s.peg_ratio) : '—'} />
                <InfoRow label="Price/Sales (ttm)" value={s.price_sales != null ? fmt(s.price_sales) : '—'} />
                <InfoRow label="Price/Book (mrq)" value={s.price_book != null ? fmt(s.price_book) : '—'} />
              </div>
            </GlassCard>

            <GlassCard accent="neutral">
              <SectionHeader icon={<Wallet className="h-4 w-4 text-cyan-300" />} label="Financial Highlights" />
              <div>
                <InfoRow label="Profit Margin" value={fin.profit_margin != null ? `${(fin.profit_margin * 100).toFixed(2)}%` : '—'} />
                <InfoRow label="Return on Assets" value={fin.return_on_assets != null ? `${(fin.return_on_assets * 100).toFixed(2)}%` : '—'} />
                <InfoRow label="Return on Equity" value={fin.return_on_equity != null ? `${(fin.return_on_equity * 100).toFixed(2)}%` : '—'} />
                <InfoRow label="Revenue (ttm)" value={fmtCurrency(fin.revenue)} />
                <InfoRow label="Net Income (ttm)" value={fmtCurrency(fin.net_income)} />
                <InfoRow label="Diluted EPS (ttm)" value={fin.diluted_eps != null ? fmtCurrency(fin.diluted_eps) : '—'} />
                <InfoRow label="Total Cash (mrq)" value={fmtCurrency(fin.total_cash)} />
                <InfoRow label="Total Debt/Equity" value={fin.total_debt_equity != null ? fmt(fin.total_debt_equity) : '—'} />
                <InfoRow label="Levered Free Cash Flow" value={fmtCurrency(fin.levered_free_cash_flow)} />
              </div>
            </GlassCard>
          </div>

          {/* Performance */}
          <GlassCard accent="neutral">
            <SectionHeader icon={<BarChart3 className="h-4 w-4 text-cyan-300" />} label="Performance" />
            <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
              <InfoRow label="52W High" value={detail.performance.week_52_high != null ? fmtCurrency(detail.performance.week_52_high) : '—'} />
              <InfoRow label="52W Low" value={detail.performance.week_52_low != null ? fmtCurrency(detail.performance.week_52_low) : '—'} />
            </div>
          </GlassCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  TAB: ANALYST                                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'analyst' && (
        <div className="grid gap-6 md:grid-cols-2">
          <GlassCard accent="neutral">
            <SectionHeader icon={<Target className="h-4 w-4 text-cyan-300" />} label="Price Target" />
            <div className="space-y-1">
              <InfoRow label="High" value={a.price_target.high != null ? fmtCurrency(a.price_target.high) : '—'} />
              <InfoRow label="Median" value={a.price_target.median != null ? fmtCurrency(a.price_target.median) : '—'} />
              <InfoRow label="Low" value={a.price_target.low != null ? fmtCurrency(a.price_target.low) : '—'} />
            </div>
            {/* Price target gauge */}
            {a.price_target.high != null && a.price_target.low != null && detail.price != null && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Price Position</p>
                <div className="relative h-2 rounded-full bg-white/[0.06]">
                  <div
                    className="absolute h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500"
                    style={{
                      left: '0%',
                      right: '0%',
                    }}
                  />
                  <div
                    className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900 shadow-lg"
                    style={{
                      left: `${Math.min(100, Math.max(0, ((detail.price - a.price_target.low) / (a.price_target.high - a.price_target.low)) * 100))}%`,
                    }}
                  >
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-white font-medium">
                      ₹{fmt(detail.price)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-between text-[10px] text-slate-500">
                  <span>Low: {fmtCurrency(a.price_target.low)}</span>
                  <span>Median: {fmtCurrency(a.price_target.median)}</span>
                  <span>High: {fmtCurrency(a.price_target.high)}</span>
                </div>
              </div>
            )}
          </GlassCard>

          <GlassCard accent="neutral">
            <SectionHeader icon={<BarChart3 className="h-4 w-4 text-cyan-300" />} label="Recommendation Breakdown" />
            <div className="space-y-1">
              <InfoRow label="Strong Buy" value={String(a.recommendation.strong_buy ?? 0)} cls="text-emerald-400" />
              <InfoRow label="Buy" value={String(a.recommendation.buy ?? 0)} cls="text-emerald-300" />
              <InfoRow label="Hold" value={String(a.recommendation.hold ?? 0)} cls="text-amber-300" />
              <InfoRow label="Sell" value={String(a.recommendation.sell ?? 0)} cls="text-rose-300" />
              <InfoRow label="Strong Sell" value={String(a.recommendation.strong_sell ?? 0)} cls="text-rose-400" />
            </div>
            {/* Recommendation bar */}
            {recTotal > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Analyst Consensus</p>
                <div className="flex h-3 overflow-hidden rounded-full">
                  {a.recommendation.strong_buy ? <div className="bg-emerald-400 transition-all" style={{ width: `${(a.recommendation.strong_buy / recTotal) * 100}%` }} /> : null}
                  {a.recommendation.buy ? <div className="bg-emerald-300 transition-all" style={{ width: `${(a.recommendation.buy / recTotal) * 100}%` }} /> : null}
                  {a.recommendation.hold ? <div className="bg-amber-300 transition-all" style={{ width: `${(a.recommendation.hold / recTotal) * 100}%` }} /> : null}
                  {a.recommendation.sell ? <div className="bg-rose-300 transition-all" style={{ width: `${(a.recommendation.sell / recTotal) * 100}%` }} /> : null}
                  {a.recommendation.strong_sell ? <div className="bg-rose-400 transition-all" style={{ width: `${(a.recommendation.strong_sell / recTotal) * 100}%` }} /> : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                  {a.recommendation.strong_buy ? <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> SB {a.recommendation.strong_buy}</span> : null}
                  {a.recommendation.buy ? <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-300" /> B {a.recommendation.buy}</span> : null}
                  {a.recommendation.hold ? <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-300" /> H {a.recommendation.hold}</span> : null}
                  {a.recommendation.sell ? <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-300" /> S {a.recommendation.sell}</span> : null}
                  {a.recommendation.strong_sell ? <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" /> SS {a.recommendation.strong_sell}</span> : null}
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  TAB: PATTERNS                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'patterns' && (
        <GlassCard accent="neutral">
          <SectionHeader icon={<Shield className="h-4 w-4 text-cyan-300" />} label="Chart Pattern Detection" badge={`${patternCount} patterns`} />

          {patternsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              <span className="ml-2 text-sm text-slate-400">Scanning patterns...</span>
            </div>
          )}

          {!patternsLoading && patternCount === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="mb-3 h-10 w-10 text-slate-500" />
              <p className="text-sm text-slate-400">No chart patterns detected in the analyzed timeframes.</p>
            </div>
          )}

          {!patternsLoading && patternsData && patternCount > 0 && (
            <div className="space-y-3">
              {patternsData.patterns.map((p, i) => (
                <div key={i} className="rounded-xl border border-white/[0.06] bg-gradient-to-r from-white/[0.02] to-transparent p-5 transition hover:border-white/[0.10]">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white">{p.pattern_name}</span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                      p.risk_level === 'Low' ? 'bg-emerald-500/10 text-emerald-400'
                        : p.risk_level === 'Medium' ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}>{p.risk_level} Risk</span>
                    <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300">{p.confidence_percent}% Confidence</span>
                    <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">{p.category}</span>
                    <span className="text-[10px] text-slate-500">{p.detected_on_timeframe}</span>
                  </div>
                  <p className="text-sm text-slate-400">{p.explanation}</p>
                  {(p.theoretical_target_price != null || p.stoploss != null) && (
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      {p.theoretical_target_price != null && (
                        <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1 text-emerald-300">
                          <TrendingUp className="h-3.5 w-3.5" />
                          Target: ₹{p.theoretical_target_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                      {p.stoploss != null && (
                        <span className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-1 text-rose-300">
                          <Shield className="h-3.5 w-3.5" />
                          Stop: ₹{p.stoploss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-2 flex gap-2 text-[10px] text-slate-500">
                    {p.suitable_for_intraday && <span className="rounded bg-white/5 px-2 py-0.5">Intraday ✓</span>}
                    {p.suitable_for_swing && <span className="rounded bg-white/5 px-2 py-0.5">Swing ✓</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  TAB: NEWS                                                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'news' && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* News */}
          <div className="md:col-span-2">
            <GlassCard accent="neutral">
              <SectionHeader icon={<Newspaper className="h-4 w-4 text-cyan-300" />} label="Recent News" badge={`${newsCount} articles`} />
              {newsCount === 0 && <p className="text-sm text-slate-500">No recent news available.</p>}
              {newsCount > 0 && (
                <div className="space-y-3">
                  {detail.news.slice(0, 8).map((n, i) => (
                    <div key={i} className="rounded-xl border border-white/[0.06] bg-gradient-to-r from-white/[0.02] to-transparent p-4 transition hover:border-white/[0.10]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <a href={n.link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white transition hover:text-cyan-300">
                            {n.title}
                          </a>
                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> {n.source}
                            </span>
                            {n.time && <span>{new Date(n.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                            {n.type && <span className="rounded bg-white/5 px-1.5 py-0.5 uppercase">{n.type}</span>}
                          </div>
                          {n.summary && <p className="mt-2 text-xs text-slate-400 line-clamp-2">{n.summary}</p>}
                        </div>
                        <a href={n.link} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg border border-white/10 p-2 transition hover:bg-white/5">
                          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Filings sidebar */}
          <div>
            <GlassCard accent="neutral">
              <SectionHeader icon={<BookOpen className="h-4 w-4 text-cyan-300" />} label="Filings" badge={`${detail.filings.length}`} />
              {detail.filings.length === 0 && <p className="text-sm text-slate-500">No filings available.</p>}
              {detail.filings.length > 0 && (
                <div className="space-y-1">
                  {detail.filings.map((fi, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-white/[0.04]">
                      <div className="flex-1">
                        <p className="text-slate-300 truncate max-w-[180px]">{fi.type || fi.title}</p>
                        <p className="text-[10px] text-slate-500">{fmtDate(fi.date)}</p>
                      </div>
                      {fi.url && (
                        <a href={fi.url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded border border-white/10 p-1.5 transition hover:bg-white/5">
                          <ExternalLink className="h-3 w-3 text-cyan-400" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      )}

      </div>
      </div>
    </PageTransition>
  );
}
