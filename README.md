# AI Stock Dashboard 3D

A full-stack Indian stock market dashboard built with **Next.js 16**, **Three.js** (React Three Fiber), **Supabase**, and **Python ML** models. Features live NSE/BSE quotes, 3D data visualizations, candlestick charts with 28 deterministic pattern detectors, ML-powered return predictions and market regime classification, IPO & earnings calendars, portfolio/watchlist management, chatbot with RAG, news aggregation, and a what-if calculator.

---

## Table of Contents

- [Architecture](#architecture)
- [Data Sources & APIs](#data-sources--apis)
- [ML Models](#ml-models)
- [Challenges Faced](#challenges-faced)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            BROWSER (React 19)                           │
│  Next.js App Router + Three.js + Tailwind CSS 4 + Framer Motion 12     │
│  Zustand (state) · Lucide (icons) · Chart.js (client charts)           │
│                                                                         │
│  Dashboard  Stock Detail  Charts    3D Globe   Chatbot  Watchlist      │
│  Home       + Report      + Picker   View      (Groq)  + Portfolio     │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │ HTTP / JSON
┌──────────────────────▼──────────────────────────────────────────────────┐
│                      NEXT.JS API ROUTES (31 files)                      │
│                                                                         │
│  ┌──────────┐ ┌──────────────┐ ┌───────────┐ ┌─────────────┐          │
│  │ Stock    │ │ News         │ │ User Data │ │ ML          │          │
│  │ & Market │ │ (NewsAPI     │ │ Watchlist │ │ Predictions │          │
│  │ Yahoo    │ │  GDELT RSS)  │ │ Portfolio │ │ (subprocess)│          │
│  │ Finance  │ │              │ │ Auth      │ │             │          │
│  └────┬─────┘ └──────┬───────┘ └─────┬─────┘ └──────┬──────┘          │
│       │              │               │              │                  │
└───────┼──────────────┼───────────────┼──────────────┼──────────────────┘
        │              │               │              │
   ┌────▼────┐   ┌────▼────┐    ┌─────▼─────┐   ┌────▼────┐
   │ Yahoo   │   │ NewsAPI │    │ Supabase  │   │ Python  │
   │ Finance2│   │ GDELT   │    │ PostgreSQL│   │ 3.13    │
   │ (free)  │   │ RSS     │    │ Auth      │   │ joblib  │
   └─────────┘   └─────────┘    │ Storage   │   │ Model   │
                                └───────────┘   └─────────┘
   ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐
   │ ipowatch │  │ Groq API  │  │QuickChart│  │ Twelve   │
   │ (scrape) │  │ (LLaMA)   │  │.io (PNG) │  │ Data     │
   └──────────┘  └───────────┘  └──────────┘  └──────────┘
```

---

## Data Sources & APIs

| Source | Data Provided | Key Required | Used By | Notes |
|--------|--------------|-------------|---------|-------|
| **Yahoo Finance** (`yahoo-finance2`) | Quotes, OHLCV, fundamentals, insights, search, screener, news | None | All stock/market routes (20+) | Primary data source. Free, no API key. `.NS`/`.BO` suffixes for Indian stocks |
| **NewsAPI** | News articles by keyword | `NEWSAPI_KEY` | `/news-latest`, `/news-fetch`, `/ipos` | Primary news source. Free tier limited |
| **GDELT** | News articles (fallback) | None | `/news-latest`, `/news-fetch` | Free, no key. URL params use `=` not `:` |
| **RSS Feeds** (Livemint, Hindu Business Line) | News (tertiary) | None | `/news-latest`, `/news-fetch` | Parsed from RSS XML |
| **ipowatch.in** | IPO GMP table (scraped) | None | `/ipos` | Scraped HTML. 9 columns parsed. 12s timeout |
| **Groq API** | LLM completions (LLaMA 3.3 70B, LLaMA 3.1 8B, Mixtral 8x7B) | `GROQ_API_KEY` | `/chat` | OpenAI-compatible, streaming SSE, 3-model fallback chain, includes live context |
| **Supabase** | PostgreSQL DB, Auth, Storage | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` | Watchlist, Portfolio, Patterns, IPOs, Calendar, Knowledge, Discover | DB + Auth. Service role key bypasses RLS |
| **QuickChart.io** | PNG chart rendering | None | `/visualize`, `detail`, `sector-chart` | URL-encoded Chart.js configs rendered server-side |
| **Finnhub** | Symbol discovery | `FINNHUB_API_KEY` | `/discover` | Free tier `stock/symbol` endpoint is blocked for Indian markets |
| **Twelve Data** | Symbol discovery | `TWELVE_DATA_API_KEY` | `/discover` | `ipo_calendar` endpoint returns 403 — only used for symbol discovery |

---

## ML Models

### 1. Future Returns Predictor

**Algorithm:** XGBoost Regressor (500 trees)

**Model Files:** `src/models/return_prediction_regressor.pkl`, `src/models/stock_regression_features.pkl`

**Python Script:** `Models/future_returns_predict.py`

**Input — 13 engineered features** from 1 year of daily OHLCV:

| Feature | Computation |
|---------|------------|
| `daily_return` | `(close - close_prev) / close_prev` |
| `5_day_return` | `(close - close[-5]) / close[-5]` |
| `20_day_return` | `(close - close[-20]) / close[-20]` |
| `volatility_20d` | Standard deviation of daily returns over 20 days |
| `RSI` | `100 - (100 / (1 + RS))` where RS = avg_gain / avg_loss (14-period) |
| `MACD` | EMA(12) - EMA(26) |
| `price_momentum` | `close / close[-20] - 1` |
| `volume` | `log(volume)` |
| `ma20_ratio` | `close / SMA(20)` |
| `ma50_ratio` | `close / SMA(50)` |
| `volume_ratio` | `volume / SMA(volume, 20)` |
| `ma20_ma50_ratio` | `SMA(20) / SMA(50)` |
| `distance_from_52w_high` | `(high_52w - close) / high_52w` |

**Pipeline:**
1. API route (`/api/future-returns`) fetches 1yr OHLCV for 25 hardcoded symbols from Yahoo Finance
2. Computes all 13 features in pure NumPy/Pandas
3. Spawns Python subprocess with JSON input on stdin
4. Python loads model via `joblib.load()`, runs inference
5. Output: `[{symbol, predicted_return (%), confidence (0-95), recommendation}]`
6. Recommendations assigned by ranking within batch: top 25% Strong Buy, next 25% Buy, next 25% Watchlist, bottom 25% Avoid

**Clamping:** Predicted return clamped to [-30%, +60%]. Confidence capped at 95.

---

### 2. Market Regime Classifier

**Algorithm:** Random Forest Classifier (3 classes: BEAR / NEUTRAL / BULL)

**Model Files:** `src/models/regime_rf_model.pkl`, `src/models/regime_scaler.pkl`

**Python Script:** `Models/regime_predict.py`

**Input — 4 features × 60 timesteps (rolling window):**

| Feature | Computation |
|---------|------------|
| `log_return_1d` | `log(close_t / close_{t-1})` |
| `volatility` | `(high_t - low_t) / close_t` |
| `log_return_4d` | `log(close_t / close_{t-4})` |
| `log_volume` | `log(volume_t)` |

**Pipeline:**
1. API route (`/api/market-regime`) fetches 6 months of daily OHLCV for 20 symbols from Yahoo Finance
2. Computes the 4 features for each day, creating a 60-timestep sliding window per symbol
3. Standardizes features using `StandardScaler` (loaded via joblib)
4. Spawns Python subprocess with JSON input on stdin
5. Python loads Random Forest model, predicts regime class + probabilities
6. Output: `[{symbol, regime ("BEAR"/"NEUTRAL"/"BULL"), confidence (%), probabilities [bear%, neutral%, bull%]}]`

**Note on window size:** If fewer than 60 timesteps of data are available, returns error. The 60-day window captures ~3 months of market behavior.

---

### 3. Stock Picker

**Algorithm:** Random Forest Regressor (fallback to rule-based formula if model unavailable)

**Model Files:** `Models/stock_return_rf_model.pkl`, `Models/stock_features.pkl`

**Python Script:** `Models/stock_picker.py`

**ML Features (stored in `stock_features.pkl` — names differ from rule features):**
- `valuation_score`, `financial_stability_score`, `debt_risk_score`, `growth_score`
- `roe`, `pe_ratio`, `pb_ratio`, `market_cap`

These are computed in the API route (`/api/stock-picker`) from Yahoo Finance `quoteSummary` data.

**Rule-based fallback formula** (when model file is missing):

```
Score = 0.20 × ROE - 0.10 × PE - 0.08 × PB - 0.12 × D/E
      + 0.15 × ProfitMargin + 0.18 × RevenueGrowth + 0.18 × EarningsGrowth
      + 0.20 × PriceMomentum(3m) + 0.10 × SectorScore
```

**Pipeline:**
1. API route fetches quote + fundamentals for 25 hardcoded symbols from Yahoo Finance
2. Computes financial metrics (PE, PB, ROE, D/E, profit margins, revenue/earnings growth)
3. Assigns sector scores based on NSE industry classification
4. Spawns Python subprocess with all computed features
5. Python tries ML model → falls back to rule formula if model not found
6. Output: `[{symbol, predicted_return (%), confidence (%), recommendation, sector}]`

---

### 4. Signal Classifier

**Algorithm:** Random Forest Classifier (3 classes: BUY / HOLD / SELL)

**Model Files:** `Models/stock_signal_classifier.pkl`, `Models/stock_signal_features.pkl`

**Python Script:** `Models/predict.py`

**ML Features (8):**
- `valuation_score`, `financial_stability_score`, `debt_risk_score`, `growth_score`
- `roe`, `pe_ratio`, `pb_ratio`

**Rule-based fallback formula:**
```
Score = -0.15 × PE - 0.15 × PB + 0.20 × ROE + 0.15 × Growth
      + 0.15 × Stability - 0.10 × Debt + 0.10 × Valuation
```
Normalized to Z-score, then thresholded: >1 → BUY, < -1 → SELL, else HOLD.

**Note:** This model is trained but not currently called by any active API route. The Stock Picker (`/api/stock-picker`) uses `stock_picker.py` instead.

---

### Model Training Data

All models were trained on historical NSE/BSE data. Feature engineering and training scripts are separate from the web app — the `.pkl` files are pre-trained and loaded at inference time. There is no online learning or re-training in the application.

---

## Challenges Faced

### 1. Finnhub Free Tier is Virtually Useless for Indian Markets

The `stock/symbol` endpoint with `exchange=NSE` returns `"You don't have access to this resource."` on the free tier. This means Finnhub contributes **zero symbols** to the discovery pipeline despite being integrated. Twelve Data's `ipo_calendar` endpoint returns 403 for the same reason. Only Yahoo Finance's free screener + search works reliably for Indian market discovery.

**Solution:** All stock discovery relies on Yahoo Finance's built-in search and screener capabilities (no API key needed).

### 2. ipowatch.in HTML Scraping Issues

Using ipowatch.in as the primary IPO data source introduced several complications:

- **Encoding:** The `₹` (Indian rupee sign) and emoji trend arrows (`📈`/`📉`) in the HTML are not properly decoded in all environments, producing garbled text like `�,110` instead of `₹110`
- **Column Structure:** The table has 9 columns (IPO Name, GMP, Trend, Price Band, Est. Listing, Date, Type, Status, Last Updated) but some rows have inconsistent cell counts
- **Cross-Month Date Parsing:** Date ranges like "30-2 July" span June 30 to July 2 — the parser must detect when the start day > end day and decrement the month accordingly
- **Price Band Format:** The "Price Band" column shows only a single price (`₹138`) rather than a range (`₹130 – ₹165`), so the curated data's range is used as enrichment when name matching succeeds
- **Network Reliability:** The site can be slow or unavailable. A 12-second timeout is used, falling back to a curated list of 13 hardcoded IPOs

**Solution:** Multi-layer approach — scrape ipowatch → enrich with curated data (fuzzy name matching) → fall back to curated list entirely if scrape fails → append NewsAPI-sourced IPOs as supplementary.

### 3. Python Subprocess Overhead

All ML models are executed by spawning `python.exe` as a child process with JSON passed via stdin/stdout. This is:

- **Blocking:** Each request waits for Python to load `joblib` models and run inference (1-3 seconds per batch)
- **Path-Dependent:** The Python interpreter path is hardcoded to a local install path
- **Model-File-Fragile:** 4 model files referenced by the Python scripts don't exist in the repository (`return_prediction_regressor.pkl`, `stock_regression_features.pkl`, `regime_rf_model.pkl`, `regime_scaler.pkl`), causing the corresponding API routes to fail unless those files are placed at the expected paths

**Solution:** Rule-based fallbacks implemented for Stock Picker and Signal Classifier. For Future Returns and Market Regime, the API returns an error if the model files are missing.

### 4. Supabase RLS and Permission Model

The Supabase anon key lacks `INSERT`, `UPDATE`, and `DELETE` permissions on most tables. Using the anon key with `@supabase/ssr` for authenticated requests still requires explicit RLS policies.

**Solution:** All server-side database writes use the `service_role` key (`supabaseAdmin`) which bypasses RLS entirely. This is safe because service_role operations are server-side only and never exposed to the client. Authenticated user reads/writes on `watchlist_items` and `portfolio_holdings` use RLS policies keyed to `auth.uid()`.

### 5. GDELT API Parameter Gotchas

GDELT's Document Analysis API uses URL query parameters with `=` separators (standard), but the Keyword Search API requires `&keyword=` syntax. Some documentation uses colons (`&sourcecountry:IN`), which silently fails and returns empty results.

**Solution:** All GDELT URLs use `&sourcecountry=IN&lang=English` with equals signs. Additionally, `timespan=24h` is used for recency filtering.

### 6. Chart Pattern Detection on Limited OHLCV Data

With only 1 month of hourly data (or 1 year of daily data), some longer-term patterns (Cup & Handle, Head & Shoulders) are difficult to detect reliably because the pattern spans too many candles relative to the data window. Harmonic patterns require precise Fibonacci ratio calculations that are extremely sensitive to noise in swing point detection.

**Solution:** Pattern confidence scoring is conservative — most patterns require strong geometric confirmation before exceeding 60% confidence. The `detectAllPatterns()` function runs all 20+ detectors, deduplicates overlapping detections, and sorts by confidence. Swing points are detected using a zigzag algorithm with configurable sensitivity.

### 7. QuickChart.io External Dependency

All server-side chart PNG generation relies on QuickChart.io, an external service that renders Chart.js configs to images. This introduces latency (1-2 seconds per chart), a dependency on external uptime, and limits on URL length for complex chart configs.

**Solution:** The `/visualize` endpoint uses `chartjs-node-canvas` as an alternative renderer, generating charts locally via Node.js canvas. The QuickChart.io approach is used in simpler routes for speed and reliability.

### 8. Yahoo Finance Rate Limiting

Yahoo Finance's free API has implicit rate limits — rapid batch requests (50+ symbols at once) can result in incomplete responses or connection timeouts. The `fetchQuotesInBatches()` function in `yahoo-discovery.ts` batches requests with delays, but still occasionally fails for large symbol sets.

**Solution:** Batches of 10-15 symbols with 200ms delays between batches. Fallback symbol list defined in `FALLBACK_SYMBOLS` (35 popular NSE stocks).

### 9. Date Handling Across Timezones

Earnings calendar events, IPO dates, and stock data all use different date formats. The calendar API generates dates for the current fiscal year (FY2027: April 2026 – March 2027). Date strings from ipowatch are in "DD Month" format without years.

**Solution:** All dates normalized to ISO 8601 (`YYYY-MM-DD`). Year is assumed to be current year. Cross-month date ranges detected by comparing start day vs end day.

### 10. RAG Search Quality for Chatbot

The chatbot uses PostgreSQL full-text search (`to_tsvector('english', content)`) on a `knowledge_base` table seeded from Yahoo Finance. The search quality depends entirely on the quality of seeded content — stock descriptions from Yahoo are often sparse or boilerplate.

**Solution:** The chat system uses a 3-model fallback chain (LLaMA 3.3 70B → LLaMA 3.1 8B → Mixtral 8x7B) with live Yahoo Finance quote and IPO data injected as context. The RAG vector provides grounding, but the LLM handles open-ended questions even without relevant knowledge base matches.

---

## Environment Variables

Create a `.env.local` file with the following:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string for `pg` pool (`postgresql://...`) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon/public key (for SSR client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service_role key (bypasses RLS for writes) |
| `GROQ_API_KEY` | Yes (for chat) | Groq API key for LLaMA/Mixtral completions |
| `NEWSAPI_KEY` | Recommended | NewsAPI key for news aggregation |
| `FINNHUB_API_KEY` | Optional | Finnhub API key (limited use for Indian markets) |
| `TWELVE_DATA_API_KEY` | Optional | Twelve Data API key (limited use) |

See `.env.example` for the full template.

---

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign up or log in.

---

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/                    # 31 API routes
│   │   │   ├── stocks/             # Stock data, IPO, calendar, news, what-if
│   │   │   ├── market/             # Indices, popular stocks
│   │   │   ├── chat/               # Groq chatbot with RAG
│   │   │   ├── portfolio/          # User portfolio CRUD
│   │   │   ├── watchlist/          # User watchlist CRUD
│   │   │   ├── future-returns/     # XGBoost prediction
│   │   │   ├── market-regime/      # RF regime classifier
│   │   │   ├── stock-picker/       # RF stock recommendation
│   │   │   ├── knowledge/          # RAG knowledge base seeding
│   │   │   ├── sector-chart/       # Sector overlay charts
│   │   │   ├── indicators/         # Mock technical indicators
│   │   │   └── news/               # Mock news data
│   │   ├── dashboard/              # All dashboard pages
│   │   │   ├── page.tsx            # Home (indices, AI summary, portfolio)
│   │   │   ├── calendar/           # Earnings + IPO calendar
│   │   │   ├── chart/[symbol]      # Stock detail report
│   │   │   ├── charts/             # Candlestick chart viewer
│   │   │   ├── future-returns/     # ML return predictions page
│   │   │   ├── market-regime/      # Regime classification page
│   │   │   ├── markets/            # Market overview
│   │   │   ├── news/               # Newspaper-style news feed
│   │   │   ├── portfolio/          # Portfolio management
│   │   │   ├── stock-picker/       # Stock recommendation page
│   │   │   ├── watchlist/          # Watchlist management
│   │   │   └── what-if/            # What-if calculator
│   │   ├── login/
│   │   ├── signup/
│   │   └── page.tsx                # Landing page with 3D globe
│   ├── components/
│   │   └── dashboard/              # GlassCard, StockSearchInput, CandlestickChart
│   └── lib/
│       ├── chart-patterns.ts       # 28 deterministic pattern detectors
│       ├── yahoo-discovery.ts      # Yahoo Finance symbol discovery
│       ├── supabase/               # SSR auth middleware + client
│       ├── supabase.ts             # Service role client
│       ├── run-sql.ts              # pg pool for DDL
│       └── mockData.ts             # Fallback mock data
├── Models/                         # Python ML scripts + .pkl files
│   ├── future_returns_predict.py
│   ├── regime_predict.py
│   ├── stock_picker.py
│   ├── predict.py
│   ├── test_regime.py
│   ├── stock_return_rf_model.pkl
│   ├── stock_features.pkl
│   ├── stock_signal_classifier.pkl
│   └── stock_signal_features.pkl
├── supabase/
│   └── migrations/                 # 21 SQL migration files
├── middleware.ts                   # Auth middleware
└── package.json
```
