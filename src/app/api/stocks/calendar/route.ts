import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runSql } from '@/lib/run-sql';

export const dynamic = 'force-dynamic';

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0];
}

const FALLBACK_STOCKS: { symbol: string; company_name: string; exchange: string; sector: string }[] = [
  { symbol: 'RELIANCE', company_name: 'Reliance Industries', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'TCS', company_name: 'Tata Consultancy Services', exchange: 'NSE', sector: 'IT' },
  { symbol: 'HDFCBANK', company_name: 'HDFC Bank', exchange: 'NSE', sector: 'Banking' },
  { symbol: 'ICICIBANK', company_name: 'ICICI Bank', exchange: 'NSE', sector: 'Banking' },
  { symbol: 'INFY', company_name: 'Infosys', exchange: 'NSE', sector: 'IT' },
  { symbol: 'SBIN', company_name: 'State Bank of India', exchange: 'NSE', sector: 'Banking' },
  { symbol: 'BHARTIARTL', company_name: 'Bharti Airtel', exchange: 'NSE', sector: 'Telecom' },
  { symbol: 'ITC', company_name: 'ITC Limited', exchange: 'NSE', sector: 'FMCG' },
  { symbol: 'WIPRO', company_name: 'Wipro', exchange: 'NSE', sector: 'IT' },
  { symbol: 'LT', company_name: 'Larsen & Toubro', exchange: 'NSE', sector: 'Infra' },
  { symbol: 'HINDUNILVR', company_name: 'Hindustan Unilever', exchange: 'NSE', sector: 'FMCG' },
  { symbol: 'NTPC', company_name: 'NTPC Limited', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'ONGC', company_name: 'Oil & Natural Gas Corp', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'TITAN', company_name: 'Titan Company', exchange: 'NSE', sector: 'Consumer' },
  { symbol: 'BAJFINANCE', company_name: 'Bajaj Finance', exchange: 'NSE', sector: 'Banking' },
  { symbol: 'MARUTI', company_name: 'Maruti Suzuki', exchange: 'NSE', sector: 'Auto' },
  { symbol: 'SUNPHARMA', company_name: 'Sun Pharma', exchange: 'NSE', sector: 'Pharma' },
  { symbol: 'TATAMOTORS', company_name: 'Tata Motors', exchange: 'NSE', sector: 'Auto' },
  { symbol: 'AXISBANK', company_name: 'Axis Bank', exchange: 'NSE', sector: 'Banking' },
  { symbol: 'KOTAKBANK', company_name: 'Kotak Mahindra Bank', exchange: 'NSE', sector: 'Banking' },
  { symbol: 'ULTRACEMCO', company_name: 'UltraTech Cement', exchange: 'NSE', sector: 'Infra' },
  { symbol: 'ASIANPAINT', company_name: 'Asian Paints', exchange: 'NSE', sector: 'Consumer' },
  { symbol: 'NESTLEIND', company_name: 'Nestlé India', exchange: 'NSE', sector: 'FMCG' },
  { symbol: 'M&M', company_name: 'Mahindra & Mahindra', exchange: 'NSE', sector: 'Auto' },
  { symbol: 'JSWSTEEL', company_name: 'JSW Steel', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'TATASTEEL', company_name: 'Tata Steel', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'HCLTECH', company_name: 'HCL Technologies', exchange: 'NSE', sector: 'IT' },
  { symbol: 'ADANIPORTS', company_name: 'Adani Ports', exchange: 'NSE', sector: 'Infra' },
  { symbol: 'DLF', company_name: 'DLF Limited', exchange: 'NSE', sector: 'Real Estate' },
  { symbol: 'HINDALCO', company_name: 'Hindalco Industries', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'EICHERMOT', company_name: 'Eicher Motors', exchange: 'NSE', sector: 'Auto' },
  { symbol: 'BRITANNIA', company_name: 'Britannia Industries', exchange: 'NSE', sector: 'FMCG' },
  { symbol: 'DIVISLAB', company_name: "Divi's Laboratories", exchange: 'NSE', sector: 'Pharma' },
  { symbol: 'DRREDDY', company_name: "Dr. Reddy's Labs", exchange: 'NSE', sector: 'Pharma' },
  { symbol: 'CIPLA', company_name: 'Cipla', exchange: 'NSE', sector: 'Pharma' },
  { symbol: 'APOLLOHOSP', company_name: 'Apollo Hospitals', exchange: 'NSE', sector: 'Healthcare' },
  { symbol: 'SBILIFE', company_name: 'SBI Life Insurance', exchange: 'NSE', sector: 'Insurance' },
  { symbol: 'HDFCLIFE', company_name: 'HDFC Life Insurance', exchange: 'NSE', sector: 'Insurance' },
  { symbol: 'MARICO', company_name: 'Marico', exchange: 'NSE', sector: 'FMCG' },
  { symbol: 'DABUR', company_name: 'Dabur India', exchange: 'NSE', sector: 'FMCG' },
  { symbol: 'BEL', company_name: 'Bharat Electronics', exchange: 'NSE', sector: 'Defence' },
  { symbol: 'IOC', company_name: 'Indian Oil Corp', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'GAIL', company_name: 'GAIL (India)', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'HEROMOTOCO', company_name: 'Hero MotoCorp', exchange: 'NSE', sector: 'Auto' },
  { symbol: 'DMART', company_name: 'Avenue Supermarts', exchange: 'NSE', sector: 'Retail' },
  { symbol: 'ZOMATO', company_name: 'Zomato', exchange: 'NSE', sector: 'Consumer' },
  { symbol: 'PNB', company_name: 'Punjab National Bank', exchange: 'NSE', sector: 'Banking' },
  { symbol: 'LUPIN', company_name: 'Lupin', exchange: 'NSE', sector: 'Pharma' },
  { symbol: 'BIOCON', company_name: 'Biocon', exchange: 'NSE', sector: 'Pharma' },
  { symbol: 'FEDERALBNK', company_name: 'Federal Bank', exchange: 'NSE', sector: 'Banking' },
  { symbol: 'COLPAL', company_name: 'Colgate-Palmolive', exchange: 'NSE', sector: 'FMCG' },
];

const SAMPLE_EVENT_TYPES = ['quarterly_results', 'earnings', 'guidance', 'dividend'];

function generateEvents(): any[] {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const fyStartYear = curMonth >= 4 ? curYear : curYear - 1;
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const fyQuarters = quarters.map((q, i) => {
    const startMonth = 4 + i * 3;
    const qStart = new Date(fyStartYear, startMonth - 1, 1);
    const qEnd = new Date(fyStartYear, startMonth + 2, 0);
    const reportStartMonth = startMonth + 3;
    const reportStart = new Date(fyStartYear, reportStartMonth - 1, 1);
    const reportEnd = new Date(fyStartYear, reportStartMonth + 1, 0);
    return { quarter: q, fy: fyStartYear + 1, qStart, qEnd, reportStart, reportEnd };
  });

  const events: any[] = [];
  let id = 1;
  for (let qi = 0; qi < fyQuarters.length; qi++) {
    const q = fyQuarters[qi];
    for (let si = 0; si < FALLBACK_STOCKS.length; si++) {
      const stock = FALLBACK_STOCKS[si];
      const eventDate = randomDate(q.reportStart, q.reportEnd);
      const eventType = SAMPLE_EVENT_TYPES[Math.floor(Math.random() * SAMPLE_EVENT_TYPES.length)];
      const eventTime = ['before_open', 'after_close', 'not_specified'][Math.floor(Math.random() * 3)];
      events.push({
        id: id++,
        symbol: stock.symbol,
        company_name: stock.company_name,
        exchange: stock.exchange,
        event_date: eventDate,
        event_time: eventTime,
        event_type: eventType,
        sector: stock.sector,
        quarter: q.quarter,
        fiscal_year: q.fy,
        description: `${q.quarter} FY${q.fy} ${eventType === 'quarterly_results' ? 'Results' : eventType === 'dividend' ? 'Dividend' : eventType === 'guidance' ? 'Guidance' : 'Earnings'} - ${stock.company_name}`,
        source: 'system',
      });
    }
  }
  events.sort((a, b) => a.event_date.localeCompare(b.event_date));
  return events;
}

async function tryPersist(events: any[]) {
  try {
    await runSql(`
      CREATE TABLE IF NOT EXISTS public.earnings_calendar (
        id BIGSERIAL PRIMARY KEY,
        symbol TEXT NOT NULL,
        company_name TEXT DEFAULT '',
        exchange TEXT DEFAULT 'NSE',
        event_date DATE NOT NULL,
        event_time TEXT DEFAULT 'not_specified',
        event_type TEXT DEFAULT 'quarterly_results',
        sector TEXT DEFAULT '',
        quarter TEXT DEFAULT '',
        fiscal_year INT DEFAULT 0,
        description TEXT DEFAULT '',
        source TEXT DEFAULT 'system',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_earnings_calendar_date ON public.earnings_calendar (event_date DESC);
      CREATE INDEX IF NOT EXISTS idx_earnings_calendar_symbol ON public.earnings_calendar (symbol);
      ALTER TABLE public.earnings_calendar ENABLE ROW LEVEL SECURITY;
    `);
    if (supabaseAdmin) {
      const BATCH = 50;
      for (let i = 0; i < events.length; i += BATCH) {
        await supabaseAdmin.from('earnings_calendar').upsert(
          events.slice(i, i + BATCH).map(({ id, ...rest }) => rest),
          { onConflict: 'symbol,event_date,quarter,fiscal_year', ignoreDuplicates: true }
        );
      }
    }
  } catch (e) {
    console.error('Failed to persist earnings calendar:', e);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const forceRefresh = searchParams.get('refresh') === 'true';

  const events = generateEvents();

  /* Try to persist to DB (fire-and-forget) */
  if (!forceRefresh) {
    tryPersist(events);
  }

  return NextResponse.json({ events, source: 'generated', count: events.length });
}
