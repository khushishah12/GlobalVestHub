'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Brain,
  Briefcase,
  Calculator,
  CalendarDays,
  ChevronRight,
  Crown,
  LineChart,
  Menu,
  Target,
  X,
} from 'lucide-react';

interface IndexData {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n);
}

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

const FEATURES = [
  {
    icon: Target,
    tag: 'Pattern recognition',
    title: 'AI Stock Picker',
    desc: 'Machine learning ranks every listed security by momentum, value and a proprietary confidence score — updated every session.',
    href: '/dashboard/stock-picker',
  },
  {
    icon: LineChart,
    tag: 'Technical analysis',
    title: 'Pro-Grade Charts',
    desc: 'Candlesticks, volume action and 20+ technical indicators rendered in an interactive terminal built for analysis.',
    href: '/dashboard/charts',
  },
  {
    icon: Brain,
    tag: 'Sentiment scanning',
    title: 'News Sentiment',
    desc: 'Real-time NLP scans headlines and reports, turning market chatter into actionable bull and bear signals.',
    href: '/dashboard/news',
  },
  {
    icon: Briefcase,
    tag: 'Portfolio analytics',
    title: 'Portfolio Analytics',
    desc: 'Track invested value, live P&L and allocation across every holding in one clean, always-in-sync view.',
    href: '/dashboard/portfolio',
  },
  {
    icon: Calculator,
    tag: 'Scenario modelling',
    title: 'What-If Calculator',
    desc: 'Model potential returns with adjustable timeframes, compounding and risk assumptions before you commit a rupee.',
    href: '/dashboard/what-if',
  },
  {
    icon: CalendarDays,
    tag: 'Catalyst calendar',
    title: 'Earnings Calendar',
    desc: 'Dividends, earnings and IPO schedules in one calendar so you never miss a potential catalyst.',
    href: '/dashboard/calendar',
  },
];

const STEPS = [
  {
    num: 'One',
    title: 'Build your watchlist',
    desc: 'Add the tickers, sectors or a whole portfolio import. NEXUS.AI starts scanning them immediately.',
  },
  {
    num: 'Two',
    title: 'Set your thresholds',
    desc: 'Choose what counts as a signal worth your attention — confidence level, risk tolerance, time horizon.',
  },
  {
    num: 'Three',
    title: 'Get your daily brief',
    desc: 'A single ranked summary lands before market open, with the full reasoning one click away.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: '₹0',
    period: ' / forever',
    desc: 'For investors getting started with AI-assisted analysis.',
    features: [
      'Live market indices & tickers',
      '1 watchlist with 10 tickers',
      'AI stock picker (weekly refresh)',
      'Basic news sentiment feed',
    ],
    cta: 'Sign up free',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '₹499',
    period: ' / month',
    desc: 'For active traders who want the full terminal.',
    features: [
      'Everything in Starter',
      'Unlimited watchlists & alerts',
      'AI stock picker (daily refresh)',
      'What-If return calculator',
      'Full earnings & IPO calendar',
      'Portfolio P&L analytics',
    ],
    cta: 'Start free trial',
    href: '/signup',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For advisory firms and teams managing client capital.',
    features: [
      'Everything in Pro',
      'White-label reporting',
      'API access & webhooks',
      'Dedicated account manager',
      'SSO & audit logs',
    ],
    cta: 'Talk to sales',
    href: '/signup',
    highlighted: false,
  },
];

const FAQS = [
  {
    q: 'Is my financial data secure?',
    a: 'Yes. NEXUS never sells your data. All holdings and account details are encrypted at rest and in transit, and we use standard OAuth connections with read-only permissions by default.',
  },
  {
    q: 'Does the AI replace financial advice?',
    a: 'No. NEXUS surfaces data-driven signals and analytics to inform your decisions, but every trade remains your call. Nothing we show is personalised financial advice.',
  },
  {
    q: 'Which markets are supported?',
    a: 'NEXUS currently covers the NSE and BSE across equity, indices and derivatives, with live news and technicals for thousands of listed securities.',
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Yes. Upgrade, downgrade or cancel in one click from your account settings. Pro subscriptions are billed monthly with no lock-in.',
  },
];

const STATS = [
  { label: 'Tickers tracked in real time', value: '9,412' },
  { label: 'Directional accuracy, 5-day horizon', value: '71.4' },
  { label: 'Median signal latency', value: '340' },
  { label: 'Active investors on the platform', value: '8,000' },
];

const STATS_UNITS = ['', '%', ' ms', '+'];

const MOCK_TICKER = [
  { sym: 'NIFTY', price: '24,562', chg: '▲0.84%', up: true },
  { sym: 'SENSEX', price: '81,147', chg: '▲0.62%', up: true },
  { sym: 'BANKNIFTY', price: '52,890', chg: '▼0.31%', up: false },
  { sym: 'RELIANCE', price: '3,142', chg: '▲1.12%', up: true },
  { sym: 'TCS', price: '4,118', chg: '▼0.48%', up: false },
  { sym: 'HDFCBANK', price: '1,684', chg: '▲0.35%', up: true },
  { sym: 'INFY', price: '1,892', chg: '▲0.71%', up: true },
  { sym: 'SBIN', price: '812', chg: '▼0.26%', up: false },
];

export default function Home() {
  const [indices, setIndices] = useState<IndexData[] | null>(null);
  const [marketStatus, setMarketStatus] = useState('closed');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch('/api/market/indices')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.indices) setIndices(d.indices);
        if (d?.marketStatus) setMarketStatus(d.marketStatus);
      })
      .catch(() => {});

    const id = setInterval(() => {
      fetch('/api/market/indices')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.indices) setIndices(d.indices);
          if (d?.marketStatus) setMarketStatus(d.marketStatus);
        })
        .catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const headIdx = (indices ?? [])[0];
  const headUp = headIdx != null && (headIdx.change ?? 0) >= 0;
  const headPrice = headIdx?.price != null ? fmt(headIdx.price) : '—';
  const headChg =
    headIdx?.changePercent != null
      ? `${headIdx.changePercent >= 0 ? '+' : ''}${fmt(headIdx.changePercent)}%`
      : '—';

  return (
    <div className="nx-theme min-h-screen overflow-x-hidden scroll-smooth">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="nx-header">
        <div className="nx-wrap">
          <nav className="nx-nav">
            <Link href="/" className="nx-logo">
              NEXUS<span className="tick">.AI</span>
            </Link>

            <ul className={`nx-nav-links${mobileOpen ? ' open' : ''}`}>
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} onClick={() => setMobileOpen(false)}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="nx-nav-actions">
              <Link href="/login" className="nx-btn nx-btn-ghost">
                Log in
              </Link>
              <Link href="/signup" className="nx-btn nx-btn-gold">
                Sign up free
              </Link>
              <button
                type="button"
                className="nx-menu-toggle"
                aria-label="Toggle menu"
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen ? (
                  <X strokeWidth={2} />
                ) : (
                  <Menu strokeWidth={2} />
                )}
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="nx-hero">
        <div className="nx-wrap nx-hero-grid">
          <div>
            <h1>
              Read the market before the market reads itself. <em>Faster.</em>
            </h1>
            <p className="nx-lede">
              NEXUS.AI scans price action, filings, earnings calls and
              sentiment across 9,000+ tickers in real time, then tells you what
              actually changed — and why it matters.
            </p>
            <div className="nx-hero-cta">
              <Link href="/signup" className="nx-btn nx-btn-gold">
                Sign up free
              </Link>
              <Link href="/login" className="nx-btn nx-btn-line">
                Log in
              </Link>
            </div>
            <div className="nx-hero-note">
              <span className="nx-dot" />
              <b>{marketStatus === 'open' ? 'Live' : 'Market closed'}</b>
              <span>·</span>
              <span>No card required · NSE &amp; BSE coverage</span>
            </div>
          </div>

          {/* Chart panel */}
          <div className="nx-panel">
            <div className="nx-panel-head">
              <div>
                <div className="nx-panel-symbol">{headIdx?.label ?? 'Nifty 50'}</div>
                <div className="nx-panel-name">NSE index · live</div>
              </div>
              <div className="nx-panel-price">
                <div className="num">{headPrice}</div>
                <div
                  className="chg"
                  style={{ color: headUp ? 'var(--nx-teal)' : 'var(--nx-red)' }}
                >
                  {headUp ? '▲' : '▼'} {headChg}
                </div>
              </div>
            </div>
            <div className="nx-panel-chart">
              <svg viewBox="0 0 340 160" width="100%" height="160" role="img" aria-label="Live market chart">
                <line x1="0" y1="40" x2="340" y2="40" stroke="#1B2438" strokeWidth="1" />
                <line x1="0" y1="80" x2="340" y2="80" stroke="#1B2438" strokeWidth="1" />
                <line x1="0" y1="120" x2="340" y2="120" stroke="#1B2438" strokeWidth="1" />
                <g strokeWidth="1.6">
                  <line x1="14" y1="70" x2="14" y2="100" stroke="#39B58C" />
                  <rect x="10" y="78" width="8" height="16" fill="#39B58C" />
                  <line x1="34" y1="60" x2="34" y2="95" stroke="#DD6455" />
                  <rect x="30" y="65" width="8" height="20" fill="#DD6455" />
                  <line x1="54" y1="75" x2="54" y2="110" stroke="#39B58C" />
                  <rect x="50" y="82" width="8" height="20" fill="#39B58C" />
                  <line x1="74" y1="50" x2="74" y2="90" stroke="#39B58C" />
                  <rect x="70" y="58" width="8" height="24" fill="#39B58C" />
                  <line x1="94" y1="65" x2="94" y2="98" stroke="#DD6455" />
                  <rect x="90" y="70" width="8" height="18" fill="#DD6455" />
                  <line x1="114" y1="45" x2="114" y2="80" stroke="#39B58C" />
                  <rect x="110" y="50" width="8" height="22" fill="#39B58C" />
                  <line x1="134" y1="55" x2="134" y2="85" stroke="#DD6455" />
                  <rect x="130" y="60" width="8" height="16" fill="#DD6455" />
                  <line x1="154" y1="35" x2="154" y2="70" stroke="#39B58C" />
                  <rect x="150" y="40" width="8" height="22" fill="#39B58C" />
                  <line x1="174" y1="42" x2="174" y2="75" stroke="#39B58C" />
                  <rect x="170" y="48" width="8" height="20" fill="#39B58C" />
                  <line x1="194" y1="30" x2="194" y2="62" stroke="#39B58C" />
                  <rect x="190" y="34" width="8" height="20" fill="#39B58C" />
                </g>
                <polyline
                  className="nx-predict"
                  points="198,44 220,38 244,26 268,22 292,14 316,10"
                  fill="none"
                  stroke="#D4A657"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <circle cx="316" cy="10" r="4" fill="#D4A657" />
              </svg>
            </div>
            <div className="nx-panel-foot">
              <span>Prediction window · next 5 sessions</span>
              <span className="nx-confidence">
                <span className="nx-pulse" />
                {marketStatus === 'open' ? 'Market open' : 'Market closed'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Ticker strip ───────────────────────────────────────── */}
      <div className="nx-ticker-strip" aria-hidden="true">
        <div className="nx-ticker-track">
          {[...MOCK_TICKER, ...MOCK_TICKER].map((item, i) => (
            <div className="nx-ticker-item" key={i}>
              <b>{item.sym}</b> {item.price}{' '}
              <span className={item.up ? 'up' : 'down'}>{item.chg}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats / terminal ───────────────────────────────────── */}
      <section className="nx-section">
        <div className="nx-wrap">
          <div className="nx-section-head">
            <h2>Numbers we are happy to stand behind</h2>
            <p>Measured across the trailing twelve months, updated quarterly.</p>
          </div>
          <div className="nx-terminal">
            {STATS.map((stat, i) => (
              <div className="nx-term-row" key={stat.label}>
                <div className="nx-term-label">{stat.label}</div>
                <div className="nx-term-value">
                  {stat.value}
                  <span>{STATS_UNITS[i]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="nx-section scroll-mt-20" style={{ paddingTop: 0 }}>
        <div className="nx-wrap">
          <div className="nx-section-head">
            <h2>The full AI trading terminal</h2>
            <p>
              Six modules run independently and feed a single combined view, so
              you see the signal without digging through ten separate tools.
            </p>
          </div>
          <div className="nx-feature-grid">
            {FEATURES.map((feature) => (
              <Link href={feature.href} className="nx-feature" key={feature.title}>
                <div className="nx-feature-top">
                  <span className="nx-f-tag">{feature.tag}</span>
                  <feature.icon className="nx-f-icon" size={20} strokeWidth={1.7} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
                <span className="nx-goal">
                  Open module
                  <ChevronRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section id="how-it-works" className="nx-section scroll-mt-20" style={{ paddingTop: 0 }}>
        <div className="nx-wrap">
          <div className="nx-section-head">
            <h2>Set up once, stay ahead every session</h2>
            <p>From account to first insight in under three minutes.</p>
          </div>
          <div className="nx-steps">
            {STEPS.map((step) => (
              <div className="nx-step" key={step.num}>
                <span className="num">{step.num}</span>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="nx-section scroll-mt-20" style={{ paddingTop: 0 }}>
        <div className="nx-wrap">
          <div className="nx-section-head">
            <h2>Start free, upgrade when the edge pays for itself</h2>
            <p>No lock-in. Cancel from your account settings at any time.</p>
          </div>
          <div className="nx-pricing-table">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`nx-tier${plan.highlighted ? ' featured' : ''}`}
                data-badge={plan.highlighted ? 'Most popular' : undefined}
              >
                <div className="nx-tier-inner">
                  <div className="nx-tier-name">
                    {plan.highlighted && (
                      <Crown className="nx-crown" size={14} strokeWidth={1.9} />
                    )}
                    {plan.name}
                  </div>
                  <div className="nx-tier-price">
                    {plan.price}
                    <span>{plan.period}</span>
                  </div>
                  <div className="nx-tier-desc">{plan.desc}</div>
                  <ul className="nx-tier-list">
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <Link
                    href={plan.href}
                    className={`nx-btn ${plan.highlighted ? 'nx-btn-gold' : 'nx-btn-line'}`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section id="faq" className="nx-section scroll-mt-20" style={{ paddingTop: 0 }}>
        <div className="nx-wrap">
          <div className="nx-section-head">
            <h2>Questions, answered</h2>
            <p>Everything you need to know before you start.</p>
          </div>
          <div className="nx-faq-list">
            {FAQS.map((faq) => (
              <details className="nx-faq" key={faq.q}>
                <summary>
                  {faq.q}
                  <ChevronRight className="nx-faq-chev" size={16} />
                </summary>
                <p className="nx-faq-body">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <div className="nx-final-cta">
        <div className="nx-wrap">
          <h2>
            The market moves fast. Your read on it does not have to lag behind.
          </h2>
          <Link href="/signup" className="nx-btn nx-btn-gold">
            Sign up free
          </Link>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="nx-footer">
        <div className="nx-wrap">
          <div className="nx-foot-grid">
            <div className="nx-foot-brand">
              <Link href="/" className="nx-logo">
                NEXUS<span className="tick">.AI</span>
              </Link>
              <p>
                AI-driven market analysis for traders and analysts who need the
                read, not just the data.
              </p>
            </div>
            <div className="nx-foot-col">
              <h5>Product</h5>
              <ul>
                <li>
                  <Link href="/dashboard">Dashboard</Link>
                </li>
                <li>
                  <Link href="/dashboard/stock-picker">AI Stock Picker</Link>
                </li>
                <li>
                  <Link href="/dashboard/charts">Charts</Link>
                </li>
                <li>
                  <Link href="/dashboard/news">News Sentiment</Link>
                </li>
              </ul>
            </div>
            <div className="nx-foot-col">
              <h5>Company</h5>
              <ul>
                <li>
                  <a href="#features">Features</a>
                </li>
                <li>
                  <a href="#how-it-works">How it works</a>
                </li>
                <li>
                  <a href="#pricing">Pricing</a>
                </li>
                <li>
                  <Link href="/login">Sign in</Link>
                </li>
              </ul>
            </div>
            <div className="nx-foot-col">
              <h5>Legal</h5>
              <ul>
                <li>
                  <a href="#">Terms</a>
                </li>
                <li>
                  <a href="#">Privacy</a>
                </li>
                <li>
                  <a href="#">Disclosures</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="nx-foot-bottom">
            <p>
              NEXUS.AI provides data-driven market analysis for informational
              purposes only and does not constitute financial advice. Trading
              involves risk, including loss of principal.
            </p>
            <p>© {new Date().getFullYear()} NEXUS.AI</p>
          </div>
        </div>
      </footer>
    </div>
  );
}