'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, TrendingUp, CalendarDays, BarChart3, LineChart } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatMsg {
  role: 'user' | 'bot';
  text: string;
  ts: number;
}

const INITIAL_SUGGESTIONS = [
  { label: 'Upcoming IPOs', icon: CalendarDays },
  { label: 'Top gainers today', icon: TrendingUp },
  { label: 'Explain NIFTY', icon: BarChart3 },
  { label: 'Earnings this week', icon: LineChart },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => [
    { role: 'bot', text: 'Hi! I\'m your **Stock Assistant**. Ask me about NSE/BSE stocks, IPOs, earnings, or market terms.', ts: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<number | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMsg = { role: 'user', text: trimmed, ts: Date.now() };
    const botMsg: ChatMsg = { role: 'bot', text: '', ts: Date.now() };

    setMsgs(prev => [...prev, userMsg, botMsg]);
    setInput('');
    setLoading(true);
    setStreamingId(msgs.length + 1);

    const history = [...msgs.slice(-10), userMsg].map(m => ({
      role: m.role,
      content: m.text,
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      });

      const ct = res.headers.get('Content-Type') || '';

      if (ct.includes('text/event-stream')) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let reply = '';
        let firstToken = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.token) {
                  reply += parsed.token;
                  if (firstToken) {
                    setLoading(false);
                    firstToken = false;
                  }
                  const idx = msgs.length + 1;
                  setStreamingId(idx);
                  setMsgs(prev => {
                    const updated = [...prev];
                    if (updated.length > 0) {
                      updated[updated.length - 1] = { role: 'bot', text: reply, ts: Date.now() };
                    }
                    return updated;
                  });
                }
              } catch {}
            }
          }
        }

        if (firstToken) setLoading(false);
      } else {
        const data = await res.json();
        setMsgs(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = { role: 'bot', text: data.text || 'No response', ts: Date.now() };
          }
          return updated;
        });
        setLoading(false);
      }
    } catch {
      setMsgs(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = { role: 'bot', text: 'Sorry, I couldn\'t reach the server. Please try again.', ts: Date.now() };
        }
        return updated;
      });
      setLoading(false);
    }

    setStreamingId(null);
  }, [msgs]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [msgs, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  return (
    <>
      {/* ── Floating icon ── */}
      <button
        onClick={() => setOpen(true)}
        className="group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#D4A657] to-[#8C7440] text-[#171207] shadow-lg shadow-[#D4A657]/25 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-[#D4A657]/40 active:scale-95"
        aria-label="Open stock assistant"
        suppressHydrationWarning
      >
        <MessageCircle className="h-6 w-6 transition-transform duration-300 group-hover:rotate-[-8deg]" />
      </button>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.8 }}
            className="fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-[4px] border border-[#26314A] bg-[#0B111C] shadow-2xl shadow-black/60"
            style={{ maxHeight: 'min(600px, calc(100vh - 120px))' }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between rounded-t-[4px] border-b border-[#1B2438] bg-gradient-to-r from-[#D4A657]/10 to-transparent px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-[#D4A657]/15 ring-1 ring-[#D4A657]/25">
                  <Sparkles className="h-4 w-4 text-[#D4A657]" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#EBEEF4]">Stock Assistant</h2>
                  <p className="text-[10px] text-[#5C6883]">AI-powered market insights</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[#5C6883] transition hover:bg-[#121B2C] hover:text-[#EBEEF4]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── Messages ── */}
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" style={{ maxHeight: '360px' }}>
              {msgs.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[3px] px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-gradient-to-br from-[#D4A657]/25 to-[#D4A657]/10 text-[#EBEEF4] shadow-sm shadow-[#D4A657]/5'
                        : 'bg-[#121B2C] text-[#8E9AB5]'
                    }`}
                  >
                    {m.role === 'bot' && streamingId === i && m.text === '' ? (
                      <span className="flex gap-0.5 py-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#5C6883] [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#5C6883] [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#5C6883] [animation-delay:300ms]" />
                      </span>
                    ) : (
                      <RenderText text={m.text} />
                    )}
                  </div>
                </motion.div>
              ))}

              {/* ── Quick suggestions (first message only) ── */}
              {msgs.length === 1 && !loading && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {INITIAL_SUGGESTIONS.map(s => (
                    <button
                      key={s.label}
                      onClick={() => send(s.label)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#1B2438] bg-[#121B2C]/60 px-3 py-1.5 text-xs font-medium text-[#8E9AB5] transition hover:border-[#D4A657]/40 hover:bg-[#D4A657]/10 hover:text-[#D4A657]"
                    >
                      <s.icon className="h-3 w-3" />
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Input ── */}
            <div className="border-t border-[#1B2438] px-4 py-3">
              <form
                onSubmit={e => { e.preventDefault(); send(input); }}
                className="flex items-center gap-2 rounded-[3px] border border-[#26314A] bg-[#121B2C] px-3 py-2 transition focus-within:border-[#D4A657]/50"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask about stocks, IPOs, market news…"
                  disabled={loading}
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#EBEEF4] placeholder-[#5C6883] outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] bg-[#D4A657] text-[#171207] transition hover:bg-[#E3B768] disabled:opacity-40 disabled:hover:bg-[#D4A657]"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini markdown renderer (bold only)                                 */
/* ------------------------------------------------------------------ */

function RenderText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} className="font-semibold text-[#D4A657]">{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}
