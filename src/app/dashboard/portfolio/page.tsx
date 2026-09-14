'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Pencil, Trash2, X, Loader2, BadgeDollarSign,
  IndianRupee, TrendingUp, TrendingDown, Wallet,
  PieChart, ArrowUpRight, ArrowDownRight, Briefcase,
} from 'lucide-react';
import PageTransition from '../../../components/dashboard/PageTransition';
import StockSearchInput from '../../../components/dashboard/StockSearchInput';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Holding {
  id: number;
  stock_symbol: string;
  quantity: number;
  buy_price: number;
  buy_date: string;
  sell_price: number | null;
  sell_date: string | null;
  status: string;
  notes: string;
  current_price: number;
  invested_amount: number;
  current_value: number;
  profit_loss: number;
  profit_loss_percentage: number;
  exchange: string;
}

interface FormData {
  stock_symbol: string;
  quantity: string;
  buy_price: string;
  buy_date: string;
  notes: string;
}

interface SellForm {
  sell_price: string;
  sell_date: string;
}

const EMPTY_FORM: FormData = { stock_symbol: '', quantity: '', buy_price: '', buy_date: '', notes: '' };

const PER_PAGE = 10;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);
}

function fmtCurrency(n: number): string {
  return n >= 0 ? `\u20B9${fmt(n)}` : `-\u20B9${fmt(Math.abs(n))}`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${fmt(n)}%`;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/* ------------------------------------------------------------------ */
/*  Modal                                                              */
/* ------------------------------------------------------------------ */

function Modal({ open, onClose, onSubmit, formData, setFormData, editing, loading }: {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: FormData;
  setFormData: (d: FormData) => void;
  editing: boolean;
  loading: boolean;
}) {
  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }
  }, [open, onClose]);

  if (!open) return null;

  const valid = formData.stock_symbol.trim() && Number(formData.quantity) > 0
    && Number(formData.buy_price) > 0 && formData.buy_date;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0b1120] p-6 shadow-2xl shadow-black/60">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit Holding' : 'Add Stock'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Stock Symbol *</label>
            <StockSearchInput
              value={formData.stock_symbol}
              onChange={val => setFormData({ ...formData, stock_symbol: val })}
              onSelect={val => setFormData({ ...formData, stock_symbol: val })}
              placeholder="Start typing a stock name..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Quantity *</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="10"
                min="0"
                step="any"
                className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-500/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Buy Price (\u20B9) *</label>
              <input
                type="number"
                value={formData.buy_price}
                onChange={e => setFormData({ ...formData, buy_price: e.target.value })}
                placeholder="2500.00"
                min="0"
                step="any"
                className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-500/30"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Buy Date *</label>
            <input
              type="date"
              value={formData.buy_date}
              onChange={e => setFormData({ ...formData, buy_date: e.target.value })}
              className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500/30 [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Notes <span className="text-slate-600">(optional)</span></label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any notes about this purchase..."
              rows={2}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-500/30"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.08]"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!valid || loading}
            className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-sm font-semibold text-white transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : editing ? 'Update' : 'Add to Portfolio'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sell Modal                                                         */
/* ------------------------------------------------------------------ */

function SellModal({ open, holding, onClose, onSell, loading }: {
  open: boolean;
  holding: Holding | null;
  onClose: () => void;
  onSell: (price: number, date: string, quantity: number) => void;
  loading: boolean;
}) {
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState('');
  const [sellQty, setSellQty] = useState('');

  useEffect(() => {
    if (open && holding) {
      setSellPrice(String(holding.current_price || 0));
      setSellDate(todayStr());
      setSellQty(String(holding.quantity));
    }
  }, [open, holding]);

  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }
  }, [open, onClose]);

  if (!open || !holding) return null;

  const qty = Number(sellQty) || 0;
  const price = Number(sellPrice) || 0;
  const valid = price >= 0 && sellDate && qty > 0 && qty <= holding.quantity;
  const estimatedPl = price * qty - holding.buy_price * qty;
  const estimatedPlPct = holding.buy_price > 0 ? (estimatedPl / (holding.buy_price * qty)) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0b1120] p-6 shadow-2xl shadow-black/60">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Sell {holding.stock_symbol}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm">
          <div className="grid grid-cols-2 gap-2 text-slate-400">
            <span>Held Quantity</span>
            <span className="text-right text-white">{fmt(holding.quantity)}</span>
            <span>Buy Price</span>
            <span className="text-right text-white">{fmtCurrency(holding.buy_price)}</span>
            <span>Invested</span>
            <span className="text-right text-white">{fmtCurrency(holding.invested_amount)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Quantity to Sell *
              <span className="ml-2 font-normal text-slate-600">(max {fmt(holding.quantity)})</span>
            </label>
            <input
              type="number"
              value={sellQty}
              onChange={e => setSellQty(e.target.value)}
              placeholder={String(holding.quantity)}
              min="0"
              max={holding.quantity}
              step="any"
              className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-500/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Sell Price (\u20B9) *</label>
            <input
              type="number"
              value={sellPrice}
              onChange={e => setSellPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="any"
              className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-500/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Sell Date *</label>
            <input
              type="date"
              value={sellDate}
              onChange={e => setSellDate(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500/30 [color-scheme:dark]"
            />
          </div>
        </div>

        {Number(sellPrice) > 0 && (
          <div className={`mt-4 rounded-xl border p-3 text-sm ${
            estimatedPl >= 0
              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
              : 'border-rose-500/20 bg-rose-500/5 text-rose-400'
          }`}>
            <div className="flex items-center justify-between">
              <span>Estimated P&L</span>
              <span className="font-semibold">
                {estimatedPl >= 0 ? '+' : ''}{fmtCurrency(estimatedPl)}
                <span className="ml-1 text-xs opacity-70">({fmtPct(estimatedPlPct)})</span>
              </span>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.08]"
          >
            Cancel
          </button>
          <button
            onClick={() => onSell(price, sellDate, qty)}
            disabled={!valid || loading}
            className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-2.5 text-sm font-semibold text-white transition hover:from-amber-400 hover:to-orange-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Confirm Sell'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary Card                                                       */
/* ------------------------------------------------------------------ */

function SummaryCard({ title, value, sub, icon: Icon, color, index = 0 }: {
  title: string; value: string; sub?: string; icon: any; color: string; index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition hover:bg-white/[0.04] hover:border-white/[0.1]"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{title}</span>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [sellHolding, setSellHolding] = useState<Holding | null>(null);
  const [selling, setSelling] = useState(false);

  const fetchHoldings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portfolio');
      if (!res.ok) return;
      const data = await res.json();
      setHoldings(data.holdings || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchHoldings(); }, [fetchHoldings]);

  const filtered = holdings.filter(h => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return h.stock_symbol.toLowerCase().includes(q)
      || h.notes.toLowerCase().includes(q)
      || h.exchange.toLowerCase().includes(q)
      || h.status.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const openHoldings = holdings.filter(h => h.status === 'open');
  const soldHoldings = holdings.filter(h => h.status === 'sold');

  const totals = holdings.reduce((acc, h) => ({
    invested: acc.invested + h.invested_amount,
    currentValue: acc.currentValue + h.current_value,
    pl: acc.pl + h.profit_loss,
  }), { invested: 0, currentValue: 0, pl: 0 });

  const openValue = openHoldings.reduce((s, h) => s + h.current_value, 0);
  const openPl = openHoldings.reduce((s, h) => s + h.profit_loss, 0);
  const realizedPl = soldHoldings.reduce((s, h) => s + h.profit_loss, 0);

  const overallPlPct = totals.invested > 0 ? (totals.pl / totals.invested) * 100 : 0;

  /* ── CRUD handlers ── */

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setEditing(false);
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = (h: Holding) => {
    setFormData({
      stock_symbol: h.stock_symbol,
      quantity: String(h.quantity),
      buy_price: String(h.buy_price),
      buy_date: h.buy_date,
      notes: h.notes,
    });
    setEditing(true);
    setEditId(h.id);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.stock_symbol.trim() || !Number(formData.quantity) || !Number(formData.buy_price) || !formData.buy_date) return;
    setSubmitting(true);
    try {
      if (editing && editId) {
        await fetch(`/api/portfolio/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stock_symbol: formData.stock_symbol,
            quantity: Number(formData.quantity),
            buy_price: Number(formData.buy_price),
            buy_date: formData.buy_date,
            notes: formData.notes,
          }),
        });
      } else {
        await fetch('/api/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stock_symbol: formData.stock_symbol,
            quantity: Number(formData.quantity),
            buy_price: Number(formData.buy_price),
            buy_date: formData.buy_date,
            notes: formData.notes,
          }),
        });
      }
      setModalOpen(false);
      fetchHoldings();
    } catch {}
    setSubmitting(false);
  };

  const openSell = (h: Holding) => {
    setSellHolding(h);
    setSellModalOpen(true);
  };

  const handleSell = async (price: number, date: string, quantity: number) => {
    if (!sellHolding) return;
    setSelling(true);
    try {
      await fetch(`/api/portfolio/${sellHolding.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sell_price: price, sell_date: date, sell_quantity: quantity }),
      });
      setSellModalOpen(false);
      setSellHolding(null);
      fetchHoldings();
    } catch {}
    setSelling(false);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try {
      await fetch(`/api/portfolio/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      fetchHoldings();
    } catch {}
  };

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
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Portfolio</h1>
                  <p className="text-sm text-slate-400">Track your stock holdings, monitor P&L and manage positions.</p>
                </div>
              </div>
              <button
                onClick={openAdd}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500"
              >
                <Plus className="h-4 w-4" />
                Add Stock
              </button>
            </div>
          </header>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/*  NOTEBOOK CONTAINER                                         */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="w-full bg-[#0a0c14] border border-white/[0.05] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">

            {/* ──── Summary cards ──── */}
            <div className="px-8 pt-8">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <SummaryCard
                  title="Total Invested"
                  value={loading ? '—' : fmtCurrency(totals.invested)}
                  icon={Wallet}
                  color="bg-blue-500/15 text-blue-400"
                  index={0}
                />
                <SummaryCard
                  title="Current Value"
                  value={loading ? '—' : fmtCurrency(totals.currentValue)}
                  sub={loading ? '' : `${openHoldings.length} open \u00B7 ${soldHoldings.length} sold`}
                  icon={PieChart}
                  color="bg-violet-500/15 text-violet-400"
                  index={1}
                />
                <SummaryCard
                  title="Profit / Loss"
                  value={loading ? '—' : fmtCurrency(totals.pl)}
                  sub={loading ? '' : `Realized ${fmtCurrency(realizedPl)} \u00B7 Unrealized ${fmtCurrency(openPl)}`}
                  icon={totals.pl >= 0 ? TrendingUp : TrendingDown}
                  color={totals.pl >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}
                  index={2}
                />
                <SummaryCard
                  title="Overall Return"
                  value={loading ? '—' : fmtPct(overallPlPct)}
                  sub={loading ? '' : `\u20B9${fmt(totals.pl)} total`}
                  icon={IndianRupee}
                  color={overallPlPct >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}
                  index={3}
                />
              </div>
            </div>

            {/* ──── Search bar ──── */}
            <div className="h-8 w-full" />
            <div className="px-8 flex justify-center">
              <div className="w-full max-w-xl">
                <div className="flex items-center gap-3 px-5 py-3.5 border-2 rounded-xl transition-all duration-300 bg-white/[0.04] border-cyan-500/20 hover:border-cyan-500/40 hover:bg-white/[0.06] hover:shadow-[0_0_16px_rgba(0,229,255,0.06)] focus-within:border-cyan-500/50 focus-within:bg-white/[0.08] focus-within:shadow-[0_0_20px_rgba(0,229,255,0.12)]">
                  <Search className="w-5 h-5 shrink-0 text-cyan-400/60" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search holdings by symbol, status, exchange..."
                    className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none tracking-wide"
                  />
                  {search && (
                    <button onClick={() => { setSearch(''); setPage(1); }} className="p-1 rounded-full hover:bg-white/[0.08] transition">
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="h-8 w-full" />

            {/* ──── Holdings table ──── */}
            <div className="px-8 pb-8">
              <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
                <table className="w-full text-left text-sm leading-loose">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-medium uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-4">Symbol</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Qty</th>
                      <th className="px-5 py-4">Buy Price</th>
                      <th className="px-5 py-4">Buy Date</th>
                      <th className="px-5 py-4">Sell Price</th>
                      <th className="px-5 py-4">Invested</th>
                      <th className="px-5 py-4">Current Value</th>
                      <th className="px-5 py-4">P/L</th>
                      <th className="px-5 py-4">P/L %</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={11} className="px-5 py-20 text-center text-slate-500">
                          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-cyan-400" />
                          Loading holdings...
                        </td>
                      </tr>
                    ) : paged.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-5 py-20 text-center text-slate-500">
                          {search ? 'No holdings match your search.' : 'No holdings yet. Click "Add Stock" to get started.'}
                        </td>
                      </tr>
                    ) : paged.map((h, i) => {
                      const isSold = h.status === 'sold';
                      return (
                      <motion.tr
                        key={h.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                        className={`border-b border-white/[0.04] transition hover:bg-white/[0.02] ${isSold ? 'opacity-60' : ''}`}
                      >
                        <td className="px-5 py-4">
                          <span className="font-semibold text-white">{h.stock_symbol}</span>
                          <span className="ml-2 text-[10px] text-slate-600">{h.exchange}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                            isSold
                              ? 'bg-slate-500/15 text-slate-400'
                              : 'bg-emerald-500/15 text-emerald-400'
                          }`}>
                            {isSold ? 'Sold' : 'Open'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-300">{fmt(h.quantity)}</td>
                        <td className="px-5 py-4 text-slate-300">{fmtCurrency(h.buy_price)}</td>
                        <td className="px-5 py-4 text-slate-400">{h.buy_date}</td>
                        <td className="px-5 py-4 text-slate-300">
                          {h.sell_price ? fmtCurrency(h.sell_price) : '\u2014'}
                          {h.sell_date && <span className="ml-1 text-[10px] text-slate-600">{h.sell_date}</span>}
                        </td>
                        <td className="px-5 py-4 text-slate-300">{fmtCurrency(h.invested_amount)}</td>
                        <td className="px-5 py-4 text-slate-300">{fmtCurrency(h.current_value)}</td>
                        <td className={`px-5 py-4 font-medium ${h.profit_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          <span className="flex items-center gap-1">
                            {h.profit_loss >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {fmtCurrency(h.profit_loss)}
                          </span>
                        </td>
                        <td className={`px-5 py-4 font-medium ${h.profit_loss_percentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {fmtPct(h.profit_loss_percentage)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isSold && (
                              <button
                                onClick={() => openSell(h)}
                                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-amber-400"
                                title="Sell"
                              >
                                <BadgeDollarSign className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(h)}
                              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-cyan-400"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteId(h.id)}
                              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-rose-400"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ── */}
              {totalPages > 1 && !loading && (
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>Showing {Math.min(filtered.length, PER_PAGE)} of {filtered.length}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`min-w-[30px] rounded-lg px-2.5 py-1.5 text-center text-xs transition ${
                          p === safePage
                            ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20'
                            : 'text-slate-500 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Add/Edit Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        editing={editing}
        loading={submitting}
      />

      {/* ── Sell Modal ── */}
      <SellModal
        open={sellModalOpen}
        holding={sellHolding}
        onClose={() => { setSellModalOpen(false); setSellHolding(null); }}
        onSell={handleSell}
        loading={selling}
      />

      {/* ── Delete Confirmation ── */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0b1120] p-6 shadow-2xl shadow-black/60">
            <h3 className="mb-2 text-lg font-semibold text-white">Delete Holding</h3>
            <p className="mb-6 text-sm text-slate-400">Are you sure you want to delete this holding? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.08]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
