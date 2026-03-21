# Inteligência Macro — Design Spec

**Date:** 2026-03-19
**Status:** APPROVED
**Replaces:** /app/news (NewsAPI proxy)

## Overview

Full replacement of the News tab with a macroeconomic intelligence platform featuring economic calendar, AI-powered adaptive narratives, decision intelligence, and central bank rate monitoring.

## Tier Gating

| Section | Free | Pro/Ultra |
|---|---|---|
| Economic Calendar | ✅ | ✅ |
| Adaptive Alerts | ✅ (simplified, no AI analysis) | ✅ (with AI analysis) |
| Weekly Briefing AI | 🔒 blur | ✅ |
| Regional Analysis | 🔒 blur | ✅ |
| Decision Intelligence | 🔒 blur | ✅ |
| Interest Rates (10 CBs) | 🔒 blur | ✅ |
| History + Comparison | 🔒 blur | ✅ |

## Data Sources

| Data | Source | Method | Fallback |
|---|---|---|---|
| Economic calendar | ForexFactory | faireconomy JSON (`nfs.faireconomy.media/ff_calendar_thisweek.json`) | Myfxbook JSON / FCS API |
| Editorial briefing | TradingEconomics | Cheerio scrape (`/calendar?article=X&g=top&importance=2`) | Claude generates from FF events only |
| Weekly narrative | Claude Sonnet | Anthropic API (TE briefing + FF events as context) | — |
| Adaptive re-analysis | Claude Sonnet | Only on HIGH impact events with actual != forecast | — |
| Interest rates | Public scraping | Vercel Cron 1x/hour → Supabase | Static manual data |
| News/headlines | TE News API | `api.tradingeconomics.com/news?c=guest:guest&f=json` | — |

## Architecture (Full TypeScript Rewrite)

### Cron Jobs

```
Vercel Cron Jobs
├── /api/cron/calendar-sync (every 30min)
│   → fetch faireconomy JSON + upsert Supabase economic_events
│   → if HIGH impact event has new actual → trigger narrative-update
│
├── /api/cron/weekly-briefing (Sunday 20h BRT + Monday 08h BRT)
│   → scrape TE Week Ahead article (Cheerio)
│   → fetch FF events for the week
│   → Claude Sonnet generates PT-BR narrative + regional + decision intel
│   → save to Supabase weekly_panoramas
│
├── /api/cron/rates-sync (every 1h)
│   → fetch rates from 10 CBs (public sources)
│   → upsert Supabase central_bank_rates
│
└── /api/cron/narrative-update (triggered by calendar-sync)
    → only runs if HIGH impact event with actual diverging from forecast
    → Claude Sonnet re-generates partial narrative
    → creates adaptive alert (BREAKING/UPDATE)
    → saves to Supabase adaptive_alerts
```

### Supabase Tables (new)

```sql
-- Economic calendar events
CREATE TABLE economic_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_uid TEXT UNIQUE NOT NULL,        -- dedup key
  date DATE NOT NULL,
  time TIME,
  country TEXT NOT NULL,                 -- ISO 2-letter
  title TEXT NOT NULL,
  impact TEXT CHECK (impact IN ('high', 'medium', 'low')),
  forecast TEXT,
  previous TEXT,
  actual TEXT,
  currency TEXT,                         -- affected currency
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Weekly panoramas (AI-generated narratives)
CREATE TABLE weekly_panoramas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE UNIQUE NOT NULL,
  week_end DATE NOT NULL,
  te_briefing_raw TEXT,                  -- scraped TE article
  narrative TEXT NOT NULL,               -- AI-generated PT-BR narrative
  regional_analysis JSONB,              -- { americas, europe, asia_pacific }
  market_impacts JSONB,                 -- asset-level impacts
  decision_intelligence JSONB,          -- { base_scenario, alt_scenario, conviction_map }
  sentiment JSONB,                      -- { bullish_pct, neutral_pct, bearish_pct }
  is_frozen BOOLEAN DEFAULT false,      -- true = week is over, no more updates
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Central bank interest rates
CREATE TABLE central_bank_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_code TEXT UNIQUE NOT NULL,       -- FED, ECB, BOE, BOJ, BCB, BOC, RBA, PBOC, SNB, BANXICO
  bank_name TEXT NOT NULL,
  country TEXT NOT NULL,
  current_rate DECIMAL(5,3) NOT NULL,
  last_action TEXT,                     -- 'hold', 'cut', 'hike'
  last_change_bps INTEGER,             -- e.g. 25, -50
  last_change_date DATE,
  next_meeting DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adaptive alerts
CREATE TABLE adaptive_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT CHECK (type IN ('breaking', 'update', 'upcoming')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_id UUID REFERENCES economic_events(id),
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Weekly history for comparison
CREATE TABLE weekly_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE UNIQUE NOT NULL,
  snapshot_data JSONB NOT NULL,         -- frozen copy of panorama + events + rates
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS Policies

- `economic_events` — public read (no user_id, shared data)
- `weekly_panoramas` — public read
- `central_bank_rates` — public read
- `adaptive_alerts` — public read
- `weekly_snapshots` — public read

Note: tier gating is enforced client-side via PaywallGate + SubscriptionContext (same pattern as AI Coach).

### API Routes

```
GET  /api/macro/calendar        — events for a given week
GET  /api/macro/panorama        — current week's panorama
GET  /api/macro/rates           — current CB rates
GET  /api/macro/alerts          — adaptive alerts for current week
GET  /api/macro/history         — list of available weeks
GET  /api/macro/compare         — two weeks side-by-side
POST /api/cron/calendar-sync    — Vercel Cron endpoint
POST /api/cron/weekly-briefing  — Vercel Cron endpoint
POST /api/cron/rates-sync       — Vercel Cron endpoint
POST /api/cron/narrative-update — Vercel Cron endpoint
```

### Components

```
app/app/macro/page.tsx                — main page (replaces /app/news)
components/macro/
├── WeeklyBriefing.tsx                — narrative + source tag + updated timestamp
├── EconomicCalendar.tsx              — timeline with day headers, highlights, impact filter
├── AdaptiveAlerts.tsx                — breaking/update/upcoming cards
├── RegionalAnalysis.tsx              — 3 cards (Americas/Europe/Asia-Pacific)
├── DecisionIntelligence.tsx          — base/alt scenarios + conviction map bars
├── InterestRatesPanel.tsx            — 10 CBs grid with rate, action, next meeting
├── WeeklyHistory.tsx                 — week navigation arrows + side-by-side comparison
├── SentimentBar.tsx                  — bullish/neutral/bearish bar
├── LiveIndicator.tsx                 — green pulsing dot
├── MacroWidgetBriefing.tsx           — dashboard widget (mini narrative + sentiment)
└── MacroWidgetEvents.tsx             — dashboard widget (next HIGH events list)
```

### Visual Design

- **Base:** V1 layout (vertical scroll with section labels)
- **From V2:** Live indicator (green pulsing dot), calendar event highlights (blue background for key events)
- **Paywall:** blur(8px) + lock icon + CTA button on all Pro sections (same as AI Coach pattern)
- **Design tokens:** wealth.Investing standard (rounded-[22px], shadow-soft, dark mode, inline bg style)
- **No tabs** — single scroll page with section dividers

### AI Configuration

- **Model:** Claude Sonnet (same API key as AI Coach)
- **Prompt persona:** Veteran macro analyst (50+ years), institutional-grade, PT-BR output
- **Re-analysis trigger:** Only HIGH impact events where actual diverges from forecast
- **Cost estimate:** ~$0.05-0.10 per narrative generation, ~2-4 per week = ~$0.50/week

### Markets Covered

**Forex:** EUR/USD, GBP/USD, USD/JPY, AUD/USD, NZD/USD, USD/BRL, USD/CAD, USD/CHF
**Indices:** S&P 500, Nasdaq, DJI
**Commodities:** XAUUSD, XAGUSD, USOIL
**Crypto:** BTC/USD, ETH/USD

### Files to Delete/Replace

- `app/api/news/route.ts` → DELETE
- `app/app/news/page.tsx` → DELETE (replaced by /app/macro)
- News widget in `app/app/page.tsx` → REPLACE with MacroWidgetBriefing + MacroWidgetEvents
- `.env.local` NEWS_API_KEY → can be removed (keep if useful elsewhere)

### Mockups

- V1 (chosen): `mockup-macro-intelligence.html`
- V2 (reference for live indicator + highlights): `mockup-macro-intelligence-v2.html`
- Full page screenshot: `mockup-macro-fullpage.png`
