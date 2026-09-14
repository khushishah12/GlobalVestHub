'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Search, TrendingUp, TrendingDown, X } from 'lucide-react';

interface StockResult {
  symbol: string;
  short_symbol: string;
  exchange: string;
  company_name: string;
  price?: number | null;
  change_percent?: number | null;
}

interface StockSearchInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelect: (symbol: string) => void;
  placeholder?: string;
  className?: string;
}

export default function StockSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = 'Search stocks...',
  className = '',
}: StockSearchInputProps) {
  const [results, setResults] = useState<StockResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) { setResults([]); setOpen(false); return; }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setResults(data.slice(0, 15));
        setOpen(true);
        setHighlightIdx(-1);
      } else { setResults([]); setOpen(false); }
    } catch { setResults([]); setOpen(false); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(() => handleSearch(value.trim()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, handleSearch]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) { setOpen(false); setIsFocused(false); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (sym: string) => {
    onSelect(sym);
    onChange(sym);
    setOpen(false);
    setIsFocused(false);
    setHighlightIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter' && highlightIdx >= 0) { e.preventDefault(); select(results[highlightIdx].short_symbol); }
    else if (e.key === 'Escape') { setOpen(false); setIsFocused(false); setHighlightIdx(-1); }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className={`flex items-center gap-3 px-4 py-3.5 border transition-all duration-300 ${
        open && results.length > 0
          ? 'rounded-t-xl rounded-b-none border-b-0'
          : 'rounded-xl'
      } ${
        isFocused
          ? 'border-cyan-500/40 bg-white/[0.06] shadow-[0_0_24px_rgba(0,229,255,0.08)] shadow-lg'
          : 'border-white/[0.08] bg-black/40 hover:bg-white/[0.04]'
      }`}>
        <Search className={`w-4 h-4 shrink-0 transition-colors duration-300 ${
          isFocused ? 'text-cyan-400' : 'text-slate-500'
        }`} />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value.toUpperCase()); setHighlightIdx(-1); }}
          onFocus={() => { setIsFocused(true); if (results.length > 0) setOpen(true); }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
          suppressHydrationWarning
        />
        <div className="flex items-center gap-2 shrink-0">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
          {value && (
            <button
              onClick={() => { onChange(''); setResults([]); setOpen(false); }}
              className="p-1 rounded-full hover:bg-white/[0.08] transition"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] text-[10px] font-mono text-slate-600 border border-white/[0.06]">
            ⌘K
          </kbd>
        </div>
      </div>

      {open && results.length > 0 && (
        <div className={`border border-t-0 rounded-b-xl overflow-hidden transition-all duration-300 ${
          isFocused
            ? 'border-cyan-500/40 bg-white/[0.06] shadow-[0_8px_24px_rgba(0,229,255,0.06)]'
            : 'border-white/[0.08] bg-[#0b1120]'
        }`}>
          <div className="divide-y divide-white/[0.04] max-h-64 overflow-y-auto">
            {results.map((r, i) => {
              const cp = r.change_percent;
              const up = cp != null && cp >= 0;
              return (
                <button
                  key={r.symbol}
                  onClick={() => select(r.short_symbol)}
                  onMouseEnter={() => setHighlightIdx(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 ${
                    i === highlightIdx
                      ? 'bg-cyan-500/8 border-l-2 border-l-cyan-400'
                      : 'border-l-2 border-l-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 text-xs font-bold border ${
                    i === highlightIdx ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-300' : 'bg-white/[0.04] border-white/[0.06] text-slate-400'
                  }`}>
                    {r.short_symbol?.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{r.short_symbol}</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.04] text-slate-500 border border-white/[0.06]">{r.exchange}</span>
                    </div>
                    {r.company_name && <p className="text-xs text-slate-400 truncate">{r.company_name}</p>}
                  </div>
                  {cp != null && (
                    <div className={`text-right shrink-0 ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <div className="flex items-center gap-0.5 text-xs font-semibold">
                        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {cp >= 0 ? '+' : ''}{cp.toFixed(2)}%
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
