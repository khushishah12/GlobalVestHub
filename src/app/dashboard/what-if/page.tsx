'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, TrendingUp, TrendingDown, CalendarDays,
  IndianRupee, Loader2, AlertTriangle, Info,
  BarChart3, ArrowRight, Clock, Sparkles,
  Wallet, Target, LineChart,
} from 'lucide-react';
import PageTransition from '@/components/dashboard/PageTransition';
import StockSearchInput from '@/components/dashboard/StockSearchInput';

interface DataPoint { date: string; portfolio: number; benchmark: number }

interface Summary {
  totalInvested: number; finalValue: number; absoluteReturn: number;
  percentReturn: number; cagr: number; benchmarkValue: number;
  benchmarkReturn: number; alpha: number;
}

interface Result {
  symbol: string; company: string; amount: number;
  startDate: string; endDate: string; mode: 'lumpsum' | 'sip';
  currentPrice: number; summary: Summary; dataPoints: DataPoint[];
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);
}

function fmtCurrency(n: number): string {
  if (Math.abs(n) >= 1e7) return `₹${fmt(n / 1e7)}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${fmt(n / 1e5)}L`;
  return `₹${fmt(n)}`;
}

function fmtPercent(n: number): string {
  return `${n >= 0 ? '+' : ''}${fmt(n)}%`;
}

function formatDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function GrowthChart({ dataPoints, width = 700, height = 320 }: { dataPoints: DataPoint[]; width?: number; height?: number }) {
  if (dataPoints.length < 2) return null;

  const pad = { top: 20, right: 20, bottom: 40, left: 60 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const allValues = dataPoints.flatMap(d => [d.portfolio, d.benchmark]);
  const minVal = Math.min(...allValues) * 0.95;
  const maxVal = Math.max(...allValues) * 1.05;
  const range = maxVal - minVal || 1;

  const xScale = (i: number) => pad.left + (i / (dataPoints.length - 1)) * plotW;
  const yScale = (v: number) => pad.top + plotH - ((v - minVal) / range) * plotH;

  const portfolioLine = dataPoints.map((d, i) => `${xScale(i)},${yScale(d.portfolio)}`).join(' ');
  const benchmarkLine = dataPoints.map((d, i) => `${xScale(i)},${yScale(d.benchmark)}`).join(' ');

  const yTicks = 5;
  const yStep = range / yTicks;
  const yLabels: number[] = [];
  for (let i = 0; i <= yTicks; i++) yLabels.push(minVal + yStep * i);

  const xLabelCount = Math.min(dataPoints.length, 8);
  const xStep = Math.max(1, Math.floor((dataPoints.length - 1) / (xLabelCount - 1)));

  const lastPortfolio = dataPoints[dataPoints.length - 1].portfolio;
  const lastBenchmark = dataPoints[dataPoints.length - 1].benchmark;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="pfGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="bmGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.02" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" rx="4" />

      {yLabels.map((v) => (
        <g key={v}>
          <line x1={pad.left} y1={yScale(v)} x2={pad.left + plotW} y2={yScale(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <text x={pad.left - 8} y={yScale(v) + 4} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="11">{fmtCurrency(v)}</text>
        </g>
      ))}

      {dataPoints.filter((_, i) => i % xStep === 0 || i === dataPoints.length - 1).map((d) => {
        const i = dataPoints.indexOf(d);
        const idx = Math.round(i / xStep);
        return (
          <text key={d.date} x={xScale(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === dataPoints.length - 1 ? 'end' : 'middle'} fill="rgba(255,255,255,0.35)" fontSize="10">
            {d.date.slice(0, 7)}
          </text>
        );
      })}

      <polyline points={benchmarkLine} fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.7" />
      <polyline points={portfolioLine} fill="none" stroke="#22d3ee" strokeWidth="2.5" filter="url(#glow)" />

      <polygon points={`${portfolioLine} ${xScale(dataPoints.length - 1)},${pad.top + plotH} ${xScale(0)},${pad.top + plotH}`} fill="url(#pfGrad)" />
      <polygon points={`${benchmarkLine} ${xScale(dataPoints.length - 1)},${pad.top + plotH} ${xScale(0)},${pad.top + plotH}`} fill="url(#bmGrad)" />

      <circle cx={xScale(dataPoints.length - 1)} cy={yScale(lastPortfolio)} r="4" fill="#22d3ee" stroke="#030308" strokeWidth="2" />
      <circle cx={xScale(dataPoints.length - 1)} cy={yScale(lastBenchmark)} r="3" fill="#a78bfa" stroke="#030308" strokeWidth="2" />

      <g transform={`translate(${pad.left + 8}, ${pad.top + 8})`}>
        <line x1="0" y1="0" x2="14" y2="0" stroke="#22d3ee" strokeWidth="2.5" />
        <text x="20" y="4" fill="rgba(255,255,255,0.6)" fontSize="11">Portfolio</text>
        <line x1="90" y1="0" x2="104" y2="0" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4,2" />
        <text x="110" y="4" fill="rgba(255,255,255,0.6)" fontSize="11">NIFTY 50</text>
      </g>
    </svg>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, trend }: { icon: any; label: string; value: string; sub?: string; trend?: 'up' | 'down' | 'neutral' }) {
  const borderColor = trend === 'up' ? 'border-emerald-500/15' : trend === 'down' ? 'border-rose-500/15' : 'border-cyan-500/15';
  const accentGrad = trend === 'up' ? 'from-emerald-400 to-emerald-500' : trend === 'down' ? 'from-rose-400 to-rose-500' : 'from-cyan-400 to-cyan-500';
  const iconBg = trend === 'up' ? 'bg-emerald-500/10' : trend === 'down' ? 'bg-rose-500/10' : 'bg-cyan-500/10';
  const iconColor = trend === 'up' ? 'text-emerald-300' : trend === 'down' ? 'text-rose-300' : 'text-cyan-300';
  return (
    <div className={`group relative rounded-2xl border ${borderColor} bg-gradient-to-b from-white/[0.03] to-transparent p-4 hover:border-white/[0.12] transition-all duration-300`}>
      <div className={`absolute top-0 left-4 right-4 h-[3px] rounded-full bg-gradient-to-r ${accentGrad} opacity-60`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-slate-500 tracking-wide">{label}</span>
          <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
        </div>
        <p className={`text-lg font-bold tracking-tight ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-white'}`}>{value}</p>
        {sub && <p className={`text-[11px] mt-1 ${trend === 'up' ? 'text-emerald-400/70' : trend === 'down' ? 'text-rose-400/70' : 'text-slate-400'}`}>{sub}</p>}
      </div>
    </div>
  );
}

export default function WhatIfPage() {
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 3); return formatDateInput(d); });
  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()));
  const [mode, setMode] = useState<'lumpsum' | 'sip'>('lumpsum');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [amountFocused, setAmountFocused] = useState(false);
  const [startDateFocused, setStartDateFocused] = useState(false);
  const [endDateFocused, setEndDateFocused] = useState(false);

  const calculate = useCallback(async () => {
    if (!symbol) { setError('Please select a stock'); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!startDate) { setError('Select a start date'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/stocks/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, amount: amt, startDate, endDate: endDate || undefined, mode }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Calculation failed');
      else { setResult(data); setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  }, [symbol, amount, startDate, endDate, mode]);

  const valid = symbol && parseFloat(amount) > 0;

  return (
    <PageTransition>
      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  HERO HEADER STRIP                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <header className="relative mb-[50px] w-[90%] mx-auto bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-transparent border-y border-white/[0.05]">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">What-If Calculator</h1>
              <p className="text-sm text-slate-400">See how past investments would have performed</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Powered by historical data</span>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  NOTEBOOK CONTAINER                                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="w-[95%] mx-auto bg-[#0a0c14] border border-white/[0.05] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-6 md:p-8">

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ──── INPUT SECTION ──── */}
          <div>
            <div className="group relative rounded-2xl border border-cyan-500/15 bg-gradient-to-b from-white/[0.03] to-transparent p-5 hover:border-cyan-500/30 transition-all duration-300">
              <div className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 opacity-60" />
              <div className="relative space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-cyan-300" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Investment Details</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 tracking-wide mb-1.5">Stock</label>
                  <StockSearchInput
                    value={symbol}
                    onChange={setSymbol}
                    onSelect={(sym) => setSymbol(sym)}
                    placeholder="Search NSE/BSE stocks..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 tracking-wide mb-1.5">
                    {mode === 'sip' ? 'Monthly SIP Amount (₹)' : 'Investment Amount (₹)'}
                  </label>
                  <div className={`flex items-center gap-3 px-4 py-3.5 border rounded-xl transition-all duration-300 ${
                    amountFocused
                      ? 'border-cyan-500/40 bg-white/[0.06] shadow-[0_0_24px_rgba(0,229,255,0.08)]'
                      : 'border-white/[0.08] bg-black/40 hover:bg-white/[0.04]'
                  }`}>
                    <IndianRupee className={`w-4 h-4 shrink-0 transition-colors duration-300 ${
                      amountFocused ? 'text-cyan-400' : 'text-slate-500'
                    }`} />
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      onFocus={() => setAmountFocused(true)}
                      onBlur={() => setAmountFocused(false)}
                      placeholder={mode === 'sip' ? 'e.g. 10,000' : 'e.g. 1,00,000'}
                      className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                      suppressHydrationWarning
                    />
                    {parseFloat(amount) > 0 && (
                      <span className="text-xs font-medium text-cyan-400/70 shrink-0 tabular-nums">
                        {mode === 'sip' ? '/mo' : ''}
                      </span>
                    )}
                  </div>
                  {parseFloat(amount) > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[10000, 25000, 50000, 100000, 500000].map((v) => (
                        <button
                          key={v}
                          onClick={() => setAmount(String(v))}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border transition-all ${
                            parseFloat(amount) === v
                              ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                              : 'border-white/[0.06] bg-white/[0.02] text-slate-500 hover:border-white/20 hover:text-slate-300'
                          }`}
                        >
                          ₹{(v / 1000).toFixed(0)}K
                        </button>
                      ))}
                    </div>
                  )}
                  {mode === 'sip' && startDate && endDate && parseFloat(amount) > 0 && (
                    <p className="text-[11px] text-slate-500 mt-2">
                      ₹{fmt(parseFloat(amount))} / month · {startDate} to {endDate}
                    </p>
                  )}
                </div>

                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 tracking-wide mb-1.5">Start Date</label>
                      <div className={`flex items-center gap-3 px-4 py-3.5 border rounded-xl transition-all duration-300 ${
                        startDateFocused
                          ? 'border-cyan-500/40 bg-white/[0.06] shadow-[0_0_24px_rgba(0,229,255,0.08)]'
                          : 'border-white/[0.08] bg-black/40 hover:bg-white/[0.04]'
                      }`}>
                        <CalendarDays className={`w-4 h-4 shrink-0 transition-colors duration-300 ${
                          startDateFocused ? 'text-cyan-400' : 'text-slate-500'
                        }`} />
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          onFocus={() => setStartDateFocused(true)}
                          onBlur={() => setStartDateFocused(false)}
                          max={endDate}
                          className="flex-1 bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 tracking-wide mb-1.5">End Date</label>
                      <div className={`flex items-center gap-3 px-4 py-3.5 border rounded-xl transition-all duration-300 ${
                        endDateFocused
                          ? 'border-cyan-500/40 bg-white/[0.06] shadow-[0_0_24px_rgba(0,229,255,0.08)]'
                          : 'border-white/[0.08] bg-black/40 hover:bg-white/[0.04]'
                      }`}>
                        <Clock className={`w-4 h-4 shrink-0 transition-colors duration-300 ${
                          endDateFocused ? 'text-cyan-400' : 'text-slate-500'
                        }`} />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          onFocus={() => setEndDateFocused(true)}
                          onBlur={() => setEndDateFocused(false)}
                          min={startDate}
                          max={formatDateInput(new Date())}
                          className="flex-1 bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      { label: '1Y', years: 1 },
                      { label: '3Y', years: 3 },
                      { label: '5Y', years: 5 },
                      { label: '10Y', years: 10 },
                    ].map(({ label, years }) => {
                      const d = new Date(); d.setFullYear(d.getFullYear() - years);
                      const val = formatDateInput(d);
                      const active = startDate === val;
                      return (
                        <button
                          key={label}
                          onClick={() => { setStartDate(val); setEndDate(formatDateInput(new Date())); }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border transition-all ${
                            active
                              ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                              : 'border-white/[0.06] bg-white/[0.02] text-slate-500 hover:border-white/20 hover:text-slate-300'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 tracking-wide mb-1.5">Investment Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMode('lumpsum')}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        mode === 'lumpsum'
                          ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.06)]'
                          : 'bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:border-white/20'
                      }`}
                    >
                      Lump Sum
                    </button>
                    <button
                      onClick={() => setMode('sip')}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        mode === 'sip'
                          ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.06)]'
                          : 'bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:border-white/20'
                      }`}
                    >
                      SIP (Monthly)
                    </button>
                  </div>
                </div>

                <button
                  onClick={calculate}
                  disabled={loading || !valid}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-white font-medium hover:from-cyan-500/30 hover:to-violet-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Calculating...</>
                  ) : (
                    <><Calculator className="w-4 h-4" /> Calculate Returns</>
                  )}
                </button>

                {error && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-rose-300">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ──── RESULT SECTION ──── */}
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                ref={resultRef}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5"
              >
                <div className="group relative rounded-2xl border border-emerald-500/15 bg-gradient-to-b from-white/[0.03] to-transparent p-5 hover:border-emerald-500/30 transition-all duration-300">
                  <div className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 opacity-60" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <BarChart3 className="w-4 h-4 text-emerald-300" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Returns</p>
                          <p className="text-sm font-semibold text-white">{result.company} ({result.symbol})</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 bg-white/[0.04] px-2 py-1 rounded-md">
                        {result.mode === 'sip' ? 'SIP' : 'Lump Sum'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <SummaryCard
                        icon={IndianRupee} label="Total Invested"
                        value={fmtCurrency(result.summary.totalInvested)}
                        trend="neutral"
                      />
                      <SummaryCard
                        icon={Wallet} label="Final Value"
                        value={fmtCurrency(result.summary.finalValue)}
                        trend={result.summary.finalValue >= result.summary.totalInvested ? 'up' : 'down'}
                      />
                      <SummaryCard
                        icon={TrendingUp} label="Total Return"
                        value={fmtCurrency(result.summary.absoluteReturn)}
                        sub={fmtPercent(result.summary.percentReturn)}
                        trend={result.summary.percentReturn >= 0 ? 'up' : 'down'}
                      />
                      <SummaryCard
                        icon={Target} label="CAGR"
                        value={`${result.summary.cagr >= 0 ? '+' : ''}${fmt(result.summary.cagr)}%`}
                        trend={result.summary.cagr >= 0 ? 'up' : 'down'}
                      />
                    </div>
                  </div>
                </div>

                <div className="group relative rounded-2xl border border-violet-500/15 bg-gradient-to-b from-white/[0.03] to-transparent p-5 hover:border-violet-500/30 transition-all duration-300">
                  <div className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-gradient-to-r from-violet-400 to-purple-500 opacity-60" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <LineChart className="w-4 h-4 text-violet-300" />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Growth vs NIFTY 50</p>
                    </div>
                    <GrowthChart dataPoints={result.dataPoints} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="group relative rounded-2xl border border-violet-500/15 bg-gradient-to-b from-white/[0.03] to-transparent p-4 hover:border-violet-500/30 transition-all duration-300">
                    <div className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-gradient-to-r from-violet-400 to-purple-500 opacity-60" />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-slate-500 tracking-wide">NIFTY 50 Return</span>
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          <BarChart3 className="w-3.5 h-3.5 text-violet-300" />
                        </div>
                      </div>
                      <p className={`text-lg font-bold ${result.summary.benchmarkReturn >= 0 ? 'text-violet-400' : 'text-rose-400'}`}>
                        {fmtPercent(result.summary.benchmarkReturn)}
                      </p>
                    </div>
                  </div>
                  <div className="group relative rounded-2xl border border-emerald-500/15 bg-gradient-to-b from-white/[0.03] to-transparent p-4 hover:border-emerald-500/30 transition-all duration-300">
                    <div className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 opacity-60" />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-slate-500 tracking-wide">Alpha (vs NIFTY 50)</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                        </div>
                      </div>
                      <p className={`text-lg font-bold ${result.summary.alpha >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {fmtPercent(result.summary.alpha)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                  <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {result.mode === 'sip'
                      ? `SIP of ₹${fmt(parseFloat(amount))}/month from ${result.startDate} to ${result.endDate}.`
                      : `Lump sum investment of ${fmtCurrency(result.summary.totalInvested)} on ${result.startDate}.`}
                    {' '}Current price: ₹{fmt(result.currentPrice)}. Past performance is not indicative of future results.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full min-h-[400px] text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
                  <Calculator className="w-7 h-7 text-white/[0.12]" />
                </div>
                <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                  Select a stock, enter your investment amount and date, then click <span className="text-cyan-400 font-medium">Calculate Returns</span> to see how your investment would have grown.
                </p>
                <div className="flex items-center gap-2 mt-6 text-[11px] text-slate-600">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400/50" />
                  <span>Compare your returns against NIFTY 50 benchmark</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </PageTransition>
  );
}
