import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
export const dynamic = 'force-dynamic';

const POPULAR_SYMBOLS = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd', sector: 'Energy' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd', sector: 'IT' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', sector: 'Banking' },
  { symbol: 'INFY.NS', name: 'Infosys Ltd', sector: 'IT' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd', sector: 'Banking' },
  { symbol: 'WIPRO.NS', name: 'Wipro Ltd', sector: 'IT' },
  { symbol: 'ITC.NS', name: 'ITC Ltd', sector: 'FMCG' },
  { symbol: 'SBIN.NS', name: 'State Bank of India', sector: 'Banking' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Ltd', sector: 'Telecom' },
  { symbol: 'LT.NS', name: 'Larsen & Toubro Ltd', sector: 'Infrastructure' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever Ltd', sector: 'FMCG' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank Ltd', sector: 'Banking' },
];

export async function GET() {
  try {
    const symbols = POPULAR_SYMBOLS.map(s => s.symbol);
    const quotes = await yahooFinance.quote(symbols).catch(() => null);
    const quoteMap = new Map();
    if (quotes) {
      for (const q of quotes) {
        quoteMap.set(q.symbol, q);
      }
    }

    const result = POPULAR_SYMBOLS.map((stock) => {
      const q = quoteMap.get(stock.symbol);
      const price = q?.regularMarketPrice ?? null;
      const prevClose = q?.regularMarketPreviousClose;
      const changePercent = price && prevClose && prevClose > 0
        ? parseFloat((((price - prevClose) / prevClose) * 100).toFixed(2))
        : null;
      return {
        symbol: stock.symbol,
        short_symbol: stock.symbol.replace(/\.(NS|BO)$/, ''),
        company_name: stock.name,
        sector: stock.sector,
        price,
        change: q?.regularMarketChange ?? null,
        change_percent: changePercent,
        volume: q?.regularMarketVolume ?? null,
        market_cap: q?.marketCap ?? null,
      };
    });

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Popular stocks error:', err);
    return NextResponse.json({ error: 'Failed to fetch popular stocks' }, { status: 500 });
  }
}
