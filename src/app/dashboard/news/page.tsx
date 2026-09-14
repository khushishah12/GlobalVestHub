'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Newspaper, ExternalLink, Clock, Building2, Loader2, TrendingUp, TrendingDown, Minus, ArrowLeft, X, ArrowUpRight } from 'lucide-react';
import PageTransition from '../../../components/dashboard/PageTransition';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StockResult {
  company_name: string;
  symbol: string;
  exchange: string;
  sector: string;
}

interface Article {
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 30) return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (days > 7) return `${Math.floor(days / 7)}w ago`;
  if (days > 0) return `${days}d ago`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs > 0) return `${hrs}h ago`;
  return 'Just now';
}

function extractSentiment(title: string, desc: string): 'positive' | 'negative' | 'neutral' {
  const t = (title + ' ' + desc).toLowerCase();
  const pos = ['surge', 'rally', 'gain', 'profit', 'bull', 'rise', 'up', 'positive', 'growth', 'record', 'high', 'beat'];
  const neg = ['fall', 'drop', 'loss', 'decline', 'bear', 'down', 'negative', 'crash', 'low', 'miss', 'cut', 'slump'];
  const pScore = pos.filter(w => t.includes(w)).length;
  const nScore = neg.filter(w => t.includes(w)).length;
  if (pScore > nScore) return 'positive';
  if (nScore > pScore) return 'negative';
  return 'neutral';
}

const SENTIMENT_STYLE = {
  positive: { border: 'border-emerald-500/30', badge: 'bg-emerald-500/15 text-emerald-300', icon: TrendingUp },
  negative: { border: 'border-rose-500/30', badge: 'bg-rose-500/15 text-rose-300', icon: TrendingDown },
  neutral: { border: 'border-slate-500/30', badge: 'bg-slate-500/15 text-slate-300', icon: Minus },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewsPage() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<StockResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [selected, setSelected] = useState<StockResult | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState('');
  const [stockMode, setStockMode] = useState(false);
  const [detailArticle, setDetailArticle] = useState<Article | null>(null);
  const [detailContent, setDetailContent] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Load latest news on mount ── */
  useEffect(() => {
    loadLatest(1);
  }, []);

  async function loadLatest(p: number) {
    setNewsLoading(true);
    setNewsError('');
    try {
      const res = await fetch(`/api/stocks/news-latest?page=${p}`);
      if (!res.ok) { setNewsError(`Server error (${res.status})`); setArticles([]); return; }
      const data = await res.json();
      if (data.error) { setNewsError(data.error); setArticles([]); return; }
      setArticles(data.articles || []);
      setPage(p);
      setTotalPages(data.totalPages ?? Math.ceil((data.total ?? 0) / (data.perPage ?? 9)));
    } catch (e) {
      setNewsError('Network error — could not reach server');
      setArticles([]);
    }
    setNewsLoading(false);
  }

  /* ── Search stocks ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      debounceRef.current = setTimeout(() => {
        setSuggestions([]);
        setShowDropdown(false);
      }, 0);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/news-search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setSuggestions(data.results || []);
        setShowDropdown(true);
      } catch {}
    }, 250);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Select stock ── */
  const selectStock = useCallback(async (s: StockResult) => {
    setStockMode(true);
    setSelected(s);
    setShowDropdown(false);
    setQuery(`${s.company_name} (${s.symbol})`);
    setNewsLoading(true);
    setNewsError('');

    try {
      const res = await fetch(`/api/stocks/news-fetch?symbol=${encodeURIComponent(s.symbol)}&company_name=${encodeURIComponent(s.company_name)}`);
      if (!res.ok) { setNewsError(`Server error (${res.status})`); setArticles([]); return; }
      const data = await res.json();
      if (data.error) { setNewsError(data.error); setArticles([]); return; }
      setArticles(data.articles || []);
      setTotalPages(1);
    } catch {
      setNewsError('Network error — could not reach server');
      setArticles([]);
    }

    setNewsLoading(false);
  }, []);

  /* ── Back to all news ── */
  const backToAll = useCallback(() => {
    setStockMode(false);
    setSelected(null);
    setQuery('');
    setPage(1);
    setNewsError('');
    loadLatest(1);
  }, []);

  /* ── Go to page ── */
  const goToPage = useCallback((p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    loadLatest(p);
  }, [page, totalPages]);

  /* ── Open article detail ── */
  const openArticle = useCallback(async (article: Article) => {
    setDetailArticle(article);
    setDetailContent('');
    setDetailError('');
    setDetailLoading(true);
    try {
      const res = await fetch('/api/stocks/news-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: article.url }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setDetailError(data.error || `Server error (${res.status})`);
      } else {
        setDetailContent(data.content || '');
      }
    } catch {
      setDetailError('Network error — could not fetch article');
    }
    setDetailLoading(false);
  }, []);

  return (
    <PageTransition>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700&display=swap');

        .np-bg {
          background:
            repeating-linear-gradient(90deg, transparent, transparent 38px, rgba(255,255,255,0.012) 38px, rgba(255,255,255,0.012) 39px),
            repeating-linear-gradient(0deg, transparent, transparent 120px, rgba(255,255,255,0.006) 120px, rgba(255,255,255,0.006) 121px),
            radial-gradient(ellipse at 15% 40%, rgba(180,150,110,0.04) 0%, transparent 60%),
            radial-gradient(ellipse at 85% 60%, rgba(180,150,110,0.03) 0%, transparent 60%),
            linear-gradient(135deg, rgba(255,255,255,0.008) 0%, transparent 50%, rgba(0,0,0,0.04) 100%);
        }
        .np-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 128px 128px;
        }
        .np-rule {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 15%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 85%, transparent 100%);
          height: 2px;
        }
        .np-rule-thick {
          background: linear-gradient(90deg, transparent 0%, rgba(220,50,50,0.15) 20%, rgba(220,50,50,0.08) 50%, rgba(220,50,50,0.15) 80%, transparent 100%);
          height: 3px;
        }
        .np-fold {
          background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.04) 30%, rgba(0,0,0,0.02) 50%, transparent 70%);
          height: 100%;
          width: 100%;
          position: absolute;
          top: 0;
          left: 0;
          pointer-events: none;
        }
        .np-text-fragment {
          position: absolute;
          font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
          font-size: 7px;
          line-height: 1;
          color: rgba(255,255,255,0.025);
          letter-spacing: 0.5px;
          pointer-events: none;
          user-select: none;
          overflow: hidden;
          text-transform: uppercase;
        }
        .np-date-line {
          font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
          font-size: 9px;
          font-style: italic;
          letter-spacing: 0.3px;
        }
        .np-headline {
          font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
          font-weight: 800;
        }
        .np-body {
          font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
        }
        .np-pager {
          font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
        }
        .np-cutting {
          clip-path: polygon(0% 0%, 98% 0%, 100% 2%, 100% 98%, 99% 100%, 1% 100%, 0% 99%);
        }
        .np-cutting-sm {
          clip-path: polygon(0.5% 0.5%, 99% 0%, 99.5% 1%, 99.5% 98%, 98.5% 99.5%, 1.5% 99%, 0% 98%);
        }
        .np-cutting-lg {
          clip-path: polygon(0% 2%, 1% 0%, 99% 0%, 100% 1%, 100% 99%, 98% 100%, 0% 99%);
        }
        .np-tear {
          position: absolute;
          bottom: -6px;
          left: 0;
          right: 0;
          height: 12px;
          background: radial-gradient(ellipse at 10% 50%, rgba(0,0,0,0.06) 0%, transparent 70%),
                      radial-gradient(ellipse at 30% 50%, transparent 40%, rgba(0,0,0,0.04) 50%, transparent 60%),
                      radial-gradient(ellipse at 55% 50%, rgba(0,0,0,0.05) 0%, transparent 50%),
                      radial-gradient(ellipse at 75% 50%, transparent 30%, rgba(0,0,0,0.03) 40%, transparent 60%),
                      radial-gradient(ellipse at 90% 50%, rgba(0,0,0,0.04) 0%, transparent 50%);
          pointer-events: none;
        }
        .np-shadow-clipping {
          box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.04);
        }
        .pager-btn {
          font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
          min-width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
          color: rgba(255,255,255,0.5);
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
          cursor: pointer;
          user-select: none;
        }
        .pager-btn:hover {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.8);
          border-color: rgba(255,255,255,0.15);
        }
        .pager-btn.active {
          background: rgba(220,50,50,0.12);
          color: #f59e9e;
          border-color: rgba(220,50,50,0.25);
        }
        .pager-btn:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }
        .pager-nav {
          font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
          height: 36px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 14px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
          color: rgba(255,255,255,0.5);
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
          cursor: pointer;
        }
        .pager-nav:hover {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.8);
          border-color: rgba(255,255,255,0.15);
        }
        .pager-nav:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }
        .pager-ornament {
          font-family: 'Playfair Display', serif;
          color: rgba(220,50,50,0.15);
          font-size: 16px;
          line-height: 1;
          user-select: none;
        }

        .np-columns {
          column-count: 2;
          column-gap: 2.5rem;
          column-rule: 1px solid rgba(255,255,255,0.06);
          column-fill: auto;
          orphans: 2;
          widows: 2;
          min-height: 200px;
        }
        .np-columns-end {
          column-span: all;
        }
        .np-dropcap::first-letter {
          float: left;
          font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
          font-size: 3.5em;
          line-height: 0.8;
          padding-right: 0.35rem;
          padding-top: 0.15rem;
          color: rgba(255,255,255,0.85);
          font-weight: 900;
        }
        .np-para {
          text-align: justify;
          hyphens: auto;
        }
        .np-tear-article {
          background: repeating-linear-gradient(
            -2deg,
            transparent 0px,
            transparent 3px,
            rgba(0,0,0,0.04) 3px,
            rgba(0,0,0,0.04) 4px,
            transparent 4px,
            transparent 8px
          );
        }

        .np-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(220,50,50,0.15) rgba(255,255,255,0.03);
        }
        .np-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .np-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.03);
          border-radius: 3px;
        }
        .np-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(220,50,50,0.15);
          border-radius: 3px;
        }
        .np-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(220,50,50,0.25);
        }
      `}</style>
      <div className="flex justify-center p-[10px] min-h-screen bg-[#070912]">
        <div style={{ width: '90%', maxWidth: '1400px' }}>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/*  HERO HEADER STRIP                                          */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <header className="relative mb-[50px] w-full bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-transparent border-y border-white/[0.05]">
            <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Newspaper className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                    {stockMode ? (selected?.company_name || 'Stock News') : 'Stock News'}
                  </h1>
                  <p className="text-sm text-slate-400">
                    {stockMode ? `Latest news for ${selected?.company_name}` : 'Latest Indian market news, headlines and sentiment analysis.'}
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-3">
                {stockMode && (
                  <button onClick={backToAll}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs text-slate-300 transition hover:bg-white/[0.08]">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    All News
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/*  NOTEBOOK CONTAINER                                         */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="w-full bg-[#0a0c14] border border-white/[0.05] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">

            {/* ──── SEARCH BAR ──── */}
            <div className="px-8 border-b border-white/[0.05]">
              <div className="h-6 w-full" />
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center gap-3 px-5 py-3.5 border-2 rounded-xl transition-all duration-300 bg-white/[0.04] hover:border-cyan-500/40 hover:bg-white/[0.06] hover:shadow-[0_0_16px_rgba(0,229,255,0.06)] focus-within:border-cyan-500/50 focus-within:bg-white/[0.08] focus-within:shadow-[0_0_20px_rgba(0,229,255,0.12)]">
                  <Search className="w-5 h-5 shrink-0 text-cyan-400/60" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => { if (suggestions.length > 0 && query.trim()) setShowDropdown(true); }}
                    placeholder="Search company or symbol (e.g. Tata, RELIANCE, Infosys)..."
                    className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none tracking-wide"
                  />
                  {query && (
                    <button onClick={() => { setQuery(''); setSuggestions([]); setShowDropdown(false); }} className="p-1 rounded-full hover:bg-white/[0.08] transition">
                      <X className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  )}
                </div>

                {showDropdown && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-white/[0.08] bg-[#151822] p-1 shadow-2xl shadow-black/60">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => selectStock(s)}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition hover:bg-white/[0.06]"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 ring-1 ring-cyan-400/20">
                          <Building2 className="h-4 w-4 text-cyan-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{s.company_name}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-slate-300">{s.symbol}</span>
                            <span>{s.exchange}</span>
                            <span>{s.sector}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && suggestions.length === 0 && query.trim() && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-white/[0.08] bg-[#151822] p-4 text-center text-sm text-slate-500 shadow-2xl shadow-black/60">
                    No stocks found for &ldquo;{query.trim()}&rdquo;
                  </div>
                )}
              </div>
              <div className="h-6 w-full" />
            </div>

            {/* ──── STOCK INFO PILL ──── */}
            {stockMode && selected && (
              <div className="px-8 py-3 border-b border-white/[0.05]">
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-3">
                  <Building2 className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-white">{selected.company_name}</span>
                  <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-xs text-slate-300">{selected.symbol}</span>
                  <span className="text-xs text-slate-500">{selected.exchange}</span>
                  <span className="ml-auto text-xs text-slate-500">{articles.length} articles</span>
                </div>
              </div>
            )}

            {/* ──── NEWS GRID ──── */}
            <div className="relative px-8 pt-8 pb-0">
              {newsLoading && articles.length === 0 ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                    <p className="text-sm text-slate-500">Fetching latest news...</p>
                  </div>
                </div>
              ) : newsError ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3">
                  <Newspaper className="h-8 w-8 text-rose-500/50" />
                  <p className="text-sm text-rose-400">{newsError}</p>
                  <button onClick={() => loadLatest(1)}
                    className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-xs text-slate-400 transition hover:bg-white/[0.08]">
                    Retry
                  </button>
                </div>
              ) : articles.length > 0 ? (
                <>
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {articles.map((a, i) => {
                      const sentiment = extractSentiment(a.title, a.description);
                      const st = SENTIMENT_STYLE[sentiment];
                      const SentIcon = st.icon;
                      return (
                        <div
                          key={`${a.url || i}`}
                          onClick={() => openArticle(a)}
                          className="group relative cursor-pointer flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#161410] transition-all hover:border-white/[0.15] hover:shadow-xl hover:shadow-black/30"
                        >
                          <div className="np-bg absolute inset-0" />
                          <div className="np-noise absolute inset-0" />
                          <div className="np-fold" />
                          <div className="np-text-fragment" style={{ top: '12%', left: '8%', width: '60%' }}>MARKET INTELLIGENCE REPORT · DAILY BRIEF</div>
                          <div className="np-rule-thick mx-5 mt-5" />
                          <div className="relative z-10 px-5 pb-5 pt-4 flex flex-col flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <span className="np-body italic text-[11px] tracking-wide text-slate-400">{a.source}</span>
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${st.badge} ring-1 ring-inset ring-white/5`}>
                                <SentIcon className="h-3 w-3" />
                                {sentiment}
                              </span>
                            </div>
                            <h3 className="mb-2.5 line-clamp-3 text-sm font-extrabold leading-snug text-white transition group-hover:text-rose-300 np-headline">
                              {a.title}
                            </h3>
                            <div className="np-rule w-12 mb-3" />
                            {a.description && (
                              <p className="mb-4 line-clamp-3 text-[12px] leading-relaxed text-slate-400 np-body tracking-wide">
                                {a.description}
                              </p>
                            )}
                            <div className="mt-auto flex items-center justify-between pt-3.5 border-t border-white/[0.04] text-[11px] text-slate-500 np-body">
                              <span className="flex items-center gap-1.5 italic">
                                <Clock className="h-3 w-3 text-slate-500" />
                                {timeAgo(a.publishedAt)}
                              </span>
                              <span className="flex items-center gap-1.5 text-slate-400 transition group-hover:text-rose-300">
                                Read <ExternalLink className="h-3 w-3" />
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center gap-4 text-slate-600 np-pager text-[11px] italic tracking-widest">— {page} of {totalPages} —</div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => goToPage(page - 1)} disabled={page <= 1 || newsLoading} className="pager-nav">← Prev</button>
                        <div className="flex items-center gap-1">
                          <span className="pager-ornament">☙</span>
                          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                            let p: number;
                            if (totalPages <= 7) { p = i + 1; }
                            else if (page <= 4) { p = i + 1; }
                            else if (page >= totalPages - 3) { p = totalPages - 6 + i; }
                            else { p = page - 3 + i; }
                            return (
                              <button key={p} onClick={() => goToPage(p)}
                                className={`pager-btn ${p === page ? 'active' : ''}`}>{p}</button>
                            );
                          })}
                          <span className="pager-ornament">❧</span>
                        </div>
                        <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages || newsLoading} className="pager-nav">Next →</button>
                      </div>
                    </div>
                  )}
                </>
              ) : !newsLoading && articles.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-2">
                  <Newspaper className="h-8 w-8 text-slate-600" />
                  <p className="text-sm text-slate-500">
                    {stockMode ? 'No news articles found for this stock' : 'No news articles available right now'}
                  </p>
                  {stockMode && (
                    <button
                      onClick={backToAll}
                      className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs text-slate-400 transition hover:bg-white/[0.08]"
                    >
                      View all market news
                    </button>
                  )}
                </div>
              ) : null}

              {newsLoading && articles.length > 0 && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0c14]/80 backdrop-blur-sm rounded-b-xl">
                  <div className="flex flex-col items-center gap-4 px-8 py-6 rounded-xl border border-white/[0.06] bg-[#161410] shadow-2xl">
                    <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-white np-headline">Fetching next page</p>
                      <p className="text-xs text-slate-400 np-body italic mt-1">Please wait while we load page {page}...</p>
                    </div>
                    <div className="np-rule w-16" />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ═══════ ARTICLE DETAIL MODAL ═══════ */}
      {detailArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6 md:p-10" onClick={() => setDetailArticle(null)}>
          <div className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden bg-[#161410] np-shadow-clipping" style={{ clipPath: 'polygon(0.5% 0.3%, 99% 0%, 99.8% 0.5%, 99.8% 98.8%, 98.5% 99.5%, 1.5% 99.5%, 0% 98%)' }} onClick={e => e.stopPropagation()}>
            <div className="np-bg absolute inset-0 opacity-70" />
            <div className="np-noise absolute inset-0 opacity-40" />
            <div className="np-fold" />
            <div className="np-tear-article absolute bottom-0 left-0 right-0 h-2" />

            <div className="relative z-10 flex flex-col flex-1">

              {/* ──── Newspaper Masthead ──── */}
              <div className="shrink-0 px-8 md:px-12 pt-8 pb-3 text-center border-b border-white/[0.04]">
                <button onClick={() => setDetailArticle(null)}
                  className="absolute left-6 top-6 rounded-full p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-white transition">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setDetailArticle(null)}
                  className="absolute right-6 top-6 rounded-full p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
                <div className="np-rule-thick mb-4 mx-auto max-w-[80%]" />
                <div className="tracking-[0.3em] text-[8px] text-slate-600/60 np-date-line uppercase mb-1">Special Market Report</div>
                <h1 className="text-3xl md:text-4xl font-black leading-tight text-white/90 np-headline tracking-tight">
                  {detailArticle.title}
                </h1>
                <div className="np-rule w-20 mx-auto mt-4 mb-3" />
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px]">
                  <span className="text-slate-300 np-body font-semibold tracking-wide">{detailArticle.source}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400 np-body italic flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {timeAgo(detailArticle.publishedAt)}
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-500 np-date-line text-[10px]">EDITION · MARKET DIGEST</span>
                </div>
                <div className="np-rule-thick mt-4 mx-auto max-w-[80%]" />
              </div>

              {/* ──── Scrollable Article Body (Newspaper Columns) ──── */}
              <div className="overflow-y-scroll flex-1 px-8 md:px-12 py-6 np-scrollbar">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-24">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                      <p className="text-sm text-slate-500 np-body italic">Setting type...</p>
                    </div>
                  </div>
                ) : detailError ? (
                  <div className="flex flex-col items-center gap-4 py-20 text-center">
                    <div className="text-[40px] text-slate-700/50 np-headline">&para;</div>
                    <p className="text-sm text-rose-400 np-body">{detailError}</p>
                    <a href={detailArticle.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-xs text-slate-300 hover:bg-white/[0.08] np-body">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open in original source
                    </a>
                  </div>
                ) : (
                  <>
                    {/* Two-column newspaper layout — manually split */}
                    {(() => {
                      const paras = detailContent.split('\n\n').filter((p: string) => p.trim());
                      if (paras.length <= 1) {
                        return (
                          <div className="text-[13px] leading-[1.75] text-slate-300 tracking-wide">
                            {paras.map((para: string, i: number) => (
                              <p key={i} className={`np-para ${i === 0 ? 'np-dropcap' : ''} mb-4`}>{para}</p>
                            ))}
                          </div>
                        );
                      }
                      const mid = Math.ceil(paras.length / 2);
                      const col1 = paras.slice(0, mid);
                      const col2 = paras.slice(mid);
                      return (
                        <div className="flex gap-8">
                          <div className="flex-1 space-y-4 text-[13px] leading-[1.75] text-slate-300 tracking-wide">
                            {col1.map((para: string, i: number) => (
                              <p key={i} className={`np-para ${i === 0 ? 'np-dropcap' : ''}`}>{para}</p>
                            ))}
                          </div>
                          <div className="w-px bg-white/[0.06] shrink-0 self-stretch" />
                          <div className="flex-1 space-y-4 text-[13px] leading-[1.75] text-slate-300 tracking-wide">
                            {col2.map((para: string, i: number) => (
                              <p key={i} className="np-para">{para}</p>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    {/* End mark */}
                    <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center justify-center gap-4 text-[11px] text-slate-600/40 np-date-line">
                      <span className="tracking-[0.3em] uppercase">✦ Continued ✦</span>
                    </div>
                  </>
                )}
              </div>

              {/* ──── Footer — Page Info / Source ──── */}
              <div className="shrink-0 border-t border-white/[0.06] px-8 md:px-12 py-3 flex items-center justify-between text-[9px] text-slate-600 np-date-line">
                <div className="flex items-center gap-3">
                  <span className="tracking-[0.2em] uppercase">Market Intelligence Daily</span>
                  <span className="text-slate-700">|</span>
                  <span className="flex items-center gap-1">
                    <span className="text-slate-500">Source:</span>
                    <span className="text-slate-400 font-semibold">{detailArticle.source}</span>
                  </span>
                </div>
                <span className="flex items-center gap-2">
                  <a href={detailArticle.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-rose-400/60 hover:text-rose-400 transition">
                    <ExternalLink className="h-2.5 w-2.5" />
                    Open Original
                  </a>
                  <span className="text-slate-700">|</span>
                  <span>Vol. XLII No. 7</span>
                  <span className="text-slate-700">|</span>
                  <span>Page A1</span>
                </span>
              </div>

            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
