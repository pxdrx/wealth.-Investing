# Radar by 0x100x - Reverse-Engineered Data Sources & API Map

> Research Date: 2026-03-26
> Platform: https://radar.0x100x.com
> Purpose: Map all data sources, APIs, and confluences for asset analysis reports

---

## 1. Platform Overview

Radar by 0x100x is a crypto analysis platform that generates instant, structured reports for tokens (BTC, ETH, SOL, BNB, XRP, DOGE, ADA, LINK, AVAX, DOT). Reports are:
- Refreshed daily with live data
- Built on "a decade of market experience"
- Structured into: WHAT IS, BY THE NUMBERS, THE ANALYSIS, SCENARIOS, TOKEN SCORE, VERDICT

Their tagline: "No hype. No fluff. Just the analysis you would do yourself if you had the data and the framework."

---

## 2. Reverse-Engineered Data Sources

### 2.1 PRICE, MARKET CAP, FDV (CoinGecko - Confirmed)

**API:** CoinGecko API (they credit it directly)
- **URL:** `https://api.coingecko.com/api/v3`
- **Key Endpoint:** `GET /coins/{id}` - Returns price, market_cap, fully_diluted_valuation, description, links, all in one call
- **Demo (Free) Base:** `https://api.coingecko.com/api/v3` with header `x-cg-demo-api-key`
- **Pro Base:** `https://pro-api.coingecko.com/api/v3` with header `x-cg-pro-api-key`

**Specific Endpoints Used:**
```
GET /coins/bitcoin
  ?localization=false
  &tickers=false
  &community_data=false
  &developer_data=false
```
Returns: `market_data.current_price.usd`, `market_data.market_cap.usd`, `market_data.fully_diluted_valuation.usd`

```
GET /coins/{id}/market_chart?vs_currency=usd&days=50
```
Returns: Price history for consolidation range analysis

```
GET /coins/markets?vs_currency=usd&ids=bitcoin&order=market_cap_desc
```
Returns: Simplified market data for multiple coins

**Free Tier (Demo):**
- Rate limit: 30 calls/min
- No historical OHLCV range queries
- No top gainers/losers
- Good enough for: price, market cap, FDV, 24h volume, ATH, description

**Pro Tier ($129/mo):**
- Rate limit: 500 calls/min
- Full historical data, OHLCV ranges, circulating supply charts

---

### 2.2 REVENUE / TRANSACTION FEES (Blockchain.info / Token Terminal)

**For BTC Revenue ($4.05M annualized from transaction fees):**

**Option A: Blockchain.info Charts API (FREE, no auth)**
- **URL:** `https://api.blockchain.info/charts/{chart_name}?timespan={timespan}&format=json`
- **Endpoints:**
  - `GET /charts/transaction-fees-usd` - Total transaction fees in USD per day
  - `GET /charts/miners-revenue` - Total miner revenue (block rewards + fees) in USD
  - `GET /charts/fees-usd-per-transaction` - Average fee per transaction
- **Format:** `{ "status": "ok", "name": "...", "unit": "USD", "values": [{"x": timestamp, "y": value}] }`
- **Rate Limit:** 1 request per 10 seconds, no API key needed
- **CORS:** Add `&cors=true` for browser requests

**Option B: Token Terminal (for protocol revenue)**
- **URL:** `https://tokenterminal.com/terminal/projects/bitcoin`
- Provides annualized revenue metrics
- API is paid ($300+/mo) - likely they scrape or cite this

**Option C: CryptoFees.info**
- **URL:** `https://cryptofees.info`
- Aggregates daily fee data across protocols
- No formal API, but data is publicly displayed

---

### 2.3 MINING COST MODEL (Checkonchain - Confirmed)

**Source:** Checkonchain Difficulty Regression Model
- **Charts URL:** `https://charts.checkonchain.com`
- **Specific Chart:** `/btconchain/mining/difficultyregression/difficultyregression_light.html`
- **Model:** Log-log regression between Mining Difficulty and Market Cap
- **Output:** Estimated cost to mine 1 BTC (cited as $88,000 in their report)

**No public API.** They likely:
1. Scrape the chart data, OR
2. Replicate the model using blockchain.info difficulty + hashrate data
3. Newsletter content from Checkmate (@_Checkmatey_)

**Alternative: Build your own mining cost model using:**
```
Mining Cost per BTC = (Network Hashrate * Avg Energy per TH/s * Electricity Price * Seconds per Day) / (BTC Mined per Day)

Data needed:
- Hashrate: blockchain.info /charts/hash-rate?format=json
- Difficulty: blockchain.info /charts/difficulty?format=json
- Block reward: blockchain.info /q/bcperblock
- Electricity cost: ~$0.05/kWh average (manual assumption)
- Efficiency: ~25 J/TH (latest gen ASICs)
```

**Additional Checkonchain Charts Available:**
- Difficulty per Issuance Model
- Thermocap Multiple
- Energy Value (Joules model)
- Puell Multiple (miner stress indicator)
- Hash Ribbons (miner capitulation signal)

---

### 2.4 NETWORK HASHRATE & DIFFICULTY (Blockchain.info - FREE)

**API:** `https://api.blockchain.info/charts/{metric}?timespan={period}&format=json`

**Endpoints:**
| Metric | Endpoint | Unit |
|--------|----------|------|
| Hashrate | `/charts/hash-rate` | TH/s (divide by 1e6 for EH/s) |
| Difficulty | `/charts/difficulty` | Absolute number |
| Block count | `/q/getblockcount` | Integer |
| Difficulty target | `/q/getdifficulty` | Decimal |
| Next retarget | `/q/nextretarget` | Block height |

**Sample Response (Hashrate):**
```json
{
  "status": "ok",
  "name": "Hash Rate",
  "unit": "Hash Rate TH/s",
  "period": "day",
  "values": [{"x": 1773619200, "y": 901260643.8668482}]
}
```
Note: Value is in TH/s. 901,260,643 TH/s = ~901 EH/s (matching their 894.5 EH/s claim)

**Rate Limit:** 1 request per 10 seconds, no API key, CORS supported

**Alternative: Mempool.space API**
- `GET https://mempool.space/api/v1/mining/hashrate/3m` - 3-month hashrate
- `GET https://mempool.space/api/v1/mining/difficulty-adjustments` - Recent adjustments
- Free, no auth, well-documented

---

### 2.5 BITCOIN ETF FLOWS (Farside Investors / SoSoValue)

**Option A: Farside Investors (most cited in industry)**
- **URL:** `https://farside.co.uk/btc/`
- **Data:** Daily flows for IBIT, FBTC, GBTC, ARKB, BITB, HODL, BRRR, EZBC, BTCW, BTCO, DEFI
- **No public API** - HTML table scraping required
- **Format:** HTML table with daily USD million flows per ETF
- **Also covers:** ETH ETFs at `/eth/`, SOL ETFs at `/sol/`

**Option B: SoSoValue (modern alternative with charts)**
- **URL:** `https://sosovalue.com/assets/etf/us-btc-spot`
- **Data:** Daily/weekly/monthly net inflows, total net assets, BTC share per ETF
- **Also has:** Bitcoin Treasuries at `/assets/bitcoin-treasuries`
- **No formal free API** - React SPA, data loaded via internal APIs
- **Internal API pattern:** Can be reverse-engineered from network tab

**Option C: BitMEX Research**
- Twitter/X: @BitMEXResearch
- Publishes daily ETF flow summaries
- No API

**Option D: The Block Data**
- **URL:** `https://www.theblock.co/data/etfs/bitcoin-etf`
- Comprehensive ETF data dashboard
- API access requires paid subscription

**Recommended approach:** Scrape Farside HTML table daily via cron, or use SoSoValue internal API endpoints.

---

### 2.6 INSTITUTIONAL HOLDINGS - MICROSTRATEGY/STRATEGY

**Option A: BitcoinTreasuries.net (Best source)**
- **URL:** `https://bitcointreasuries.net`
- **Data:** All public companies holding BTC, including Strategy (761,068 BTC), purchase history
- **Key stats shown:** Weekly net inflow, total BTC held by public companies (1,023,332 BTC = 5.12% of supply)
- **Also has:** Mining companies, news feed
- **No formal API** but data is in client-side JS

**Option B: SaylorTracker.com**
- **URL:** `https://saylortracker.com`
- Real-time Strategy/MicroStrategy treasury analytics
- Total BTC holdings, average cost basis, unrealized P&L
- Client-rendered SPA

**Option C: SoSoValue Bitcoin Treasuries**
- **URL:** `https://sosovalue.com/assets/bitcoin-treasuries`
- Lists 42+ companies with BTC holdings > 100
- Weekly net inflow data

**Option D: SEC EDGAR filings**
- For precise purchase data, 8-K filings from Strategy
- `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=MSTR&type=8-K`

---

### 2.7 FEAR & GREED INDEX (Alternative.me - Confirmed FREE API)

**API:** `https://api.alternative.me/fng/`
- **Method:** GET
- **No auth required**
- **Rate limit:** Not explicitly stated, reasonable use expected

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `limit` | int | Number of results (default 1, use 0 for all) |
| `format` | string | `json` or `csv` |
| `date_format` | string | `us`, `cn`, `kr`, `world`, or empty (unix) |

**Sample Response:**
```json
{
  "name": "Fear and Greed Index",
  "data": [{
    "value": "13",
    "value_classification": "Extreme Fear",
    "timestamp": "1774569600",
    "time_until_update": "45688"
  }]
}
```

**Data Sources Behind the Index:**
1. Volatility (25%) - BTC volatility vs 30/90 day average
2. Market Momentum/Volume (25%) - Volume vs 30/90 day average
3. Social Media (15%) - Twitter hashtag analysis, interaction speed
4. Surveys (15%) - Weekly crypto polls (strawpoll.com, ~2000-3000 participants)
5. Dominance (10%) - BTC dominance rise = fear, alt season = greed
6. Trends (10%) - Google Trends for Bitcoin-related search queries

---

### 2.8 WHALE MOVEMENTS / ON-CHAIN ANALYTICS

**Option A: Whale Alert**
- **URL:** `https://whale-alert.io`
- **API:** `https://api.whale-alert.io/v1/transactions`
- **Free tier:** 10 requests/min, last 3600 seconds of data, min $500K transactions
- **Paid:** $29.95/mo for historical data, lower minimums, more requests
- **Tracks:** BTC, ETH, USDT, USDC, and 30+ tokens across all major blockchains

**Option B: Glassnode (Professional)**
- **URL:** `https://api.glassnode.com/v1/metrics/{category}/{metric}`
- **Categories relevant:**
  - `/mining/hash_rate_mean` - Mining hashrate
  - `/mining/difficulty_latest` - Latest difficulty
  - `/mining/revenue_sum` - Miner revenue
  - `/distribution/balance_exchanges` - Exchange balances (whale proxy)
  - `/institutions/purpose_etf_holdings_sum` - ETF holdings
  - `/market/price_usd_close` - Price
  - `/indicators/sopr` - Spent Output Profit Ratio
  - `/supply/profit_relative` - % of supply in profit
- **Free tier (Community):** Limited to 24h resolution, 2 years history, ~30 metrics
- **Standard ($29/mo):** 1h resolution, full history, 100+ metrics
- **Professional ($799/mo):** All metrics, 10min resolution

**Option C: Arkham Intelligence**
- **URL:** `https://platform.arkhamintelligence.com`
- Entity-labeled on-chain data
- Identifies wallets belonging to exchanges, institutions, whales
- API available for enterprise

**Option D: Blockchain.com Explorer API (FREE)**
- `GET https://blockchain.info/rawaddr/{address}` - Address balance and transactions
- `GET https://blockchain.info/q/addressbalance/{address}` - Quick balance check
- Can track known whale addresses directly

---

### 2.9 OPTIONS DATA (Put/Call Skew, Implied Volatility)

**Option A: Deribit API (FREE public endpoints)**
- **URL:** `https://www.deribit.com/api/v2/public/`
- **Key Endpoints:**
  - `GET /public/get_book_summary_by_currency?currency=BTC&kind=option` - All option summaries
  - `GET /public/get_index_price?index_name=btc_usd` - Index price
  - `GET /public/ticker?instrument_name=BTC-28MAR26-70000-P` - Specific option data with IV, Greeks
  - `GET /public/get_instruments?currency=BTC&kind=option` - List all option instruments
- **Data available:** Implied volatility, bid/ask, open interest, volume, Greeks
- **Rate limit:** 20 requests/sec for public endpoints, no auth needed
- **Put/Call skew:** Calculate from individual option IVs (25-delta put IV minus 25-delta call IV)

**Option B: Laevitas (Professional)**
- **URL:** `https://apiv2.laevitas.ch`
- **Coverage:** Deribit, OKX, Binance, Bybit, Hyperliquid
- **Data:** Options Greeks, funding rates, open interest, liquidations, skew
- **Free tier:** Limited
- **REST API v2 docs:** `https://apiv2.laevitas.ch/redoc`
- **Also has:** WebSocket for real-time, MCP server for AI integration

**Option C: The Block Data Dashboard**
- **URL:** `https://www.theblock.co/data/crypto-markets/options`
- Charts: Aggregated OI, volume, put/call ratio, DVOL index, variance premium
- No free API, subscription required

**Option D: CoinGlass**
- **URL:** `https://www.coinglass.com/options`
- Aggregated options data across exchanges
- API: `https://open-api.coinglass.com/` (paid plans)

---

### 2.10 S&P 500 / MACRO INDICES DATA

**Option A: Alpha Vantage (FREE tier available)**
- **URL:** `https://www.alphavantage.co/query`
- **Free API Key:** `https://www.alphavantage.co/support/#api-key`
- **Rate limit (Free):** 25 requests/day (was 500/day, recently reduced)
- **Key Endpoints:**

| Data Point | Function | Example |
|------------|----------|---------|
| S&P 500 daily | `TIME_SERIES_DAILY` | `?function=TIME_SERIES_DAILY&symbol=SPY&apikey=demo` |
| S&P 500 200-day MA | `SMA` | `?function=SMA&symbol=SPY&interval=daily&time_period=200&series_type=close&apikey=demo` |
| Oil (WTI) | `WTI` | `?function=WTI&interval=daily&apikey=demo` |
| Oil (Brent) | `BRENT` | `?function=BRENT&interval=daily&apikey=demo` |
| DXY (Dollar Index) | `CURRENCY_EXCHANGE_RATE` | Use EUR/USD as proxy |
| Federal Funds Rate | `FEDERAL_FUNDS_RATE` | `?function=FEDERAL_FUNDS_RATE&apikey=demo` |
| CPI | `CPI` | `?function=CPI&apikey=demo` |
| Treasury Yield | `TREASURY_YIELD` | `?function=TREASURY_YIELD&interval=daily&maturity=10year&apikey=demo` |
| Real GDP | `REAL_GDP` | `?function=REAL_GDP&apikey=demo` |
| News Sentiment | `NEWS_SENTIMENT` | `?function=NEWS_SENTIMENT&tickers=SPY&apikey=demo` |

**Option B: Twelve Data (Best free tier for market data)**
- **URL:** `https://api.twelvedata.com`
- **Free tier:** 800 requests/day, 8 requests/min
- **Key Endpoints:**

| Data | Endpoint | Example |
|------|----------|---------|
| Real-time price | `/price` | `?symbol=SPX&apikey=...` |
| Time series | `/time_series` | `?symbol=SPX&interval=1day&outputsize=200&apikey=...` |
| SMA indicator | `/sma` | `?symbol=SPX&interval=1day&time_period=200&apikey=...` |
| Quote | `/quote` | `?symbol=SPX&apikey=...` |
| Forex pairs | `/time_series` | `?symbol=EUR/USD&interval=1day&apikey=...` |
| Commodities | `/time_series` | `?symbol=CL` (crude oil), `?symbol=GC` (gold) |
| Crypto | `/time_series` | `?symbol=BTC/USD&interval=1day&apikey=...` |
| Fundamentals | `/statistics` | `?symbol=AAPL&apikey=...` (P/E, EPS, margins) |
| Income statement | `/income_statement` | `?symbol=AAPL&apikey=...` |

**Coverage:** 850+ exchanges, stocks, ETFs, forex, crypto, commodities, indices, funds
**Websocket:** Available for real-time streaming

**Option C: Yahoo Finance (Unofficial)**
- Various npm packages: `yahoo-finance2`
- No official API, but widely used
- Rate limits enforced but not documented

**Option D: Financial Modeling Prep (FMP)**
- **URL:** `https://financialmodelingprep.com/api/v3`
- **Free tier:** 250 requests/day
- Stocks, ETFs, forex, crypto, commodities, economics
- Good for fundamentals (P/E, revenue, margins)

---

### 2.11 FOREX & CENTRAL BANK DATA

**Option A: Twelve Data (see 2.10)**
- All major forex pairs: EUR/USD, GBP/USD, USD/JPY, etc.
- Real-time and historical

**Option B: Alpha Vantage Forex**
- `CURRENCY_EXCHANGE_RATE` - Real-time exchange rate
- `FX_DAILY` / `FX_WEEKLY` / `FX_MONTHLY` - Historical OHLC

**Option C: Exchange Rates API**
- **URL:** `https://api.exchangerate-api.com/v4/latest/USD`
- **Free:** 1,500 requests/month
- Simple currency conversion

**Central Bank Rates:**
- **TradingEconomics** (scraping): `https://tradingeconomics.com/country-list/interest-rate`
- **BIS API:** `https://data.bis.org/api/v1/` - Bank for International Settlements
- **FRED API:** `https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&api_key=...`
  - Free API key at `https://fred.stlouisfed.org/docs/api/api_key.html`
  - All major economic indicators: GDP, CPI, unemployment, interest rates

---

## 3. COMPLETE API RECOMMENDATION MAP

### Tier 1: Free APIs (No cost, sufficient for MVP)

| Data Category | Recommended API | Rate Limit | Auth |
|---------------|----------------|------------|------|
| Crypto price/mcap/FDV | CoinGecko Demo | 30/min | API key (free) |
| Fear & Greed Index | Alternative.me | Unlimited* | None |
| BTC Hashrate | Blockchain.info Charts | 6/min | None |
| BTC Difficulty | Blockchain.info Charts | 6/min | None |
| BTC Mining Revenue | Blockchain.info Charts | 6/min | None |
| BTC Block Reward | Blockchain.info Query | 6/min | None |
| Stocks/Forex/Commodities | Twelve Data | 800/day | API key (free) |
| Economic Indicators | FRED API | 120/min | API key (free) |
| Oil (WTI/Brent) | Alpha Vantage | 25/day | API key (free) |
| Options (BTC/ETH) | Deribit Public | 20/sec | None |

### Tier 2: Affordable Paid APIs ($30-130/mo)

| Data Category | Recommended API | Cost | Why |
|---------------|----------------|------|-----|
| Crypto (full data) | CoinGecko Pro | $129/mo | Full OHLCV, historical, top movers |
| On-chain (advanced) | Glassnode Standard | $29/mo | SOPR, MVRV, exchange flows |
| Whale alerts | Whale Alert | $29.95/mo | Real-time large transactions |
| Stocks (more calls) | Twelve Data Basic | $29/mo | 3,200/day, websocket |

### Tier 3: Premium APIs ($100+/mo)

| Data Category | Recommended API | Cost | Why |
|---------------|----------------|------|-----|
| Options analytics | Laevitas | Custom | Full derivatives suite |
| On-chain (all) | Glassnode Pro | $799/mo | Every metric, 10min resolution |
| ETF flows | The Block | Custom | API access to all ETF data |
| Stock fundamentals | FMP/Polygon | $49-79/mo | Full financial statements |

---

## 4. SCRAPING TARGETS (No API Available)

| Data | Source | Method | Frequency |
|------|--------|--------|-----------|
| ETF daily flows | Farside Investors | HTML table scrape | Daily |
| MicroStrategy holdings | BitcoinTreasuries.net | Client JS data | Daily |
| Mining cost model | Checkonchain | Build from blockchain.info data | Daily |
| Options skew summary | The Block / CoinGlass | Screenshot or scrape | Daily |
| Whale sells (specific) | Arkham Intelligence | Manual or API | As-needed |

---

## 5. CONFLUENCE MAP: 30+ Data Points Per Asset Type

### 5.1 CRYPTO (BTC, ETH, SOL, etc.)

| # | Confluence | Source | Free? |
|---|-----------|--------|-------|
| 1 | Current Price | CoinGecko | Yes |
| 2 | Market Cap | CoinGecko | Yes |
| 3 | Fully Diluted Valuation | CoinGecko | Yes |
| 4 | 24h Volume | CoinGecko | Yes |
| 5 | 24h/7d/30d Price Change % | CoinGecko | Yes |
| 6 | All-Time High & Distance | CoinGecko | Yes |
| 7 | Circulating vs Max Supply | CoinGecko | Yes |
| 8 | Fear & Greed Index | Alternative.me | Yes |
| 9 | Network Hashrate | Blockchain.info | Yes |
| 10 | Mining Difficulty (& change %) | Blockchain.info | Yes |
| 11 | Estimated Mining Cost | Calculated (difficulty model) | Yes |
| 12 | Transaction Fees (revenue) | Blockchain.info | Yes |
| 13 | Miner Revenue | Blockchain.info | Yes |
| 14 | ETF Daily/Weekly Inflows | Farside (scrape) | Yes* |
| 15 | ETF Cumulative Flows | SoSoValue (scrape) | Yes* |
| 16 | ETF AUM by Fund (IBIT, FBTC) | SoSoValue | Yes* |
| 17 | Institutional Holdings (MSTR) | BitcoinTreasuries.net | Yes* |
| 18 | Options Put/Call Ratio | Deribit public | Yes |
| 19 | Options IV Skew (put premium) | Deribit public | Yes |
| 20 | Options Max Pain | Deribit public | Yes |
| 21 | Funding Rate (perps) | CoinGecko/Deribit | Yes |
| 22 | Open Interest (futures) | CoinGlass/Deribit | Yes |
| 23 | Whale Transactions | Whale Alert | Partial |
| 24 | Exchange Inflows/Outflows | Glassnode | Paid |
| 25 | SOPR (Spent Output Profit Ratio) | Glassnode | Paid |
| 26 | MVRV Ratio | Glassnode | Paid |
| 27 | S&P 500 Correlation | Twelve Data | Yes |
| 28 | DXY (Dollar Strength) | Twelve Data | Yes |
| 29 | Oil Price Impact | Alpha Vantage | Yes |
| 30 | US Treasury Yields | FRED API | Yes |
| 31 | Fed Funds Rate | FRED API | Yes |
| 32 | BTC Dominance | CoinGecko /global | Yes |
| 33 | Stablecoin Market Cap | CoinGecko | Yes |
| 34 | Google Trends (sentiment) | SerpAPI / manual | Partial |
| 35 | Social Media Sentiment | LunarCrush / manual | Paid |

### 5.2 STOCKS (AAPL, MSFT, TSLA, etc.)

| # | Confluence | Source | Free? |
|---|-----------|--------|-------|
| 1 | Current Price | Twelve Data | Yes |
| 2 | Market Cap | Twelve Data /statistics | Yes |
| 3 | P/E Ratio (TTM & Forward) | Twelve Data /statistics | Yes |
| 4 | EPS (TTM) | Twelve Data /statistics | Yes |
| 5 | Revenue (TTM) | Twelve Data /income_statement | Yes |
| 6 | Revenue Growth (YoY) | Twelve Data | Yes |
| 7 | Profit Margin | Twelve Data /statistics | Yes |
| 8 | Free Cash Flow | Twelve Data /cash_flow | Yes |
| 9 | Debt/Equity Ratio | Twelve Data /balance_sheet | Yes |
| 10 | Dividend Yield | Twelve Data /statistics | Yes |
| 11 | 52-Week High/Low | Twelve Data /quote | Yes |
| 12 | 200-Day MA (above/below) | Twelve Data /sma | Yes |
| 13 | 50-Day MA | Twelve Data /sma | Yes |
| 14 | RSI (14-day) | Twelve Data /rsi | Yes |
| 15 | MACD | Twelve Data /macd | Yes |
| 16 | Volume vs Average | Twelve Data /time_series | Yes |
| 17 | Institutional Ownership % | Alpha Vantage | Yes |
| 18 | Insider Transactions | Alpha Vantage | Yes |
| 19 | Earnings Surprise History | Twelve Data /earnings | Yes |
| 20 | Next Earnings Date | Twelve Data /earnings_calendar | Yes |
| 21 | Analyst Consensus | FMP/Yahoo | Partial |
| 22 | Options Put/Call Ratio | Alpha Vantage (Premium) | Paid |
| 23 | Short Interest | FINRA data / FMP | Partial |
| 24 | Sector Performance | Twelve Data | Yes |
| 25 | S&P 500 Relative Strength | Calculated | Yes |
| 26 | Beta | Twelve Data /statistics | Yes |
| 27 | Fed Rate Impact | FRED API | Yes |
| 28 | Treasury Yield Spread | FRED API | Yes |
| 29 | CPI / Inflation | FRED API | Yes |
| 30 | GDP Growth | FRED API | Yes |

### 5.3 FOREX (EUR/USD, GBP/USD, etc.)

| # | Confluence | Source | Free? |
|---|-----------|--------|-------|
| 1 | Current Rate | Twelve Data | Yes |
| 2 | 24h/7d/30d Change % | Twelve Data | Yes |
| 3 | 52-Week Range | Twelve Data | Yes |
| 4 | 200-Day MA | Twelve Data /sma | Yes |
| 5 | 50-Day MA | Twelve Data /sma | Yes |
| 6 | RSI (14) | Twelve Data /rsi | Yes |
| 7 | MACD | Twelve Data /macd | Yes |
| 8 | Bollinger Bands | Twelve Data /bbands | Yes |
| 9 | ATR (Volatility) | Twelve Data /atr | Yes |
| 10 | Pivot Points | Calculated | Yes |
| 11 | DXY Index | Twelve Data | Yes |
| 12 | Interest Rate Differential | FRED API | Yes |
| 13 | Central Bank Rate (base) | FRED / BIS | Yes |
| 14 | Central Bank Rate (quote) | FRED / BIS | Yes |
| 15 | Next CB Meeting Date | ForexFactory scrape | Yes* |
| 16 | Rate Decision Probability | CME FedWatch (scrape) | Yes* |
| 17 | CPI Differential | FRED API | Yes |
| 18 | GDP Growth Differential | FRED API | Yes |
| 19 | Trade Balance | FRED API | Yes |
| 20 | Employment Data (NFP) | FRED API | Yes |
| 21 | PMI (Manufacturing) | Manual / FRED | Partial |
| 22 | COT Positioning (net) | CFTC / Barchart | Yes* |
| 23 | Options Risk Reversal | Bloomberg (paid) | Paid |
| 24 | Carry Trade Yield | Calculated | Yes |
| 25 | Geopolitical Risk Index | Manual | N/A |

### 5.4 COMMODITIES (Gold, Oil, etc.)

| # | Confluence | Source | Free? |
|---|-----------|--------|-------|
| 1 | Current Price | Alpha Vantage / Twelve Data | Yes |
| 2 | 24h/7d/30d Change % | Twelve Data | Yes |
| 3 | 52-Week High/Low | Twelve Data | Yes |
| 4 | 200-Day MA | Twelve Data /sma | Yes |
| 5 | 50-Day MA | Twelve Data /sma | Yes |
| 6 | RSI (14) | Twelve Data /rsi | Yes |
| 7 | MACD | Twelve Data /macd | Yes |
| 8 | Oil (WTI) Price | Alpha Vantage `WTI` | Yes |
| 9 | Oil (Brent) Price | Alpha Vantage `BRENT` | Yes |
| 10 | Gold Spot Price | Alpha Vantage `GOLD` | Yes |
| 11 | Silver Spot Price | Alpha Vantage `SILVER` | Yes |
| 12 | DXY Correlation | Twelve Data | Yes |
| 13 | US Treasury Yields | FRED API | Yes |
| 14 | Inflation Rate (CPI) | FRED API | Yes |
| 15 | Real Interest Rate | Calculated (yield - CPI) | Yes |
| 16 | OPEC Production Data | EIA API / manual | Partial |
| 17 | Inventory Data (EIA) | EIA API | Yes |
| 18 | COT Positioning | CFTC / Barchart | Yes* |
| 19 | ETF Flows (GLD, USO) | Alpha Vantage | Partial |
| 20 | Geopolitical Premium | Manual assessment | N/A |

### 5.5 INDICES (S&P 500, NASDAQ, etc.)

| # | Confluence | Source | Free? |
|---|-----------|--------|-------|
| 1 | Current Level | Twelve Data | Yes |
| 2 | 24h/7d/30d Change % | Twelve Data | Yes |
| 3 | YTD Performance | Twelve Data | Yes |
| 4 | 52-Week High/Low | Twelve Data | Yes |
| 5 | 200-Day MA (& relation) | Twelve Data /sma | Yes |
| 6 | 50-Day MA | Twelve Data /sma | Yes |
| 7 | RSI (14) | Twelve Data /rsi | Yes |
| 8 | MACD | Twelve Data /macd | Yes |
| 9 | VIX (Volatility Index) | Twelve Data `VIX` | Yes |
| 10 | P/E Ratio (index) | Manual / Shiller PE | Partial |
| 11 | Earnings Growth (aggregate) | Manual / FactSet | Paid |
| 12 | Advance/Decline Ratio | Manual / MarketWatch | Partial |
| 13 | New Highs vs New Lows | Manual | Partial |
| 14 | Sector Rotation | Twelve Data sector ETFs | Yes |
| 15 | Fed Funds Rate | FRED API | Yes |
| 16 | Treasury Yield Curve | FRED API (10Y-2Y spread) | Yes |
| 17 | CPI / Inflation | FRED API | Yes |
| 18 | Unemployment Rate | FRED API | Yes |
| 19 | GDP Growth | FRED API | Yes |
| 20 | Consumer Confidence | FRED API | Yes |
| 21 | PMI (ISM) | FRED / ISM | Partial |
| 22 | Options Put/Call Ratio | CBOE data | Partial |
| 23 | Margin Debt | FINRA data | Partial |
| 24 | DXY Impact | Twelve Data | Yes |
| 25 | Oil Price Impact | Alpha Vantage | Yes |

---

## 6. IMPLEMENTATION PRIORITY (for wealth.Investing)

### Phase 1: Free APIs Only (Cost: $0)
1. **CoinGecko Demo** - Price, mcap, FDV, volume, description (30 req/min)
2. **Alternative.me** - Fear & Greed Index (no limit)
3. **Blockchain.info** - Hashrate, difficulty, mining revenue, fees (6 req/min)
4. **Twelve Data Free** - Stocks, forex, commodities, indices, technicals (800 req/day)
5. **FRED API** - Economic indicators, interest rates, CPI, GDP (120 req/min)
6. **Deribit Public** - Options data, IV, put/call (20 req/sec)
7. **Farside scraping** - ETF flows (1x daily cron)
8. **BitcoinTreasuries scraping** - Institutional holdings (1x daily cron)
9. **Mining cost calculation** - Difficulty regression model from blockchain.info data

### Phase 2: Essential Paid ($160/mo)
1. **CoinGecko Pro** ($129/mo) - Full historical, OHLCV, top movers
2. **Whale Alert** ($29.95/mo) - Large transaction alerts

### Phase 3: Professional ($1000+/mo)
1. **Glassnode Professional** ($799/mo) - Complete on-chain analytics
2. **Laevitas** (custom) - Full derivatives analytics
3. **The Block API** (custom) - ETF and institutional data API

---

## 7. API KEY REGISTRATION LINKS

| Service | Registration URL | Free Tier |
|---------|-----------------|-----------|
| CoinGecko | https://www.coingecko.com/en/api/pricing | Demo (free) |
| Alpha Vantage | https://www.alphavantage.co/support/#api-key | 25 req/day |
| Twelve Data | https://twelvedata.com/pricing | 800 req/day |
| FRED | https://fred.stlouisfed.org/docs/api/api_key.html | 120 req/min |
| Deribit | No key needed for public endpoints | Unlimited public |
| Alternative.me | No key needed | Unlimited |
| Blockchain.info | No key needed | 6 req/min |
| Whale Alert | https://whale-alert.io/signup | 7-day trial |
| Glassnode | https://studio.glassnode.com | Community (free) |

---

## 8. SAMPLE: RECONSTRUCTED RADAR REPORT DATA FLOW

For a BTC report like Radar produces:

```
1. CoinGecko /coins/bitcoin
   -> price: $71,356
   -> market_cap: $1,427.4B
   -> fdv: $1,427.4B
   -> description: "Bitcoin is..."

2. Blockchain.info /charts/hash-rate?timespan=30days&format=json
   -> latest hashrate: 894.5 EH/s

3. Blockchain.info /charts/difficulty?timespan=90days&format=json
   -> current difficulty + % change in March = -7.8%

4. Blockchain.info /charts/transaction-fees-usd?timespan=365days&format=json
   -> sum / 365 * 365 = $4.05M annualized revenue

5. Calculated: Mining cost = $88,000/BTC
   -> Using difficulty regression model (Checkonchain methodology)

6. Alternative.me /fng/?limit=1
   -> Fear & Greed: 11 (Extreme Fear)

7. Farside.co.uk /btc/ (scrape)
   -> March inflows: $2.5B
   -> IBIT leads with >50% of flows
   -> Nov 2025-Feb 2026 outflows: $6.4B

8. BitcoinTreasuries.net (scrape)
   -> Strategy: 761,068 BTC
   -> March purchase: 22,337 BTC for $1.57B

9. Deribit /public/get_book_summary_by_currency?currency=BTC&kind=option
   -> Put premium: 8-10 vol points over calls

10. Twelve Data /sma?symbol=SPX&interval=1day&time_period=200
    -> S&P 500 below 200-day MA

11. Alpha Vantage ?function=WTI&interval=daily
    -> Oil above $100

12. Claude/GPT API
    -> Generate analysis narrative from structured data
    -> Produce bear/base/bull scenarios
    -> Score token 0-10
    -> Write verdict
```

---

## 9. KEY INSIGHT: How Radar Likely Works

Based on the analysis, Radar's architecture is probably:

1. **Data Layer:** CoinGecko API (primary) + Blockchain.info (mining) + scraped sources (ETF flows, treasuries)
2. **Analysis Layer:** LLM (likely GPT-4/Claude) with structured prompts that take the data and produce the report sections
3. **Scoring Framework:** Deterministic rules (price vs mining cost, ETF flows direction, Fear & Greed level, technical levels) that feed into a 1-10 score
4. **Scenario Engine:** Rules-based probability assignment (bear/base/bull) adjusted by current macro conditions
5. **Caching:** Reports refreshed daily (not real-time), likely via cron job
6. **Limited scope:** Only crypto tokens (10 listed), not stocks/forex/commodities yet

The quality of their output suggests heavy use of an LLM for the narrative sections, with structured data injected as context. The "decade of market experience" likely refers to the prompt engineering and scoring framework, not a proprietary data pipeline.

---

*End of research document*
