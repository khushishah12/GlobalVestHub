'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown,
  RefreshCw, Activity, Briefcase, Star,
  AlertTriangle, ArrowRight, Brain, Newspaper,
} from 'lucide-react';
import { motion } from 'framer-motion';
import PageTransition from '@/components/dashboard/PageTransition';
import GlassCard from '@/components/dashboard/GlassCard';
import AnimatedNumber from '@/components/dashboard/AnimatedNumber';
import SparklineChart from '@/components/dashboard/SparklineChart';

interface IndexData {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

interface SparklinePoint { time: string; close: number }

interface PortfolioHolding {
  stock_symbol: string; quantity: number; buy_price: number;
  current_price: number; invested: number; current_value: number;
  pl: number; pl_percent: number; status: string;
}

interface WatchlistItem { symbol: string; price: number; change: number; changePercent: number }

interface NewsItem { title: string; sentiment: string; source: string; time: string }

interface IndicesResponse {
  indices: IndexData[]; sparkline: SparklinePoint[];
  marketStatus: string; fetchedAt: string;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);
}

function fmtShort(n: number): string {
  if (Math.abs(n) >= 1e7) return `₹${fmt(n / 1e7)}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${fmt(n / 1e5)}L`;
  return `₹${fmt(n)}`;
}

function fmtPercent(n: number): string {
  return `${n >= 0 ? '+' : ''}${fmt(n)}%`;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function generateSummary(indices: IndexData[] | null, status: string): { message: string; type: string; confidence: number } {
  if (!indices) return { message: 'Loading market data...', type: 'neutral', confidence: 0 };
  const nifty = indices.find(i => i.symbol === '^NSEI');
  if (!nifty || nifty.changePercent === null) return { message: 'Market data is being processed.', type: 'neutral', confidence: 50 };
  const cp = nifty.changePercent;
  if (status === 'closed') {
    if (cp > 1) return { message: `Markets closed. Last session ended with strong gains of ${fmt(Math.abs(cp))}%. Bullish momentum prevailing.`, type: 'bullish', confidence: Math.min(Math.abs(cp) * 30 + 60, 92) };
    if (cp > 0) return { message: `Markets closed. NIFTY ended ${cp > 0 ? 'higher' : 'lower'} by ${fmt(Math.abs(cp))}% in the last session.`, type: cp > 0 ? 'bullish' : 'bearish', confidence: 65 };
    return { message: `Markets closed. NIFTY declined ${fmt(Math.abs(cp))}% in the last session.`, type: 'bearish', confidence: Math.min(Math.abs(cp) * 30 + 60, 92) };
  }
  if (cp > 1.5) return { message: `Strong bullish momentum! NIFTY up ${fmt(cp)}% with broad-based buying across sectors.`, type: 'bullish', confidence: Math.min(cp * 20 + 70, 95) };
  if (cp > 0.5) return { message: `Markets trading higher with positive bias. NIFTY gained ${fmt(cp)}% driven by buying interest.`, type: 'bullish', confidence: 78 };
  if (cp > 0) return { message: `Markets in green. NIFTY up ${fmt(cp)}% with selective buying in heavyweight stocks.`, type: 'bullish', confidence: 68 };
  if (cp > -0.5) return { message: `Markets trading flat to negative. NIFTY down ${fmt(Math.abs(cp))}% with mild selling pressure.`, type: 'bearish', confidence: 65 };
  if (cp > -1.5) return { message: `Markets under pressure. NIFTY declined ${fmt(Math.abs(cp))}% with broad-based selling.`, type: 'bearish', confidence: 78 };
  return { message: `Bearish sentiment prevailing! NIFTY down ${fmt(Math.abs(cp))}% with significant selling across sectors.`, type: 'bearish', confidence: Math.min(Math.abs(cp) * 20 + 70, 95) };
}

function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[4px] bg-[#121B2C]/60 ${className}`} />;
}

function KpiCard({ icon, label, value, up, sub }: { icon: React.ReactNode; label: string; value: string; up: boolean; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="nx-panel-card"
    >
      <div className="nx-panel-card-head">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <span className={`mt-0.5 w-7 h-7 rounded-[3px] flex items-center justify-center shrink-0 ${up ? 'bg-[#39B58C]/15 text-[#39B58C]' : 'bg-[#DD6455]/10 text-[#DD6455]'}`}>
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="nx-panel-symbol">{label}</p>
            <p className="nx-panel-num">{value}</p>
          </div>
        </div>
      </div>
      <div className="nx-panel-card-meta">
        <p className={`nx-panel-name ${up ? 'nx-up' : 'nx-down'}`}>{up ? 'Advancing' : 'Declining'}</p>
        {sub && <p className={`nx-panel-chg ${up ? 'nx-up' : 'nx-down'}`}>{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function DashboardHomePage() {
  const [indicesData, setIndicesData] = useState<IndicesResponse | null>(null);
  const [indicesLoading, setIndicesLoading] = useState(true);
  const [indicesError, setIndicesError] = useState('');
  const [portfolio, setPortfolio] = useState<PortfolioHolding[] | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<WatchlistItem[] | null>(null);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState('');

  const fetchIndices = useCallback(async () => {
    try {
      const res = await fetch('/api/market/indices');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setIndicesData(data);
      setIndicesError('');
    } catch { setIndicesError('Could not load market data'); }
    finally { setIndicesLoading(false); }
  }, []);

  useEffect(() => {
    const id = setInterval(fetchIndices, 30000);
    const initial = setTimeout(fetchIndices, 0);
    return () => { clearInterval(id); clearTimeout(initial); };
  }, [fetchIndices]);

  useEffect(() => {
    fetch('/api/portfolio')
      .then(r => r.ok ? r.json() : [])
      .then(d => setPortfolio(Array.isArray(d) ? d : []))
      .catch(() => setPortfolio([]))
      .finally(() => setPortfolioLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/watchlist')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.items) setWatchlist(d.items.slice(0, 4)); else setWatchlist([]); })
      .catch(() => setWatchlist([]))
      .finally(() => setWatchlistLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/stocks/news-latest?limit=5')
      .then(r => r.ok ? r.json() : [])
      .then(d => { const articles = d.articles || d || []; setNews(Array.isArray(articles) ? articles.slice(0, 5) : []); })
      .catch(() => setNewsError('Could not load news'))
      .finally(() => setNewsLoading(false));
  }, []);

  const summary = useMemo(() => generateSummary(indicesData?.indices ?? null, indicesData?.marketStatus ?? 'closed'), [indicesData]);

  const portfolioSummary = useMemo(() => {
    if (!portfolio || !Array.isArray(portfolio) || portfolio.length === 0) return null;
    const totalInvested = portfolio.reduce((s, h) => s + h.invested, 0);
    const currentValue = portfolio.reduce((s, h) => s + h.current_value, 0);
    const totalPl = currentValue - totalInvested;
    const plPercent = totalInvested > 0 ? (totalPl / totalInvested) * 100 : 0;
    return { totalInvested, currentValue, totalPl, plPercent, count: portfolio.length };
  }, [portfolio]);

  const mainIndex = indicesData?.indices?.find(i => i.symbol === '^NSEI');
  const isUp = (mainIndex?.change ?? 0) >= 0;

  return (
    <PageTransition>
      <div className="rounded-[4px] border border-[#1B2438] bg-[#0B111C] px-4 py-8 md:px-8 lg:py-10">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  HERO HEADER STRIP (full-width)                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <header className="relative mb-[50px] w-full bg-[#121B2C]/40 border-y border-[#1B2438]">
        <div className="py-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#D4A657]">Terminal Home</p>
            <h1
              className="text-2xl font-medium tracking-tight text-[#EBEEF4] md:text-3xl"
              style={{ fontFamily: 'var(--nx-serif-font), Georgia, serif' }}
            >
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-[#5C6883]">Overview of markets, live indices snapshot, and AI-generated summary.</p>
          </div>
          <button
            onClick={fetchIndices}
            disabled={indicesLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-[#121B2C] border border-[#1B2438] text-xs text-[#5C6883] hover:text-[#8E9AB5] hover:border-[#26314A] transition disabled:opacity-40"
            suppressHydrationWarning
          >
            <RefreshCw className={`w-3.5 h-3.5 ${indicesLoading ? 'animate-spin' : ''}`} />
            {indicesData ? timeAgo(indicesData.fetchedAt) : '--'}
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  NIFTY HERO + AI SUMMARY (3-col grid)                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid gap-5 md:grid-cols-3 mb-8">
        {indicesLoading ? (
          <>
            <SkeletonCard className="md:col-span-2 h-48" />
            <SkeletonCard className="h-48" />
          </>
        ) : indicesError ? (
          <GlassCard accent="bearish" className="md:col-span-2">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#DD6455] shrink-0" />
              <p className="text-sm text-[#DD6455]">{indicesError}</p>
              <button onClick={fetchIndices} className="ml-auto px-3 py-1.5 rounded-[3px] bg-[#DD6455]/10 border border-[#DD6455]/20 text-xs text-[#DD6455] hover:bg-[#DD6455]/20 transition">Retry</button>
            </div>
          </GlassCard>
        ) : mainIndex && mainIndex.price ? (
          <GlassCard accent={isUp ? 'bullish' : 'bearish'} className="md:col-span-2 overflow-hidden relative">
            <div className="relative">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isUp ? <TrendingUp className="w-5 h-5 text-[#39B58C]" /> : <TrendingDown className="w-5 h-5 text-[#DD6455]" />}
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#5C6883]">{mainIndex.label}</p>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-[11px] font-semibold ${
                  indicesData?.marketStatus === 'open'
                    ? 'bg-[#39B58C]/15 text-[#39B58C] border border-[#39B58C]/25'
                    : 'bg-[#5C6883]/15 text-[#5C6883] border border-[#5C6883]/25'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${indicesData?.marketStatus === 'open' ? 'bg-[#39B58C] animate-pulse' : 'bg-[#5C6883]'}`} />
                  {indicesData?.marketStatus === 'open' ? 'OPEN' : 'CLOSED'}
                </div>
              </div>
              <p
                className="text-3xl md:text-4xl font-medium text-[#EBEEF4] tracking-tight"
                style={{ fontFamily: 'var(--nx-serif-font), Georgia, serif' }}
              >
                <AnimatedNumber value={mainIndex.price} decimals={2} />
              </p>
              <div className="flex items-center gap-3 mt-2">
                <p className={`flex items-center gap-1 text-sm font-semibold ${isUp ? 'text-[#39B58C]' : 'text-[#DD6455]'}`}>
                  {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {isUp ? '+' : ''}{fmt(mainIndex.change ?? 0)} ({fmtPercent(mainIndex.changePercent ?? 0)})
                  <span className="text-xs text-[#5C6883] font-normal ml-1">Today</span>
                </p>
              </div>
              <div className="mt-3 h-14 -mx-5 -mb-5 px-5 pb-2">
                <SparklineChart data={indicesData?.sparkline ?? []} color={isUp ? '#39B58C' : '#DD6455'} />
              </div>
            </div>
          </GlassCard>
        ) : null}

        <GlassCard accent={summary.type === 'bullish' ? 'bullish' : summary.type === 'bearish' ? 'bearish' : 'neutral'} className="flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Brain className={`w-4 h-4 ${summary.type === 'bullish' ? 'text-[#39B58C]' : summary.type === 'bearish' ? 'text-[#DD6455]' : 'text-[#D4A657]'}`} />
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#5C6883]">AI Summary</p>
          </div>
          <p className="text-sm leading-relaxed text-[#8E9AB5] flex-1">{summary.message}</p>
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#5C6883]">Confidence</span>
              <span className={`font-semibold ${summary.type === 'bullish' ? 'text-[#39B58C]' : summary.type === 'bearish' ? 'text-[#DD6455]' : 'text-[#D4A657]'}`}>{summary.confidence}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#1B2438] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  summary.type === 'bullish' ? 'bg-gradient-to-r from-[#39B58C] to-[#39B58C]/70' :
                  summary.type === 'bearish' ? 'bg-gradient-to-r from-[#DD6455] to-[#DD6455]/70' :
                  'bg-gradient-to-r from-[#D4A657] to-[#D4A657]/70'
                }`}
                style={{ width: `${summary.confidence}%` }}
              />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  NOTEBOOK CONTAINER (wraps everything below)                 */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="w-full mx-auto bg-[#0B111C] border border-[#1B2438] rounded-[4px] p-6 md:p-8">

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  INDEX RACK (live indices as cards)                     */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-6 px-1">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#D4A657]" />
              <h2 className="text-xl font-medium text-[#EBEEF4]" style={{ fontFamily: 'var(--nx-serif-font), Georgia, serif' }}>
                Market Indices
              </h2>
            </div>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-[11px] font-semibold ${
              indicesData?.marketStatus === 'open'
                ? 'bg-[#39B58C]/15 text-[#39B58C] border border-[#39B58C]/25'
                : 'bg-[#5C6883]/15 text-[#5C6883] border border-[#5C6883]/25'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${indicesData?.marketStatus === 'open' ? 'bg-[#39B58C] animate-pulse' : 'bg-[#5C6883]'}`} />
              {indicesData?.marketStatus === 'open' ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
          <div className="rounded-[4px] bg-[#121B2C]/50 border border-[#1B2438] py-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-5">
              {indicesLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} className="h-28 w-full" />)
              ) : (indicesData?.indices ?? []).map((idx) => {
                  const rawUp = (idx.change ?? 0) >= 0;
                  const isVix = idx.symbol === '^INDIAVIX';
                  const up = isVix ? !rawUp : rawUp;
                  return (
                    <KpiCard
                      key={idx.symbol}
                      icon={up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      label={idx.label}
                      value={idx.price != null ? fmt(idx.price) : '—'}
                      up={up}
                      sub={idx.changePercent != null ? `${up ? '+' : ''}${fmt(idx.changePercent)}% today` : undefined}
                    />
                  );
                })}
            </div>
          </div>
        </div>

        <div className="h-[30px]" />

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  PORTFOLIO + WATCHLIST (2-col)                           */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="grid gap-5 md:grid-cols-2 mb-8">
          {portfolioLoading ? (
            <SkeletonCard className="h-36" />
          ) : portfolioSummary ? (
            <div className="group relative rounded-[4px] border border-[#39B58C]/20 bg-gradient-to-b from-[#121B2C]/80 to-transparent p-5 hover:border-[#39B58C]/40 transition-all duration-300">
              <div className="absolute top-0 left-4 right-4 h-[3px] rounded-b-full bg-gradient-to-r from-[#39B58C] to-[#39B58C]/50 opacity-60" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-[3px] bg-[#39B58C]/10 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-[#39B58C]" />
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#5C6883]">Portfolio</p>
                  </div>
                  <span className="text-[11px] text-[#5C6883]">{portfolioSummary.count} holdings</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[11px] text-[#5C6883]">Invested</p>
                    <p className="text-sm font-bold text-[#EBEEF4]">{fmtShort(portfolioSummary.totalInvested)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#5C6883]">Current</p>
                    <p className="text-sm font-bold text-[#EBEEF4]">{fmtShort(portfolioSummary.currentValue)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#5C6883]">P&L</p>
                    <p className={`text-sm font-bold ${portfolioSummary.totalPl >= 0 ? 'text-[#39B58C]' : 'text-[#DD6455]'}`}>
                      {portfolioSummary.totalPl >= 0 ? '+' : ''}{fmtShort(portfolioSummary.totalPl)}
                      <span className="text-xs ml-1">({fmtPercent(portfolioSummary.plPercent)})</span>
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/portfolio" className="mt-3 inline-flex items-center gap-1 text-xs text-[#39B58C] hover:text-[#EBEEF4] transition">
                  View full portfolio <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="group relative rounded-[4px] border border-[#1B2438] bg-gradient-to-b from-[#121B2C]/40 to-transparent p-5 hover:border-[#26314A] transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-[3px] bg-[#D4A657]/10 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-[#D4A657]" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#5C6883]">Portfolio</p>
              </div>
              <p className="text-sm text-[#5C6883]">No holdings yet. Start tracking your investments.</p>
              <Link href="/dashboard/portfolio" className="mt-3 inline-flex items-center gap-1 text-xs text-[#D4A657] hover:text-[#EBEEF4] transition">
                Add your first stock <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {watchlistLoading ? (
            <SkeletonCard className="h-36" />
          ) : watchlist && watchlist.length > 0 ? (
            <div className="group relative rounded-[4px] border border-[#D4A657]/20 bg-gradient-to-b from-[#121B2C]/80 to-transparent p-5 hover:border-[#D4A657]/40 transition-all duration-300">
              <div className="absolute top-0 left-4 right-4 h-[3px] rounded-b-full bg-gradient-to-r from-[#D4A657] to-[#D4A657]/50 opacity-60" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-[3px] bg-[#D4A657]/10 flex items-center justify-center">
                      <Star className="w-4 h-4 text-[#D4A657]" />
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#5C6883]">Watchlist</p>
                  </div>
                  <span className="text-[11px] text-[#5C6883]">{watchlist.length} tracked</span>
                </div>
                <div className="space-y-2">
                  {watchlist.map((item) => {
                    const up = (item.change ?? 0) >= 0;
                    return (
                      <div key={item.symbol} className="flex items-center justify-between py-1.5 border-b border-[#1B2438] last:border-0">
                        <p className="text-sm font-medium text-[#EBEEF4]">{item.symbol.replace(/\.(NS|BO)$/i, '')}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-[#8E9AB5]">₹{fmt(item.price ?? 0)}</span>
                          <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? 'text-[#39B58C]' : 'text-[#DD6455]'}`}>
                            {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {fmtPercent(item.changePercent ?? 0)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Link href="/dashboard/watchlist" className="mt-3 inline-flex items-center gap-1 text-xs text-[#D4A657] hover:text-[#EBEEF4] transition">
                  View full watchlist <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="group relative rounded-[4px] border border-[#1B2438] bg-gradient-to-b from-[#121B2C]/40 to-transparent p-5 hover:border-[#26314A] transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-[3px] bg-[#D4A657]/10 flex items-center justify-center">
                  <Star className="w-4 h-4 text-[#D4A657]" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#5C6883]">Watchlist</p>
              </div>
              <p className="text-sm text-[#5C6883]">No stocks tracked yet.</p>
              <Link href="/dashboard/watchlist" className="mt-3 inline-flex items-center gap-1 text-xs text-[#D4A657] hover:text-[#EBEEF4] transition">
                Start tracking stocks <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        <div className="h-[30px]" />

        <div className="h-[30px]" />

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  NEWS SECTION                                            */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-[#D4A657]" />
              <h2 className="text-xl font-medium text-[#EBEEF4]" style={{ fontFamily: 'var(--nx-serif-font), Georgia, serif' }}>
                Latest Market News
              </h2>
            </div>
            <Link href="/dashboard/news" className="text-xs text-[#D4A657] hover:text-[#EBEEF4] transition flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {newsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-14" />)}
            </div>
          ) : newsError ? (
            <div className="rounded-[4px] border border-[#DD6455]/20 bg-[#121B2C]/40 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#DD6455] shrink-0" />
                <p className="text-sm text-[#8E9AB5]">{newsError}</p>
              </div>
            </div>
          ) : news.length === 0 ? (
            <div className="rounded-[4px] border border-[#1B2438] bg-[#121B2C]/40 p-4">
              <p className="text-sm text-[#5C6883]">No news articles available right now.</p>
            </div>
          ) : (
            <div className="nx-ticker-strip rounded-[3px] border border-[#1B2438]">
              <div className="nx-ticker-track">
                {[...news, ...news].map((article, i) => (
                  <span key={i} className="nx-ticker-item">
                    <b>{article.source}</b>
                    {article.title}
                    {article.time && <span className="nx-ticker-time">· {article.time}</span>}
                    <span
                      className={
                        article.sentiment === 'positive' ? 'up'
                        : article.sentiment === 'negative' ? 'down'
                        : ''
                      }
                    >
                      {article.sentiment}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
      </div>
    </PageTransition>
  );
}
