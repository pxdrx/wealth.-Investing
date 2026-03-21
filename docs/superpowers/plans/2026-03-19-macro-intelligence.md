# Inteligência Macro — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the News tab with a full macroeconomic intelligence platform featuring economic calendar, AI-powered narratives, decision intelligence, central bank rates, and adaptive alerts.

**Architecture:** Server-side cron jobs fetch data from ForexFactory (faireconomy JSON) and TradingEconomics, store in 5 new Supabase tables. Claude Sonnet generates weekly narratives and adaptive re-analyses. Client renders a single-scroll page at `/app/macro` with PaywallGate blur for Pro sections. Two new dashboard widgets replace the old News widget.

**Tech Stack:** Next.js 14 App Router, Supabase (5 new tables, public RLS), Vercel Cron, Anthropic SDK (Claude Sonnet), Cheerio (scraping), PaywallGate (existing), Tailwind + shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-19-macro-intelligence-design.md`

**Prerequisites:**
- `ANTHROPIC_API_KEY` in `.env.local` (already exists from AI Coach)
- `CRON_SECRET` in `.env.local` AND Vercel project settings (generate: `openssl rand -hex 16`)
- `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (already exists)
- Run migration SQL in Supabase SQL editor (Task 2)
- Install `@anthropic-ai/sdk` if not already present

---

## File Structure

```
# NEW FILES
lib/macro/
├── types.ts                          — All TypeScript interfaces/types for macro feature
├── faireconomy.ts                    — ForexFactory calendar fetcher (faireconomy JSON)
├── te-scraper.ts                     — TradingEconomics Week Ahead scraper (Cheerio)
├── rates-fetcher.ts                  — Central bank rates fetcher
├── narrative-generator.ts            — Claude Sonnet narrative generation
├── constants.ts                      — Markets, CB list, impact thresholds

app/api/macro/
├── calendar/route.ts                 — GET events for a given week
├── panorama/route.ts                 — GET current week panorama
├── rates/route.ts                    — GET current CB rates
├── alerts/route.ts                   — GET adaptive alerts for current week
├── history/route.ts                  — GET list of available weeks
└── compare/route.ts                  — GET two weeks side-by-side

app/api/cron/
├── calendar-sync/route.ts            — Vercel Cron: sync FF calendar every 30min
├── weekly-briefing/route.ts          — Vercel Cron: generate narrative Sun/Mon
├── rates-sync/route.ts               — Vercel Cron: sync CB rates hourly
└── narrative-update/route.ts         — Vercel Cron: re-analyze on HIGH impact divergence

app/app/macro/page.tsx                — Main macro intelligence page

components/macro/
├── LiveIndicator.tsx                 — Green pulsing dot
├── SentimentBar.tsx                  — Bullish/neutral/bearish horizontal bar
├── AdaptiveAlerts.tsx                — Breaking/update/upcoming alert cards
├── EconomicCalendar.tsx              — Timeline with day headers, impact filter
├── WeeklyBriefing.tsx                — AI narrative + source tag + timestamp
├── RegionalAnalysis.tsx              — 3 cards: Americas/Europe/Asia-Pacific
├── DecisionIntelligence.tsx          — Base/alt scenarios + conviction map
├── InterestRatesPanel.tsx            — 10 CBs grid
├── WeeklyHistory.tsx                 — Week navigation + side-by-side comparison
├── MacroWidgetBriefing.tsx           — Dashboard widget: mini narrative + sentiment
└── MacroWidgetEvents.tsx             — Dashboard widget: next HIGH events

# MODIFIED FILES
components/layout/AppHeader.tsx       — Change /app/news → /app/macro, label "Macro"
app/app/page.tsx                      — Replace News widget with MacroWidgetBriefing + MacroWidgetEvents
vercel.json                           — NEW: cron schedule definitions
lib/subscription-shared.ts            — Add hasMacroIntelligence to TierLimits

# DELETED FILES (after macro is working)
app/api/news/route.ts                 — Old NewsAPI proxy
app/app/news/page.tsx                 — Old News page
```

---

## Phase 1: Foundation (Types + Database + Constants)

### Task 1: Types and Constants

**Files:**
- Create: `lib/macro/types.ts`
- Create: `lib/macro/constants.ts`

- [ ] **Step 1: Create types file**

```typescript
// lib/macro/types.ts

export interface EconomicEvent {
  id: string;
  event_uid: string;
  date: string;          // YYYY-MM-DD
  time: string | null;   // HH:MM
  country: string;       // ISO 2-letter
  title: string;
  impact: "high" | "medium" | "low";
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  currency: string | null;
  week_start: string;    // YYYY-MM-DD (Monday)
  created_at: string;
  updated_at: string;
}

export interface WeeklyPanorama {
  id: string;
  week_start: string;
  week_end: string;
  te_briefing_raw: string | null;
  narrative: string;
  regional_analysis: RegionalAnalysis | null;
  market_impacts: MarketImpact[] | null;
  decision_intelligence: DecisionIntelligence | null;
  sentiment: Sentiment | null;
  is_frozen: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegionalAnalysis {
  americas: RegionSection;
  europe: RegionSection;
  asia_pacific: RegionSection;
}

export interface RegionSection {
  title: string;
  summary: string;
  key_events: string[];
  outlook: "bullish" | "neutral" | "bearish";
}

export interface MarketImpact {
  asset: string;
  direction: "bullish" | "bearish" | "neutral";
  conviction: number;    // 0-100
  rationale: string;
}

export interface DecisionIntelligence {
  base_scenario: Scenario;
  alt_scenario: Scenario;
  conviction_map: ConvictionEntry[];
}

export interface Scenario {
  title: string;
  probability: number;   // 0-100
  description: string;
  key_drivers: string[];
}

export interface ConvictionEntry {
  asset: string;
  direction: "long" | "short" | "neutral";
  conviction: number;    // 0-100
}

export interface Sentiment {
  bullish_pct: number;
  neutral_pct: number;
  bearish_pct: number;
}

export interface CentralBankRate {
  id: string;
  bank_code: string;
  bank_name: string;
  country: string;
  current_rate: number;
  last_action: "hold" | "cut" | "hike" | null;
  last_change_bps: number | null;
  last_change_date: string | null;
  next_meeting: string | null;
  updated_at: string;
}

export interface AdaptiveAlert {
  id: string;
  type: "breaking" | "update" | "upcoming";
  title: string;
  description: string | null;
  event_id: string | null;
  week_start: string;
  created_at: string;
}

export interface WeeklySnapshot {
  id: string;
  week_start: string;
  snapshot_data: {
    panorama: WeeklyPanorama;
    events: EconomicEvent[];
    rates: CentralBankRate[];
  };
  created_at: string;
}

// Faireconomy API response shape
export interface FaireconomyEvent {
  title: string;
  country: string;
  date: string;          // "MM-DD-YYYY" or ISO
  impact: string;        // "High", "Medium", "Low", "Holiday"
  forecast: string;
  previous: string;
}
```

- [ ] **Step 2: Create constants file**

```typescript
// lib/macro/constants.ts

export const CENTRAL_BANKS = [
  { code: "FED",     name: "Federal Reserve",           country: "US", currency: "USD" },
  { code: "ECB",     name: "European Central Bank",     country: "EU", currency: "EUR" },
  { code: "BOE",     name: "Bank of England",           country: "GB", currency: "GBP" },
  { code: "BOJ",     name: "Bank of Japan",             country: "JP", currency: "JPY" },
  { code: "BCB",     name: "Banco Central do Brasil",   country: "BR", currency: "BRL" },
  { code: "BOC",     name: "Bank of Canada",            country: "CA", currency: "CAD" },
  { code: "RBA",     name: "Reserve Bank of Australia", country: "AU", currency: "AUD" },
  { code: "PBOC",    name: "People's Bank of China",    country: "CN", currency: "CNY" },
  { code: "SNB",     name: "Swiss National Bank",       country: "CH", currency: "CHF" },
  { code: "BANXICO", name: "Banco de México",           country: "MX", currency: "MXN" },
] as const;

export const TRACKED_MARKETS = {
  forex: ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "NZD/USD", "USD/BRL", "USD/CAD", "USD/CHF"],
  indices: ["S&P 500", "Nasdaq", "DJI"],
  commodities: ["XAUUSD", "XAGUSD", "USOIL"],
  crypto: ["BTC/USD", "ETH/USD"],
} as const;

export const FAIRECONOMY_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

export const IMPACT_COLORS = {
  high: { bg: "bg-red-500/10", text: "text-red-500", dot: "bg-red-500" },
  medium: { bg: "bg-orange-500/10", text: "text-orange-500", dot: "bg-orange-500" },
  low: { bg: "bg-yellow-500/10", text: "text-yellow-500", dot: "bg-yellow-500" },
} as const;

export const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", EU: "🇪🇺", GB: "🇬🇧", JP: "🇯🇵", BR: "🇧🇷",
  CA: "🇨🇦", AU: "🇦🇺", NZ: "🇳🇿", CH: "🇨🇭", MX: "🇲🇽",
  CN: "🇨🇳", DE: "🇩🇪", FR: "🇫🇷", IT: "🇮🇹", ES: "🇪🇸",
};

/** Get Monday of the week containing a given date */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

/** Get Friday of the week containing a given date */
export function getWeekEnd(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -2 : 5); // Friday
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export const CRON_SECRET_HEADER = "x-cron-secret";
```

- [ ] **Step 3: Verify build**

Run: `npm run build` — ensure no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add lib/macro/types.ts lib/macro/constants.ts
git commit -m "feat(macro): add types and constants for macro intelligence"
```

---

### Task 2: Database Migration SQL

**Files:**
- Create: `docs/migrations/2026-03-19-macro-intelligence.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- docs/migrations/2026-03-19-macro-intelligence.sql
-- Macro Intelligence tables — run in Supabase SQL editor

-- 1. Economic calendar events
CREATE TABLE IF NOT EXISTS economic_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_uid TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  time TIME,
  country TEXT NOT NULL,
  title TEXT NOT NULL,
  impact TEXT CHECK (impact IN ('high', 'medium', 'low')),
  forecast TEXT,
  previous TEXT,
  actual TEXT,
  currency TEXT,
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Weekly panoramas (AI-generated narratives)
CREATE TABLE IF NOT EXISTS weekly_panoramas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE UNIQUE NOT NULL,
  week_end DATE NOT NULL,
  te_briefing_raw TEXT,
  narrative TEXT NOT NULL,
  regional_analysis JSONB,
  market_impacts JSONB,
  decision_intelligence JSONB,
  sentiment JSONB,
  is_frozen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Central bank interest rates
CREATE TABLE IF NOT EXISTS central_bank_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_code TEXT UNIQUE NOT NULL,
  bank_name TEXT NOT NULL,
  country TEXT NOT NULL,
  current_rate DECIMAL(5,3) NOT NULL,
  last_action TEXT,
  last_change_bps INTEGER,
  last_change_date DATE,
  next_meeting DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Adaptive alerts
CREATE TABLE IF NOT EXISTS adaptive_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT CHECK (type IN ('breaking', 'update', 'upcoming')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_id UUID REFERENCES economic_events(id),
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Weekly snapshots (history for comparison)
CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE UNIQUE NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_economic_events_week ON economic_events(week_start);
CREATE INDEX IF NOT EXISTS idx_economic_events_date ON economic_events(date);
CREATE INDEX IF NOT EXISTS idx_economic_events_impact ON economic_events(impact);
CREATE INDEX IF NOT EXISTS idx_adaptive_alerts_week ON adaptive_alerts(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_panoramas_week ON weekly_panoramas(week_start);

-- RLS: All tables are PUBLIC READ (shared data, no user_id)
ALTER TABLE economic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_panoramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE central_bank_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read economic_events" ON economic_events FOR SELECT USING (true);
CREATE POLICY "Public read weekly_panoramas" ON weekly_panoramas FOR SELECT USING (true);
CREATE POLICY "Public read central_bank_rates" ON central_bank_rates FOR SELECT USING (true);
CREATE POLICY "Public read adaptive_alerts" ON adaptive_alerts FOR SELECT USING (true);
CREATE POLICY "Public read weekly_snapshots" ON weekly_snapshots FOR SELECT USING (true);

-- Service role INSERT/UPDATE (for cron jobs)
-- Service role only for writes (cron jobs use service_role key)
CREATE POLICY "Service insert economic_events" ON economic_events FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update economic_events" ON economic_events FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Service insert weekly_panoramas" ON weekly_panoramas FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update weekly_panoramas" ON weekly_panoramas FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Service insert central_bank_rates" ON central_bank_rates FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update central_bank_rates" ON central_bank_rates FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Service insert adaptive_alerts" ON adaptive_alerts FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service insert weekly_snapshots" ON weekly_snapshots FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update weekly_snapshots" ON weekly_snapshots FOR UPDATE USING (auth.role() = 'service_role');
```

- [ ] **Step 2: Run migration in Supabase SQL editor**

⚠️ **MANUAL STEP:** Copy the SQL above and execute it in the Supabase dashboard SQL editor. Verify all 5 tables appear in the Table Editor.

- [ ] **Step 3: Commit**

```bash
git add docs/migrations/2026-03-19-macro-intelligence.sql
git commit -m "feat(macro): add database migration for 5 macro intelligence tables"
```

---

### Task 3: Add Tier Limit + Subscription Update

**Files:**
- Modify: `lib/subscription-shared.ts`

- [ ] **Step 1: Read current file**

Read `lib/subscription-shared.ts` to find the `TierLimits` interface and `TIER_LIMITS` object.

- [ ] **Step 2: Add `hasMacroIntelligence` to TierLimits interface**

Add `hasMacroIntelligence: boolean` to the `TierLimits` interface and set it in each tier:
- `free`: `false`
- `pro`: `true`
- `ultra`: `true`

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add lib/subscription-shared.ts
git commit -m "feat(macro): add hasMacroIntelligence tier limit"
```

---

## Phase 2: Data Fetching Layer

### Task 4: Faireconomy Calendar Fetcher

**Files:**
- Create: `lib/macro/faireconomy.ts`

- [ ] **Step 1: Implement fetcher**

```typescript
// lib/macro/faireconomy.ts
import { FAIRECONOMY_URL, getWeekStart } from "./constants";
import type { FaireconomyEvent, EconomicEvent } from "./types";

function normalizeImpact(impact: string): "high" | "medium" | "low" | null {
  const lower = impact.toLowerCase();
  if (lower === "high") return "high";
  if (lower === "medium") return "medium";
  if (lower === "low") return "low";
  return null; // Skip holidays
}

function parseDate(dateStr: string): { date: string; time: string | null } {
  // Faireconomy returns dates like "2026-03-19T13:30:00-04:00" or similar ISO
  try {
    const d = new Date(dateStr);
    const date = d.toISOString().split("T")[0];
    const hours = d.getUTCHours().toString().padStart(2, "0");
    const minutes = d.getUTCMinutes().toString().padStart(2, "0");
    const time = hours === "00" && minutes === "00" ? null : `${hours}:${minutes}`;
    return { date, time };
  } catch {
    return { date: dateStr.split("T")[0], time: null };
  }
}

function generateEventUid(event: FaireconomyEvent): string {
  // Dedup key: country + title + date
  const dateClean = event.date.replace(/[^0-9]/g, "").slice(0, 8);
  return `${event.country}-${dateClean}-${event.title}`.toLowerCase().replace(/\s+/g, "-").slice(0, 128);
}

export async function fetchFaireconomyCalendar(): Promise<Omit<EconomicEvent, "id" | "created_at" | "updated_at">[]> {
  const res = await fetch(FAIRECONOMY_URL, {
    headers: { "User-Agent": "wealth-investing/1.0" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Faireconomy fetch failed: ${res.status} ${res.statusText}`);
  }

  const raw: FaireconomyEvent[] = await res.json();
  const weekStart = getWeekStart();

  return raw
    .filter((e) => normalizeImpact(e.impact) !== null)
    .map((e) => {
      const { date, time } = parseDate(e.date);
      const impact = normalizeImpact(e.impact)!;
      return {
        event_uid: generateEventUid(e),
        date,
        time,
        country: e.country.toUpperCase().slice(0, 2),
        title: e.title,
        impact,
        forecast: e.forecast || null,
        previous: e.previous || null,
        actual: null, // Filled later by updates
        currency: e.country.toUpperCase().slice(0, 3),
        week_start: weekStart,
      };
    });
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add lib/macro/faireconomy.ts
git commit -m "feat(macro): add ForexFactory calendar fetcher via faireconomy JSON"
```

---

### Task 5: TradingEconomics Scraper

**Files:**
- Create: `lib/macro/te-scraper.ts`

- [ ] **Step 1: Implement scraper**

```typescript
// lib/macro/te-scraper.ts
import * as cheerio from "cheerio";

const TE_CALENDAR_URL = "https://tradingeconomics.com/calendar";

export interface TeBriefingResult {
  raw_html: string;
  text_content: string;
  top_events: string[];
}

/**
 * Scrape TradingEconomics calendar page for high-importance events.
 * Used as editorial context for Claude narrative generation.
 * Falls back gracefully if scraping fails.
 */
export async function scrapeTeBriefing(): Promise<TeBriefingResult | null> {
  try {
    const res = await fetch(TE_CALENDAR_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.warn(`[te-scraper] Failed to fetch TE: ${res.status}`);
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Extract table rows with economic events
    const topEvents: string[] = [];
    $("table#calendar tbody tr").each((_, row) => {
      const importance = $(row).find("td.calendar-sentiment").attr("title") || "";
      if (importance.toLowerCase().includes("high") || importance.includes("3")) {
        const country = $(row).find("td.calendar-country").text().trim();
        const event = $(row).find("td.calendar-event").text().trim();
        if (event) {
          topEvents.push(`${country}: ${event}`);
        }
      }
    });

    // Extract any article/editorial content
    const articleText = $(".calendar-article, .te-article, article").text().trim();

    return {
      raw_html: html.slice(0, 50000), // Limit storage
      text_content: articleText || topEvents.join("\n"),
      top_events: topEvents.slice(0, 20),
    };
  } catch (error) {
    console.warn("[te-scraper] Scraping failed:", error);
    return null;
  }
}
```

- [ ] **Step 2: Verify build** (cheerio is already a project dependency)

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add lib/macro/te-scraper.ts
git commit -m "feat(macro): add TradingEconomics calendar scraper"
```

---

### Task 6: Central Bank Rates Fetcher

**Files:**
- Create: `lib/macro/rates-fetcher.ts`

- [ ] **Step 1: Implement rates data file**

Rates are maintained manually via periodic research (user runs a Claude session to
web-search current rates and update the JSON file). The cron job reads this file
and upserts to Supabase.

```typescript
// lib/macro/rates-fetcher.ts
import { CENTRAL_BANKS } from "./constants";
import type { CentralBankRate } from "./types";

/**
 * Central bank policy rates — manually maintained.
 *
 * HOW TO UPDATE: Ask Claude to research current CB rates and update this object.
 * Run a session with: "Pesquise as taxas de juros atuais dos 10 bancos centrais
 * e atualize lib/macro/rates-fetcher.ts"
 *
 * Last updated: 2026-03-19
 */
const POLICY_RATES: Record<string, {
  current_rate: number;
  last_action: "hold" | "cut" | "hike";
  last_change_bps: number;
  last_change_date: string;
  next_meeting: string | null;
}> = {
  FED:     { current_rate: 4.500, last_action: "hold",  last_change_bps: -25,  last_change_date: "2024-12-18", next_meeting: "2026-05-07" },
  ECB:     { current_rate: 2.650, last_action: "cut",   last_change_bps: -25,  last_change_date: "2025-03-06", next_meeting: "2026-04-17" },
  BOE:     { current_rate: 4.500, last_action: "cut",   last_change_bps: -25,  last_change_date: "2025-02-06", next_meeting: "2026-05-08" },
  BOJ:     { current_rate: 0.500, last_action: "hike",  last_change_bps: 25,   last_change_date: "2025-01-24", next_meeting: "2026-04-25" },
  BCB:     { current_rate: 14.250, last_action: "hike", last_change_bps: 100,  last_change_date: "2025-03-19", next_meeting: "2026-05-07" },
  BOC:     { current_rate: 2.750, last_action: "cut",   last_change_bps: -25,  last_change_date: "2025-03-12", next_meeting: "2026-04-16" },
  RBA:     { current_rate: 4.100, last_action: "cut",   last_change_bps: -25,  last_change_date: "2025-02-18", next_meeting: "2026-04-01" },
  PBOC:    { current_rate: 3.100, last_action: "cut",   last_change_bps: -25,  last_change_date: "2024-10-21", next_meeting: null },
  SNB:     { current_rate: 0.250, last_action: "cut",   last_change_bps: -25,  last_change_date: "2025-03-20", next_meeting: "2026-06-19" },
  BANXICO: { current_rate: 9.500, last_action: "cut",   last_change_bps: -50,  last_change_date: "2025-03-27", next_meeting: "2026-05-15" },
};

export async function fetchCentralBankRates(): Promise<Omit<CentralBankRate, "id">[]> {
  return CENTRAL_BANKS.map((cb) => {
    const data = POLICY_RATES[cb.code];
    if (!data) {
      return {
        bank_code: cb.code,
        bank_name: cb.name,
        country: cb.country,
        current_rate: 0,
        last_action: null,
        last_change_bps: null,
        last_change_date: null,
        next_meeting: null,
        updated_at: new Date().toISOString(),
      };
    }
    return {
      bank_code: cb.code,
      bank_name: cb.name,
      country: cb.country,
      current_rate: data.current_rate,
      last_action: data.last_action,
      last_change_bps: data.last_change_bps,
      last_change_date: data.last_change_date,
      next_meeting: data.next_meeting,
      updated_at: new Date().toISOString(),
    };
  });
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add lib/macro/rates-fetcher.ts
git commit -m "feat(macro): add central bank rates with manually maintained policy rates"
```

---

### Task 7: Claude Sonnet Narrative Generator

**Files:**
- Create: `lib/macro/narrative-generator.ts`

- [ ] **Step 1: Implement narrative generator**

```typescript
// lib/macro/narrative-generator.ts
import Anthropic from "@anthropic-ai/sdk";
import type { EconomicEvent, WeeklyPanorama, RegionalAnalysis, MarketImpact, DecisionIntelligence, Sentiment } from "./types";
import { TRACKED_MARKETS } from "./constants";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Você é um analista macroeconômico veterano com 50+ anos de experiência em mercados globais. Seu público são traders de forex/futuros no Brasil.

Responda SEMPRE em PT-BR. Seja direto, institucional, sem jargões desnecessários.

Formato de resposta: JSON válido com a estrutura exata solicitada. Não inclua markdown, apenas JSON puro.`;

interface NarrativeInput {
  events: EconomicEvent[];
  teBriefing: string | null;
  weekStart: string;
  weekEnd: string;
}

interface NarrativeOutput {
  narrative: string;
  regional_analysis: RegionalAnalysis;
  market_impacts: MarketImpact[];
  decision_intelligence: DecisionIntelligence;
  sentiment: Sentiment;
}

export async function generateWeeklyNarrative(input: NarrativeInput): Promise<NarrativeOutput> {
  const highEvents = input.events.filter((e) => e.impact === "high");
  const allMarkets = [
    ...TRACKED_MARKETS.forex,
    ...TRACKED_MARKETS.indices,
    ...TRACKED_MARKETS.commodities,
    ...TRACKED_MARKETS.crypto,
  ];

  const userPrompt = `Gere a análise semanal para ${input.weekStart} a ${input.weekEnd}.

EVENTOS DE ALTO IMPACTO DESTA SEMANA:
${highEvents.map((e) => `- ${e.date} ${e.time || "TBD"} | ${e.country} | ${e.title} | Prev: ${e.previous || "N/A"} | Forecast: ${e.forecast || "N/A"} | Actual: ${e.actual || "Pendente"}`).join("\n")}

TODOS OS EVENTOS (${input.events.length} total):
${input.events.map((e) => `- ${e.date} ${e.time || ""} | ${e.country} | ${e.title} [${e.impact}]`).join("\n")}

${input.teBriefing ? `CONTEXTO EDITORIAL (TradingEconomics):\n${input.teBriefing}\n` : ""}

MERCADOS COBERTOS: ${allMarkets.join(", ")}

Responda em JSON com esta estrutura exata:
{
  "narrative": "Texto de 3-5 parágrafos em PT-BR sobre a semana macro. Inclua os eventos mais impactantes, contexto histórico, e o que os traders devem observar.",
  "regional_analysis": {
    "americas": { "title": "Américas", "summary": "...", "key_events": ["evento1", "evento2"], "outlook": "bullish|neutral|bearish" },
    "europe": { "title": "Europa", "summary": "...", "key_events": ["evento1"], "outlook": "bullish|neutral|bearish" },
    "asia_pacific": { "title": "Ásia-Pacífico", "summary": "...", "key_events": ["evento1"], "outlook": "bullish|neutral|bearish" }
  },
  "market_impacts": [
    { "asset": "EUR/USD", "direction": "bullish|bearish|neutral", "conviction": 0-100, "rationale": "..." }
  ],
  "decision_intelligence": {
    "base_scenario": { "title": "...", "probability": 60, "description": "...", "key_drivers": ["driver1"] },
    "alt_scenario": { "title": "...", "probability": 40, "description": "...", "key_drivers": ["driver1"] },
    "conviction_map": [
      { "asset": "EUR/USD", "direction": "long|short|neutral", "conviction": 0-100 }
    ]
  },
  "sentiment": { "bullish_pct": 40, "neutral_pct": 35, "bearish_pct": 25 }
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON from response (strip any markdown fencing)
  const jsonStr = textBlock.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed: NarrativeOutput = JSON.parse(jsonStr);

  return parsed;
}

/**
 * Generate adaptive re-analysis when a HIGH impact event diverges from forecast.
 * Returns a short update narrative.
 */
export async function generateAdaptiveUpdate(
  event: EconomicEvent,
  existingNarrative: string
): Promise<{ update_text: string; alert_title: string }> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `EVENTO ATUALIZADO COM RESULTADO:
- ${event.country} | ${event.title}
- Forecast: ${event.forecast || "N/A"}
- Actual: ${event.actual}
- Previous: ${event.previous || "N/A"}

NARRATIVA EXISTENTE DA SEMANA:
${existingNarrative.slice(0, 2000)}

Gere um JSON com:
{
  "alert_title": "Título curto da atualização (max 80 chars)",
  "update_text": "Parágrafo de 2-3 frases explicando o impacto do resultado real vs esperado e o que muda para os traders."
}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const jsonStr = textBlock.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(jsonStr);
}
```

- [ ] **Step 2: Verify @anthropic-ai/sdk is installed**

Run: `npm ls @anthropic-ai/sdk` — if not found, `npm install @anthropic-ai/sdk`

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add lib/macro/narrative-generator.ts
git commit -m "feat(macro): add Claude Sonnet narrative generator for weekly briefings"
```

---

## Phase 3: Cron Jobs (API Routes)

### Task 8: Cron Authentication Helper + Vercel Config

**Files:**
- Create: `vercel.json`
- Create: `lib/macro/cron-auth.ts`

- [ ] **Step 1: Create cron auth helper**

```typescript
// lib/macro/cron-auth.ts
import { NextRequest } from "next/server";

/**
 * Verify cron requests come from Vercel or have the correct secret.
 * In production, Vercel sets the Authorization header automatically.
 * For manual triggers, check CRON_SECRET.
 */
export function verifyCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron-auth] CRON_SECRET not configured");
    return false;
  }

  // Vercel Cron sets Authorization header with CRON_SECRET
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}
```

- [ ] **Step 2: Create vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/calendar-sync",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/cron/rates-sync",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/weekly-briefing",
      "schedule": "0 23 * * 0"
    },
    {
      "path": "/api/cron/weekly-briefing",
      "schedule": "0 11 * * 1"
    }
  ]
}
```

Note: `weekly-briefing` runs twice — Sunday 23:00 UTC (20:00 BRT) for preview and Monday 11:00 UTC (08:00 BRT) for updated version with any weekend developments. `narrative-update` is triggered programmatically by `calendar-sync`, not scheduled.

- [ ] **Step 3: Add `CRON_SECRET` to .env.local**

Generate a random secret and add to `.env.local`:
```
CRON_SECRET=<random-32-char-hex>
```

- [ ] **Step 4: Commit**

```bash
git add vercel.json lib/macro/cron-auth.ts
git commit -m "feat(macro): add Vercel cron config and cron auth helper"
```

---

### Task 9: Calendar Sync Cron Job

**Files:**
- Create: `app/api/cron/calendar-sync/route.ts`

- [ ] **Step 1: Implement calendar sync**

```typescript
// app/api/cron/calendar-sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchFaireconomyCalendar } from "@/lib/macro/faireconomy";
import { verifyCronAuth } from "@/lib/macro/cron-auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const events = await fetchFaireconomyCalendar();

    // Upsert events (dedup by event_uid)
    let upserted = 0;
    let updated = 0;

    for (const event of events) {
      const { data: existing } = await supabaseAdmin
        .from("economic_events")
        .select("id, actual")
        .eq("event_uid", event.event_uid)
        .maybeSingle();

      if (existing) {
        // Check if actual value changed (for adaptive alerts)
        if (event.actual && event.actual !== existing.actual) {
          await supabaseAdmin
            .from("economic_events")
            .update({ actual: event.actual, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          updated++;

          // If HIGH impact and actual diverges from forecast, trigger narrative update
          if (event.impact === "high" && event.forecast && event.actual !== event.forecast) {
            await triggerNarrativeUpdate(existing.id, event);
          }
        }
      } else {
        const { error } = await supabaseAdmin.from("economic_events").insert(event);
        if (!error) upserted++;
      }
    }

    return NextResponse.json({
      ok: true,
      fetched: events.length,
      upserted,
      updated,
    });
  } catch (error) {
    console.error("[calendar-sync] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Also support GET for Vercel Cron (which sends GET requests)
export { POST as GET };

async function triggerNarrativeUpdate(eventId: string, event: Record<string, unknown>) {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    await fetch(`${baseUrl}/api/cron/narrative-update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ event_id: eventId }),
    });
  } catch (error) {
    console.warn("[calendar-sync] Failed to trigger narrative update:", error);
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/calendar-sync/route.ts
git commit -m "feat(macro): add calendar-sync cron job (ForexFactory via faireconomy)"
```

---

### Task 10: Weekly Briefing Cron Job

**Files:**
- Create: `app/api/cron/weekly-briefing/route.ts`

- [ ] **Step 1: Implement weekly briefing cron**

```typescript
// app/api/cron/weekly-briefing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { scrapeTeBriefing } from "@/lib/macro/te-scraper";
import { generateWeeklyNarrative } from "@/lib/macro/narrative-generator";
import { getWeekStart, getWeekEnd } from "@/lib/macro/constants";
import type { EconomicEvent } from "@/lib/macro/types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    // Check if panorama already exists and is frozen
    const { data: existing } = await supabaseAdmin
      .from("weekly_panoramas")
      .select("id, is_frozen")
      .eq("week_start", weekStart)
      .maybeSingle();

    if (existing?.is_frozen) {
      return NextResponse.json({ ok: true, message: "Week is frozen, skipping" });
    }

    // 1. Get events for this week
    const { data: events } = await supabaseAdmin
      .from("economic_events")
      .select("*")
      .eq("week_start", weekStart)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    // 2. Scrape TE briefing (optional context)
    const teBriefing = await scrapeTeBriefing();

    // 3. Generate narrative via Claude Sonnet
    const narrative = await generateWeeklyNarrative({
      events: (events || []) as EconomicEvent[],
      teBriefing: teBriefing?.text_content || null,
      weekStart,
      weekEnd,
    });

    // 4. Upsert panorama
    const panoramaData = {
      week_start: weekStart,
      week_end: weekEnd,
      te_briefing_raw: teBriefing?.text_content || null,
      narrative: narrative.narrative,
      regional_analysis: narrative.regional_analysis,
      market_impacts: narrative.market_impacts,
      decision_intelligence: narrative.decision_intelligence,
      sentiment: narrative.sentiment,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabaseAdmin
        .from("weekly_panoramas")
        .update(panoramaData)
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("weekly_panoramas").insert(panoramaData);
    }

    return NextResponse.json({
      ok: true,
      weekStart,
      eventsCount: events?.length || 0,
      hasTeBriefing: !!teBriefing,
    });
  } catch (error) {
    console.error("[weekly-briefing] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export { POST as GET };
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/weekly-briefing/route.ts
git commit -m "feat(macro): add weekly-briefing cron job with Claude Sonnet narrative"
```

---

### Task 11: Rates Sync Cron Job

**Files:**
- Create: `app/api/cron/rates-sync/route.ts`

- [ ] **Step 1: Implement rates sync**

```typescript
// app/api/cron/rates-sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { fetchCentralBankRates } from "@/lib/macro/rates-fetcher";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rates = await fetchCentralBankRates();

    let upserted = 0;
    for (const rate of rates) {
      const { error } = await supabaseAdmin
        .from("central_bank_rates")
        .upsert(rate, { onConflict: "bank_code" });
      if (!error) upserted++;
    }

    return NextResponse.json({ ok: true, upserted, total: rates.length });
  } catch (error) {
    console.error("[rates-sync] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export { POST as GET };
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/rates-sync/route.ts
git commit -m "feat(macro): add rates-sync cron job for central bank rates"
```

---

### Task 12: Narrative Update Cron Job

**Files:**
- Create: `app/api/cron/narrative-update/route.ts`

- [ ] **Step 1: Implement narrative update**

```typescript
// app/api/cron/narrative-update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { generateAdaptiveUpdate } from "@/lib/macro/narrative-generator";
import { getWeekStart } from "@/lib/macro/constants";
import type { EconomicEvent } from "@/lib/macro/types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const eventId = body.event_id;

    if (!eventId) {
      return NextResponse.json({ ok: false, error: "Missing event_id" }, { status: 400 });
    }

    // Get the event
    const { data: event } = await supabaseAdmin
      .from("economic_events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();

    if (!event) {
      return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
    }

    // Get current panorama
    const weekStart = getWeekStart();
    const { data: panorama } = await supabaseAdmin
      .from("weekly_panoramas")
      .select("*")
      .eq("week_start", weekStart)
      .maybeSingle();

    if (!panorama || panorama.is_frozen) {
      return NextResponse.json({ ok: true, message: "No panorama or frozen" });
    }

    // Generate adaptive update
    const update = await generateAdaptiveUpdate(
      event as EconomicEvent,
      panorama.narrative
    );

    // Create adaptive alert
    await supabaseAdmin.from("adaptive_alerts").insert({
      type: "breaking",
      title: update.alert_title,
      description: update.update_text,
      event_id: eventId,
      week_start: weekStart,
    });

    // Append update to narrative
    const updatedNarrative = `${panorama.narrative}\n\n---\n**Atualização (${new Date().toLocaleString("pt-BR")}):** ${update.update_text}`;
    await supabaseAdmin
      .from("weekly_panoramas")
      .update({ narrative: updatedNarrative, updated_at: new Date().toISOString() })
      .eq("id", panorama.id);

    return NextResponse.json({ ok: true, alert: update.alert_title });
  } catch (error) {
    console.error("[narrative-update] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/narrative-update/route.ts
git commit -m "feat(macro): add narrative-update cron for adaptive re-analysis"
```

---

## Phase 4: Public API Routes

### Task 13: Macro API Routes (all 6)

**Files:**
- Create: `app/api/macro/calendar/route.ts`
- Create: `app/api/macro/panorama/route.ts`
- Create: `app/api/macro/rates/route.ts`
- Create: `app/api/macro/alerts/route.ts`
- Create: `app/api/macro/history/route.ts`
- Create: `app/api/macro/compare/route.ts`

- [ ] **Step 1: Calendar API**

```typescript
// app/api/macro/calendar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getWeekStart } from "@/lib/macro/constants";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("week") || getWeekStart();

  const { data, error } = await supabase
    .from("economic_events")
    .select("*")
    .eq("week_start", weekStart)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data || [] });
}
```

- [ ] **Step 2: Panorama API**

```typescript
// app/api/macro/panorama/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getWeekStart } from "@/lib/macro/constants";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("week") || getWeekStart();

  const { data, error } = await supabase
    .from("weekly_panoramas")
    .select("*")
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
```

- [ ] **Step 3: Rates API**

```typescript
// app/api/macro/rates/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET() {
  const { data, error } = await supabase
    .from("central_bank_rates")
    .select("*")
    .order("bank_code", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data || [] });
}
```

- [ ] **Step 4: Alerts API**

```typescript
// app/api/macro/alerts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getWeekStart } from "@/lib/macro/constants";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("week") || getWeekStart();

  const { data, error } = await supabase
    .from("adaptive_alerts")
    .select("*")
    .eq("week_start", weekStart)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data || [] });
}
```

- [ ] **Step 5: History API**

```typescript
// app/api/macro/history/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET() {
  const { data, error } = await supabase
    .from("weekly_panoramas")
    .select("week_start, week_end, is_frozen, created_at")
    .order("week_start", { ascending: false })
    .limit(12);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data || [] });
}
```

- [ ] **Step 6: Compare API**

```typescript
// app/api/macro/compare/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weekA = searchParams.get("weekA");
  const weekB = searchParams.get("weekB");

  if (!weekA || !weekB) {
    return NextResponse.json({ ok: false, error: "Missing weekA or weekB" }, { status: 400 });
  }

  const [panoramaA, panoramaB, eventsA, eventsB] = await Promise.all([
    supabase.from("weekly_panoramas").select("*").eq("week_start", weekA).maybeSingle(),
    supabase.from("weekly_panoramas").select("*").eq("week_start", weekB).maybeSingle(),
    supabase.from("economic_events").select("*").eq("week_start", weekA).order("date"),
    supabase.from("economic_events").select("*").eq("week_start", weekB).order("date"),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      weekA: { panorama: panoramaA.data, events: eventsA.data || [] },
      weekB: { panorama: panoramaB.data, events: eventsB.data || [] },
    },
  });
}
```

- [ ] **Step 7: Verify build**

Run: `npm run build`

- [ ] **Step 8: Commit**

```bash
git add app/api/macro/
git commit -m "feat(macro): add 6 public API routes for macro intelligence data"
```

---

## Phase 5: Frontend Components

### Task 14: Utility Components (LiveIndicator + SentimentBar)

**Files:**
- Create: `components/macro/LiveIndicator.tsx`
- Create: `components/macro/SentimentBar.tsx`

- [ ] **Step 1: Create LiveIndicator**

```typescript
// components/macro/LiveIndicator.tsx
"use client";

export function LiveIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      Ao vivo
    </span>
  );
}
```

- [ ] **Step 2: Create SentimentBar**

```typescript
// components/macro/SentimentBar.tsx
"use client";

import type { Sentiment } from "@/lib/macro/types";

interface SentimentBarProps {
  sentiment: Sentiment | null;
}

export function SentimentBar({ sentiment }: SentimentBarProps) {
  if (!sentiment) return null;

  const { bullish_pct, neutral_pct, bearish_pct } = sentiment;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Bullish {bullish_pct}%</span>
        <span>Neutro {neutral_pct}%</span>
        <span>Bearish {bearish_pct}%</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full">
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${bullish_pct}%` }}
        />
        <div
          className="bg-gray-400 transition-all"
          style={{ width: `${neutral_pct}%` }}
        />
        <div
          className="bg-red-500 transition-all"
          style={{ width: `${bearish_pct}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/macro/LiveIndicator.tsx components/macro/SentimentBar.tsx
git commit -m "feat(macro): add LiveIndicator and SentimentBar utility components"
```

---

### Task 15: Adaptive Alerts Component

**Files:**
- Create: `components/macro/AdaptiveAlerts.tsx`

- [ ] **Step 1: Implement component**

```typescript
// components/macro/AdaptiveAlerts.tsx
"use client";

import { AlertTriangle, TrendingUp, Clock } from "lucide-react";
import type { AdaptiveAlert } from "@/lib/macro/types";

interface AdaptiveAlertsProps {
  alerts: AdaptiveAlert[];
}

const ALERT_CONFIG = {
  breaking: {
    icon: AlertTriangle,
    bg: "bg-red-500/10 border-red-500/20",
    text: "text-red-500",
    label: "BREAKING",
  },
  update: {
    icon: TrendingUp,
    bg: "bg-orange-500/10 border-orange-500/20",
    text: "text-orange-500",
    label: "ATUALIZAÇÃO",
  },
  upcoming: {
    icon: Clock,
    bg: "bg-blue-500/10 border-blue-500/20",
    text: "text-blue-500",
    label: "EM BREVE",
  },
} as const;

export function AdaptiveAlerts({ alerts }: AdaptiveAlertsProps) {
  if (!alerts.length) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const config = ALERT_CONFIG[alert.type];
        const Icon = config.icon;
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 rounded-[16px] border p-4 ${config.bg}`}
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.text}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${config.text}`}>
                  {config.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(alert.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium">{alert.title}</p>
              {alert.description && (
                <p className="mt-1 text-xs text-muted-foreground">{alert.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/macro/AdaptiveAlerts.tsx
git commit -m "feat(macro): add AdaptiveAlerts component"
```

---

### Task 16: Economic Calendar Component

**Files:**
- Create: `components/macro/EconomicCalendar.tsx`

- [ ] **Step 1: Implement calendar**

```typescript
// components/macro/EconomicCalendar.tsx
"use client";

import { useState } from "react";
import { IMPACT_COLORS, COUNTRY_FLAGS } from "@/lib/macro/constants";
import type { EconomicEvent } from "@/lib/macro/types";

interface EconomicCalendarProps {
  events: EconomicEvent[];
}

type ImpactFilter = "all" | "high" | "medium" | "low";

export function EconomicCalendar({ events }: EconomicCalendarProps) {
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>("all");

  const filtered = impactFilter === "all"
    ? events
    : events.filter((e) => e.impact === impactFilter);

  // Group by date
  const grouped = filtered.reduce<Record<string, EconomicEvent[]>>((acc, event) => {
    const key = event.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-4">
      {/* Impact filter */}
      <div className="flex gap-2">
        {(["all", "high", "medium", "low"] as ImpactFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setImpactFilter(filter)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              impactFilter === filter
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {filter === "all" ? "Todos" : filter === "high" ? "Alto" : filter === "medium" ? "Médio" : "Baixo"}
          </button>
        ))}
      </div>

      {/* Events by day */}
      {Object.entries(grouped).map(([date, dayEvents]) => (
        <div key={date}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {formatDate(date)}
          </h4>
          <div className="space-y-1">
            {dayEvents.map((event) => {
              const colors = IMPACT_COLORS[event.impact];
              const flag = COUNTRY_FLAGS[event.country] || event.country;
              const hasActual = event.actual !== null && event.actual !== "";

              return (
                <div
                  key={event.id}
                  className={`flex items-center gap-3 rounded-[12px] px-3 py-2 transition-colors ${
                    hasActual ? "bg-blue-500/5" : ""
                  }`}
                  style={{ backgroundColor: hasActual ? undefined : "hsl(var(--card))" }}
                >
                  {/* Time */}
                  <span className="w-12 shrink-0 text-xs text-muted-foreground">
                    {event.time || "—"}
                  </span>

                  {/* Impact dot */}
                  <span className={`h-2 w-2 shrink-0 rounded-full ${colors.dot}`} />

                  {/* Flag + Title */}
                  <span className="text-sm">{flag}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {event.title}
                  </span>

                  {/* Values */}
                  <div className="flex shrink-0 gap-4 text-xs">
                    <div className="text-center">
                      <div className="text-muted-foreground">Prev</div>
                      <div>{event.previous || "—"}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">Forecast</div>
                      <div>{event.forecast || "—"}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">Actual</div>
                      <div className={hasActual ? "font-semibold text-foreground" : ""}>
                        {event.actual || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum evento encontrado para este filtro.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/macro/EconomicCalendar.tsx
git commit -m "feat(macro): add EconomicCalendar component with impact filter"
```

---

### Task 17: Weekly Briefing Component

**Files:**
- Create: `components/macro/WeeklyBriefing.tsx`

- [ ] **Step 1: Implement briefing component**

```typescript
// components/macro/WeeklyBriefing.tsx
"use client";

import { LiveIndicator } from "./LiveIndicator";
import { SentimentBar } from "./SentimentBar";
import type { WeeklyPanorama } from "@/lib/macro/types";

interface WeeklyBriefingProps {
  panorama: WeeklyPanorama | null;
}

export function WeeklyBriefing({ panorama }: WeeklyBriefingProps) {
  if (!panorama) {
    return (
      <div className="rounded-[22px] p-6" style={{ backgroundColor: "hsl(var(--card))" }}>
        <p className="text-sm text-muted-foreground">
          Narrativa semanal ainda não disponível. Será gerada automaticamente.
        </p>
      </div>
    );
  }

  const updatedAt = new Date(panorama.updated_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4 rounded-[22px] p-6" style={{ backgroundColor: "hsl(var(--card))" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold tracking-tight">Panorama Semanal</h3>
          {!panorama.is_frozen && <LiveIndicator />}
        </div>
        <span className="text-xs text-muted-foreground">Atualizado: {updatedAt}</span>
      </div>

      {/* Sentiment bar */}
      <SentimentBar sentiment={panorama.sentiment} />

      {/* Narrative text */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {panorama.narrative.split("\n").map((paragraph, i) => {
          if (paragraph.startsWith("---")) {
            return <hr key={i} className="my-4 border-border" />;
          }
          if (paragraph.startsWith("**")) {
            return (
              <p key={i} className="text-sm leading-relaxed">
                <strong dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*/g, "") }} />
              </p>
            );
          }
          return paragraph.trim() ? (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ) : null;
        })}
      </div>

      {/* Source tag */}
      <div className="flex items-center gap-2 border-t border-border pt-3">
        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-500">
          Claude Sonnet
        </span>
        {panorama.te_briefing_raw && (
          <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            TradingEconomics
          </span>
        )}
        <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-[10px] font-medium text-gray-500">
          ForexFactory
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/macro/WeeklyBriefing.tsx
git commit -m "feat(macro): add WeeklyBriefing component with narrative display"
```

---

### Task 18: Regional Analysis Component

**Files:**
- Create: `components/macro/RegionalAnalysis.tsx`

- [ ] **Step 1: Implement component**

```typescript
// components/macro/RegionalAnalysis.tsx
"use client";

import { Globe, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { RegionalAnalysis as RegionalAnalysisType } from "@/lib/macro/types";

interface RegionalAnalysisProps {
  data: RegionalAnalysisType | null;
}

const OUTLOOK_CONFIG = {
  bullish: { icon: TrendingUp, color: "text-emerald-500", label: "Bullish" },
  neutral: { icon: Minus, color: "text-gray-400", label: "Neutro" },
  bearish: { icon: TrendingDown, color: "text-red-500", label: "Bearish" },
} as const;

const REGION_EMOJI: Record<string, string> = {
  americas: "🌎",
  europe: "🌍",
  asia_pacific: "🌏",
};

export function RegionalAnalysis({ data }: RegionalAnalysisProps) {
  if (!data) return null;

  const regions = [
    { key: "americas" as const, data: data.americas },
    { key: "europe" as const, data: data.europe },
    { key: "asia_pacific" as const, data: data.asia_pacific },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {regions.map(({ key, data: region }) => {
        const outlook = OUTLOOK_CONFIG[region.outlook];
        const OutlookIcon = outlook.icon;

        return (
          <div
            key={key}
            className="rounded-[22px] p-5"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <span>{REGION_EMOJI[key]}</span>
                {region.title}
              </h4>
              <span className={`flex items-center gap-1 text-xs font-medium ${outlook.color}`}>
                <OutlookIcon className="h-3.5 w-3.5" />
                {outlook.label}
              </span>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              {region.summary}
            </p>
            <ul className="space-y-1">
              {region.key_events.map((event, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                  {event}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/macro/RegionalAnalysis.tsx
git commit -m "feat(macro): add RegionalAnalysis component with 3-region grid"
```

---

### Task 19: Decision Intelligence Component

**Files:**
- Create: `components/macro/DecisionIntelligence.tsx`

- [ ] **Step 1: Implement component**

```typescript
// components/macro/DecisionIntelligence.tsx
"use client";

import type { DecisionIntelligence as DecisionIntelligenceType } from "@/lib/macro/types";

interface DecisionIntelligenceProps {
  data: DecisionIntelligenceType | null;
}

export function DecisionIntelligence({ data }: DecisionIntelligenceProps) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Scenarios */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Base scenario */}
        <div className="rounded-[22px] p-5" style={{ backgroundColor: "hsl(var(--card))" }}>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Cenário Base</h4>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
              {data.base_scenario.probability}%
            </span>
          </div>
          <p className="mb-2 text-sm font-medium">{data.base_scenario.title}</p>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            {data.base_scenario.description}
          </p>
          <div className="space-y-1">
            {data.base_scenario.key_drivers.map((driver, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                {driver}
              </div>
            ))}
          </div>
        </div>

        {/* Alt scenario */}
        <div className="rounded-[22px] p-5" style={{ backgroundColor: "hsl(var(--card))" }}>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Cenário Alternativo</h4>
            <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-500">
              {data.alt_scenario.probability}%
            </span>
          </div>
          <p className="mb-2 text-sm font-medium">{data.alt_scenario.title}</p>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            {data.alt_scenario.description}
          </p>
          <div className="space-y-1">
            {data.alt_scenario.key_drivers.map((driver, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-orange-500" />
                {driver}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conviction Map */}
      <div className="rounded-[22px] p-5" style={{ backgroundColor: "hsl(var(--card))" }}>
        <h4 className="mb-4 text-sm font-semibold">Mapa de Convicção</h4>
        <div className="space-y-3">
          {data.conviction_map.map((entry) => {
            const barColor =
              entry.direction === "long"
                ? "bg-emerald-500"
                : entry.direction === "short"
                  ? "bg-red-500"
                  : "bg-gray-400";
            const dirLabel =
              entry.direction === "long" ? "LONG" : entry.direction === "short" ? "SHORT" : "NEUTRO";

            return (
              <div key={entry.asset} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs font-medium">{entry.asset}</span>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${entry.conviction}%` }}
                    />
                  </div>
                </div>
                <span className="w-16 shrink-0 text-right text-xs font-medium">
                  {dirLabel} {entry.conviction}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/macro/DecisionIntelligence.tsx
git commit -m "feat(macro): add DecisionIntelligence component with scenarios and conviction map"
```

---

### Task 20: Interest Rates Panel Component

**Files:**
- Create: `components/macro/InterestRatesPanel.tsx`

- [ ] **Step 1: Implement component**

```typescript
// components/macro/InterestRatesPanel.tsx
"use client";

import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { COUNTRY_FLAGS } from "@/lib/macro/constants";
import type { CentralBankRate } from "@/lib/macro/types";

interface InterestRatesPanelProps {
  rates: CentralBankRate[];
}

const ACTION_CONFIG = {
  hike: { icon: ArrowUp, color: "text-red-500", label: "Alta" },
  cut: { icon: ArrowDown, color: "text-emerald-500", label: "Corte" },
  hold: { icon: Minus, color: "text-gray-400", label: "Manteve" },
} as const;

export function InterestRatesPanel({ rates }: InterestRatesPanelProps) {
  if (!rates.length) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Dados de taxas de juros indisponíveis.
      </p>
    );
  }

  // Find most recent update timestamp across all rates
  const lastUpdated = rates.reduce((latest, rate) => {
    const t = new Date(rate.updated_at).getTime();
    return t > latest ? t : latest;
  }, 0);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {rates.map((rate) => {
          const flag = COUNTRY_FLAGS[rate.country] || rate.country;
          const action = rate.last_action ? ACTION_CONFIG[rate.last_action] : null;
          const ActionIcon = action?.icon || Minus;

          return (
            <div
              key={rate.bank_code}
              className="rounded-[16px] p-4"
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{flag} {rate.bank_code}</span>
                {action && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-medium ${action.color}`}>
                    <ActionIcon className="h-3 w-3" />
                    {action.label}
                  </span>
                )}
              </div>
              <div className="text-xl font-bold tracking-tight">{rate.current_rate.toFixed(2)}%</div>
              <div className="mt-1 text-[10px] text-muted-foreground">{rate.bank_name}</div>
              {rate.next_meeting && (
                <div className="mt-2 text-[10px] text-muted-foreground">
                  Próx: {new Date(rate.next_meeting + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Last updated timestamp */}
      <p className="text-right text-[10px] text-muted-foreground">
        Última atualização: {new Date(lastUpdated).toLocaleString("pt-BR", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/macro/InterestRatesPanel.tsx
git commit -m "feat(macro): add InterestRatesPanel component with 10 CB grid"
```

---

### Task 21: Weekly History Component

**Files:**
- Create: `components/macro/WeeklyHistory.tsx`

- [ ] **Step 1: Implement component**

```typescript
// components/macro/WeeklyHistory.tsx
"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SentimentBar } from "./SentimentBar";
import type { WeeklyPanorama, EconomicEvent } from "@/lib/macro/types";

interface WeeklyHistoryProps {
  weeks: { week_start: string; week_end: string }[];
  currentWeek: string;
}

interface CompareData {
  weekA: { panorama: WeeklyPanorama | null; events: EconomicEvent[] };
  weekB: { panorama: WeeklyPanorama | null; events: EconomicEvent[] };
}

export function WeeklyHistory({ weeks, currentWeek }: WeeklyHistoryProps) {
  const [compareWeek, setCompareWeek] = useState<string | null>(null);
  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);

  const currentIndex = weeks.findIndex((w) => w.week_start === currentWeek);

  useEffect(() => {
    if (!compareWeek) {
      setCompareData(null);
      return;
    }

    setLoading(true);
    fetch(`/api/macro/compare?weekA=${currentWeek}&weekB=${compareWeek}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) setCompareData(json.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [compareWeek, currentWeek]);

  const formatWeek = (weekStart: string) => {
    const d = new Date(weekStart + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  if (weeks.length < 2) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Histórico disponível após a segunda semana.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Comparar com:</span>
        <div className="flex gap-2 overflow-x-auto">
          {weeks
            .filter((w) => w.week_start !== currentWeek)
            .slice(0, 8)
            .map((week) => (
              <button
                key={week.week_start}
                onClick={() =>
                  setCompareWeek(compareWeek === week.week_start ? null : week.week_start)
                }
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  compareWeek === week.week_start
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {formatWeek(week.week_start)}
              </button>
            ))}
        </div>
      </div>

      {/* Comparison view */}
      {loading && <p className="text-sm text-muted-foreground">Carregando comparação...</p>}

      {compareData && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Current week */}
          <div className="rounded-[22px] p-5" style={{ backgroundColor: "hsl(var(--card))" }}>
            <h4 className="mb-3 text-sm font-semibold">
              Semana atual ({formatWeek(currentWeek)})
            </h4>
            <SentimentBar sentiment={compareData.weekA.panorama?.sentiment || null} />
            <p className="mt-3 text-xs text-muted-foreground">
              {compareData.weekA.events.length} eventos |{" "}
              {compareData.weekA.events.filter((e) => e.impact === "high").length} alto impacto
            </p>
          </div>

          {/* Compare week */}
          <div className="rounded-[22px] p-5" style={{ backgroundColor: "hsl(var(--card))" }}>
            <h4 className="mb-3 text-sm font-semibold">
              Semana {formatWeek(compareWeek!)}
            </h4>
            <SentimentBar sentiment={compareData.weekB.panorama?.sentiment || null} />
            <p className="mt-3 text-xs text-muted-foreground">
              {compareData.weekB.events.length} eventos |{" "}
              {compareData.weekB.events.filter((e) => e.impact === "high").length} alto impacto
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/macro/WeeklyHistory.tsx
git commit -m "feat(macro): add WeeklyHistory component with week comparison"
```

---

## Phase 6: Main Page + Dashboard Widgets

### Task 22: Main Macro Intelligence Page

**Files:**
- Create: `app/app/macro/page.tsx`

- [ ] **Step 1: Read `app/app/ai-coach/page.tsx`** for PaywallGate integration pattern reference.

- [ ] **Step 2: Implement main page**

```typescript
// app/app/macro/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaywallGate } from "@/components/billing/PaywallGate";
import { useSubscription } from "@/components/context/SubscriptionContext";
import { LiveIndicator } from "@/components/macro/LiveIndicator";
import { AdaptiveAlerts } from "@/components/macro/AdaptiveAlerts";
import { EconomicCalendar } from "@/components/macro/EconomicCalendar";
import { WeeklyBriefing } from "@/components/macro/WeeklyBriefing";
import { RegionalAnalysis } from "@/components/macro/RegionalAnalysis";
import { DecisionIntelligence } from "@/components/macro/DecisionIntelligence";
import { InterestRatesPanel } from "@/components/macro/InterestRatesPanel";
import { WeeklyHistory } from "@/components/macro/WeeklyHistory";
import { getWeekStart } from "@/lib/macro/constants";
import type { EconomicEvent, WeeklyPanorama, CentralBankRate, AdaptiveAlert as AdaptiveAlertType } from "@/lib/macro/types";

export default function MacroIntelligencePage() {
  const { plan } = useSubscription();

  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [panorama, setPanorama] = useState<WeeklyPanorama | null>(null);
  const [rates, setRates] = useState<CentralBankRate[]>([]);
  const [alerts, setAlerts] = useState<AdaptiveAlertType[]>([]);
  const [weeks, setWeeks] = useState<{ week_start: string; week_end: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const weekStart = getWeekStart();

  const fetchData = useCallback(async () => {
    try {
      const [calRes, panRes, ratesRes, alertsRes, histRes] = await Promise.all([
        fetch(`/api/macro/calendar?week=${weekStart}`),
        fetch(`/api/macro/panorama?week=${weekStart}`),
        fetch("/api/macro/rates"),
        fetch(`/api/macro/alerts?week=${weekStart}`),
        fetch("/api/macro/history"),
      ]);

      const [calJson, panJson, ratesJson, alertsJson, histJson] = await Promise.all([
        calRes.json(),
        panRes.json(),
        ratesRes.json(),
        alertsRes.json(),
        histRes.json(),
      ]);

      if (calJson.ok) setEvents(calJson.data);
      if (panJson.ok) setPanorama(panJson.data);
      if (ratesJson.ok) setRates(ratesJson.data);
      if (alertsJson.ok) setAlerts(alertsJson.data);
      if (histJson.ok) setWeeks(histJson.data);
    } catch (error) {
      console.error("[macro] Failed to fetch data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-[22px]"
              style={{ backgroundColor: "hsl(var(--card))" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-semibold tracking-tight">Inteligência Macro</h1>
            <LiveIndicator />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Calendário econômico, narrativas AI e intelligence para traders
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="space-y-8">
        {/* Adaptive Alerts — FREE (simplified for free, with AI analysis for Pro) */}
        {alerts.length > 0 && <AdaptiveAlerts alerts={alerts} />}

        {/* Economic Calendar — FREE */}
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Calendário Econômico</h2>
          <EconomicCalendar events={events} />
        </section>

        {/* Weekly Briefing — PRO */}
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Panorama Semanal AI</h2>
          <PaywallGate requiredPlan="pro" blurContent>
            <WeeklyBriefing panorama={panorama} />
          </PaywallGate>
        </section>

        {/* Regional Analysis — PRO */}
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Análise Regional</h2>
          <PaywallGate requiredPlan="pro" blurContent>
            <RegionalAnalysis data={panorama?.regional_analysis || null} />
          </PaywallGate>
        </section>

        {/* Decision Intelligence — PRO */}
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Inteligência de Decisão</h2>
          <PaywallGate requiredPlan="pro" blurContent>
            <DecisionIntelligence data={panorama?.decision_intelligence || null} />
          </PaywallGate>
        </section>

        {/* Interest Rates — PRO */}
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Taxas de Juros (Bancos Centrais)</h2>
          <PaywallGate requiredPlan="pro" blurContent>
            <InterestRatesPanel rates={rates} />
          </PaywallGate>
        </section>

        {/* Weekly History — PRO */}
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Histórico Semanal</h2>
          <PaywallGate requiredPlan="pro" blurContent>
            <WeeklyHistory weeks={weeks} currentWeek={weekStart} />
          </PaywallGate>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add app/app/macro/page.tsx
git commit -m "feat(macro): add main Inteligência Macro page with paywall gating"
```

---

### Task 23: Dashboard Widgets

**Files:**
- Create: `components/macro/MacroWidgetBriefing.tsx`
- Create: `components/macro/MacroWidgetEvents.tsx`

- [ ] **Step 1: Create briefing widget**

```typescript
// components/macro/MacroWidgetBriefing.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe } from "lucide-react";
import { SentimentBar } from "./SentimentBar";
import { LiveIndicator } from "./LiveIndicator";
import { getWeekStart } from "@/lib/macro/constants";
import type { WeeklyPanorama } from "@/lib/macro/types";

export function MacroWidgetBriefing() {
  const [panorama, setPanorama] = useState<WeeklyPanorama | null>(null);

  useEffect(() => {
    const weekStart = getWeekStart();
    fetch(`/api/macro/panorama?week=${weekStart}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok && json.data) setPanorama(json.data);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium">Macro</span>
        <LiveIndicator />
      </div>

      {panorama ? (
        <>
          <SentimentBar sentiment={panorama.sentiment} />
          <p className="line-clamp-3 text-xs text-muted-foreground">
            {panorama.narrative.slice(0, 200)}...
          </p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Panorama semanal indisponível.</p>
      )}

      <Link
        href="/app/macro"
        className="inline-block text-xs font-medium text-blue-500 hover:underline"
      >
        Ver análise completa →
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Create events widget**

```typescript
// components/macro/MacroWidgetEvents.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IMPACT_COLORS, COUNTRY_FLAGS, getWeekStart } from "@/lib/macro/constants";
import type { EconomicEvent } from "@/lib/macro/types";

export function MacroWidgetEvents() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);

  useEffect(() => {
    const weekStart = getWeekStart();
    fetch(`/api/macro/calendar?week=${weekStart}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok && json.data) {
          // Show only upcoming HIGH impact events
          const now = new Date();
          const highEvents = json.data
            .filter((e: EconomicEvent) => e.impact === "high")
            .filter((e: EconomicEvent) => new Date(e.date + "T" + (e.time || "23:59")) >= now)
            .slice(0, 5);
          setEvents(highEvents);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-3">
      {events.length > 0 ? (
        <div className="space-y-2">
          {events.map((event) => {
            const flag = COUNTRY_FLAGS[event.country] || event.country;
            return (
              <div key={event.id} className="flex items-center gap-2 text-xs">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${IMPACT_COLORS.high.dot}`} />
                <span>{flag}</span>
                <span className="min-w-0 flex-1 truncate">{event.title}</span>
                <span className="shrink-0 text-muted-foreground">{event.time || "TBD"}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sem eventos de alto impacto pendentes.</p>
      )}

      <Link
        href="/app/macro"
        className="inline-block text-xs font-medium text-blue-500 hover:underline"
      >
        Ver calendário completo →
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/macro/MacroWidgetBriefing.tsx components/macro/MacroWidgetEvents.tsx
git commit -m "feat(macro): add MacroWidgetBriefing and MacroWidgetEvents dashboard widgets"
```

---

## Phase 7: Integration + Cleanup

### Task 24: Update Navigation (AppHeader)

**Files:**
- Modify: `components/layout/AppHeader.tsx`

- [ ] **Step 1: Read AppHeader.tsx**

- [ ] **Step 2: Change the nav link**

Replace `{ href: "/app/news", label: "News" }` with `{ href: "/app/macro", label: "Macro" }`.

- [ ] **Step 3: Commit**

```bash
git add components/layout/AppHeader.tsx
git commit -m "feat(macro): update navigation from News to Macro"
```

---

### Task 25: Replace Dashboard News Widget

**Files:**
- Modify: `app/app/page.tsx`

- [ ] **Step 1: Read `app/app/page.tsx`** to find the News widget section.

- [ ] **Step 2: Replace News widget** with MacroWidgetBriefing and MacroWidgetEvents.

Find the News widget `<Card>` in the dashboard and replace it with two new cards:

```typescript
// Import at top:
import { MacroWidgetBriefing } from "@/components/macro/MacroWidgetBriefing";
import { MacroWidgetEvents } from "@/components/macro/MacroWidgetEvents";

// Replace the News card with:
<Card className="rounded-[22px] shadow-soft dark:shadow-soft-dark" style={{ backgroundColor: "hsl(var(--card))" }}>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-base font-medium">Macro</CardTitle>
    <Button variant="ghost" size="sm" className="text-muted-foreground -mr-2" asChild>
      <Link href="/app/macro">Ver tudo</Link>
    </Button>
  </CardHeader>
  <CardContent>
    <MacroWidgetBriefing />
  </CardContent>
</Card>

<Card className="rounded-[22px] shadow-soft dark:shadow-soft-dark" style={{ backgroundColor: "hsl(var(--card))" }}>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-base font-medium">Próximos Eventos</CardTitle>
    <Button variant="ghost" size="sm" className="text-muted-foreground -mr-2" asChild>
      <Link href="/app/macro">Calendário</Link>
    </Button>
  </CardHeader>
  <CardContent>
    <MacroWidgetEvents />
  </CardContent>
</Card>
```

- [ ] **Step 3: Remove old News imports and component code** (the inline NewsWidget function if it exists).

- [ ] **Step 4: Verify build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add app/app/page.tsx
git commit -m "feat(macro): replace dashboard News widget with Macro widgets"
```

---

### Task 26: Delete Old News Files

**Files:**
- Delete: `app/api/news/route.ts`
- Delete: `app/app/news/page.tsx`

- [ ] **Step 1: Verify no other files import from these paths**

Search for imports of `@/app/api/news` or `@/app/app/news` or links to `/app/news` (besides what we already updated).

- [ ] **Step 2: Delete old files**

```bash
rm app/api/news/route.ts
rm app/app/news/page.tsx
# Remove empty directories if needed
rmdir app/api/news 2>/dev/null || true
rmdir app/app/news 2>/dev/null || true
```

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old News system (replaced by Macro Intelligence)"
```

---

### Task 27: Update Landing Page Navigation (if applicable)

**Files:**
- Check: `lib/landing-data.ts` or `components/landing/Navbar.tsx`

- [ ] **Step 1: Search for any landing page references to "News" or "/app/news"**

If the landing page navbar has links to `/app/news` for logged-in users, update them to `/app/macro`.

- [ ] **Step 2: Commit (if changes needed)**

```bash
git add components/landing/Navbar.tsx lib/landing-data.ts
git commit -m "feat(macro): update landing navbar links from News to Macro"
```

---

## Phase 8: Verification

### Task 28: Build + Visual Verification

- [ ] **Step 1: Full build check**

Run: `npm run build` — must pass with zero errors.

- [ ] **Step 2: Start dev server**

Run: `npm run dev`

- [ ] **Step 3: Navigate to /app/macro**

Use Playwright to navigate and take a screenshot:
- Verify page loads without errors
- Verify calendar section renders (even if empty)
- Verify Pro sections show blur/paywall for free users
- Verify navigation shows "Macro" instead of "News"

- [ ] **Step 4: Check dashboard**

Navigate to `/app` and verify:
- MacroWidgetBriefing renders
- MacroWidgetEvents renders
- No references to old News widget

- [ ] **Step 5: Test cron endpoints manually**

```bash
# Trigger calendar sync
curl -X POST http://localhost:3000/api/cron/calendar-sync \
  -H "Authorization: Bearer $CRON_SECRET"

# Trigger rates sync
curl -X POST http://localhost:3000/api/cron/rates-sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

Verify data appears in `/app/macro` after cron runs.

- [ ] **Step 6: Commit any final fixes**

- [ ] **Step 7: Push to deploy**

```bash
git push origin main
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-3 | Foundation: types, constants, migration SQL, tier limits |
| 2 | 4-7 | Data fetching: faireconomy, TE scraper, rates, Claude narrative |
| 3 | 8-12 | Cron jobs: auth, calendar-sync, weekly-briefing, rates-sync, narrative-update |
| 4 | 13 | API routes: 6 public GET endpoints |
| 5 | 14-21 | Frontend: 10 components |
| 6 | 22-23 | Main page + dashboard widgets |
| 7 | 24-27 | Integration: nav, widget replacement, cleanup |
| 8 | 28 | Verification: build, visual, cron test |

**Total: 28 tasks, ~80 steps**
**New files: ~30**
**Modified files: ~4**
**Deleted files: ~2**
