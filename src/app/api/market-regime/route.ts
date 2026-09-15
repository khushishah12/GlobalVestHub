import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { predictRegime } from '@/lib/ml';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

const SYMBOLS = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS',
  'BHARTIARTL.NS', 'ITC.NS', 'SBIN.NS', 'LT.NS', 'HINDUNILVR.NS',
  'BAJFINANCE.NS', 'KOTAKBANK.NS', 'AXISBANK.NS', 'ASIANPAINT.NS',
  'MARUTI.NS', 'SUNPHARMA.NS', 'TITAN.NS', 'ULTRACEMCO.NS',
  'NTPC.NS', 'POWERGRID.NS',
];

interface RegimePrediction {
  symbol: string;
  regime: string;
  confidence: number;
  probabilities: number[];
}

export async function GET() {
  try {
    const results = await Promise.allSettled(SYMBOLS.map(async (sym) => {
      try {
        const hist = await yahooFinance.historical(sym, {
          period1: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
          period2: new Date(),
          interval: '1d',
        });
        if (!hist || hist.length < 30) {
          return { symbol: sym, regime: 'NEUTRAL', confidence: 0, probabilities: [33.3, 33.3, 33.3] } as RegimePrediction;
        }
        const ohlcv = hist.slice(-60).map(d => [
          d.open ?? 0,
          d.high ?? 0,
          d.low ?? 0,
          d.close ?? 0,
          d.volume ?? 0,
        ]);
        return { symbol: sym, ...predictRegime(ohlcv) };
      } catch {
        return { symbol: sym, regime: 'NEUTRAL', confidence: 0, probabilities: [33.3, 33.3, 33.3] } as RegimePrediction;
      }
    }));

    const predictions = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    return NextResponse.json({ predictions, updated_at: new Date().toISOString() });
  } catch (err) {
    console.error('Market regime error:', err);
    return NextResponse.json({ error: 'Failed to generate regime predictions' }, { status: 500 });
  }
}