# AI Coach Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-powered trading coach page that streams analysis from Claude Haiku 4.5, combining personal trade stats, macro context, and community intelligence from profitable traders.

**Architecture:** Dedicated page `/app/ai-coach` with streaming SSE responses from `POST /api/ai/coach`. Four data sources feed the system prompt: personal trade aggregation, news headlines, cross-platform profitable trader sentiment (service role), and historical pattern matching. Usage tracked in `ai_usage` table with optimistic increment.

**Tech Stack:** Anthropic SDK (`@anthropic-ai/sdk`), react-markdown + remark-gfm, Framer Motion, Next.js App Router SSE streaming, Supabase RPC

**Spec:** `docs/superpowers/specs/2026-03-17-ai-coach-design.md`

---

## Chunk 1: Infrastructure & Database

### Task 1: SQL Migration — `ai_usage` table + RPC functions

**Files:**
- Create: `supabase/migrations/20260317_ai_usage.sql`

- [ ] **Step 1: Create migration file**

```sql
-- AI Coach usage tracking
CREATE TABLE ai_usage (
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  month TEXT NOT NULL,
  usage_count INT DEFAULT 0,
  daily_count INT DEFAULT 0,
  daily_date DATE DEFAULT CURRENT_DATE,
  last_used_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, month)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON ai_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON ai_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON ai_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Atomic increment with daily reset logic
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID, p_month TEXT)
RETURNS TABLE(new_usage_count INT, new_daily_count INT) AS $$
BEGIN
  INSERT INTO ai_usage (user_id, month, usage_count, daily_count, daily_date, last_used_at)
  VALUES (p_user_id, p_month, 1, 1, CURRENT_DATE, now())
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    usage_count = ai_usage.usage_count + 1,
    daily_count = CASE
      WHEN ai_usage.daily_date = CURRENT_DATE THEN ai_usage.daily_count + 1
      ELSE 1
    END,
    daily_date = CURRENT_DATE,
    last_used_at = now();

  RETURN QUERY
    SELECT a.usage_count, a.daily_count
    FROM ai_usage a
    WHERE a.user_id = p_user_id AND a.month = p_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rollback on API failure
CREATE OR REPLACE FUNCTION decrement_ai_usage(p_user_id UUID, p_month TEXT)
RETURNS void AS $$
BEGIN
  UPDATE ai_usage
  SET usage_count = GREATEST(0, usage_count - 1),
      daily_count = GREATEST(0, daily_count - 1)
  WHERE user_id = p_user_id AND month = p_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260317_ai_usage.sql
git commit -m "feat(ai-coach): add ai_usage table migration with RPC functions"
```

**Note:** User must run this SQL manually in Supabase Dashboard SQL Editor before testing the API route.

---

### Task 2: Service Role Client

**Files:**
- Create: `lib/supabase/service.ts`

- [ ] **Step 1: Create service role client utility**

This follows the same pattern as `lib/supabase/server.ts` but uses the service role key instead of user JWT. This is server-only code — never import from client components.

```typescript
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./env";

/**
 * Create a Supabase client with service_role key.
 * SERVER-ONLY — never import from "use client" modules.
 * Used for cross-user aggregate queries (e.g., community intelligence).
 */
export function createServiceRoleClient() {
  const { url } = getSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase/service.ts
git commit -m "feat(ai-coach): add service role Supabase client for cross-user queries"
```

---

### Task 3: Extract Shared Subscription Utilities

**Files:**
- Create: `lib/subscription-shared.ts`
- Modify: `lib/subscription.ts`

- [ ] **Step 1: Create shared utilities file**

Extract the pure functions and types (no `"use client"`, no browser Supabase import) so they can be used from both client and server code.

```typescript
// lib/subscription-shared.ts
// Shared subscription types and utilities — no "use client" directive.
// Importable from both client components and API routes.

export type Plan = "free" | "pro" | "elite";
export type SubStatus = "active" | "canceled" | "past_due" | "trialing" | "incomplete";

export interface TierLimits {
  maxTrades: number | null;
  maxAccounts: number | null;
  aiCoachMonthly: number;
  aiCoachDaily: number | null;
  hasExportCsv: boolean;
  hasCtrader: boolean;
  hasDashboardOverview: boolean;
  hasAccountComparison: boolean;
  hasCustomAlerts: boolean;
  hasPrioritySupport: boolean;
}

const TIER_LIMITS: Record<Plan, TierLimits> = {
  free: {
    maxTrades: 30,
    maxAccounts: 2,
    aiCoachMonthly: 1,
    aiCoachDaily: null,
    hasExportCsv: false,
    hasCtrader: false,
    hasDashboardOverview: false,
    hasAccountComparison: false,
    hasCustomAlerts: false,
    hasPrioritySupport: false,
  },
  pro: {
    maxTrades: null,
    maxAccounts: 5,
    aiCoachMonthly: 10,
    aiCoachDaily: null,
    hasExportCsv: true,
    hasCtrader: true,
    hasDashboardOverview: true,
    hasAccountComparison: false,
    hasCustomAlerts: false,
    hasPrioritySupport: false,
  },
  elite: {
    maxTrades: null,
    maxAccounts: null,
    aiCoachMonthly: 150,
    aiCoachDaily: 5,
    hasExportCsv: true,
    hasCtrader: true,
    hasDashboardOverview: true,
    hasAccountComparison: true,
    hasCustomAlerts: true,
    hasPrioritySupport: true,
  },
};

export function getTierLimits(plan: Plan): TierLimits {
  return TIER_LIMITS[plan];
}

export function isProOrAbove(plan: Plan): boolean {
  return plan === "pro" || plan === "elite";
}

export function isElite(plan: Plan): boolean {
  return plan === "elite";
}
```

- [ ] **Step 2: Update `lib/subscription.ts` to re-export from shared**

Replace the duplicated types, constants, and functions with re-exports. Keep `fetchMySubscription` and the `"use client"` directive since that function uses the browser Supabase client.

```typescript
"use client";

import { supabase } from "@/lib/supabase/client";

// Re-export shared types and utilities for existing consumers
export type { Plan, SubStatus, TierLimits } from "./subscription-shared";
export { getTierLimits, isProOrAbove, isElite } from "./subscription-shared";

// Use re-imported types locally via alias
import type { Plan as PlanType, SubStatus as SubStatusType } from "./subscription-shared";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan: PlanType;
  status: SubStatusType;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export async function fetchMySubscription(): Promise<SubscriptionRow | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.warn("[subscription] fetch error:", error.message);
    return null;
  }
  return data as SubscriptionRow | null;
}
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: No TypeScript errors — all existing imports of `Plan`, `getTierLimits`, etc. from `lib/subscription` still work via re-exports.

- [ ] **Step 4: Commit**

```bash
git add lib/subscription-shared.ts lib/subscription.ts
git commit -m "refactor: extract shared subscription utilities for server-side use"
```

---

### Task 4: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
npm install @anthropic-ai/sdk react-markdown remark-gfm
```

- [ ] **Step 2: Verify build still passes**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(ai-coach): add anthropic sdk, react-markdown, remark-gfm"
```

---

## Chunk 2: Data Aggregation Layer

### Task 5: Personal Trade Stats Aggregation

**Files:**
- Create: `lib/ai-stats.ts`

- [ ] **Step 1: Create the aggregation module**

This module queries `journal_trades` for the active account (last 90 days) and returns pre-aggregated stats. All aggregation is done in TypeScript — not SQL.

```typescript
import { SupabaseClient } from "@supabase/supabase-js";

export interface TradeRow {
  symbol: string;
  direction: string;
  pnl_usd: number;
  net_pnl_usd: number;
  fees_usd: number;
  opened_at: string;
  closed_at: string;
}

export interface SymbolStats {
  symbol: string;
  tradeCount: number;
  winRate: number;
  avgPnl: number;
  totalPnl: number;
}

export interface SessionStats {
  session: string;
  tradeCount: number;
  winRate: number;
}

export interface DayStats {
  day: string;
  tradeCount: number;
  winRate: number;
  avgPnl: number;
}

export interface WeeklyPnl {
  weekStart: string;
  pnl: number;
}

export interface PersonalTradeStats {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  avgRR: number;
  avgDurationMinutes: number;
  bySymbol: SymbolStats[];
  bySession: SessionStats[];
  byDay: DayStats[];
  streaks: { current: number; longestWin: number; longestLoss: number };
  weeklyPnl: WeeklyPnl[];
  recentTrades: { symbol: string; direction: string; pnl: number; date: string }[];
}

function getSession(utcHour: number): string {
  if (utcHour >= 23 || utcHour < 4) return "Tokyo";
  if (utcHour >= 7 && utcHour < 12) return "London";
  if (utcHour >= 13 && utcHour < 18) return "New York";
  return "Other";
}

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function calcStreaks(trades: TradeRow[]): { current: number; longestWin: number; longestLoss: number } {
  let current = 0;
  let longestWin = 0;
  let longestLoss = 0;
  let streak = 0;

  const sorted = [...trades].sort((a, b) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime());

  for (const t of sorted) {
    const win = t.net_pnl_usd > 0;
    if (win) {
      streak = streak > 0 ? streak + 1 : 1;
      longestWin = Math.max(longestWin, streak);
    } else {
      streak = streak < 0 ? streak - 1 : -1;
      longestLoss = Math.max(longestLoss, Math.abs(streak));
    }
  }
  current = streak;
  return { current, longestWin, longestLoss };
}

export async function getPersonalTradeStats(
  client: SupabaseClient,
  accountId: string,
  userId: string
): Promise<PersonalTradeStats | null> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: trades, error } = await client
    .from("journal_trades")
    .select("symbol, direction, pnl_usd, net_pnl_usd, fees_usd, opened_at, closed_at")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .gte("closed_at", ninetyDaysAgo.toISOString())
    .order("closed_at", { ascending: true });

  if (error || !trades || trades.length === 0) return null;

  const typedTrades = trades as TradeRow[];
  const totalTrades = typedTrades.length;
  const wins = typedTrades.filter((t) => t.net_pnl_usd > 0);
  const losses = typedTrades.filter((t) => t.net_pnl_usd <= 0);
  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

  const grossWin = wins.reduce((s, t) => s + t.net_pnl_usd, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.net_pnl_usd, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  const avgWin = wins.length > 0 ? grossWin / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

  // Average duration
  const durations = typedTrades.map((t) => {
    const open = new Date(t.opened_at).getTime();
    const close = new Date(t.closed_at).getTime();
    return (close - open) / 60000;
  });
  const avgDurationMinutes = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  // By symbol (top 5)
  const symbolMap = new Map<string, TradeRow[]>();
  for (const t of typedTrades) {
    const arr = symbolMap.get(t.symbol) || [];
    arr.push(t);
    symbolMap.set(t.symbol, arr);
  }
  const bySymbol: SymbolStats[] = Array.from(symbolMap.entries())
    .map(([symbol, tds]) => ({
      symbol,
      tradeCount: tds.length,
      winRate: (tds.filter((t) => t.net_pnl_usd > 0).length / tds.length) * 100,
      avgPnl: tds.reduce((s, t) => s + t.net_pnl_usd, 0) / tds.length,
      totalPnl: tds.reduce((s, t) => s + t.net_pnl_usd, 0),
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount)
    .slice(0, 5);

  // By session
  const sessionMap = new Map<string, TradeRow[]>();
  for (const t of typedTrades) {
    const hour = new Date(t.opened_at).getUTCHours();
    const sess = getSession(hour);
    const arr = sessionMap.get(sess) || [];
    arr.push(t);
    sessionMap.set(sess, arr);
  }
  const bySession: SessionStats[] = Array.from(sessionMap.entries())
    .map(([session, tds]) => ({
      session,
      tradeCount: tds.length,
      winRate: (tds.filter((t) => t.net_pnl_usd > 0).length / tds.length) * 100,
    }))
    .filter((s) => s.session !== "Other");

  // By day of week
  const dayMap = new Map<number, TradeRow[]>();
  for (const t of typedTrades) {
    const day = new Date(t.opened_at).getDay();
    const arr = dayMap.get(day) || [];
    arr.push(t);
    dayMap.set(day, arr);
  }
  const byDay: DayStats[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, tds]) => ({
      day: DAY_NAMES[day],
      tradeCount: tds.length,
      winRate: (tds.filter((t) => t.net_pnl_usd > 0).length / tds.length) * 100,
      avgPnl: tds.reduce((s, t) => s + t.net_pnl_usd, 0) / tds.length,
    }));

  // Weekly P&L (last 12 weeks)
  const weeklyMap = new Map<string, number>();
  for (const t of typedTrades) {
    const d = new Date(t.closed_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    weeklyMap.set(key, (weeklyMap.get(key) || 0) + t.net_pnl_usd);
  }
  const weeklyPnl: WeeklyPnl[] = Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([weekStart, pnl]) => ({ weekStart, pnl }));

  // Recent trades (last 10)
  const recentTrades = typedTrades
    .slice(-10)
    .reverse()
    .map((t) => ({
      symbol: t.symbol,
      direction: t.direction,
      pnl: t.net_pnl_usd,
      date: new Date(t.closed_at).toLocaleDateString("pt-BR"),
    }));

  const streaks = calcStreaks(typedTrades);

  return {
    totalTrades,
    winRate,
    profitFactor,
    avgRR,
    avgDurationMinutes,
    bySymbol,
    bySession,
    byDay,
    streaks,
    weeklyPnl,
    recentTrades,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/ai-stats.ts
git commit -m "feat(ai-coach): add personal trade stats aggregation"
```

---

### Task 6: Community Intelligence — Profitable Trader Sentiment

**Files:**
- Create: `lib/ai-community-stats.ts`

- [ ] **Step 1: Create the community stats module**

Uses service role client to aggregate across all users. Only includes traders with positive net P&L in last 30 days. Symbols with fewer than 5 profitable traders are omitted.

```typescript
import { createServiceRoleClient } from "@/lib/supabase/service";

export interface CommunitySymbolSentiment {
  symbol: string;
  longPct: number;
  shortPct: number;
  traderCount: number;
}

// In-memory cache: refreshed every hour
let cachedSentiment: CommunitySymbolSentiment[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getCommunityIntelligence(): Promise<CommunitySymbolSentiment[]> {
  const now = Date.now();
  if (cachedSentiment && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSentiment;
  }

  const serviceClient = createServiceRoleClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Step 1: Find profitable traders (positive net P&L in last 30 days)
  const { data: profitableRows, error: profErr } = await serviceClient
    .from("journal_trades")
    .select("user_id, net_pnl_usd")
    .gte("closed_at", thirtyDaysAgo.toISOString());

  if (profErr || !profitableRows) {
    console.warn("[community-stats] error fetching trades:", profErr?.message);
    return cachedSentiment ?? [];
  }

  // Aggregate P&L per user
  const userPnl = new Map<string, number>();
  for (const row of profitableRows as { user_id: string; net_pnl_usd: number }[]) {
    userPnl.set(row.user_id, (userPnl.get(row.user_id) || 0) + row.net_pnl_usd);
  }
  const profitableUserIds = new Set(
    Array.from(userPnl.entries())
      .filter(([, pnl]) => pnl > 0)
      .map(([uid]) => uid)
  );

  if (profitableUserIds.size < 5) {
    cachedSentiment = [];
    cacheTimestamp = now;
    return [];
  }

  // Step 2: Get last 7 days trades from profitable traders
  const { data: recentTrades, error: recErr } = await serviceClient
    .from("journal_trades")
    .select("user_id, symbol, direction")
    .gte("closed_at", sevenDaysAgo.toISOString());

  if (recErr || !recentTrades) {
    console.warn("[community-stats] error fetching recent trades:", recErr?.message);
    return cachedSentiment ?? [];
  }

  // Step 3: Aggregate sentiment per symbol (only profitable traders)
  const symbolSentiment = new Map<string, { longs: Set<string>; shorts: Set<string> }>();
  for (const t of recentTrades as { user_id: string; symbol: string; direction: string }[]) {
    if (!profitableUserIds.has(t.user_id)) continue;

    if (!symbolSentiment.has(t.symbol)) {
      symbolSentiment.set(t.symbol, { longs: new Set(), shorts: new Set() });
    }
    const entry = symbolSentiment.get(t.symbol)!;
    if (t.direction === "BUY") {
      entry.longs.add(t.user_id);
    } else {
      entry.shorts.add(t.user_id);
    }
  }

  // Step 4: Build output, filter min 5 traders, sort by trader count
  const result: CommunitySymbolSentiment[] = [];
  for (const [symbol, { longs, shorts }] of symbolSentiment) {
    const allTraders = new Set([...longs, ...shorts]);
    if (allTraders.size < 5) continue;
    const total = allTraders.size;
    result.push({
      symbol,
      longPct: Math.round((longs.size / total) * 100),
      shortPct: Math.round((shorts.size / total) * 100),
      traderCount: total,
    });
  }
  result.sort((a, b) => b.traderCount - a.traderCount);

  cachedSentiment = result.slice(0, 10);
  cacheTimestamp = now;
  return cachedSentiment;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/ai-community-stats.ts
git commit -m "feat(ai-coach): add community intelligence aggregation for profitable traders"
```

---

### Task 7: System Prompt Builder

**Files:**
- Create: `lib/ai-prompts.ts`

- [ ] **Step 1: Create the prompt builder**

Builds the system prompt by injecting all 4 data sources as structured context.

```typescript
import type { PersonalTradeStats } from "./ai-stats";
import type { CommunitySymbolSentiment } from "./ai-community-stats";

interface PromptContext {
  personalStats: PersonalTradeStats | null;
  newsHeadlines: string[];
  communitySentiment: CommunitySymbolSentiment[];
  analysisType: "session" | "weekly" | "chat";
  accountName: string;
}

const SYSTEM_BASE = `Você é um analista de mercado sênior e coach de trading da plataforma wealth.Investing.

## Sua abordagem
- Orientativo: guie o trader a pensar melhor, nunca prescreva operações
- Descritivo: descreva o que os dados mostram objetivamente
- Informativo: forneça contexto macro que enriqueça a visão do trader
- Você PODE e DEVE discordar quando a visão do trader conflita com os dados
- Fundamente toda opinião com dados: estatísticas pessoais, contexto macro, ou sentimento da plataforma
- Nunca diga "compre X" ou "venda Y" — diga "os dados sugerem..." ou "considere que..."

## Seu tom
- Profissional mas acessível, como um colega sênior
- Direto — sem enrolação, sem formalidades excessivas
- Sempre em Português (pt-BR)
- Use Markdown: headers, bullets, **negrito** para números-chave

## Regras importantes
- Nunca revele identidades ou dados individuais de outros traders
- O sentimento da plataforma é de traders lucrativos apenas — mencione isso quando citá-lo
- Se discordar do trader, seja respeitoso mas firme com dados
- Se não houver dados suficientes para uma boa análise, diga honestamente
- Se o trader pedir previsões de preço, recuse — você analisa, não prevê
- Valide seus insights com experiências passadas do trader quando possível`;

function formatPersonalStats(stats: PersonalTradeStats): string {
  const lines: string[] = [
    "## ESTATÍSTICAS PESSOAIS (últimos 90 dias)",
    "",
    \`- Total de trades: **\${stats.totalTrades}**\`,
    \`- Win rate: **\${stats.winRate.toFixed(1)}%**\`,
    \`- Profit factor: **\${stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}**\`,
    \`- RR médio: **\${stats.avgRR.toFixed(2)}**\`,
    \`- Duração média: **\${Math.round(stats.avgDurationMinutes)} min**\`,
    "",
    "### Por par (top 5)",
  ];

  for (const s of stats.bySymbol) {
    lines.push(\`- \${s.symbol}: \${s.tradeCount} trades, WR \${s.winRate.toFixed(1)}%, P&L total $\${s.totalPnl.toFixed(2)}\`);
  }

  lines.push("", "### Por sessão");
  for (const s of stats.bySession) {
    lines.push(\`- \${s.session}: \${s.tradeCount} trades, WR \${s.winRate.toFixed(1)}%\`);
  }

  lines.push("", "### Por dia da semana");
  for (const d of stats.byDay) {
    lines.push(\`- \${d.day}: \${d.tradeCount} trades, WR \${d.winRate.toFixed(1)}%, média $\${d.avgPnl.toFixed(2)}\`);
  }

  lines.push("", "### Streaks");
  lines.push(\`- Atual: \${stats.streaks.current > 0 ? \`+\${stats.streaks.current} wins\` : \`\${stats.streaks.current} losses\`}\`);
  lines.push(\`- Maior sequência de wins: \${stats.streaks.longestWin}\`);
  lines.push(\`- Maior sequência de losses: \${stats.streaks.longestLoss}\`);

  lines.push("", "### P&L semanal (últimas 12 semanas)");
  for (const w of stats.weeklyPnl) {
    lines.push(\`- \${w.weekStart}: $\${w.pnl.toFixed(2)}\`);
  }

  lines.push("", "### Últimos 10 trades");
  for (const t of stats.recentTrades) {
    lines.push(\`- \${t.date}: \${t.symbol} \${t.direction} → $\${t.pnl.toFixed(2)}\`);
  }

  return lines.join("\n");
}

function formatCommunity(sentiment: CommunitySymbolSentiment[]): string {
  if (sentiment.length === 0) return "";

  const lines = [
    "## SENTIMENTO DA PLATAFORMA (traders lucrativos, últimos 7 dias)",
    "",
  ];
  for (const s of sentiment) {
    lines.push(\`- \${s.symbol}: \${s.longPct}% long / \${s.shortPct}% short (\${s.traderCount} traders)\`);
  }
  return lines.join("\n");
}

function formatNews(headlines: string[]): string {
  if (headlines.length === 0) return "";
  const lines = ["## CONTEXTO MACRO ATUAL", ""];
  for (const h of headlines) {
    lines.push(\`- \${h}\`);
  }
  return lines.join("\n");
}

const TYPE_INSTRUCTIONS: Record<string, string> = {
  session: "O trader pediu uma análise da sessão de trading mais recente. Foque nos trades recentes, padrões imediatos, e o que melhorar na próxima sessão.",
  weekly: "O trader pediu uma análise semanal. Foque em tendências da semana, comparação com semanas anteriores, e recomendações para a próxima semana.",
  chat: "O trader está fazendo uma pergunta livre. Responda com base nos dados disponíveis.",
};

export function buildSystemPrompt(ctx: PromptContext): string {
  const parts = [SYSTEM_BASE];

  parts.push(\`\n\n## Contexto da conta: \${ctx.accountName}\`);
  parts.push(\`\n\${TYPE_INSTRUCTIONS[ctx.analysisType]}\`);

  if (ctx.personalStats) {
    parts.push(\`\n\n\${formatPersonalStats(ctx.personalStats)}\`);
  } else {
    parts.push("\n\n## ESTATÍSTICAS PESSOAIS\nNenhum trade encontrado nos últimos 90 dias para esta conta.");
  }

  const news = formatNews(ctx.newsHeadlines);
  if (news) parts.push(\`\n\n\${news}\`);

  const community = formatCommunity(ctx.communitySentiment);
  if (community) parts.push(\`\n\n\${community}\`);

  return parts.join("");
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/ai-prompts.ts
git commit -m "feat(ai-coach): add system prompt builder with 4 data sources"
```

---

## Chunk 3: API Route (Streaming)

### Task 8: Streaming API Route

**Files:**
- Create: `app/api/ai/coach/route.ts`

- [ ] **Step 1: Create the streaming API route**

```typescript
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { getTierLimits } from "@/lib/subscription-shared";
import type { Plan } from "@/lib/subscription-shared";
import { getPersonalTradeStats } from "@/lib/ai-stats";
import { getCommunityIntelligence } from "@/lib/ai-community-stats";
import { buildSystemPrompt } from "@/lib/ai-prompts";

// Lazy-init to prevent build-time crash if ANTHROPIC_API_KEY is missing
let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

// Simple per-user rate limiter (2 req/min)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 2;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  rateLimitMap.set(userId, recent);
  return true;
}

interface CoachRequestBody {
  type: "session" | "weekly" | "chat";
  messages: { role: "user" | "assistant"; content: string }[];
  account_id: string;
}

const VALID_TYPES = new Set(["session", "weekly", "chat"]);
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_TOTAL_LENGTH = 50000;

export async function POST(req: NextRequest) {
  // 1. Auth
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ ok: false, error: "Não autorizado" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const supabase = createSupabaseClientForUser(token);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
  }
  const userId = user.id;

  // 2. Parse & validate body
  let body: CoachRequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Corpo inválido" }, { status: 400 });
  }

  if (!VALID_TYPES.has(body.type)) {
    return Response.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
  }
  if (!body.account_id || typeof body.account_id !== "string") {
    return Response.json({ ok: false, error: "account_id obrigatório" }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ ok: false, error: "messages obrigatório" }, { status: 400 });
  }
  if (body.messages.length > MAX_MESSAGES) {
    return Response.json({ ok: false, error: "Muitas mensagens" }, { status: 400 });
  }

  let totalLength = 0;
  for (const msg of body.messages) {
    if (typeof msg.content !== "string" || !["user", "assistant"].includes(msg.role)) {
      return Response.json({ ok: false, error: "Formato de mensagem inválido" }, { status: 400 });
    }
    if (msg.content.length > MAX_MESSAGE_LENGTH) {
      return Response.json({ ok: false, error: "Mensagem muito longa" }, { status: 400 });
    }
    totalLength += msg.content.length;
  }
  if (totalLength > MAX_TOTAL_LENGTH) {
    return Response.json({ ok: false, error: "Conteúdo total muito longo" }, { status: 400 });
  }

  // 3. Rate limit
  if (!checkRateLimit(userId)) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  // 4. Check tier quota
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  const plan: Plan = (sub?.plan as Plan) ?? "free";
  const limits = getTierLimits(plan);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: usage } = await supabase
    .from("ai_usage")
    .select("usage_count, daily_count, daily_date")
    .eq("user_id", userId)
    .eq("month", currentMonth)
    .maybeSingle();

  const usageCount = (usage as { usage_count?: number } | null)?.usage_count ?? 0;
  const dailyCount = (usage as { daily_count?: number; daily_date?: string } | null)?.daily_count ?? 0;
  const dailyDate = (usage as { daily_date?: string } | null)?.daily_date ?? "";
  const today = new Date().toISOString().slice(0, 10);

  if (usageCount >= limits.aiCoachMonthly) {
    return Response.json({
      ok: false,
      error: "quota_exceeded",
      limit: limits.aiCoachMonthly,
      used: usageCount,
      plan,
    }, { status: 429 });
  }

  if (limits.aiCoachDaily && dailyDate === today && dailyCount >= limits.aiCoachDaily) {
    return Response.json({
      ok: false,
      error: "daily_quota_exceeded",
      dailyLimit: limits.aiCoachDaily,
      dailyUsed: dailyCount,
      plan,
    }, { status: 429 });
  }

  // 5. Optimistic increment (before calling Anthropic)
  const { error: incrError } = await supabase.rpc("increment_ai_usage", {
    p_user_id: userId,
    p_month: currentMonth,
  });
  if (incrError) {
    console.warn("[ai-coach] increment error:", incrError.message);
  }

  // 6. Fetch data sources in parallel
  // Get account name for context
  const { data: account } = await supabase
    .from("accounts")
    .select("name")
    .eq("id", body.account_id)
    .eq("user_id", userId)
    .maybeSingle();

  const accountName = (account as { name?: string } | null)?.name ?? "Conta";

  let personalStats;
  let communitySentiment;
  let newsHeadlines: string[] = [];

  try {
    [personalStats, communitySentiment] = await Promise.all([
      getPersonalTradeStats(supabase, body.account_id, userId),
      getCommunityIntelligence(),
    ]);
  } catch (err) {
    console.warn("[ai-coach] data fetch error:", err);
    personalStats = null;
    communitySentiment = [];
  }

  // Fetch news headlines (best-effort, don't block on failure)
  try {
    const newsUrl = new URL("/api/news", req.url);
    const newsRes = await fetch(newsUrl.toString());
    if (newsRes.ok) {
      const newsData = await newsRes.json();
      if (Array.isArray(newsData.articles)) {
        newsHeadlines = (newsData.articles as { title?: string }[])
          .slice(0, 5)
          .map((a) => a.title ?? "")
          .filter(Boolean);
      }
    }
  } catch {}

  // 7. Build system prompt
  const systemPrompt = buildSystemPrompt({
    personalStats,
    newsHeadlines,
    communitySentiment: communitySentiment ?? [],
    analysisType: body.type,
    accountName,
  });

  // 8. Stream from Anthropic
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messageStream = getAnthropic().messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2048,
          system: systemPrompt,
          messages: body.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        });

        for await (const event of messageStream) {
          if (event.type === "content_block_delta" && "delta" in event) {
            const delta = event.delta as { type: string; text?: string };
            if (delta.type === "text_delta" && delta.text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`)
              );
            }
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("[ai-coach] Anthropic stream error:", err);

        // Rollback usage on failure
        try {
          await supabase.rpc("decrement_ai_usage", {
            p_user_id: userId,
            p_month: currentMonth,
          });
        } catch {}

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "Erro ao gerar resposta" })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/ai/coach/route.ts
git commit -m "feat(ai-coach): add streaming API route with tier gating and 4 data sources"
```

---

## Chunk 4: Frontend Components

### Task 9: Usage Progress Bar Component

**Files:**
- Create: `components/ai/UsageBar.tsx`

- [ ] **Step 1: Create the animated usage bar**

Follows the DrawdownBar pattern from `components/prop/DrawdownBar.tsx`.

```typescript
"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

const easeApple: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface UsageBarProps {
  used: number;
  limit: number;
}

function getBarColor(pct: number): string {
  if (pct >= 80) return "#ef4444";
  if (pct >= 50) return "#f59e0b";
  return "#10b981";
}

export function UsageBar({ used, limit }: UsageBarProps) {
  const pct = useMemo(() => {
    if (limit <= 0) return 0;
    return Math.min(100, Math.max(0, (used / limit) * 100));
  }, [used, limit]);

  const barColor = useMemo(() => getBarColor(pct), [pct]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Análises usadas
        </span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: barColor }}>
          {used}/{limit} este mês
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "hsl(var(--muted))" }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: easeApple }}
          style={{ backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ai/UsageBar.tsx
git commit -m "feat(ai-coach): add animated usage progress bar component"
```

---

### Task 10: Quick Action Card Component

**Files:**
- Create: `components/ai/QuickActionCard.tsx`

- [ ] **Step 1: Create the quick action cards**

```typescript
"use client";

import type { LucideIcon } from "lucide-react";

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

export function QuickActionCard({ icon: Icon, title, description, onClick, disabled }: QuickActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-start gap-2 rounded-[22px] p-5 text-left transition-shadow hover:shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ai/QuickActionCard.tsx
git commit -m "feat(ai-coach): add quick action card component"
```

---

### Task 11: Chat Message Component

**Files:**
- Create: `components/ai/ChatMessage.tsx`

- [ ] **Step 1: Create the chat message bubble**

```typescript
"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser ? "bg-blue-600 text-white" : ""
        }`}
        style={!isUser ? { backgroundColor: "hsl(var(--card))" } : undefined}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-foreground/60 animate-pulse rounded-sm" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ai/ChatMessage.tsx
git commit -m "feat(ai-coach): add chat message component with markdown rendering"
```

---

### Task 12: Chat Input Component

**Files:**
- Create: `components/ai/ChatInput.tsx`

- [ ] **Step 1: Create the input with send button**

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div
      className="flex items-end gap-2 rounded-2xl border px-3 py-2"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Pergunte ao AI Coach..."}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
      />
      <Button
        size="icon"
        variant="ghost"
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className="shrink-0 h-8 w-8 rounded-full"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ai/ChatInput.tsx
git commit -m "feat(ai-coach): add chat input component with auto-resize"
```

---

## Chunk 5: Main Page + Navigation

### Task 13: AI Coach Page

**Files:**
- Create: `app/app/ai-coach/page.tsx`

- [ ] **Step 1: Create the main page**

```typescript
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { BarChart3, Calendar, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { useSubscription } from "@/components/context/SubscriptionContext";
import { getTierLimits } from "@/lib/subscription-shared";
import { UsageBar } from "@/components/ai/UsageBar";
import { QuickActionCard } from "@/components/ai/QuickActionCard";
import { ChatMessage } from "@/components/ai/ChatMessage";
import { ChatInput } from "@/components/ai/ChatInput";
import { supabase } from "@/lib/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  {
    type: "session" as const,
    icon: BarChart3,
    title: "Análise da sessão",
    description: "Analise seus trades mais recentes",
    prompt: "Faça uma análise da minha sessão de trading mais recente. Quais padrões você identifica e o que posso melhorar?",
  },
  {
    type: "weekly" as const,
    icon: Calendar,
    title: "Análise semanal",
    description: "Resumo e insights da sua semana",
    prompt: "Faça uma análise completa da minha semana de trading. Compare com semanas anteriores e me dê recomendações para a próxima.",
  },
  {
    type: "chat" as const,
    icon: MessageCircle,
    title: "Pergunta livre",
    description: "Pergunte qualquer coisa sobre seus trades",
    prompt: "",
  },
];

export default function AICoachPage() {
  const { activeAccountId } = useActiveAccount();
  const { plan } = useSubscription();
  const limits = getTierLimits(plan);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [analysisType, setAnalysisType] = useState<"session" | "weekly" | "chat">("chat");
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quotaExhausted = usageCount >= limits.aiCoachMonthly;

  // Load current usage
  useEffect(() => {
    async function loadUsage() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data } = await supabase
        .from("ai_usage")
        .select("usage_count")
        .eq("user_id", session.user.id)
        .eq("month", currentMonth)
        .maybeSingle();

      setUsageCount((data as { usage_count?: number } | null)?.usage_count ?? 0);
      setUsageLoaded(true);
    }
    loadUsage();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string, type?: "session" | "weekly" | "chat") => {
    if (!activeAccountId || isStreaming || quotaExhausted) return;

    const currentType = type ?? analysisType;
    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsStreaming(true);

    // Add empty assistant message for streaming
    const assistantMessage: Message = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMessage]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: "Erro: sessão expirada. Faça login novamente." };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      const response = await fetch("/api/ai/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: currentType,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          account_id: activeAccountId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Erro desconhecido" }));
        const errorMsg = err.error === "quota_exceeded"
          ? `Você atingiu o limite de ${err.limit} análises do plano ${err.plan}. Faça upgrade para continuar.`
          : err.error === "daily_quota_exceeded"
          ? `Limite diário atingido (${err.dailyLimit}/dia). Tente novamente amanhã.`
          : err.error === "rate_limited"
          ? "Aguarde um momento antes de enviar outra mensagem."
          : `Erro: ${err.error ?? "Não foi possível processar sua solicitação."}`;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: errorMsg };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: updated[updated.length - 1].content + `\n\n_Erro: ${parsed.error}_`,
                };
                return updated;
              });
            } else if (parsed.text) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: updated[updated.length - 1].content + parsed.text,
                };
                return updated;
              });
            }
          } catch {}
        }
      }

      setUsageCount((prev) => prev + 1);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // User cancelled — do nothing
      } else {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Erro ao conectar com o AI Coach. Tente novamente.",
          };
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [activeAccountId, isStreaming, quotaExhausted, messages, analysisType]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight-apple leading-tight-apple text-foreground">
          AI Coach
        </h1>
        <p className="mt-1 text-muted-foreground leading-relaxed-apple">
          Analista de mercado com seus dados, contexto macro, e sentimento da plataforma.
        </p>
      </div>

      {/* Usage bar */}
      {usageLoaded && (
        <div className="mb-6 max-w-sm">
          <UsageBar used={usageCount} limit={limits.aiCoachMonthly} />
        </div>
      )}

      {/* Quick action cards */}
      {messages.length === 0 && (
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionCard
              key={action.type}
              icon={action.icon}
              title={action.title}
              description={action.description}
              disabled={quotaExhausted || isStreaming || !activeAccountId}
              onClick={() => {
                setAnalysisType(action.type);
                if (action.prompt) {
                  sendMessage(action.prompt, action.type);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* No account selected */}
      {!activeAccountId && (
        <Card className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">
              Selecione uma conta para usar o AI Coach.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Chat area */}
      {activeAccountId && (
        <div className="flex flex-col gap-4">
          {/* Messages */}
          {messages.length > 0 && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {messages.map((msg, i) => (
                <ChatMessage
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Quota exhausted */}
          {quotaExhausted && (
            <Card className="rounded-[22px] border-amber-500/30" style={{ backgroundColor: "hsl(var(--card))" }}>
              <CardContent className="flex flex-col items-center gap-3 py-6">
                <p className="text-sm text-foreground text-center">
                  Você usou todas as {limits.aiCoachMonthly} análises do plano {plan}.
                  Faça upgrade para continuar usando o AI Coach.
                </p>
                <a
                  href="/app/pricing"
                  className="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Fazer upgrade
                </a>
              </CardContent>
            </Card>
          )}

          {/* Input */}
          <ChatInput
            onSend={(text) => sendMessage(text)}
            disabled={quotaExhausted || isStreaming || !activeAccountId}
            placeholder={isStreaming ? "Aguarde a resposta..." : "Pergunte ao AI Coach..."}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/app/ai-coach/page.tsx
git commit -m "feat(ai-coach): add main AI Coach page with streaming chat"
```

---

### Task 14: Add Navigation Link

**Files:**
- Modify: `components/layout/AppHeader.tsx`

- [ ] **Step 1: Add AI Coach to the nav links array**

In `components/layout/AppHeader.tsx`, find the `navLinks` array (around line 15) and add the AI Coach link:

```typescript
const navLinks = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/wallet", label: "Wallet" },
  { href: "/app/alerts", label: "Alerts" },
  { href: "/app/news", label: "News" },
  { href: "/app/journal", label: "Journal" },
  { href: "/app/ai-coach", label: "AI Coach" },
  { href: "/app/pricing", label: "Planos" },
];
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add components/layout/AppHeader.tsx
git commit -m "feat(ai-coach): add AI Coach link to app navigation"
```

---

### Task 15: Final Build Verification & Deploy

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Build passes with no TypeScript errors.

- [ ] **Step 2: Final commit (if any remaining changes)**

- [ ] **Step 3: Push to deploy**

```bash
git push origin main
```

Vercel auto-deploys on push.

- [ ] **Step 4: User runs SQL migration**

User must run `supabase/migrations/20260317_ai_usage.sql` in Supabase Dashboard SQL Editor.

- [ ] **Step 5: User adds `ANTHROPIC_API_KEY` to Vercel env vars**

In Vercel Dashboard → Settings → Environment Variables, add:
- `ANTHROPIC_API_KEY` = (Anthropic API key)

Redeploy after adding the env var.
