import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance();
const symbols = [
  '^NSEI', '^BSESN', '^NSEBANK', '^CNXIT', '^CNXPHARMA',
  '^CNXAUTO', '^CNXFMCG', '^CNXMETAL', '^CNXREALTY',
  '^CNXINFRA', '^CNXENERGY', '^INDIAVIX',
];
try {
  const r = await yf.quote(symbols);
  for (const q of r) {
    console.log(JSON.stringify({ symbol: q.symbol, name: q.shortName || q.longName, price: q.regularMarketPrice, change: q.regularMarketChangePercent }));
  }
} catch (e) {
  console.error('ERR', e && e.message || e);
  process.exit(1);
}