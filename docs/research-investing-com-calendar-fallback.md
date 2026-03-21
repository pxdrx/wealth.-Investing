# Research: Investing.com Economic Calendar as Fallback Source

**Date:** 2026-03-18
**Status:** Research complete
**Purpose:** Fallback when ForexFactory JSON is unavailable

---

## 1. Main Page (investing.com/economic-calendar/)

- **Server-side rendered:** Yes — full HTML table with event data is in the initial response
- **Data fields present:** date, time, currency, country flag, event name, impact (bull icons), actual, forecast, previous
- **Problem:** Main page is heavy (~28KB of content), includes JS frameworks, ads, navigation
- **Feasibility:** Scrapable with cheerio but fragile — HTML structure changes frequently

## 2. Internal API Endpoint

- `POST /economic-calendar/Service/getCalendarFilteredData` — returned HTTP 200 but with **empty body (0 bytes)**
- Requires specific headers (`X-Requested-With: XMLHttpRequest`) and CSRF tokens from cookies
- **Not viable** from serverless without maintaining session state

## 3. sslecal2.investing.com Widget

- **Status:** Both direct fetch and parameterized fetch returned **Cloudflare challenge pages** (403 / managed challenge)
- The widget URL pattern: `https://sslecal2.investing.com/?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&importance=1,2,3&calType=week&timeZone=55&lang=12`
- **Cloudflare protection is active** — requires JS execution to pass challenge
- **Not viable from serverless** (no headless browser)

## 4. Best npm Package: `investing-economic-calendar`

- **Package:** `investing-economic-calendar` v0.0.5 (published 2025-05-29, by lludol)
- **GitHub:** https://github.com/lludol/investing-economic-calendar (11 stars, 18 commits)
- **How it works:** Fetches `sslecal2.investing.com` widget HTML and parses with **cheerio**
- **TypeScript:** Full TS support with typed enums (Country, Currency, Importance, Language, TimeZone)
- **Data format returned (EconomicEvent interface):**
  ```ts
  interface EconomicEvent {
    id: string;
    timestampDay: number;
    time: string;
    country: string;
    currency: Currency;       // "USD", "EUR", etc.
    importance: Importance;   // HIGH, MEDIUM, LOW
    name: string;
    actual: string | null;
    forecast: string | null;
    previous: string | null;
  }
  ```
- **All required fields are present:** date (timestampDay), time, currency, event name, impact, forecast, previous, actual

### Critical Problem

This package fetches from `sslecal2.investing.com` which is now **behind Cloudflare managed challenge**. As of 2026-03-18, it will NOT work from serverless environments. The package was last tested ~mid-2025 before Cloudflare was added.

## 5. Other npm Packages

| Package | Notes |
|---------|-------|
| `investing-com-api` v5.0.3 | General Investing.com API (markets, not calendar-focused) |
| `@pratiksha90/financial-data-extractors` v1.0.8 | Multi-source (Bloomberg, Trading Economics, Investing) — worth investigating |
| `forexfactory` v1.0.0 | ForexFactory scraper (our primary source, not a fallback) |
| `fcsapi-economic-calendar` v0.0.1 | Wraps fcsapi.com paid API |

## 6. Rate Limits & Legal Considerations

- **Investing.com ToS:** Prohibits automated scraping (Section 8 of their Terms of Service)
- **Cloudflare WAF:** Active on both main domain and sslecal2 subdomain — aggressive bot detection
- **Rate limits:** Unknown exact thresholds, but Cloudflare will block after a few requests from datacenter IPs (Vercel)
- **Legal risk:** Medium-high — commercial use of scraped data violates ToS

## 7. Recommendation

**Investing.com is NOT a viable fallback for serverless.** Reasons:
1. Cloudflare blocks all non-browser requests to sslecal2.investing.com
2. Main page requires session/CSRF tokens for AJAX API
3. ToS prohibits scraping
4. All existing npm packages rely on sslecal2 which is now blocked

### Better Alternatives for Fallback

1. **FCS API** (fcsapi.com) — Free tier with 500 req/day, proper JSON API, includes economic calendar
2. **Trading Economics API** — Paid, but has official calendar endpoint
3. **Myfxbook Economic Calendar** — Has a public JSON feed at `https://www.myfxbook.com/getEconomicCalendarData.json`
4. **DailyFX Calendar** — RSS/XML feed available
5. **Cache ForexFactory aggressively** — ISR with 30-60min revalidation, stale-while-revalidate pattern
