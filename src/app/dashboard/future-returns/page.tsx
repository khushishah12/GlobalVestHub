'use client';

import { useState, useEffect, useRef } from 'react';
import {
  TrendingUp, TrendingDown, BarChart3,
  Loader2, Sparkles, RefreshCw,
  Search, AlertTriangle,
  TrendingUp as TrendUp, Shield, Award,
  Filter, X, ChevronDown, ChevronUp,
  Clock, Eye, LineChart, Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PageTransition from '@/components/dashboard/PageTransition';

/* ── Types ── */

interface Prediction {
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

const SERIF = { fontFamily: 'var(--nx-serif-font), Georgia, serif' };

const REC_LABELS: Record<string, { label: string; color: string; bg: string; border: string; stars: number; starLabel: string; icon: LucideIcon }> = {
  'Strong Buy': { label: 'Strong Buy', color: 'text-[#39B58C]', bg: 'bg-[#39B58C]/10', border: 'border-[#39B58C]/25', stars: 5, starLabel: 'Excellent', icon: TrendingUp },
  'Buy':        { label: 'Buy',        color: 'text-[#D4A657]', bg: 'bg-[#D4A657]/10', border: 'border-[#D4A657]/25', stars: 4, starLabel: 'Strong',  icon: TrendUp },
  'Watchlist':  { label: 'Watchlist',  color: 'text-[#8E9AB5]', bg: 'bg-[#8E9AB5]/10', border: 'border-[#26314A]',    stars: 3, starLabel: 'Moderate', icon: Eye },
  'Avoid':      { label: 'Avoid',      color: 'text-[#DD6455]', bg: 'bg-[#DD6455]/10', border: 'border-[#DD6455]/25', stars: 1, starLabel: 'Poor',     icon: TrendingDown },
};

/* ── Helpers ── */

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);
}

function fmtReturn(n: number): string {
  return `${n >= 0 ? '+' : ''}${fmt(n)}%`;
}

function fmtMarketCap(n: number): string {
  if (n >= 1e12) return `₹${fmt(n / 1e12)}T`;
  if (n >= 1e9) return `₹${fmt(n / 1e9)}B`;
  if (n >= 1e7) return `₹${fmt(n / 1e7)}Cr`;
  return `₹${fmt(n)}`;
}

function getReturnColor(r: number): string {
  return r >= 15 ? '#39B58C' : r >= 8 ? '#D4A657' : r >= 3 ? '#D4A657' : r >= 0 ? '#8E9AB5' : '#DD6455';
}

function marketStatus(): 'open' | 'closed' {
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), d = now.getDay();
  if (d === 0 || d === 6) return 'closed';
  const total = h * 60 + m;
  return total >= 555 && total <= 930 ? 'open' : 'closed';
}

function getSectors(preds: Prediction[]): string[] {
  return [...new Set(preds.map(r => r.sector))].filter(Boolean).sort();
}

function clampConf(n: number | undefined | null): number {
  if (n == null || !isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/* ── Animated Counter ── */

function AnimatedNumber({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
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
  return <>{display.toFixed(decimals)}{suffix}</>;
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

function StatValue({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <p className={`text-[22px] font-medium leading-tight whitespace-nowrap ${color || 'text-[#EBEEF4]'}`} style={SERIF}>
      {children}
    </p>
  );
}

/* ── Star Rating ── */

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`h-3 w-3 ${s <= rating ? 'fill-[#D4A657] text-[#D4A657]' : 'text-[#26314A]'}`} />
      ))}
    </div>
  );
}

/* ── Bar Chart ── */

function BarChart({ data, sectorMode }: { data: { label: string; value: number }[]; sectorMode?: boolean }) {
  const max = Math.max(...data.map(d => Math.abs(d.value)), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-24 truncate text-[10px] font-mono text-[#8E9AB5]">{d.label}</span>
          <div className="flex-1">
            <div className="h-[7px] overflow-hidden rounded-full bg-[#1B2438]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  sectorMode ? 'bg-[#D4A657]/60' : d.value >= 0 ? 'bg-[#39B58C]/70' : 'bg-[#DD6455]/70'
                }`}
                style={{ width: `${(Math.abs(d.value) / max) * 100}%` }}
              />
            </div>
          </div>
          <span className={`w-16 text-right font-mono text-[10px] ${sectorMode ? 'text-[#D4A657]' : d.value >= 0 ? 'text-[#39B58C]' : 'text-[#DD6455]'}`}>
            {sectorMode ? `${fmt(d.value)}%` : fmtReturn(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Scatter Plot ── */

function ScatterPlot({ data }: { data: { x: number; y: number; label: string }[] }) {
  const maxX = Math.max(...data.map(d => d.x), 1);
  const maxY = Math.max(...data.map(d => Math.abs(d.y)), 1);
  const minY = Math.min(...data.map(d => d.y), 0);
  const rangeY = maxY - minY || 1;
  return (
    <div className="relative h-48 w-full">
      <svg viewBox="0 0 400 200" className="h-full w-full">
        {data.slice(0, 30).map((d, i) => {
          const cx = 30 + (d.x / maxX) * 340;
          const cy = 180 - ((d.y - minY) / rangeY) * 160;
          return (
            <circle key={i} cx={cx} cy={cy} r={5} fill={d.y >= 0 ? '#39B58C' : '#DD6455'} opacity={0.7}>
              <title>{d.label}: {d.y.toFixed(2)}%</title>
            </circle>
          );
        })}
        <line x1={30} y1={180 - (-minY / rangeY) * 160} x2={370} y2={180 - (-minY / rangeY) * 160}
          stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="4,4" />
      </svg>
    </div>
  );
}

/* ── Distribution Chart ── */

function DistributionChart({ values }: { values: number[] }) {
  const bins = [-20, -10, -5, 0, 3, 8, 15, 20, 30, 50];
  const counts = bins.map((_, i) => {
    if (i === 0) return values.filter(v => v < bins[0]).length;
    if (i === bins.length - 1) return values.filter(v => v >= bins[i]).length;
    return values.filter(v => v >= bins[i] && v < bins[i + 1]).length;
  });
  const maxCount = Math.max(...counts, 1);
  const labels = ['<-20%', '-20%', '-5%', '0%', '3%', '8%', '15%', '20%', '30%', '>50%'];
  const barColors = ['#DD6455', '#DD6455', '#DD6455', '#8E9AB5', '#D4A657', '#39B58C', '#39B58C', '#39B58C', '#39B58C', '#39B58C'];

  return (
    <div className="flex h-40 items-end gap-1">
      {counts.map((c, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[8px] text-[#5C6883]">{c}</span>
          <div
            className="w-full rounded-t"
            style={{ height: `${(c / maxCount) * 100}%`, background: barColors[i], opacity: 0.7 }}
          />
          <span className="text-[7px] text-[#5C6883] -rotate-45 origin-left whitespace-nowrap">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Detail Modal ── */

function DetailModal({ pred, onClose }: { pred: Prediction | null; onClose: () => void }) {
  if (!pred) return null;
  const rec = REC_LABELS[pred.recommendation] || REC_LABELS['Watchlist'];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 w-full max-w-lg rounded-[4px] border border-[#1B2438] bg-[#0B111C] p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold text-[#EBEEF4]" style={SERIF}>{pred.company}</p>
            <p className="font-mono text-xs text-[#5C6883]">{pred.symbol}</p>
          </div>
          <button onClick={onClose} className="rounded-[3px] p-1.5 text-[#5C6883] hover:bg-[#1B2438] hover:text-[#EBEEF4] transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-[3px] border border-[#1B2438] bg-[#121B2C] p-3 text-center">
            <p className="text-[9px] text-[#5C6883] uppercase">Predicted Return</p>
            <p className={`text-lg font-semibold ${pred.predicted_return >= 0 ? 'text-[#39B58C]' : 'text-[#DD6455]'}`} style={SERIF}>
              {fmtReturn(pred.predicted_return)}
            </p>
          </div>
          <div className="rounded-[3px] border border-[#1B2438] bg-[#121B2C] p-3 text-center">
            <p className="text-[9px] text-[#5C6883] uppercase">Confidence</p>
            <p className="text-lg font-semibold text-[#EBEEF4]" style={SERIF}>{pred.confidence}%</p>
          </div>
          <div className="rounded-[3px] border border-[#1B2438] bg-[#121B2C] p-3 text-center">
            <p className="text-[9px] text-[#5C6883] uppercase">Market Cap</p>
            <p className="text-sm font-semibold text-[#EBEEF4]" style={SERIF}>{fmtMarketCap(pred.market_cap)}</p>
          </div>
          <div className="rounded-[3px] border border-[#1B2438] bg-[#121B2C] p-3 text-center">
            <p className="text-[9px] text-[#5C6883] uppercase">Recommendation</p>
            <p className={`text-sm font-semibold ${rec.color}`}>{rec.label}</p>
          </div>
        </div>

        <div className="mb-4 space-y-3">
          {['Valuation Score', 'Growth Score', 'ROE', 'P/E Ratio', 'P/B Ratio'].map(k => (
            <div key={k} className="flex justify-between text-[10px]">
              <span className="text-[#5C6883]">{k}</span>
              <span className="font-mono text-[#8E9AB5]">—</span>
            </div>
          ))}
        </div>

        <div className="rounded-[3px] border border-[#D4A657]/20 bg-[#D4A657]/5 p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 text-[#D4A657] shrink-0" />
            <p className="text-[11px] leading-relaxed text-[#8E9AB5]">
              This stock is predicted to deliver approximately{' '}
              <span className="font-semibold text-[#EBEEF4]">{fmtReturn(pred.predicted_return)}</span>{' '}
              return over the next 30 days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ── */

export default function FutureReturnsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
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
  const [detail, setDetail] = useState<Prediction | null>(null);
  const [nonce, setNonce] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const PER_PAGE = 10;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const res = await fetch('/api/future-returns');
        if (!res.ok) throw new Error('API error');
        const d = await res.json();
        if (!cancelled) setPredictions(d.predictions || []);
      } catch { if (!cancelled) setError('Failed to load predictions'); }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [nonce]);

  /* ---- Derived (inline, no useMemo) ---- */

  const filtered = (() => {
    let list = [...predictions];
    if (search) { const q = search.toLowerCase(); list = list.filter(r => r.symbol.toLowerCase().includes(q) || r.company.toLowerCase().includes(q)); }
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
  const featured = [...predictions].sort((a, b) => b.predicted_return - a.predicted_return)[0];
  const status = marketStatus();
  const sectors = getSectors(predictions);
  const mcaps = [...new Set(predictions.map(r => r.market_cap_category))].filter(Boolean);
  const recTypes = ['Strong Buy', 'Buy', 'Watchlist', 'Avoid'];

  const total = predictions.length;
  const avgReturn = total > 0 ? predictions.reduce((s, r) => s + r.predicted_return, 0) / total : 0;
  const highest = total > 0 ? Math.max(...predictions.map(r => r.predicted_return)) : 0;
  const lowest = total > 0 ? Math.min(...predictions.map(r => r.predicted_return)) : 0;
  const positiveCount = predictions.filter(r => r.predicted_return > 0).length;
  const positivePct = total > 0 ? (positiveCount / total) * 100 : 0;

  const top10 = filtered.slice(0, 10);
  const sectorMap = new Map<string, number[]>();
  predictions.forEach(r => { const arr = sectorMap.get(r.sector) || []; arr.push(r.predicted_return); sectorMap.set(r.sector, arr); });
  const sectorData = Array.from(sectorMap.entries()).map(([s, vals]) => ({
    label: s, value: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100, count: vals.length,
  })).sort((a, b) => b.value - a.value);
  const scatterData = predictions.map(r => ({ x: r.market_cap, y: r.predicted_return, label: r.symbol }));
  const distributionValues = predictions.map(r => r.predicted_return);

  /* ---- Grouped overview (max 12 cards: 3 per rec type) ---- */

  const grouped: Record<string, Prediction[]> = {};
  predictions.forEach(p => { if (!grouped[p.recommendation]) grouped[p.recommendation] = []; grouped[p.recommendation].push(p); });
  const overviewSample = [
    ...(grouped['Strong Buy'] || []).slice(0, 3),
    ...(grouped['Buy'] || []).slice(0, 3),
    ...(grouped['Watchlist'] || []).slice(0, 3),
    ...(grouped['Avoid'] || []).slice(0, 3),
  ];

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortAsc(!sortAsc);
    else { setSortBy(field); setSortAsc(false); }
  };

  const exportCsv = () => {
    setExporting('csv');
    const header = 'Rank,Symbol,Company,Predicted Return %,Confidence,Sector,Market Cap,Market Cap Category';
    const rows = predictions.map(r => `${r.rank},${r.symbol},"${r.company}",${r.predicted_return},${r.confidence},"${r.sector}","${fmtMarketCap(r.market_cap)}","${r.market_cap_category}"`);
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'future-returns.csv'; a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(null), 500);
  };

  return (
    <PageTransition>
      <div className="rounded-[4px] border border-[#1B2438] bg-[#0B111C] px-4 py-8 md:px-8 lg:py-10">

        {/* ──── HEADER ──── */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[3px] border border-[#D4A657]/30 bg-[#D4A657]/10 text-[#D4A657]">
              <LineChart className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-medium text-[#EBEEF4]" style={SERIF}>
                Future Returns
              </h1>
              <p className="text-sm text-[#8E9AB5]">ML-predicted stock returns · 30-day horizon</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:flex items-center gap-2 rounded-[3px] border border-[#1B2438] bg-[#0B111C] px-3 py-2 text-xs text-[#5C6883]">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inset-0 rounded-full ${status === 'open' ? 'bg-[#39B58C] animate-ping opacity-40' : 'bg-[#5C6883]'}`} />
                <span className={`relative w-2 h-2 rounded-full ${status === 'open' ? 'bg-[#39B58C]' : 'bg-[#5C6883]'}`} />
              </span>
              Market {status === 'open' ? 'Open' : 'Closed'}
            </span>
            <span className="hidden lg:flex items-center gap-1.5 text-xs text-[#5C6883]">
              <Clock className="h-3 w-3" />
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button onClick={() => setNonce(n => n + 1)} disabled={loading}
              className="flex items-center gap-2 rounded-[3px] border border-[#1B2438] bg-[#0B111C] px-3.5 py-2 text-xs text-[#8E9AB5] transition hover:border-[#26314A] hover:text-[#EBEEF4] disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#D4A657]' : ''}`} /> Refresh
            </button>
          </div>
        </header>

        {/* ──── FEATURED HERO ──── */}
        {featured && !loading && (
          <div className="mb-10">
            <div className="nx-panel-card overflow-hidden">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 p-6">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[4px] border border-[#D4A657]/30 bg-[#D4A657]/10 text-[#D4A657]">
                    <Award className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-[#D4A657]/30 bg-[#D4A657]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#D4A657]">
                      <Sparkles className="w-3 h-3" /> Featured Prediction
                    </div>
                    <h4 className="text-lg font-semibold text-[#EBEEF4]" style={SERIF}>{featured.company}</h4>
                    <p className="text-xs text-[#5C6883]">{featured.symbol} · {featured.sector} · {featured.market_cap_category}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                  <div className="text-center">
                    <p className="mb-0.5 text-[10px] uppercase tracking-wider text-[#5C6883]">Predicted Return</p>
                    <p className={`text-2xl font-medium ${featured.predicted_return >= 0 ? 'text-[#39B58C]' : 'text-[#DD6455]'}`} style={SERIF}>
                      {fmtReturn(featured.predicted_return)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="mb-0.5 text-[10px] uppercase tracking-wider text-[#5C6883]">Confidence</p>
                    <p className="text-2xl font-medium text-[#EBEEF4]" style={SERIF}>{featured.confidence}%</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <StarRating rating={REC_LABELS[featured.recommendation]?.stars || 3} />
                    <span className={`text-[10px] font-medium ${(REC_LABELS[featured.recommendation] || REC_LABELS['Watchlist']).color}`}>
                      {(REC_LABELS[featured.recommendation] || REC_LABELS['Watchlist']).starLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-[#1B2438] bg-[#0B111C] px-4 py-2">
                    <TrendingUp className={`w-4 h-4 ${featured.predicted_return >= 0 ? 'text-[#39B58C]' : 'text-[#DD6455]'}`} />
                    <span className="text-xs font-semibold text-[#8E9AB5]">{featured.recommendation}</span>
                  </div>
                </div>
              </div>
              <div className="nx-panel-card-meta">
                <p className="nx-panel-name">{featured.symbol}</p>
                <p className="nx-panel-chg">Next 30 days · AI predicted</p>
              </div>
            </div>
          </div>
        )}

        {/* ──── SUMMARY RACK ──── */}
        <div className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-5">
          <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Avg Return" accent="gold"
            meta={<span className="w-full text-center text-[12px] font-medium text-[#8E9AB5]">Predicted</span>}>
            {loading ? <StatValue>—</StatValue> : (
              <StatValue color={avgReturn >= 0 ? 'text-[#39B58C]' : 'text-[#DD6455]'}>{fmtReturn(avgReturn)}</StatValue>
            )}
          </StatCard>
          <StatCard icon={<TrendUp className="h-4 w-4" />} label="Highest Return" accent="teal"
            meta={<span className="w-full text-center text-[12px] font-medium text-[#8E9AB5]">Best performer</span>}>
            {loading ? <StatValue>—</StatValue> : (
              <StatValue color="text-[#39B58C]">{fmtReturn(highest)}</StatValue>
            )}
          </StatCard>
          <StatCard icon={<TrendingDown className="h-4 w-4" />} label="Lowest Return" accent="gold"
            meta={<span className="w-full text-center text-[12px] font-medium text-[#8E9AB5]">Worst performer</span>}>
            {loading ? <StatValue>—</StatValue> : (
              <StatValue color="text-[#DD6455]">{fmtReturn(lowest)}</StatValue>
            )}
          </StatCard>
          <StatCard icon={<Award className="h-4 w-4" />} label="Positive Returns" accent="teal"
            meta={<span className="w-full text-center text-[12px] font-medium text-[#8E9AB5]">{positivePct.toFixed(0)}% of total</span>}>
            {loading ? <StatValue>—</StatValue> : <StatValue><AnimatedNumber value={positiveCount} /></StatValue>}
          </StatCard>
        </div>

        {/* ──── PREDICTION OVERVIEW GRID ──── */}
        {!loading && predictions.length > 0 && (
          <div className="mb-10">
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#8E9AB5]">Prediction Overview</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {overviewSample.map(p => {
                const rec = REC_LABELS[p.recommendation] || REC_LABELS['Watchlist'];
                return (
                  <button key={p.symbol} onClick={() => setDetail(p)}
                    className={`group text-left rounded-[4px] border ${rec.border} ${rec.bg} p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20`}>
                    <p className="text-sm font-semibold text-[#EBEEF4]">{p.symbol}</p>
                    <p className="mt-0.5 truncate text-[10px] text-[#5C6883]">{p.company}</p>
                    <div className="my-2"><StarRating rating={rec.stars} /></div>
                    <div className="flex items-center justify-between">
                      <p className="text-base font-semibold" style={{ color: getReturnColor(p.predicted_return), fontFamily: 'var(--nx-serif-font), Georgia, serif' }}>
                        {fmtReturn(p.predicted_return)}
                      </p>
                      <span className="text-[10px] text-[#5C6883]">{p.confidence}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ──── TOOLBAR ──── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <div className={`flex items-center gap-4 rounded-[4px] border bg-[#0B111C] px-5 py-3.5 transition-all duration-300 ${
              search ? 'border-[#D4A657]/50 shadow-[0_0_14px_rgba(212,166,87,0.10)]' : 'border-[#26314A]'
            }`}>
              <Search className={`w-5 h-5 shrink-0 transition-colors ${search ? 'text-[#D4A657]' : 'text-[#5C6883]'}`} />
              <input ref={searchRef} type="text" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by symbol or company..."
                className="flex-1 bg-transparent text-sm text-[#EBEEF4] placeholder-[#5C6883] outline-none"
                suppressHydrationWarning />
              {search && (
                <button onClick={() => setSearch('')} className="p-1 rounded-full text-[#5C6883] hover:bg-[#1B2438] hover:text-[#EBEEF4] transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 rounded-[3px] border px-3.5 py-2.5 text-xs transition-all duration-200 ${
                showFilters ? 'border-[#D4A657]/50 bg-[#D4A657]/10 text-[#D4A657]' : 'border-[#1B2438] bg-[#0B111C] text-[#8E9AB5] hover:border-[#26314A] hover:text-[#EBEEF4]'
              }`}>
              <Filter className="w-3.5 h-3.5" /> Filters
            </button>
            <button onClick={exportCsv} disabled={exporting === 'csv' || !predictions.length}
              className="flex items-center gap-1.5 rounded-[3px] border border-[#1B2438] bg-[#0B111C] px-3.5 py-2.5 text-xs text-[#8E9AB5] transition hover:border-[#26314A] hover:text-[#EBEEF4] disabled:opacity-40">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              {exporting === 'csv' ? 'Exporting...' : 'CSV'}
            </button>
          </div>
        </div>

        {/* ──── FILTER PANEL ──── */}
        {showFilters && (
          <div className="mb-8">
            <div className="rounded-[4px] border border-[#1B2438] bg-[#121B2C] p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#EBEEF4]">Filters</h3>
                <button onClick={() => { setSelectedSectors([]); setSelectedMcap([]); setSelectedRec([]); setMinReturn(-30); }}
                  className="text-[11px] text-[#D4A657] hover:text-[#EBEEF4] transition">Reset</button>
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
                  <div className="mt-1 flex justify-between text-[10px] text-[#5C6883]"><span>-30%</span><span>+40%</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──── PREDICTION TABLE ──── */}
        <div className="mb-10 overflow-hidden rounded-[4px] border border-[#1B2438]">
          <div className="flex items-center justify-between border-b border-[#1B2438] bg-[#121B2C] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#EBEEF4]">Prediction Rankings</h2>
            <span className="text-[11px] text-[#5C6883]">{filtered.length} stocks</span>
          </div>
          {loading ? (
            <div className="px-5 py-16 text-center">
              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#D4A657]" />
              <p className="text-xs text-[#5C6883]">Computing predictions with ML model...</p>
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
                      <th className="px-5 py-3">Rating</th>
                      <th className="px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} className="px-5 py-12 text-center text-[#5C6883]">No matching predictions</td></tr>
                    ) : paged.map(r => {
                      const rec = REC_LABELS[r.recommendation] || REC_LABELS['Watchlist'];
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
                                <div className={`h-full rounded-full ${clampConf(r.confidence) >= 80 ? 'bg-[#39B58C]' : clampConf(r.confidence) >= 60 ? 'bg-[#D4A657]' : 'bg-[#DD6455]'}`}
                                  style={{ width: `${clampConf(r.confidence)}%` }} />
                              </div>
                              <span className="font-mono text-[#5C6883]">{clampConf(r.confidence)}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3"><StarRating rating={rec.stars} /></td>
                          <td className="px-5 py-3">
                            <button onClick={() => setDetail(r)}
                              className="rounded-[3px] border border-[#1B2438] bg-[#0B111C] p-1.5 text-[#8E9AB5] transition hover:border-[#26314A] hover:text-[#EBEEF4]"
                              title="View Details">
                              <Eye className="h-3 w-3" />
                            </button>
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

        {/* ──── VISUAL ANALYTICS ──── */}
        {!loading && predictions.length > 0 && (
          <div className="mb-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[4px] border border-[#1B2438] bg-[#121B2C] p-6">
              <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-wider text-[#8E9AB5]">Return Distribution</h3>
              <DistributionChart values={distributionValues} />
            </div>
            <div className="rounded-[4px] border border-[#1B2438] bg-[#121B2C] p-6">
              <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-wider text-[#8E9AB5]">Top 10 Returns</h3>
              <BarChart data={top10.map(r => ({ label: r.symbol, value: r.predicted_return }))} />
            </div>
            <div className="rounded-[4px] border border-[#1B2438] bg-[#121B2C] p-6">
              <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-wider text-[#8E9AB5]">Sector-wise Opportunity</h3>
              <BarChart data={sectorData} sectorMode />
            </div>
            <div className="rounded-[4px] border border-[#1B2438] bg-[#121B2C] p-6">
              <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-wider text-[#8E9AB5]">Market Cap vs Return</h3>
              <ScatterPlot data={scatterData} />
              <div className="mt-3 flex justify-center gap-4 text-[9px] text-[#5C6883]">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#39B58C]" /> Positive</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#DD6455]" /> Negative</span>
              </div>
            </div>
          </div>
        )}

        {/* ──── DETAIL MODAL ──── */}
        {detail && <DetailModal pred={detail} onClose={() => setDetail(null)} />}

        {/* ──── FOOTER ──── */}
        <footer className="mt-10 border-t border-[#1B2438] py-6 text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] text-[#5C6883]">
            <Shield className="h-3 w-3" /> Risk Disclaimer
          </div>
          <p className="mx-auto max-w-xl text-[10px] leading-relaxed text-[#5C6883]">
            Predictions are generated using machine learning models and are not financial advice.
            Past performance does not guarantee future results. Always do your own research before investing.
          </p>
        </footer>
      </div>
    </PageTransition>
  );
}