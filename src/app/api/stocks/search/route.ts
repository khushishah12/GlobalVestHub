import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  const sector = request.nextUrl.searchParams.get('sector')?.trim() || '';

  if (!q && !sector) {
    return NextResponse.json([]);
  }

  try {
    let query = supabase
      .from('stocks')
      .select('symbol, company_name, exchange, sector, industry');

    if (q) {
      query = query.or(`symbol.ilike.%${q}%,company_name.ilike.%${q}%`);
    }
    if (sector) {
      query = query.eq('sector', sector);
    }

    const { data: stocks } = await query.limit(20);

    if (!stocks || stocks.length === 0) {
      return NextResponse.json([]);
    }

    const symbols = stocks.map((s: { symbol: string }) => s.symbol);
    let quotes: any[] = [];
    try {
      const result = await yahooFinance.quote(symbols);
      quotes = Array.isArray(result) ? result : [result];
    } catch {
      try {
        quotes = [];
        for (const sym of symbols) {
          try {
            const qr = await yahooFinance.quote(sym);
            quotes.push(qr);
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }

    const quoteMap = new Map(quotes.map((q: any) => [q.symbol, q]));

    const enriched = stocks.map((s: { symbol: string; company_name: string; exchange: string; sector: string; industry: string }) => {
      const quote = quoteMap.get(s.symbol);
      const price = quote?.regularMarketPrice;
      const prevClose = quote?.regularMarketPreviousClose;
      const changePercent = price && prevClose && prevClose > 0
        ? ((price - prevClose) / prevClose) * 100
        : null;
      return {
        symbol: s.symbol,
        short_symbol: s.symbol.replace(/\.(NS|BO)$/, ''),
        exchange: s.exchange,
        company_name: s.company_name,
        sector: s.sector,
        industry: s.industry,
        price: price ?? null,
        change_percent: changePercent ? parseFloat(changePercent.toFixed(2)) : null,
        volume: quote?.regularMarketVolume ?? null,
        market_cap: quote?.marketCap ?? null,
        hasQuote: !!price,
      };
    });

    enriched.sort((a: { volume: number | null }, b: { volume: number | null }) => (b.volume ?? 0) - (a.volume ?? 0));
    const withQuote = enriched.filter(s => s.hasQuote);

    const now = Math.floor(Date.now() / 1000);
    const twoYearsBack = now - 86400 * 730;
    const histChecks = await Promise.allSettled(
      withQuote.map(s => yahooFinance.chart(s.symbol, { period1: twoYearsBack, period2: now, interval: '1mo', return: 'object' }))
    );
    const filtered = withQuote.filter((_, i) => {
      const r = histChecks[i];
      return r.status === 'fulfilled' && r.value?.indicators?.quote?.[0]?.close?.some((c: number | null) => c && c > 0);
    });

    return NextResponse.json(filtered, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
