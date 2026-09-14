import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runSql } from '@/lib/run-sql';

export const dynamic = 'force-dynamic';

const NEWSAPI_KEY = process.env.NEWSAPI_KEY || '';

const SECTORS = [
  'Fintech', 'Jewellery', 'IT', 'Cruise Tourism', 'Packaging',
  'Metals & Mining', 'Healthcare', 'FMCG', 'Energy', 'Dairy',
  'Quick Commerce', 'E-commerce', 'Stock Exchange', 'Manufacturing',
];

interface IpoDef {
  symbol: string;
  company_name: string;
  exchange: string;
  open_date: string;
  close_date: string;
  listing_date: string;
  issue_type: string;
  price_band: string;
  lot_size: number;
  issue_size_cr: number;
  sector: string;
  status: string;
  gmp: number;
}

const CURATED_IPOS: IpoDef[] = [
  {
    symbol: 'TURTLEMINT',
    company_name: 'Turtlemint Fintech Solutions',
    exchange: 'NSE',
    open_date: '2026-06-19',
    close_date: '2026-06-22',
    listing_date: '2026-06-26',
    issue_type: 'mainboard',
    price_band: '₹144 – ₹152',
    lot_size: 100,
    issue_size_cr: 883,
    sector: 'Fintech',
    status: 'upcoming',
    gmp: 0,
  },
  {
    symbol: 'ADVITJEWELS',
    company_name: 'Advit Jewels',
    exchange: 'NSE',
    open_date: '2026-06-23',
    close_date: '2026-06-25',
    listing_date: '2026-07-01',
    issue_type: 'mainboard',
    price_band: '₹130 – ₹165',
    lot_size: 100,
    issue_size_cr: 180,
    sector: 'Jewellery',
    status: 'upcoming',
    gmp: 0,
  },
  {
    symbol: 'CORDELIA',
    company_name: 'Waterways Leisure Tourism (Cordelia Cruises)',
    exchange: 'NSE',
    open_date: '2026-06-24',
    close_date: '2026-06-26',
    listing_date: '2026-07-02',
    issue_type: 'mainboard',
    price_band: '₹185 – ₹210',
    lot_size: 70,
    issue_size_cr: 727,
    sector: 'Cruise Tourism',
    status: 'upcoming',
    gmp: 0,
  },
  {
    symbol: 'KNACKPACK',
    company_name: 'Knack Packaging',
    exchange: 'BSE',
    open_date: '2026-06-26',
    close_date: '2026-06-30',
    listing_date: '2026-07-04',
    issue_type: 'mainboard',
    price_band: '₹95 – ₹110',
    lot_size: 120,
    issue_size_cr: 250,
    sector: 'Packaging',
    status: 'upcoming',
    gmp: 0,
  },
  {
    symbol: 'ZEPTO',
    company_name: 'Zepto',
    exchange: 'NSE',
    open_date: '2026-07-10',
    close_date: '2026-07-14',
    listing_date: '2026-07-18',
    issue_type: 'mainboard',
    price_band: '₹350 – ₹380',
    lot_size: 40,
    issue_size_cr: 6000,
    sector: 'Quick Commerce',
    status: 'upcoming',
    gmp: 0,
  },
  {
    symbol: 'MILKYMIST',
    company_name: 'Milky Mist Dairy Food',
    exchange: 'NSE',
    open_date: '2026-07-06',
    close_date: '2026-07-08',
    listing_date: '2026-07-14',
    issue_type: 'mainboard',
    price_band: '₹175 – ₹195',
    lot_size: 75,
    issue_size_cr: 2035,
    sector: 'Dairy',
    status: 'upcoming',
    gmp: 0,
  },
  {
    symbol: 'SHIPROCKET',
    company_name: 'Shiprocket',
    exchange: 'NSE',
    open_date: '2026-07-15',
    close_date: '2026-07-17',
    listing_date: '2026-07-23',
    issue_type: 'mainboard',
    price_band: '₹250 – ₹275',
    lot_size: 50,
    issue_size_cr: 3200,
    sector: 'E-commerce',
    status: 'upcoming',
    gmp: 0,
  },
  {
    symbol: 'ZETWERK',
    company_name: 'Zetwerk',
    exchange: 'NSE',
    open_date: '2026-08-05',
    close_date: '2026-08-07',
    listing_date: '2026-08-14',
    issue_type: 'mainboard',
    price_band: '₹280 – ₹310',
    lot_size: 45,
    issue_size_cr: 4500,
    sector: 'Manufacturing',
    status: 'upcoming',
    gmp: 0,
  },
  {
    symbol: 'CMRGREEN',
    company_name: 'CMR Green Technologies',
    exchange: 'NSE',
    open_date: '2026-06-03',
    close_date: '2026-06-05',
    listing_date: '2026-06-11',
    issue_type: 'mainboard',
    price_band: '₹145 – ₹150',
    lot_size: 100,
    issue_size_cr: 631,
    sector: 'Metals & Mining',
    status: 'listing',
    gmp: 0,
  },
  {
    symbol: 'HEXANUTR',
    company_name: 'Hexagon Nutrition',
    exchange: 'NSE',
    open_date: '2026-06-05',
    close_date: '2026-06-09',
    listing_date: '2026-06-12',
    issue_type: 'mainboard',
    price_band: '₹42 – ₹45',
    lot_size: 300,
    issue_size_cr: 139,
    sector: 'Healthcare',
    status: 'listing',
    gmp: 0,
  },
  {
    symbol: 'NSE',
    company_name: 'National Stock Exchange of India',
    exchange: 'NSE',
    open_date: '2026-08-20',
    close_date: '2026-08-22',
    listing_date: '2026-08-29',
    issue_type: 'mainboard',
    price_band: '₹2200 – ₹2500',
    lot_size: 6,
    issue_size_cr: 30000,
    sector: 'Stock Exchange',
    status: 'upcoming',
    gmp: 0,
  },
];

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toSymbol(name: string): string {
  return name
    .replace(/\(.*?\)/g, '')
    .replace(/[^A-Za-z0-9]/g, ' ')
    .trim()
    .split(/\s+/)
    .map(w => w.toUpperCase())
    .join('')
    .slice(0, 15) || 'IPO';
}

function parseDateRange(dateStr: string): { open_date: string; close_date: string } | null {
  const m = dateStr.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([A-Za-z]+)/);
  if (!m) return null;
  const startDay = parseInt(m[1], 10);
  const endDay = parseInt(m[2], 10);
  const monthName = m[3].toLowerCase();
  const monthIdx = MONTHS.indexOf(monthName);
  if (monthIdx === -1) return null;
  const year = new Date().getFullYear();
  let openMonth = monthIdx;
  const closeMonth = monthIdx;
  if (startDay > endDay) {
    openMonth = monthIdx - 1;
    if (openMonth < 0) openMonth = 11;
  }
  return {
    open_date: `${year}-${pad(openMonth + 1)}-${pad(startDay)}`,
    close_date: `${year}-${pad(closeMonth + 1)}-${pad(endDay)}`,
  };
}

function estimateListingDate(closeDate: string, issueType: string): string {
  const d = new Date(closeDate + 'T00:00:00');
  const days = issueType === 'sme' ? 3 : 6;
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function mapExchange(ipoType: string): string {
  const t = ipoType.toUpperCase();
  if (t.includes('BSE')) return 'BSE';
  return 'NSE';
}

function mapIssueType(ipoType: string): string {
  return ipoType.toUpperCase().includes('SME') ? 'sme' : 'mainboard';
}

function mapIpoWatchStatus(raw: string, ipo: { open_date: string; close_date: string; listing_date: string }): string {
  const s = raw.toLowerCase();
  if (s === 'open') return 'open';
  if (s === 'closed') return 'closed';
  const now = new Date().toISOString().split('T')[0];
  if (ipo.listing_date < now) return 'listing';
  if (ipo.close_date < now) return 'closed';
  if (ipo.open_date <= now && ipo.close_date >= now) return 'open';
  return 'upcoming';
}

function cleanCell(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function extractPrice(html: string): string {
  return cleanCell(html).replace(/[₹&#8377;,\s]/g, '').trim();
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildCuratedLookup(): Map<string, IpoDef> {
  const map = new Map<string, IpoDef>();
  for (const ipo of CURATED_IPOS) {
    map.set(normalizeName(ipo.company_name), ipo);
    map.set(normalizeName(ipo.symbol), ipo);
  }
  return map;
}

/* ─── Fetch ALL IPO data from ipowatch.in ─── */

async function fetchAllFromIpoWatch(): Promise<any[] | null> {
  try {
    const res = await fetch('https://www.ipowatch.in/ipo-grey-market-premium/', {
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const tableMatch = html.match(/<table[\s\S]*?IPO Name[\s\S]*?IPO GMP[\s\S]*?<\/table>/i);
    if (!tableMatch) return null;

    const rows = tableMatch[0].match(/<tr[\s\S]*?<\/tr>/gi) || [];
    const curatedLookup = buildCuratedLookup();
    const results: any[] = [];
    let idCounter = 0;

    for (const row of rows) {
      if (row.includes('IPO Name') || row.includes('IPO GMP')) continue;
      const cells = row.match(/<td[^>]*>(.*?)<\/td>/gi);
      if (!cells || cells.length < 7) continue;

      const nameRaw = cleanCell(cells[0]);
      if (!nameRaw || nameRaw.length < 2 || nameRaw.length > 60) continue;

      const gmpVal = parseInt(extractPrice(cells[1]), 10) || 0;
      const priceRaw = extractPrice(cells[3]);
      const priceBand = priceRaw ? `₹${priceRaw}` : '';
      const estListingRaw = cleanCell(cells[4]);
      const dateRangeRaw = cleanCell(cells[5]);
      const ipoTypeRaw = cleanCell(cells[6]);
      const statusRaw = cleanCell(cells[7]);

      const dates = dateRangeRaw ? parseDateRange(dateRangeRaw) : null;
      if (!dates) continue;

      const issueType = mapIssueType(ipoTypeRaw);
      const exchange = mapExchange(ipoTypeRaw);
      const listingDate = estimateListingDate(dates.close_date, issueType);
      const symbol = toSymbol(nameRaw);

      const fullIpo = {
        open_date: dates.open_date,
        close_date: dates.close_date,
        listing_date: listingDate,
        issue_type: issueType,
        exchange,
      };

      const status = mapIpoWatchStatus(statusRaw, fullIpo);
      idCounter++;

      const curatedKey = normalizeName(nameRaw);
      let enriched: { sector: string; lot_size: number; issue_size_cr: number; description: string; price_band: string | null } = {
        sector: 'General',
        lot_size: 0,
        issue_size_cr: 0,
        description: '',
        price_band: null,
      };

      for (const [ckey, cipo] of curatedLookup) {
        if (curatedKey.includes(ckey) || ckey.includes(curatedKey)) {
          enriched = {
            sector: cipo.sector,
            lot_size: cipo.lot_size,
            issue_size_cr: cipo.issue_size_cr,
            description: `${issueType === 'sme' ? 'SME ' : ''}IPO of ${nameRaw} — ${cipo.sector}. Opens: ${dates.open_date}, Closes: ${dates.close_date}, Listing: ${listingDate}`,
            price_band: cipo.price_band,
          };
          break;
        }
      }

      if (!enriched.description) {
        enriched.description = `${issueType === 'sme' ? 'SME ' : ''}IPO of ${nameRaw}. Opens: ${dates.open_date}, Closes: ${dates.close_date}, Listing: ${listingDate}`;
      }

      results.push({
        id: idCounter,
        gmp: gmpVal,
        symbol,
        company_name: nameRaw,
        exchange,
        ipo_date: dates.open_date,
        issue_type: issueType,
        price_band: enriched.price_band || priceBand,
        lot_size: enriched.lot_size,
        min_investment: priceRaw ? parseInt(priceRaw, 10) * 100 : 0,
        sector: enriched.sector,
        status,
        description: enriched.description,
        source: 'ipowatch',
        close_date: dates.close_date,
        listing_date: listingDate,
      });
    }

    return results.length > 0 ? results : null;
  } catch {
    return null;
  }
}

/* ─── NewsAPI fallback ─── */

async function fetchNewsIpos(): Promise<any[]> {
  const newsIpos: any[] = [];
  if (!NEWSAPI_KEY) return newsIpos;

  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=India+IPO&sortBy=publishedAt&pageSize=50&language=en&apiKey=${NEWSAPI_KEY}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return newsIpos;
    const data = await res.json();
    if (!data.articles?.length) return newsIpos;

    for (const article of data.articles) {
      const text = `${article.title || ''} ${article.description || ''}`;
      const ipoMatch = text.match(/([A-Z][A-Za-z\s&.]+)\s+(?:to\s+)?(?:launch|file|open|list)\s+(?:its\s+)?IPO/i);
      if (!ipoMatch) continue;
      const rawName = ipoMatch[1].trim().replace(/\s+IPO.*/, '').trim();
      if (rawName.length < 3) continue;

      let dateStr = '';
      const dateMatch = text.match(/IPO\s+(?:on|opens?|closes?)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i);
      if (dateMatch) dateStr = dateMatch[0];

      const priceMatch = text.match(/₹\s*(\d+)\s*[–-]\s*₹\s*(\d+)/);
      const priceBand = priceMatch ? `₹${priceMatch[1]} – ₹${priceMatch[2]}` : '';
      const minInv = priceMatch ? parseInt(priceMatch[1]) * 100 : 0;

      newsIpos.push({
        gmp: 0,
        symbol: rawName.replace(/[^A-Z]/g, '').slice(0, 15) || 'IPO',
        company_name: rawName,
        exchange: 'NSE/BSE',
        ipo_date: dateStr || 'TBD',
        issue_type: 'mainboard',
        price_band: priceBand || 'TBD',
        lot_size: 0,
        min_investment: minInv,
        sector: 'General',
        status: 'upcoming',
        description: `Upcoming IPO of ${rawName} — sourced from news`,
        source: 'newsapi',
      });
    }
  } catch {
    /* silent */
  }

  return newsIpos;
}

/* ─── Persist ─── */

async function tryPersist(ipos: any[]) {
  try {
    await runSql(`
      CREATE TABLE IF NOT EXISTS public.upcoming_ipos (
        id BIGSERIAL PRIMARY KEY,
        symbol TEXT NOT NULL,
        company_name TEXT DEFAULT '',
        exchange TEXT DEFAULT 'NSE',
        ipo_date DATE NOT NULL,
        issue_type TEXT DEFAULT 'mainboard',
        price_band TEXT DEFAULT '',
        lot_size INT DEFAULT 0,
        min_investment INT DEFAULT 0,
        sector TEXT DEFAULT '',
        status TEXT DEFAULT 'upcoming',
        description TEXT DEFAULT '',
        source TEXT DEFAULT 'system',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_upcoming_ipos_date ON public.upcoming_ipos (ipo_date DESC);
      CREATE INDEX IF NOT EXISTS idx_upcoming_ipos_symbol ON public.upcoming_ipos (symbol);
      CREATE INDEX IF NOT EXISTS idx_upcoming_ipos_status ON public.upcoming_ipos (status);
      ALTER TABLE public.upcoming_ipos ENABLE ROW LEVEL SECURITY;
    `);
    if (supabaseAdmin) {
      const BATCH = 50;
      for (let i = 0; i < ipos.length; i += BATCH) {
        await supabaseAdmin.from('upcoming_ipos').upsert(
          ipos.slice(i, i + BATCH).map(({ id, ...rest }) => rest),
          { onConflict: 'symbol,ipo_date', ignoreDuplicates: true }
        );
      }
    }
  } catch (e) {
    console.error('Failed to persist IPOs:', e);
  }
}

function computeMinInv(priceBand: string, lotSize: number): number {
  const match = priceBand.match(/₹(\d+)/);
  if (!match || !lotSize) return 0;
  return parseInt(match[1]) * lotSize;
}

async function loadFromDb(): Promise<any[] | null> {
  try {
    if (!supabaseAdmin) return null;
    const { data } = await supabaseAdmin
      .from('upcoming_ipos')
      .select('*')
      .order('ipo_date', { ascending: true })
      .limit(100);
    return data?.length ? data.map(r => ({ ...r, ipo_date: r.ipo_date?.split('T')[0] || r.ipo_date })) : null;
  } catch {
    return null;
  }
}

/* ─── GET handler ─── */

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const forceRefresh = searchParams.get('refresh') === 'true';

  if (!forceRefresh) {
    const cached = await loadFromDb();
    if (cached) {
      return NextResponse.json({ ipos: cached, source: 'database', count: cached.length });
    }
  }

  // Primary: fetch from ipowatch
  const ipowatchIpos = await fetchAllFromIpoWatch();

  let resultIpos: any[];
  let source: string;

  if (ipowatchIpos && ipowatchIpos.length > 0) {
    resultIpos = ipowatchIpos;
    source = 'ipowatch';
  } else {
    // Fallback: use curated list
    resultIpos = CURATED_IPOS.map((ipo, i) => {
      const now = new Date().toISOString().split('T')[0];
      let status = ipo.status;
      if (ipo.listing_date < now) status = 'listing';
      else if (ipo.close_date < now) status = 'closed';
      else if (ipo.open_date <= now && ipo.close_date >= now) status = 'open';
      else if (ipo.open_date > now) status = 'upcoming';
      return {
        id: i + 1,
        gmp: ipo.gmp,
        symbol: ipo.symbol,
        company_name: ipo.company_name,
        exchange: ipo.exchange,
        ipo_date: ipo.open_date,
        issue_type: ipo.issue_type,
        price_band: ipo.price_band,
        lot_size: ipo.lot_size,
        min_investment: computeMinInv(ipo.price_band, ipo.lot_size),
        sector: ipo.sector,
        status,
        description: `${ipo.issue_type === 'sme' ? 'SME ' : ''}IPO of ${ipo.company_name} — ${ipo.sector}. Opens: ${ipo.open_date}, Closes: ${ipo.close_date}, Listing: ${ipo.listing_date}`,
        source: 'curated',
      };
    });
    source = 'curated';
  }

  // Merge news IPOs (append)
  const newsIpos = await fetchNewsIpos();
  const allIpos = [...resultIpos, ...newsIpos];

  tryPersist(allIpos);

  return NextResponse.json({ ipos: resultIpos, newsDiscovered: newsIpos.length, source, count: resultIpos.length });
}
