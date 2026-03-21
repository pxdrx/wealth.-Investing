# TradingEconomics "Week Ahead" — Research Findings

**Date:** 2026-03-18

## 1. The "Week Ahead" Page Does NOT Exist

- `https://tradingeconomics.com/week-ahead` → **404 Page Not Found**
- `https://tradingeconomics.com/weekly` → **404**
- `https://tradingeconomics.com/newsletter` → **404**
- `https://tradingeconomics.com/ws` → **403 Forbidden**

**Conclusion:** There is no dedicated "Week Ahead" editorial/briefing page on TradingEconomics. The content being copy-pasted likely comes from their **News stream** or from a **newsletter email** that is not publicly available on the web.

## 2. What TradingEconomics DOES Offer

### News Stream (`/stream`, `/united-states/news`)
- Auto-generated market commentary (not editorial briefings)
- Per-country, per-indicator news blurbs
- Example: "NZX 50 Jumps 1.0% at Close" with 1-paragraph descriptions
- Categories: Stock Market, Bond Yield, Currency, GDP, etc.
- Each news item has: id, title, date, description, country, category, symbol, url, importance

### Economic Calendar (`/calendar`)
- Structured data: event name, country, date, actual/previous/forecast/TE forecast
- Importance levels: 1 (low), 2 (medium), 3 (high)
- Filterable by country, date range, importance
- **This is the most useful data source for a "week ahead" feature**

## 3. API Access

### Free/Guest Tier (`guest:guest`)
- **Calendar API works:** `https://api.tradingeconomics.com/calendar?c=guest:guest&f=json`
- Returns structured JSON with all calendar events
- **News API works (limited):** `https://api.tradingeconomics.com/news?c=guest:guest&f=json`
- Returns recent news items with title + description
- **News by country is BLOCKED:** `/news/country/united%20states?c=guest:guest` → 403
- Trial limits: 100,000 data points, 100 requests

### Calendar API Endpoints (with API key)
| Endpoint | Description |
|----------|-------------|
| `/calendar` | All upcoming events |
| `/calendar/country/{country}` | Filter by country |
| `/calendar/{date1}/{date2}` | Date range |
| `/calendar/country/{country}/{date1}/{date2}` | Country + date range |
| `/calendar/calendarid/{ids}` | Specific events by ID |
| `/calendar/updates` | Recently modified events |

### Calendar Response Fields
```json
{
  "CalendarId": "393390",
  "Date": "2025-09-19T00:00:00",
  "Country": "Euro Area",
  "Category": "Calendar",
  "Event": "Eurogroup Meeting",
  "Reference": "",
  "Source": "",
  "Actual": "",
  "Previous": "",
  "Forecast": "",
  "TEForecast": "",
  "Importance": 1,
  "LastUpdate": "...",
  "Currency": "",
  "Unit": "%",
  "Ticker": "EUR CALENDAR",
  "Symbol": ""
}
```

### News API Response Fields
```json
{
  "id": "534184",
  "title": "NZX 50 Jumps 1.0% at Close",
  "date": "2026-03-18T04:27:06.167",
  "description": "The NZX 50 climbed 133 points...",
  "country": "New Zealand",
  "category": "Stock Market",
  "symbol": "NZSE50FG",
  "url": "/new-zealand/stock-market",
  "importance": 1
}
```

### Paid Plans
- Pricing page doesn't show specific tiers publicly (contact sales)
- Trial: 100K data points, 100 requests, not refundable
- No public RSS feeds (403 on `/rss`)

## 4. Can It Be Scraped?

### Calendar Page — Partially
- Calendar table uses server-side rendering with JS-powered filters
- The HTML table IS present in the initial response (Cheerio could parse it)
- But date range/country filtering requires JavaScript (`setCalendarRange()` calls)
- **Better approach: use the API with `guest:guest` credentials**

### News Page — Yes, but limited
- News items render in SSR HTML
- Could be scraped with Cheerio
- But items are short market summaries, NOT editorial "week ahead" briefings

### Editorial "Week Ahead" — Does NOT exist as scrapeable content
- No public URL for this content
- Likely only available via email newsletter or internal reports

## 5. Recommended Approach: Build Our Own "Week Ahead"

Since TradingEconomics does NOT offer a ready-made "Week Ahead" editorial briefing via API, the best strategy is:

### Option A: AI-Generated Week Ahead (RECOMMENDED)
1. **Fetch calendar data** via TE API (`guest:guest` or paid key)
   - Filter: next 7 days, importance >= 2, major countries (US, EU, UK, JP, CN)
2. **Fetch recent news** via TE News API (general endpoint works with guest)
3. **Feed both to Claude/AI** to generate a "Week Ahead" briefing
4. **Cache the result** (generate once on Monday, serve all week)

### Option B: Scrape + Summarize
1. Scrape `/calendar` page HTML with date range filter via API
2. Scrape `/stream` for recent market news
3. Use AI to synthesize into a briefing

### Option C: Alternative Sources for "Week Ahead"
- **ForexFactory** (already have `forexfactory-ESSENCIAL/` code with weekly_panoramas)
- **Investing.com** economic calendar
- **DailyFX** weekly forecasts (editorial content)
- **Bloomberg** week ahead (requires subscription)

## 6. Technical Implementation Plan

```
API Route: /api/week-ahead
├── Fetch: TE Calendar API (next 7 days, importance >= 2)
├── Fetch: TE News API (latest 20 items)
├── Cache check: Supabase table `weekly_briefings`
├── If stale (> 12h): call Claude Haiku to generate briefing
├── Store in `weekly_briefings` table
└── Return cached briefing as JSON
```

### Cost Estimate
- TE API guest: Free (100 requests/trial)
- TE API paid: Contact for pricing
- Claude Haiku for generation: ~$0.01 per briefing (negligible)
- Total: Near-zero if using guest key + AI generation

## 7. Summary

| Question | Answer |
|----------|--------|
| Does `/week-ahead` exist? | **No (404)** |
| Is there an RSS feed? | **No (403)** |
| Is there a newsletter page? | **No (404)** |
| Can calendar be fetched via API? | **Yes, `guest:guest` works** |
| Can news be fetched via API? | **Yes, general endpoint works** |
| Can it be scraped with Cheerio? | **Calendar: partially. News: yes** |
| Free API tier? | **Guest key with 100K points / 100 requests** |
| Does API include editorial briefings? | **No — only structured data + short news** |
| Best approach? | **Fetch calendar + news data, AI-generate the briefing** |
