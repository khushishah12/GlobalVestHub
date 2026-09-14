'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, BarChart3, Zap,
  Loader2, Activity, Sparkles, RefreshCw,
  Search, Download, AlertTriangle, Target,
  TrendingUp as TrendUp, Shield, Award,
  Filter, ChevronUp, ChevronDown,
  Clock, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PageTransition from '@/components/dashboard/PageTransition';

/* ── Types ── */

interface Recommendation {
  rank: number;
  symbol: string;
  company: string;
  predicted_return: number;
  confidence: number;
  recommendation: string;
  sector: string;
  industry: string;
  market_cap: number;
  market_cap_category: string;
  price: number;
}

/* ── Config ── */

const REC_LABELS: Record<string, { label: string; color: string; bg: string; border: string; icon: LucideIcon }> = {
  'Strong Buy': { label: 'Strong Buy', color: 'text-[#39B58C]', bg: 'bg-[#39B58C]/10', border: 'border-[#39B58C]/25', icon: TrendingUp },
  'Buy': { label: 'Buy', color: 'text-[#D4A657]', bg: 'bg-[#D4A657]/10', border: 'border-[#D4A657]/25', icon: Activity },
  'Watchlist': { label: 'Watchlist', color: 'text-[#8E9AB5]', bg: 'bg-[#8E9AB5]/10', border: 'border-[#26314A]', icon: Clock },
  'Avoid': { label: 'Avoid', color: 'text-[#DD6455]', bg: 'bg-[#DD6455]/10', border: 'border-[#DD6455]/25', icon: TrendingDown },
};

const SERIF = { fontFamily: 'var(--nx-serif-font), Georgia, serif' };

/* ── Helpers ── */

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);
}

function fmtReturn(n: number): string {
  return `${n >= 0 ? '+' : ''}${fmt(n)}%`;
}

function marketStatus(): 'open' | 'closed' {
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), d = now.getDay();
  if (d === 0 || d === 6) return 'closed';
  const total = h * 60 + m;
  if (total >= 555 && total <= 930) return 'open';
  return 'closed';
}

function getSectors(recos: Recommendation[]): string[] {
  return [...new Set(recos.map(r => r.sector))].filter(Boolean).sort();
}

function clampConfidence(n: number | undefined | null): number {
  if (n == null || !isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/* ── Animated Counter ── */

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = 0;
    const dur = 1200;
    const step = (value - start) / (dur / 16);
    let cur = start;
    const timer = setInterval(() => {
      cur += step;
      if ((step > 0 && cur >= value) || (step < 0 && cur <= value)) { cur = value; clearInterval(timer); }
      setDisplay(Math.round(cur));
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}{suffix}</>;
}

/* ── Stat Card ── */

function StatCard({ icon, label, children, meta, accent }: {
  icon: React.ReactNode; label: string; children: React.ReactNode; meta?: React.ReactNode; accent: 'gold' | 'teal';
}) {
  const chip = accent === 'teal' ? 'bg-[#39B58C]/15 text-[#39B58C]' : 'bg-[#D4A657]/10 text-[#D4A657]';
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

/* ── Simple Bar Chart ── */

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => Math.abs(d.value)), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-20 truncate font-mono text-[11px] text-[#8E9AB5]">{d.label}</span>
          <div className="flex-1">
            <div className="h-[7px] overflow-hidden rounded-full bg-[#1B2438]">
              <div className={`h-full rounded-full ${d.value >= 0 ? 'bg-[#39B58C]/70' : 'bg-[#DD6455]/70'} transition-all duration-500`}
                style={{ width: `${(Math.abs(d.value) / max) * 100}%` }} />
            </div>
          </div>
          <span className={`w-20 text-right font-mono text-xs ${d.value >= 0 ? 'text-[#39B58C]' : 'text-[#DD6455]'}`}>
            {fmtReturn(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Page ── */

export default function StockPickerPage() {
  const [recos, setRecos] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'return' | 'confidence'>('return');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedMcap, setSelectedMcap] = useState<string[]>([]);
  const [selectedRec, setSelectedRec] = useState<string[]>([]);
  const [minReturn, setMinReturn] = useState(-30);
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState<'csv' | null>(null);
  const [nonce, setNonce] = useState(0);

  const PER_PAGE = 10;

  /* ---- Load recommendations ---- */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/stock-picker');
        if (!res.ok) throw new Error('API error');
        const d = await res.json();
        if (!cancelled) setRecos(d.recommendations || []);
      } catch {
        if (!cancelled) setError('Failed to load recommendations');
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [nonce]);

  const filtered = (() => {
    let list = [...recos];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.symbol.toLowerCase().includes(q) || r.company.toLowerCase().includes(q));
    }
    if (selectedSectors.length) list = list.filter(r => selectedSectors.includes(r.sector));
    if (selectedMcap.length) list = list.filter(r => selectedMcap.includes(r.market_cap_category));
    if (selectedRec.length) list = list.filter(r => selectedRec.includes(r.recommendation));
    list = list.filter(r => r.predicted_return >= minReturn);
    list.sort((a, b) => {
      const aVal = sortBy === 'return' ? a.predicted_return : a.confidence;
      const bVal = sortBy === 'return' ? b.predicted_return : b.confidence;
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    return list;
  })();

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  const best = recos[0];
  const status = marketStatus();
  const sectors = getSectors(recos);
  const mcaps = [...new Set(recos.map(r => r.market_cap_category))].filter(Boolean);
  const recTypes = [...new Set(recos.map(r => r.recommendation))].filter(Boolean);

  const total = recos.length;
  const strongBuy = recos.filter(r => r.recommendation === 'Strong Buy').length;
  const avgReturn = total > 0 ? recos.reduce((s, r) => s + r.predicted_return, 0) / total : 0;
  const highest = total > 0 ? Math.max(...recos.map(r => r.predicted_return)) : 0;

  const top10 = recos.slice(0, 10);

  const exportCsv = () => {
    setExporting('csv');
    const header = 'Rank,Symbol,Company,Predicted Return %,Confidence,Recommendation,Sector,Market Cap';
    const rows = recos.map(r => `${r.rank},${r.symbol},"${r.company}",${r.predicted_return},${r.confidence},"${r.recommendation}","${r.sector}","${r.market_cap_category}"`);
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ai-stock-picker.csv'; a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(null), 500);
  };

  const toggleSort = (field: 'return' | 'confidence') => {
    if (sortBy === field) setSortAsc(!sortAsc);
    else { setSortBy(field); setSortAsc(false); }
  };

  return (
    <PageTransition>
      <div className="rounded-[4px] border border-[#1B2438] bg-[#0B111C] px-4 py-8 md:px-8 lg:py-10">
        {/* ──── HEADER ──── */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[3px] border border-[#D4A657]/30 bg-[#D4A657]/10 text-[#D4A657]">
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4A657]/25 bg-[#D4A657]/10 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[#D4A657]">
                  <Sparkles className="w-2.5 h-2.5" /> AI Powered
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-medium text-[#EBEEF4]" style={SERIF}>
                Stock Picker
              </h1>
              <p className="text-sm text-[#8E9AB5]">ML-powered stock recommendations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:flex items-center gap-2 rounded-[3px] border border-[#1B2438] bg-[#0B111C] px-3 py-2 text-xs text-[#5C6883]">
              <span className={`relative flex h-2 w-2`}>
                <span className={`absolute inset-0 rounded-full ${status === 'open' ? 'bg-[#39B58C] animate-ping opacity-40' : 'bg-[#5C6883]'}`} />
                <span className={`relative w-2 h-2 rounded-full ${status === 'open' ? 'bg-[#39B58C]' : 'bg-[#5C6883]'}`} />
              </span>
              Market {status === 'open' ? 'Open' : 'Closed'}
            </span>
            <button
              onClick={() => setNonce(n => n + 1)}
              disabled={loading}
              className="flex items-center gap-2 rounded-[3px] border border-[#1B2438] bg-[#0B111C] px-3.5 py-2 text-xs text-[#8E9AB5] transition hover:border-[#26314A] hover:text-[#EBEEF4] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#D4A657]' : ''}`} /> Refresh
            </button>
          </div>
        </header>

        {/* ──── SUMMARY RACK ──── */}
        <div className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-5">
          <StatCard
            icon={<BarChart3 className="h-4 w-4" />}
            label="Total Stocks"
            accent="gold"
            meta={<span className="w-full text-center text-[12px] font-medium text-[#8E9AB5]">Analyzed</span>}
          >
            {loading ? <StatValue>—</StatValue> : <StatValue><AnimatedNumber value={total} /></StatValue>}
          </StatCard>

          <StatCard
            icon={<TrendUp className="h-4 w-4" />}
            label="Strong Buy"
            accent="teal"
            meta={<span className="w-full text-center text-[12px] font-medium text-[#8E9AB5]">Recommendations</span>}
          >
            {loading ? <StatValue>—</StatValue> : <StatValue><AnimatedNumber value={strongBuy} /></StatValue>}
          </StatCard>

          <StatCard
            icon={<Target className="h-4 w-4" />}
            label="Avg Return"
            accent="gold"
            meta={<span className="w-full text-center text-[12px] font-medium text-[#8E9AB5]">Predicted</span>}
          >
            {loading ? <StatValue>—</StatValue> : (
              <StatValue><span className={avgReturn >= 0 ? 'text-[#39B58C]' : 'text-[#DD6455]'}>{fmtReturn(avgReturn)}</span></StatValue>
            )}
          </StatCard>

          <StatCard
            icon={<Award className="h-4 w-4" />}
            label="Top Return"
            accent="gold"
            meta={<span className="w-full text-center text-[12px] font-medium text-[#8E9AB5]">Highest predicted</span>}
          >
            {loading ? <StatValue>—</StatValue> : (
              <StatValue><span className={highest >= 0 ? 'text-[#39B58C]' : 'text-[#DD6455]'}>{fmtReturn(highest)}</span></StatValue>
            )}
          </StatCard>
        </div>

        {/* ──── BEST OPPORTUNITY ──── */}
        {best && !loading && (
          <div className="mb-10">
            <div className="nx-panel-card overflow-hidden">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 p-6">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[4px] border border-[#D4A657]/30 bg-[#D4A657]/10 text-[#D4A657]">
                    <Award className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-[#D4A657]/30 bg-[#D4A657]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#D4A657]">
                      <Sparkles className="w-3 h-3" /> #1 Pick
                    </div>
                    <h4 className="text-lg font-semibold text-[#EBEEF4]" style={SERIF}>{best.company}</h4>
                    <p className="text-xs text-[#5C6883]">{best.symbol} · {best.sector} · {best.market_cap_category}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                  <div className="text-center">
                    <p className="mb-0.5 text-[10px] uppercase tracking-wider text-[#5C6883]">Predicted Return</p>
                    <p className={`text-2xl font-medium ${best.predicted_return >= 0 ? 'text-[#39B58C]' : 'text-[#DD6455]'}`} style={SERIF}>
                      {fmtReturn(best.predicted_return)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="mb-0.5 text-[10px] uppercase tracking-wider text-[#5C6883]">Confidence</p>
                    <p className="text-2xl font-medium text-[#EBEEF4]" style={SERIF}>{best.confidence}%</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-[#1B2438] bg-[#0B111C] px-4 py-2">
                    <TrendingUp className={`w-4 h-4 ${best.predicted_return >= 0 ? 'text-[#39B58C]' : 'text-[#DD6455]'}`} />
                    <span className="text-xs font-semibold text-[#8E9AB5]">{best.recommendation}</span>
                  </div>
                </div>
              </div>
              <div className="nx-panel-card-meta">
                <p className="nx-panel-name">{best.symbol}</p>
                <p className="nx-panel-chg">AI rank #{best.rank}</p>
              </div>
            </div>
          </div>
        )}

        {/* ──── TOOLBAR ──── */}
        <div className="mt-8 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <div className={`flex items-center gap-4 rounded-[4px] border bg-[#0B111C] px-5 py-3.5 transition-all duration-300 ${
              search ? 'border-[#D4A657]/50 shadow-[0_0_14px_rgba(212,166,87,0.10)]' : 'border-[#26314A] hover:border-[#26314A]'
            }`}>
              <Search className={`w-5 h-5 shrink-0 transition-colors duration-300 ${search ? 'text-[#D4A657]' : 'text-[#5C6883]'}`} />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by symbol or company..."
                className="flex-1 bg-transparent text-sm text-[#EBEEF4] placeholder-[#5C6883] outline-none"
                suppressHydrationWarning
              />
              {search && (
                <button onClick={() => setSearch('')} className="p-1 rounded-full text-[#5C6883] hover:bg-[#1B2438] hover:text-[#EBEEF4] transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 rounded-[3px] border px-3.5 py-2.5 text-xs transition-all duration-200 ${
                showFilters ? 'border-[#D4A657]/50 bg-[#D4A657]/10 text-[#D4A657]' : 'border-[#1B2438] bg-[#0B111C] text-[#8E9AB5] hover:border-[#26314A] hover:text-[#EBEEF4]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" /> Filters
            </button>
            <button
              onClick={exportCsv}
              disabled={exporting === 'csv' || !recos.length}
              className="flex items-center gap-1.5 rounded-[3px] border border-[#1B2438] bg-[#0B111C] px-3.5 py-2.5 text-xs text-[#8E9AB5] transition hover:border-[#26314A] hover:text-[#EBEEF4] disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" /> {exporting === 'csv' ? 'Exporting...' : 'CSV'}
            </button>
          </div>
        </div>

        {/* ──── FILTER PANEL ──── */}
        {showFilters && (
          <div className="mb-8">
            <div className="rounded-[4px] border border-[#1B2438] bg-[#121B2C] p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#EBEEF4]">Filters</h3>
                <button
                  onClick={() => { setSelectedSectors([]); setSelectedMcap([]); setSelectedRec([]); setMinReturn(-30); }}
                  className="text-[11px] text-[#D4A657] hover:text-[#EBEEF4] transition"
                >
                  Reset
                </button>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="mb-2.5 text-[10px] font-medium uppercase tracking-wider text-[#8E9AB5]">Sector</p>
                  <div className="max-h-32 space-y-2 overflow-y-auto pr-1">
                    {sectors.map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selectedSectors.includes(s)}
                          onChange={() => setSelectedSectors(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                          className="h-3.5 w-3.5 rounded border-[#26314A] bg-[#0B111C] accent-[#D4A657]" />
                        <span className="text-[11px] text-[#8E9AB5]">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2.5 text-[10px] font-medium uppercase tracking-wider text-[#8E9AB5]">Market Cap</p>
                  <div className="space-y-2">
                    {mcaps.map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selectedMcap.includes(s)}
                          onChange={() => setSelectedMcap(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                          className="h-3.5 w-3.5 rounded border-[#26314A] bg-[#0B111C] accent-[#D4A657]" />
                        <span className="text-[11px] text-[#8E9AB5]">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2.5 text-[10px] font-medium uppercase tracking-wider text-[#8E9AB5]">Recommendation</p>
                  <div className="space-y-2">
                    {recTypes.map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selectedRec.includes(s)}
                          onChange={() => setSelectedRec(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                          className="h-3.5 w-3.5 rounded border-[#26314A] bg-[#0B111C] accent-[#D4A657]" />
                        <span className="text-[11px] text-[#8E9AB5]">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2.5 text-[10px] font-medium uppercase tracking-wider text-[#8E9AB5]">Min Return: <span className="text-[#D4A657]">{minReturn}%</span></p>
                  <input type="range" min={-30} max={40} value={minReturn} onChange={e => setMinReturn(Number(e.target.value))}
                    className="w-full accent-[#D4A657]" />
                  <div className="mt-1 flex justify-between text-[10px] text-[#5C6883]">
                    <span>-30%</span><span>+40%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──── RANKING TABLE ──── */}
        <div className="mb-10 overflow-hidden rounded-[4px] border border-[#1B2438]">
          <div className="flex items-center justify-between border-b border-[#1B2438] bg-[#121B2C] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#EBEEF4]">Stock Rankings</h2>
            <span className="text-[11px] text-[#5C6883]">{filtered.length} stocks</span>
          </div>
          {loading ? (
            <div className="px-5 py-16 text-center">
              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#D4A657]" />
              <p className="text-xs text-[#5C6883]">Analyzing stocks with AI model...</p>
            </div>
          ) : error ? (
            <div className="px-5 py-16 text-center">
              <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-[#DD6455]" />
              <p className="text-sm text-[#DD6455]">{error}</p>
              <button onClick={() => setNonce(n => n + 1)} className="mt-3 rounded-[3px] border border-[#1B2438] bg-[#0B111C] px-4 py-2 text-xs text-[#8E9AB5] transition hover:border-[#26314A] hover:text-[#EBEEF4]">Retry</button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1B2438] text-[9px] uppercase tracking-wider text-[#5C6883]">
                      <th className="px-5 py-3 w-10">#</th>
                      <th className="px-5 py-3">Symbol</th>
                      <th className="px-5 py-3">Company</th>
                      <th className="px-5 py-3 cursor-pointer select-none" onClick={() => toggleSort('return')}>
                        <span className={`flex items-center gap-1 transition-colors ${sortBy === 'return' ? 'text-[#D4A657]' : ''}`}>
                          Return {sortBy === 'return' ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : ''}
                        </span>
                      </th>
                      <th className="px-5 py-3 cursor-pointer select-none" onClick={() => toggleSort('confidence')}>
                        <span className={`flex items-center gap-1 transition-colors ${sortBy === 'confidence' ? 'text-[#D4A657]' : ''}`}>
                          Confidence {sortBy === 'confidence' ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : ''}
                        </span>
                      </th>
                      <th className="px-5 py-3">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={6} className="px-5 py-12 text-center text-[#5C6883]">No matching stocks</td></tr>
                    ) : paged.map(r => {
                      const cfg = REC_LABELS[r.recommendation] || REC_LABELS['Watchlist'];
                      const Icon = cfg.icon;
                      return (
                        <tr key={r.symbol} className="border-b border-[#1B2438] transition hover:bg-[#1B2438]/40">
                          <td className="px-5 py-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-[3px] border border-[#1B2438] bg-[#0B111C] font-mono text-[10px] text-[#5C6883]">{r.rank}</span>
                          </td>
                          <td className="px-5 py-3 font-mono font-semibold text-[#EBEEF4]">{r.symbol}</td>
                          <td className="px-5 py-3 text-[#8E9AB5]">{r.company}</td>
                          <td className={`px-5 py-3 font-mono font-medium ${r.predicted_return >= 0 ? 'text-[#39B58C]' : 'text-[#DD6455]'}`}>{fmtReturn(r.predicted_return)}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[#1B2438]">
                                <div className={`h-full rounded-full ${clampConfidence(r.confidence) >= 80 ? 'bg-[#39B58C]' : clampConfidence(r.confidence) >= 60 ? 'bg-[#D4A657]' : 'bg-[#DD6455]'}`}
                                  style={{ width: `${clampConfidence(r.confidence)}%` }} />
                              </div>
                              <span className="font-mono text-[#5C6883]">{clampConfidence(r.confidence)}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 ${cfg.border} ${cfg.bg} ${cfg.color}`}>
                              <Icon className="h-2.5 w-2.5" />
                              <span className="text-[10px] font-medium">{cfg.label}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-[#1B2438] px-5 py-4">
                  <span className="text-[11px] text-[#5C6883]">Page {page} of {totalPages}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                      const p = start + i;
                      if (p > totalPages) return null;
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`min-w-[28px] rounded-[3px] px-2 py-1 text-[10px] transition ${p === page ? 'bg-[#D4A657]/15 text-[#D4A657]' : 'text-[#5C6883] hover:bg-[#1B2438] hover:text-[#EBEEF4]'}`}>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ──── TOP 10 CHART ──── */}
        {!loading && recos.length > 0 && (
          <div className="rounded-[4px] border border-[#1B2438] bg-[#121B2C] p-6">
            <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-wider text-[#8E9AB5]">Top 10 Returns</h3>
            <BarChart data={top10.map(r => ({ label: r.symbol, value: r.predicted_return }))} />
          </div>
        )}

        {/* ──── FOOTER ──── */}
        <footer className="mt-10 border-t border-[#1B2438] py-6 text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] text-[#5C6883]">
            <Shield className="h-3 w-3" /> Risk Disclaimer
          </div>
          <p className="mx-auto max-w-xl text-[10px] leading-relaxed text-[#5C6883]">
            Recommendations are generated using machine learning models and are not financial advice.
            Past performance does not guarantee future results. Always do your own research before investing.
          </p>
        </footer>
      </div>
    </PageTransition>
  );
}