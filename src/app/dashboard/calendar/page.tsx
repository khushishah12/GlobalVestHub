'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search, CalendarDays, Table2, TrendingUp,
  Loader2, RefreshCw, ChevronLeft, ChevronRight, Clock, Coins,
} from 'lucide-react';
import PageTransition from '@/components/dashboard/PageTransition';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface EarningsEvent {
  id: number;
  symbol: string;
  company_name: string;
  exchange: string;
  event_date: string;
  event_time: string;
  event_type: string;
  sector: string;
  quarter: string;
  fiscal_year: number;
  description: string;
  source: string;
}

interface IpoEvent {
  id: number;
  gmp: number;
  symbol: string;
  company_name: string;
  exchange: string;
  ipo_date: string;
  issue_type: string;
  price_band: string;
  lot_size: number;
  min_investment: number;
  sector: string;
  status: string;
  description: string;
  source: string;
}

type SortField = 'event_date' | 'company_name';
type IpoSortField = 'ipo_date' | 'company_name' | 'min_investment';
type ViewMode = 'table' | 'calendar';
type TabType = 'earnings' | 'ipos';

const EVENT_STYLES: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
  quarterly_results: { label: 'Results', bg: 'bg-blue-500/15', text: 'text-blue-300', dot: 'bg-blue-400', border: 'border-l-blue-400/40' },
  earnings: { label: 'Earnings', bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-400', border: 'border-l-emerald-400/40' },
  guidance: { label: 'Guidance', bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400', border: 'border-l-amber-400/40' },
  dividend: { label: 'Dividend', bg: 'bg-purple-500/15', text: 'text-purple-300', dot: 'bg-purple-400', border: 'border-l-purple-400/40' },
};

const IPO_STATUS_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  upcoming: { label: 'Upcoming', bg: 'bg-blue-500/15', text: 'text-blue-300', dot: 'bg-blue-400' },
  open: { label: 'Open', bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  closed: { label: 'Closed', bg: 'bg-slate-500/15', text: 'text-slate-300', dot: 'bg-slate-400' },
  listing: { label: 'Listing', bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
};

const TIME_LABELS: Record<string, string> = {
  before_open: 'Before Market',
  after_close: 'After Market',
  not_specified: 'Not Specified',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function dayOfWeek(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
}

function isToday(d: string): boolean {
  return new Date(d + 'T00:00:00').toDateString() === new Date().toDateString();
}

function daysUntil(d: string): number {
  return Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400000);
}

function getMonthDays(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < first; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

function fmtPrice(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CalendarPage() {
  const [tab, setTab] = useState<TabType>('earnings');
  const [events, setEvents] = useState<EarningsEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [ipos, setIpos] = useState<IpoEvent[]>([]);
  const [iposLoading, setIposLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('table');
  const [ipoView, setIpoView] = useState<ViewMode>('table');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterExchange, setFilterExchange] = useState('all');
  const [filterRange, setFilterRange] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterIssueType, setFilterIssueType] = useState('all');
  const [sortField, setSortField] = useState<string>('event_date');
  const [ipoSortField, setIpoSortField] = useState<IpoSortField>('ipo_date');
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [ipoCalMonth, setIpoCalMonth] = useState(new Date().getMonth());
  const [ipoCalYear, setIpoCalYear] = useState(new Date().getFullYear());
  const [focused, setFocused] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();

  const fetchEvents = useCallback(async (forceRefresh = false) => {
    setEventsLoading(true);
    try {
      const res = await fetch(`/api/stocks/calendar${forceRefresh ? '?refresh=true' : ''}`);
      const data = await res.json();
      if (data.events) setEvents(data.events);
    } catch {}
    setEventsLoading(false);
  }, []);

  const fetchIpos = useCallback(async (forceRefresh = false) => {
    setIposLoading(true);
    try {
      const res = await fetch(`/api/stocks/ipos${forceRefresh ? '?refresh=true' : ''}`);
      const data = await res.json();
      if (data.ipos) setIpos(data.ipos);
    } catch {}
    setIposLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchIpos(); }, [fetchIpos]);

  const refresh = useCallback(() => {
    if (tab === 'earnings') fetchEvents(true);
    else fetchIpos(true);
  }, [tab, fetchEvents, fetchIpos]);

  const processedEvents = useMemo(() => {
    let f = [...events];
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter(e => e.company_name.toLowerCase().includes(q) || e.symbol.toLowerCase().includes(q));
    }
    if (filterExchange !== 'all') f = f.filter(e => e.exchange?.toUpperCase() === filterExchange.toUpperCase());
    const todayStr = new Date(now).toISOString().split('T')[0];
    if (filterRange === 'today') f = f.filter(e => e.event_date === todayStr);
    else if (filterRange === 'week') { const end = new Date(now + 7 * 86400000).toISOString().split('T')[0]; f = f.filter(e => e.event_date >= todayStr && e.event_date <= end); }
    else if (filterRange === 'month') { const end = new Date(now + 30 * 86400000).toISOString().split('T')[0]; f = f.filter(e => e.event_date >= todayStr && e.event_date <= end); }
    f.sort((a, b) => sortField === 'event_date' ? a.event_date.localeCompare(b.event_date) : a.company_name.localeCompare(b.company_name));
    return f;
  }, [events, search, filterExchange, filterRange, sortField, now]);

  const processedIpos = useMemo(() => {
    let f = [...ipos];
    if (search.trim()) { const q = search.toLowerCase(); f = f.filter(e => e.company_name.toLowerCase().includes(q) || e.symbol.toLowerCase().includes(q)); }
    if (filterExchange !== 'all') f = f.filter(e => e.exchange?.toUpperCase() === filterExchange.toUpperCase());
    if (filterStatus !== 'all') f = f.filter(e => e.status === filterStatus);
    if (filterIssueType !== 'all') f = f.filter(e => e.issue_type === filterIssueType);
    f.sort((a, b) => { if (ipoSortField === 'ipo_date') return a.ipo_date.localeCompare(b.ipo_date); if (ipoSortField === 'company_name') return a.company_name.localeCompare(b.company_name); return a.min_investment - b.min_investment; });
    return f;
  }, [ipos, search, filterExchange, filterStatus, filterIssueType, ipoSortField]);

  const calendarEvents = useMemo(() => {
    const map = new Map<string, EarningsEvent[]>();
    for (const e of events) { const d = e.event_date; if (!map.has(d)) map.set(d, []); map.get(d)!.push(e); }
    return map;
  }, [events]);

  const ipoCalendarEvents = useMemo(() => {
    const map = new Map<string, IpoEvent[]>();
    for (const e of ipos) { const d = e.ipo_date; if (!map.has(d)) map.set(d, []); map.get(d)!.push(e); }
    return map;
  }, [ipos]);

  const days = useMemo(() => getMonthDays(calYear, calMonth), [calYear, calMonth]);
  const ipoDays = useMemo(() => getMonthDays(ipoCalYear, ipoCalMonth), [ipoCalYear, ipoCalMonth]);

  const stats = useMemo(() => ({ upcoming: events.filter(e => e.event_date >= today).length, sectors: new Set(events.map(e => e.sector).filter(Boolean)).size }), [events, today]);
  const ipoStats = useMemo(() => ({ upcoming: ipos.filter(e => e.ipo_date >= today).length, open: ipos.filter(e => e.status === 'open').length }), [ipos, today]);
  const loading = tab === 'earnings' ? eventsLoading : iposLoading;

  return (
    <PageTransition>
      <div className="flex justify-center p-[10px] min-h-screen bg-[#070912]">
        <div style={{ width: '90%', maxWidth: '1400px' }}>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/*  HERO HEADER STRIP                                          */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <header className="relative mb-[50px] w-full bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-transparent border-y border-white/[0.05]">
            <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tab === 'ipos' ? 'bg-violet-500/10' : 'bg-cyan-500/10'}`}>
                  {tab === 'ipos' ? <Coins className="w-5 h-5 text-violet-300" /> : <CalendarDays className="w-5 h-5 text-cyan-300" />}
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{tab === 'ipos' ? 'IPO Calendar' : 'Earnings Calendar'}</h1>
                  <p className="text-sm text-slate-400">{tab === 'ipos' ? 'Track upcoming IPOs, listings, and offerings' : 'Track quarterly results, dividends, and guidance'}</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-3">
                <button onClick={refresh} disabled={loading}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
            </div>
          </header>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/*  NOTEBOOK CONTAINER                                         */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="w-full bg-[#0a0c14] border border-white/[0.05] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">

            <div className="h-5 w-full" />

            {/* ──── TAB BAR: Earnings | IPOs ──── */}
            <div className="flex items-stretch border-b border-white/[0.05] gap-3">
              <button onClick={() => setTab('earnings')}
                className={`flex items-center gap-3 px-8 md:px-10 py-4 text-sm font-semibold transition-all relative ${tab === 'earnings' ? 'text-cyan-300 bg-cyan-500/5' : 'text-slate-500 hover:text-white hover:bg-white/[0.02]'}`}>
                <CalendarDays className="w-4 h-4" />
                <span>Earnings</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${tab === 'earnings' ? 'bg-cyan-500/15 text-cyan-300' : 'bg-white/[0.04] text-slate-500'}`}>{stats.upcoming}</span>
                {tab === 'earnings' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 to-blue-500" />}
              </button>
              <div className="w-px self-stretch bg-white/[0.05]" />
              <button onClick={() => setTab('ipos')}
                className={`flex items-center gap-3 px-8 md:px-10 py-4 text-sm font-semibold transition-all relative ${tab === 'ipos' ? 'text-violet-300 bg-violet-500/5' : 'text-slate-500 hover:text-white hover:bg-white/[0.02]'}`}>
                <Coins className="w-4 h-4" />
                <span>IPOs</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${tab === 'ipos' ? 'bg-violet-500/15 text-violet-300' : 'bg-white/[0.04] text-slate-500'}`}>{ipoStats.upcoming}</span>
                {tab === 'ipos' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-400 to-purple-500" />}
              </button>
              <div className="flex-1" />
              <div className="flex items-center px-6 md:px-8">
                <div className="flex gap-2 rounded-lg border border-white/[0.08] bg-black/40 p-1">
                  <button onClick={() => { if (tab === 'earnings') setView('table'); else setIpoView('table'); }}
                    className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-all ${(tab === 'earnings' ? view : ipoView) === 'table'
                      ? (tab === 'earnings' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-violet-500/20 text-violet-300')
                      : 'text-slate-500 hover:text-white'}`}>
                    <Table2 className="w-3.5 h-3.5" /> Table
                  </button>
                  <button onClick={() => { if (tab === 'earnings') setView('calendar'); else setIpoView('calendar'); }}
                    className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-all ${(tab === 'earnings' ? view : ipoView) === 'calendar'
                      ? (tab === 'earnings' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-violet-500/20 text-violet-300')
                      : 'text-slate-500 hover:text-white'}`}>
                    <CalendarDays className="w-3.5 h-3.5" /> Calendar
                  </button>
                </div>
              </div>
            </div>

            {/* ──── TOOLBAR: SEARCH + FILTERS ──── */}
            <div className="px-8 border-b border-white/[0.05]">
              <div className="h-5 w-full" />
              <div className="flex flex-wrap items-center gap-5">
                <div className="relative flex-1 min-w-[240px]">
                  <div className={`flex items-center gap-3 px-5 py-3.5 border-2 rounded-xl transition-all duration-300 ${
                    focused
                      ? 'border-cyan-500/50 bg-white/[0.08] shadow-[0_0_20px_rgba(0,229,255,0.12)]'
                      : 'border-cyan-500/20 bg-white/[0.04] hover:border-cyan-500/40 hover:bg-white/[0.06] hover:shadow-[0_0_16px_rgba(0,229,255,0.06)]'
                  }`}>
                    <Search className={`w-5 h-5 shrink-0 transition-colors duration-300 ${focused || search ? 'text-cyan-400' : 'text-cyan-400/60'}`} />
                    <input type="text" value={searchInput} onChange={(e) => { const v = e.target.value; setSearchInput(v); if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => setSearch(v), 200); }}
                      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                      placeholder={tab === 'earnings' ? 'Search by company or symbol...' : 'Search IPOs by company or symbol...'}
                      className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none tracking-wide" />
                    {searchInput && (
                      <button onClick={() => { setSearchInput(''); setSearch(''); }} className="p-1 rounded-full hover:bg-white/[0.08] transition">
                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
              </div>
              <div className="h-5 w-full" />
            </div>

                <div className="flex flex-wrap items-center gap-3">
                  {tab === 'earnings' ? (
                    <>
                      <FilterSelect value={filterRange} onChange={setFilterRange} label="All Dates">
                        <option value="all">All Dates</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">Next 30 Days</option>
                      </FilterSelect>
                      <FilterSelect value={filterExchange} onChange={setFilterExchange} label="All Exchanges">
                        <option value="all">All Exchanges</option>
                        <option value="NSE">NSE</option>
                        <option value="BSE">BSE</option>
                      </FilterSelect>
                      <FilterSelect value={sortField} onChange={(v) => setSortField(v)} label="Sort">
                        <option value="event_date">Sort: Date</option>
                        <option value="company_name">Sort: Name</option>
                      </FilterSelect>
                    </>
                  ) : (
                    <>
                      <FilterSelect value={filterStatus} onChange={setFilterStatus} label="All Status">
                        <option value="all">All Status</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="listing">Listing</option>
                      </FilterSelect>
                      <FilterSelect value={filterIssueType} onChange={setFilterIssueType} label="All Types">
                        <option value="all">All Types</option>
                        <option value="mainboard">Mainboard</option>
                        <option value="sme">SME</option>
                      </FilterSelect>
                      <FilterSelect value={filterExchange} onChange={setFilterExchange} label="All Exchanges">
                        <option value="all">All Exchanges</option>
                        <option value="NSE">NSE</option>
                        <option value="BSE">BSE</option>
                      </FilterSelect>
                      <FilterSelect value={ipoSortField} onChange={(v) => setIpoSortField(v as IpoSortField)} label="Sort">
                        <option value="ipo_date">Sort: Date</option>
                        <option value="company_name">Sort: Name</option>
                        <option value="min_investment">Sort: Min Investment</option>
                      </FilterSelect>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ──── CONTENT AREA ──── */}
            <div className="p-8">
              {loading && ((tab === 'earnings' ? events : ipos).length === 0) ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                </div>
              ) : tab === 'earnings' ? (
                view === 'table' ? <EarningsTableView events={processedEvents} /> : (
                  <CalendarView days={days} year={calYear} month={calMonth} events={calendarEvents} accent="cyan"
                    onPrev={() => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); }}
                    onNext={() => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); }} />
                )
              ) : ipoView === 'table' ? <IpoTableView ipos={processedIpos} /> : (
                <IpoCalendarView days={ipoDays} year={ipoCalYear} month={ipoCalMonth} ipos={ipoCalendarEvents}
                  onPrev={() => { if (ipoCalMonth === 0) { setIpoCalYear(y => y - 1); setIpoCalMonth(11); } else setIpoCalMonth(m => m - 1); }}
                  onNext={() => { if (ipoCalMonth === 11) { setIpoCalYear(y => y + 1); setIpoCalMonth(0); } else setIpoCalMonth(m => m + 1); }} />
              )}
            </div>

            <div className="h-5 w-full" />

          </div>
        </div>
      </div>
    </PageTransition>
  );
}

/* ------------------------------------------------------------------ */
/*  FilterSelect                                                       */
/* ------------------------------------------------------------------ */

function FilterSelect({ value, onChange, label, children }: {
  value: string; onChange: (v: string) => void; label: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { options, currentLabel } = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    let lbl = label;
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === 'option') {
        const p = child.props as { value: string; children: string };
        opts.push({ value: p.value, label: p.children });
        if (p.value === value) lbl = p.children;
      }
    });
    return { options: opts, currentLabel: lbl };
  }, [children, value, label]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-xs font-medium text-white outline-none transition hover:border-white/[0.25] hover:bg-white/[0.09]">
        <span className="flex-1 text-left whitespace-nowrap">{currentLabel}</span>
        <svg className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-xl border border-white/[0.12] bg-[#151822] py-1 shadow-2xl shadow-black/60 backdrop-blur-xl">
          {options.map(opt => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full px-4 py-2.5 text-left text-xs font-medium transition ${opt.value === value ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Earnings Table View                                                */
/* ------------------------------------------------------------------ */

function EarningsTableView({ events }: { events: EarningsEvent[] }) {
  if (events.length === 0) {
    return <div className="flex h-64 flex-col items-center justify-center gap-2">
      <TrendingUp className="h-8 w-8 text-slate-600" />
      <p className="text-sm text-slate-500">No events match your filters</p>
    </div>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-black/20">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-white/[0.06] text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <th className="px-5 py-4">Date</th>
            <th className="px-5 py-4">Company</th>
            <th className="px-5 py-4">Symbol</th>
            <th className="px-5 py-4">Exchange</th>
            <th className="px-5 py-4">Event</th>
            <th className="px-5 py-4">Quarter</th>
            <th className="px-5 py-4">Time</th>
            <th className="px-5 py-4">Sector</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const es = EVENT_STYLES[e.event_type] || EVENT_STYLES.quarterly_results;
            const du = daysUntil(e.event_date);
            const isT = isToday(e.event_date);
            return (
              <tr key={e.id} className={`border-b border-white/[0.04] transition hover:bg-white/[0.03] ${isT ? 'bg-cyan-500/5' : ''}`}>
                <td className={`border-l-2 px-5 py-4 ${isT ? es.border : 'border-l-transparent'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="flex flex-col items-center justify-center rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="text-[9px] font-medium uppercase text-slate-500">{dayOfWeek(e.event_date)}</span>
                      <span className="text-sm font-bold text-white">{new Date(e.event_date + 'T00:00:00').getDate()}</span>
                      <span className="text-[9px] text-slate-400">{new Date(e.event_date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}</span>
                      <span className="text-[8px] text-slate-600">{new Date(e.event_date + 'T00:00:00').getFullYear()}</span>
                    </div>
                    {du === 0 && <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-medium text-cyan-300">Today</span>}
                    {du === 1 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">Tomorrow</span>}
                  </div>
                </td>
                <td className="px-5 py-4"><span className="text-sm font-semibold text-white">{e.company_name}</span></td>
                <td className="px-5 py-4"><span className="rounded-lg bg-white/[0.06] px-2.5 py-1 font-mono text-xs font-medium text-slate-200">{e.symbol}</span></td>
                <td className="px-5 py-4"><span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-xs text-slate-400">{e.exchange}</span></td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${es.bg} ${es.text} ring-1 ring-inset ring-white/5`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${es.dot}`} />{es.label}
                  </span>
                </td>
                <td className="px-5 py-4"><span className="text-xs font-medium text-slate-400">{e.quarter} <span className="text-slate-600">FY</span>{e.fiscal_year}</span></td>
                <td className="px-5 py-4">
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="h-3 w-3 text-slate-500" />{TIME_LABELS[e.event_time] || '—'}
                  </span>
                </td>
                <td className="px-5 py-4"><span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-500">{e.sector}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  IPO Table View                                                     */
/* ------------------------------------------------------------------ */

function IpoTableView({ ipos }: { ipos: IpoEvent[] }) {
  if (ipos.length === 0) {
    return <div className="flex h-64 flex-col items-center justify-center gap-2">
      <Coins className="h-8 w-8 text-slate-600" />
      <p className="text-sm text-slate-500">No IPOs match your filters</p>
    </div>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-black/20">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-white/[0.06] text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <th className="px-5 py-4">Date</th>
            <th className="px-5 py-4">Company</th>
            <th className="px-5 py-4">Symbol</th>
            <th className="px-5 py-4">Exchange</th>
            <th className="px-5 py-4">Type</th>
            <th className="px-5 py-4">Price Band</th>
            <th className="px-5 py-4">GMP</th>
            <th className="px-5 py-4">Lot</th>
            <th className="px-5 py-4">Min Inv.</th>
            <th className="px-5 py-4">Sector</th>
            <th className="px-5 py-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {ipos.map((e) => {
            const st = IPO_STATUS_STYLES[e.status] || IPO_STATUS_STYLES.upcoming;
            const du = daysUntil(e.ipo_date);
            const isT = isToday(e.ipo_date);
            return (
              <tr key={e.id} className={`border-b border-white/[0.04] transition hover:bg-white/[0.03] ${isT ? 'bg-violet-500/5' : ''}`}>
                <td className={`border-l-2 px-5 py-4 ${isT ? 'border-l-violet-400/40' : 'border-l-transparent'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="flex flex-col items-center justify-center rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="text-[9px] font-medium uppercase text-slate-500">{dayOfWeek(e.ipo_date)}</span>
                      <span className="text-sm font-bold text-white">{new Date(e.ipo_date + 'T00:00:00').getDate()}</span>
                      <span className="text-[9px] text-slate-400">{new Date(e.ipo_date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}</span>
                      <span className="text-[8px] text-slate-600">{new Date(e.ipo_date + 'T00:00:00').getFullYear()}</span>
                    </div>
                    {du === 0 && <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-300">Today</span>}
                    {du === 1 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">Tomorrow</span>}
                    {du > 1 && du <= 7 && <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-300">D-{du}</span>}
                  </div>
                </td>
                <td className="px-5 py-4"><span className="text-sm font-semibold text-white">{e.company_name}</span></td>
                <td className="px-5 py-4"><span className="rounded-lg bg-white/[0.06] px-2.5 py-1 font-mono text-xs font-medium text-slate-200">{e.symbol}</span></td>
                <td className="px-5 py-4"><span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-xs text-slate-400">{e.exchange}</span></td>
                <td className="px-5 py-4">
                  <span className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${e.issue_type === 'sme' ? 'bg-yellow-500/10 text-yellow-300 ring-1 ring-inset ring-yellow-500/20' : 'bg-blue-500/10 text-blue-300 ring-1 ring-inset ring-blue-500/20'}`}>
                    {e.issue_type === 'sme' ? 'SME' : 'Mainboard'}
                  </span>
                </td>
                <td className="px-5 py-4"><span className="whitespace-nowrap font-mono text-xs font-medium text-emerald-300">{e.price_band}</span></td>
                <td className="px-5 py-4">
                  {e.gmp > 0 ? (() => {
                    const lower = parseFloat(e.price_band.replace(/[₹,\s]/g, '').split('–')[0]);
                    const pct = lower > 0 ? ((e.gmp / lower) * 100).toFixed(1) : '0.0';
                    return (
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-amber-300">
                        <TrendingUp className="h-3 w-3 text-amber-400" />
                        ₹{e.gmp}
                        <span className="text-[10px] text-amber-400/70">(+{pct}%)</span>
                      </span>
                    );
                  })() : <span className="font-mono text-xs text-slate-500">—</span>}
                </td>
                <td className="px-5 py-4"><span className="font-mono text-xs text-slate-400">{e.lot_size}</span></td>
                <td className="px-5 py-4"><span className="font-mono text-xs font-medium text-slate-200">{fmtPrice(e.min_investment)}</span></td>
                <td className="px-5 py-4"><span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-500">{e.sector}</span></td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${st.bg} ${st.text} ring-1 ring-inset ring-white/5`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{st.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Calendar View                                                      */
/* ------------------------------------------------------------------ */

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function CalendarView({ days, year, month, events, accent = 'cyan', onPrev, onNext }: {
  days: (number | null)[]; year: number; month: number; events: Map<string, EarningsEvent[]>; accent?: 'cyan' | 'violet'; onPrev: () => void; onNext: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const a = accent === 'violet'
    ? { border: 'border-violet-400/40', bg: 'from-violet-500/10', shadow: 'shadow-violet-500/5', circleBg: 'bg-violet-400', circleText: 'text-[#0b1120]', more: 'text-violet-400/70' }
    : { border: 'border-cyan-400/40', bg: 'from-cyan-500/10', shadow: 'shadow-cyan-500/5', circleBg: 'bg-cyan-400', circleText: 'text-[#0b1120]', more: 'text-cyan-400/70' };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onPrev} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-black/40 text-slate-400 transition hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold text-white">{MONTH_NAMES[month]} <span className="text-slate-500">{year}</span></h2>
        <button onClick={onNext} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-black/40 text-slate-400 transition hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-2.5 text-center text-xs font-bold uppercase tracking-widest text-slate-500">{d}</div>
        ))}
        {days.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} className="min-h-[140px] rounded-xl bg-white/[0.03]" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayEvents = events.get(dateStr) || [];
          const isT = dateStr === today;
          return (
            <div key={dateStr} className={`min-h-[140px] rounded-xl border p-3 transition ${isT ? `${a.border} bg-gradient-to-b ${a.bg} to-transparent shadow-md ${a.shadow}` : dayEvents.length > 0 ? 'border-white/[0.08] bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]' : 'border-white/[0.04] bg-white/[0.02] hover:border-white/10'}`}>
              <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${isT ? `${a.circleBg} ${a.circleText} shadow-sm` : 'text-slate-300'}`}>{d}</div>
              <div className="space-y-1.5">
                {dayEvents.slice(0, 3).map(e => {
                  const es = EVENT_STYLES[e.event_type] || EVENT_STYLES.quarterly_results;
                  return (
                    <div key={e.id} className="group relative truncate rounded-lg px-2 py-1.5 text-[11px] leading-tight bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.04] hover:border-white/10 cursor-default" title={`${e.company_name} · ${es.label} ${e.quarter}`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${es.dot} shadow-sm`} />
                        <span className="truncate font-semibold text-slate-100">{e.symbol}</span>
                      </div>
                      <div className="truncate text-[10px] text-slate-500 pl-3.5">{es.label} &middot; {e.quarter}</div>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && <div className={`text-xs font-semibold ${a.more} hover:opacity-100 transition cursor-pointer`}>+{dayEvents.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  IPO Calendar View                                                  */
/* ------------------------------------------------------------------ */

const IPO_CAL_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  upcoming: { label: 'Upcoming', bg: 'bg-blue-500/15', text: 'text-blue-300', dot: 'bg-blue-400' },
  open: { label: 'Open', bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  closed: { label: 'Closed', bg: 'bg-slate-500/15', text: 'text-slate-300', dot: 'bg-slate-400' },
  listing: { label: 'Listing', bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
};

function IpoCalendarView({ days, year, month, ipos, onPrev, onNext }: {
  days: (number | null)[]; year: number; month: number; ipos: Map<string, IpoEvent[]>; onPrev: () => void; onNext: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const a = { border: 'border-violet-400/40', bg: 'from-violet-500/10', shadow: 'shadow-violet-500/5', circleBg: 'bg-violet-400', circleText: 'text-[#0b1120]', more: 'text-violet-400/70' };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onPrev} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-black/40 text-slate-400 transition hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold text-white">{MONTH_NAMES[month]} <span className="text-slate-500">{year}</span></h2>
        <button onClick={onNext} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-black/40 text-slate-400 transition hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-2.5 text-center text-xs font-bold uppercase tracking-widest text-slate-500">{d}</div>
        ))}
        {days.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} className="min-h-[140px] rounded-xl bg-white/[0.03]" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayIpos = ipos.get(dateStr) || [];
          const isT = dateStr === today;
          return (
            <div key={dateStr} className={`min-h-[140px] rounded-xl border p-3 transition ${isT ? `${a.border} bg-gradient-to-b ${a.bg} to-transparent shadow-md ${a.shadow}` : dayIpos.length > 0 ? 'border-white/[0.08] bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]' : 'border-white/[0.04] bg-white/[0.02] hover:border-white/10'}`}>
              <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${isT ? `${a.circleBg} ${a.circleText} shadow-sm` : 'text-slate-300'}`}>{d}</div>
              <div className="space-y-1.5">
                {dayIpos.slice(0, 3).map(e => {
                  const st = IPO_CAL_STYLES[e.status] || IPO_CAL_STYLES.upcoming;
                  return (
                    <div key={e.id} className="group relative truncate rounded-lg px-2 py-1.5 text-[11px] leading-tight bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.04] hover:border-white/10 cursor-default" title={`${e.company_name} · ${st.label} · ${e.price_band}`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${st.dot} shadow-sm`} />
                        <span className="truncate font-semibold text-slate-100">{e.symbol}</span>
                      </div>
                      <div className="truncate text-[10px] text-slate-500 pl-3.5">{st.label} &middot; {e.price_band}</div>
                    </div>
                  );
                })}
                {dayIpos.length > 3 && <div className={`text-xs font-semibold ${a.more} hover:opacity-100 transition cursor-pointer`}>+{dayIpos.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
