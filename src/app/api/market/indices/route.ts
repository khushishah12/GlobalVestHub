import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
export const dynamic = 'force-dynamic';

function marketStatus(): 'open' | 'closed' {
  const now = new Date();
  const istOffset = 5.5 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + istOffset * 60000);
  const h = ist.getHours(), m = ist.getMinutes(), d = ist.getDay();
  if (d === 0 || d === 6) return 'closed';
  const total = h * 60 + m;
  if (total >= 555 && total <= 930) return 'open';
  return 'closed';
}

export async function GET() {
  try {
    const INDICES: [string, string][] = [
      ['^NSEI', 'NIFTY 50'],
      ['^BSESN', 'SENSEX'],
      ['^NSEBANK', 'BANK NIFTY'],
      ['^CNXIT', 'NIFTY IT'],
      ['^CNXAUTO', 'NIFTY AUTO'],
      ['^CNXPHARMA', 'NIFTY PHARMA'],
      ['^CNXFMCG', 'NIFTY FMCG'],
      ['^CNXMETAL', 'NIFTY METAL'],
      ['^CNXREALTY', 'NIFTY REALTY'],
      ['^CNXENERGY', 'NIFTY ENERGY'],
      ['^INDIAVIX', 'INDIA VIX'],
    ];

    const [quotesRaw, sparklineRaw] = await Promise.all([
      yahooFinance.quote(INDICES.map(([sym]) => sym)).catch(() => null),
      yahooFinance.chart('^NSEI', {
        period1: Math.floor(Date.now() / 1000) - 86400,
        interval: '5m',
        return: 'object',
      }).catch(() => null),
    ]);

    interface QuoteData {
      regularMarketPrice?: number;
      regularMarketChange?: number;
      regularMarketChangePercent?: number;
    }
    const quoteMap: Record<string, QuoteData> = {};
    if (quotesRaw) {
      for (const q of quotesRaw) {
        quoteMap[q.symbol] = {
          regularMarketPrice: q.regularMarketPrice,
          regularMarketChange: q.regularMarketChange,
          regularMarketChangePercent: q.regularMarketChangePercent,
        };
      }
    }

    function extract(sym: string, label: string) {
      const q = quoteMap[sym];
      return {
        symbol: sym,
        label,
        price: q?.regularMarketPrice ?? null,
        change: q?.regularMarketChange ?? null,
        changePercent: q?.regularMarketChangePercent ?? null,
      };
    }

    const sparkline: { time: string; close: number }[] = [];
    if (sparklineRaw?.indicators?.quote?.[0]) {
      const q = sparklineRaw.indicators.quote[0];
      const ts = sparklineRaw.timestamp || [];
      for (let i = 0; i < ts.length; i++) {
        const c = q.close?.[i];
        if (c && c > 0) {
          sparkline.push({
            time: new Date(ts[i] * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }),
            close: c,
          });
        }
      }
    }

    return NextResponse.json({
      indices: INDICES.map(([sym, label]) => extract(sym, label)),
      sparkline,
      marketStatus: marketStatus(),
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Market indices error:', err);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
