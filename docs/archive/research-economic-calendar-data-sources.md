# Research: Economic Calendar Data Sources for wealth.Investing

**Date:** 2026-03-18
**Goal:** Replace Selenium-based ForexFactory scraper with a lightweight solution compatible with Next.js 14 on Vercel (serverless, no headless browser).

---

## 1. WINNER: ForexFactory JSON via faireconomy.media (Third-Party Mirror)

**URL:** `https://nfs.faireconomy.media/ff_calendar_thisweek.json`

### What it is
A third-party JSON mirror of ForexFactory calendar data hosted by faireconomy.media. Returns a clean JSON array — no scraping needed.

### Data format (verified live)
```json
{
  "title": "CPI m/m",
  "country": "CAD",
  "date": "2026-03-16T08:30:00-04:00",
  "impact": "High",
  "forecast": "0.7%",
  "previous": "0.0%"
}
```

### Fields available
- `title` — event name (e.g., "Non-Farm Employment Change")
- `country` — currency code (USD, EUR, GBP, JPY, etc.)
- `date` — ISO 8601 with timezone offset
- `impact` — "High", "Medium", "Low", or "Holiday"
- `forecast` — consensus forecast (string, may be empty)
- `previous` — previous value (string, may be empty)

### Missing fields
- **`actual`** — NOT present in this endpoint (only forecast/previous)
- No event description or detailed breakdown

### URL patterns (confirmed working)
- `ff_calendar_thisweek.json` — current week
- `ff_calendar_nextweek.json` — next week
- `ff_calendar_lastweek.json` — last week (has actual values filled in retrospectively? needs verification)

### Pros
- Pure JSON — no parsing needed, just `fetch()` + `.json()`
- Works perfectly in Next.js API routes / serverless
- No API key required
- Same data as ForexFactory (it's a mirror)
- All major currencies covered
- ISO dates with timezone

### Cons
- **Rate limited** — returned HTTP 429 on rapid successive requests (aggressive rate limiting)
- **Third-party mirror** — not official, could disappear without notice
- **No `actual` values** — only forecast + previous (actual appears after event occurs)
- **No SLA** — unknown uptime guarantees
- **Legal gray area** — scraping ForexFactory's data without clear permission

### Recommended strategy
- Cache aggressively: fetch once per hour via ISR/cron, store in Supabase or edge cache
- Vercel Cron Job: `0 */1 * * *` to refresh data
- Fallback to cached data if 429 or timeout

---

## 2. ALTERNATIVE: MQL5 Economic Calendar (MetaQuotes)

**URL:** `https://www.mql5.com/en/economic-calendar`

### What it is
MetaQuotes' official economic calendar. Server-side rendered HTML with all data visible.

### Data available
- Time, Currency, Event name, Actual, Forecast, Previous
- Impact levels (Low/Medium/High)
- 900+ indicators from 20+ countries
- Includes **actual values** (filled after release)

### Scraping feasibility
- HTML is server-rendered — **Cheerio can parse it** (no JS required for initial data)
- Calendar table data is in the initial HTML response
- Has a downloadable widget and Tradays app

### Pros
- Official MetaQuotes product (company behind MT4/MT5)
- Includes actual values
- Cheerio-compatible (SSR HTML)
- More comprehensive (900+ indicators)
- Free, no API key

### Cons
- HTML scraping required (fragile, can break on layout changes)
- No official JSON API endpoint found (returns 404)
- Potential bot blocking / rate limiting
- ToS may prohibit scraping

---

## 3. ALTERNATIVE: TradingEconomics

**URL:** `https://tradingeconomics.com/calendar`

### API
- Official API exists: `https://api.tradingeconomics.com/calendar`
- **Free tier:** 1,000 requests/month (very limited)
- **Paid:** starts at $49/month for basic access
- Returns JSON with all fields including actual values

### Pros
- Official API with JSON responses
- Comprehensive data (GDP, CPI, NFP, etc.)
- Actual values included
- Well-documented

### Cons
- Free tier too limited (1K req/month)
- Paid plans expensive for a startup
- API key required

---

## 4. ALTERNATIVE: Investing.com Economic Calendar

### Scraping
- Heavily JavaScript-rendered — requires headless browser
- Aggressive bot detection (Cloudflare)
- **NOT viable** for serverless

### API
- No public API
- Unofficial endpoints exist but are undocumented and blocked frequently

**Verdict: NOT recommended**

---

## 5. ALTERNATIVE: FXStreet Economic Calendar

**URL:** `https://www.fxstreet.com/economic-calendar`

### Scraping
- Uses client-side JS rendering
- Has internal API endpoints that return JSON (undocumented)
- Previous community projects have reverse-engineered the API

### Pros
- Data quality is good
- If internal API is found, returns JSON

### Cons
- Undocumented internal APIs can change without notice
- Bot detection present
- Legal concerns

---

## 6. ALTERNATIVE: DailyFX / ForexLive

- Similar data but require scraping
- No public APIs
- Not worth the effort given better options exist

---

## Architecture Recommendation

### Primary: faireconomy.media JSON + Supabase cache

```
[Vercel Cron] → fetch ff_calendar_thisweek.json
                 ↓
              [API Route /api/calendar]
                 ↓
              [Supabase table: economic_events]
                 ↓ (cached, ISR)
              [Dashboard Widget]
```

### Implementation plan

1. **API Route:** `app/api/calendar/route.ts`
   - GET: returns cached events from Supabase
   - Filters by date range, impact level, currency

2. **Cron Job:** `app/api/cron/calendar/route.ts`
   - Fetches from faireconomy.media JSON
   - Upserts into `economic_events` table
   - Runs every hour via Vercel Cron (`vercel.json`)
   - Handles 429 gracefully (skip, use existing cache)

3. **Supabase table:** `economic_events`
   ```sql
   CREATE TABLE economic_events (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     title TEXT NOT NULL,
     country TEXT NOT NULL,
     event_date TIMESTAMPTZ NOT NULL,
     impact TEXT NOT NULL CHECK (impact IN ('Holiday','Low','Medium','High')),
     forecast TEXT,
     previous TEXT,
     actual TEXT,
     source TEXT DEFAULT 'forexfactory',
     fetched_at TIMESTAMPTZ DEFAULT now(),
     UNIQUE(title, country, event_date)
   );
   ```

4. **Fallback:** If faireconomy.media goes down, fall back to MQL5 HTML scraping via Cheerio (already in the project).

### Why NOT direct scraping of ForexFactory HTML
- ForexFactory calendar table data is rendered via JavaScript (not in initial HTML)
- The HTML response we fetched showed navigation/login UI but NO event data in the table
- Would require Selenium/Playwright — incompatible with Vercel serverless (no headless browser)

### Rate limiting strategy
- Fetch max 1x per hour (Vercel Cron)
- Cache in Supabase with `fetched_at` timestamp
- API route serves from DB, never hits external source directly
- Users never trigger external fetches

### Cost
- **$0** — no API keys, no paid services
- Only Supabase storage (negligible: ~100-200 rows/week)

---

## Summary Matrix

| Source | Format | Actual Values | Free | Serverless-OK | Reliability |
|--------|--------|--------------|------|---------------|-------------|
| **faireconomy.media** | JSON | No* | Yes | Yes | Medium |
| MQL5 Calendar | HTML (SSR) | Yes | Yes | Yes (Cheerio) | High |
| TradingEconomics API | JSON | Yes | Limited | Yes | Very High |
| Investing.com | JS-rendered | Yes | N/A | No | N/A |
| FXStreet | JS-rendered | Yes | N/A | Maybe | Low |
| ForexFactory HTML | JS-rendered | Yes | N/A | No | N/A |

*faireconomy.media may include actuals in `lastweek` data (needs verification)

**Final recommendation:** Use faireconomy.media JSON as primary (zero-friction, JSON, free), with MQL5 Cheerio scraping as fallback for actual values and resilience.
