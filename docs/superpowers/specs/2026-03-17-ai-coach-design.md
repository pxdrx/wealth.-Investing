# AI Coach — Phase 2 Design Spec

**Status:** APPROVED
**Date:** 2026-03-17
**Decisions:** Page-based UX, streaming responses, session-only history, Haiku 4.5, inline tier gating

---

## 1. Overview

Dedicated page `/app/ai-coach` providing AI-powered trading analysis. The Coach acts as a senior market analyst — orientative, descriptive, informative. It combines four data sources: trader's personal metrics, macroeconomic context, platform community intelligence (profitable traders only), and historical pattern matching.

The Coach can and should disagree with the trader when data suggests their view is incorrect, always backing disagreement with data + macro context.

---

## 2. UX Design

### Page Layout
- Route: `/app/ai-coach`
- Standard app layout: `mx-auto max-w-6xl px-6 py-10`
- Header: "AI Coach" title + animated usage progress bar ("3/10 este mês")
- Quick action cards row: "Análise da sessão", "Análise semanal", "Pergunta livre"
- Chat area below with message history (session-scoped)
- Text input at bottom with send button
- Responses streamed word-by-word, rendered as Markdown

### Usage Progress Bar
- Framer Motion animated bar (easeApple curve)
- Color: green (<50% used), yellow (50-80%), red (>80%)
- Label: "3/10 análises usadas este mês"
- Reuses DrawdownBar color logic pattern

### Quick Action Cards
- 3 cards in a row (grid sm:grid-cols-3)
- Each card: icon + title + 1-line description
- Click auto-sends a pre-built prompt for that analysis type
- Cards: rounded-[22px], bg inline style hsl(var(--card))

### Tier Gating (quota exhausted)
- Input becomes disabled
- Card appears above input: "Você usou todas as análises do plano Free. Faça upgrade para Pro e tenha 10 análises/mês"
- "Fazer upgrade" button → `/app/pricing`
- No modal, no blur tricks — honest inline messaging

### Chat Messages
- User messages: right-aligned, accent background
- Coach messages: left-aligned, card background, Markdown rendered
- Streaming: text accumulates progressively in the coach message bubble
- Skeleton pulse animation while waiting for first token

### Session History
- Messages stored in useState array
- Follow-ups include previous messages in context (conversation memory within session)
- Closing/navigating away clears history
- No database persistence for MVP

---

## 3. Architecture

### API Route: `POST /api/ai/coach`

**Request:**
```typescript
{
  type: "session" | "weekly" | "chat";
  messages: { role: "user" | "assistant"; content: string }[];
  account_id: string;
}
```

**Response:** `ReadableStream` (Server-Sent Events)

**Input validation:**
- Max 20 messages in the array
- Max 4000 characters per user message
- Max 50000 total characters across all messages
- Validate server-side before calling Anthropic

**Flow:**
1. Extract Bearer token → `createSupabaseClientForUser(token)`
2. Get user session, validate auth
3. Validate input (message count, length limits)
4. Query `ai_usage` → check tier quota (monthly + daily for Elite)
5. **Optimistic increment:** call `increment_ai_usage` RPC *before* calling Anthropic (prevents race conditions and mid-stream abandonment abuse)
6. Fetch in parallel:
   - Personal trade stats (last 90 days, active account)
   - News headlines (from existing `/api/news` or direct query)
   - Community intelligence (profitable traders' sentiment, via service role client)
7. Build system prompt with all 4 data sources
8. Call Anthropic SDK with streaming (`stream: true`, model: `claude-haiku-4-5-20251001`)
9. Pipe response as SSE to client
10. If Anthropic call fails: decrement usage count (rollback)

**Rate limiting:**
- Max 2 requests per minute per user (simple in-memory throttle)
- Prevents rapid spam even within quota

**Error handling:**
- Auth failure: 401
- Quota exceeded: 429 with `{ error: "quota_exceeded", limit: 10, used: 10, plan: "pro" }`
- Rate limited: 429 with `{ error: "rate_limited" }`
- Input too large: 400 with `{ error: "input_too_large" }`
- Anthropic API error: 502 with generic message (rollback usage count)
- No trades found: return helpful message suggesting to import trades first

### Streaming Implementation

**Server (API route):**
```typescript
const stream = new ReadableStream({
  async start(controller) {
    const response = await anthropic.messages.stream({...});
    for await (const event of response) {
      if (event.type === 'content_block_delta') {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event.delta)}\n\n`));
      }
    }
    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    controller.close();
  }
});
return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  }
});
```

**Client:**
```typescript
const controller = new AbortController();
const response = await fetch('/api/ai/coach', {
  method: 'POST', body, headers,
  signal: controller.signal  // allows cancellation
});
const reader = response.body.getReader();
// Read chunks, parse SSE, accumulate text in setState
// On unmount or "stop generating": controller.abort()
```

---

## 4. Data Sources

### 4.1 Personal Trade Stats (`lib/ai-stats.ts`)

Pre-aggregated metrics for the active account (last 90 days):

- **Overall:** total trades, win rate, profit factor, avg RR, avg duration
- **By symbol:** top 5 pairs by volume, win rate + avg P&L each
- **By session:** London (07-12 UTC), New York (13-18 UTC), Tokyo (23-04 UTC), win rate each
- **By day of week:** win rate + avg P&L per weekday
- **Streaks:** current streak, longest win streak, longest loss streak
- **Weekly P&L:** last 12 weeks trend
- **Recent trades:** last 10 trades (symbol, direction, P&L, date) for immediate context

Query: `journal_trades` filtered by `account_id`, `user_id`, last 90 days. Aggregation done in TypeScript (not SQL) to keep it simple.

### 4.2 Macro Context

Reuse existing news infrastructure:
- Query recent headlines from the news API (or cached data)
- Extract: top 5 most relevant headlines for trader's active instruments
- Include: upcoming economic events if available (FOMC, NFP, CPI dates)
- Injected as a "Contexto macro atual" section in the system prompt

### 4.3 Community Intelligence (`lib/ai-community-stats.ts`)

Aggregated sentiment from profitable traders across the platform:

- **Profitable trader filter:** net_pnl_usd > 0 over last 30 days (per user, across all accounts)
- **Aggregation:** for each of the top 10 most-traded symbols:
  - % of profitable traders going long vs short (based on last 7 days of trades)
  - Total number of profitable traders with positions
- **Output example:** `{ symbol: "EURUSD", longPct: 68, shortPct: 32, traderCount: 45 }`
- **Query:** server-side with service role client (`lib/supabase/service.ts` — new utility, never importable from client code)
- **Cache:** 1 hour in-memory or via ISR-style caching (not real-time)
- **Privacy:** never expose individual trader data. Symbols with fewer than 5 profitable traders are omitted entirely from the data.

### 4.4 Historical Pattern Matching

Cross-reference trader's performance with recurring conditions:
- "In the last 4 NFP weeks, your XAUUSD win rate was 75% vs 54% normal"
- Built from personal stats + macro calendar
- Not a separate data source — derived by the AI from sources 4.1 + 4.2

---

## 5. System Prompt Design

```
You are a senior market analyst and trading coach for the wealth.Investing platform.

## Your approach
- Orientative: guide the trader to think better, never prescribe trades
- Descriptive: describe what the data shows objectively
- Informative: provide macro context that enriches the trader's view
- You CAN and SHOULD disagree when the trader's view conflicts with data
- Back every opinion with data: personal stats, macro context, or platform sentiment
- Never say "buy X" or "sell Y" — say "the data suggests..." or "consider that..."

## Your tone
- Professional but approachable, like a senior colleague
- Direct — no filler, no excessive pleasantries
- Always in Portuguese (pt-BR)
- Use Markdown: headers, bullets, bold for key numbers

## Data sources available to you
1. PERSONAL STATS: [injected metrics]
2. MACRO CONTEXT: [injected headlines + events]
3. PLATFORM SENTIMENT: [injected community intelligence]

## Important rules
- Never reveal other traders' identities or individual data
- Platform sentiment is from profitable traders only — mention this when citing it
- If you disagree with the trader, be respectful but firm with data backing
- If there's insufficient data to give good analysis, say so honestly
- If the trader asks you to predict prices, decline — you analyze, not predict
```

---

## 6. Database

### Table: `ai_usage`

```sql
CREATE TABLE ai_usage (
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  month TEXT NOT NULL, -- '2026-03'
  usage_count INT DEFAULT 0,
  daily_count INT DEFAULT 0,
  daily_date DATE DEFAULT CURRENT_DATE,
  last_used_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, month)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON ai_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own usage" ON ai_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON ai_usage
  FOR UPDATE USING (auth.uid() = user_id);
```

### Usage tracking logic

```typescript
// Increment usage (called after successful AI response)
await supabase.rpc('increment_ai_usage', { p_user_id: userId, p_month: '2026-03' });
```

RPC function for atomic increment (handles both monthly and daily counts):
```sql
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
```

RPC function for rollback on Anthropic API failure:
```sql
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

---

## 7. Tier Limits

Already defined in `lib/subscription.ts` → `TierLimits`:

| Tier | Monthly limit | Daily limit |
|------|--------------|-------------|
| Free | 1 | — |
| Pro | 10 | — |
| Elite | 150 | 5 |

Validation on API route (server-side, not client-only):
1. Query `ai_usage` for current month (includes `daily_count` and `daily_date`)
2. Query `subscriptions` for current plan (use shared utility from `lib/subscription-shared.ts`)
3. If `usage_count >= tierLimit`: return 429
4. For Elite: if `daily_date == today && daily_count >= 5`: return 429

---

## 8. Dependencies

### New packages
- `@anthropic-ai/sdk` — official Anthropic client for Claude API
- `react-markdown` — render Markdown responses
- `remark-gfm` — GitHub Flavored Markdown support (tables, strikethrough)

### Environment variables
- `ANTHROPIC_API_KEY` — Anthropic API key (server-side only, never exposed to client)
- `SUPABASE_SERVICE_ROLE_KEY` — already in .env.local, needed for community intelligence queries

### Infrastructure
- `lib/supabase/service.ts` — new utility: `createServiceRoleClient()` for cross-user queries (server-only, never importable from client)
- `lib/subscription-shared.ts` — extracted pure utilities (`getTierLimits`, `isProOrAbove`) without `"use client"` directive, importable from both client and server

### Cost Estimates
- System prompt + trade data + community stats + conversation: ~3000-5000 input tokens/request
- Haiku 4.5 pricing: ~$0.25/MTok input, ~$1.25/MTok output
- Per request: ~$0.005-0.01
- Pro user (10/month): ~$0.05-0.10/user/month
- Elite user (150/month max): ~$0.75-1.50/user/month
- Margin: >96% at all tiers

---

## 9. File Structure

```
app/app/ai-coach/page.tsx           — main page component
app/api/ai/coach/route.ts           — streaming API route
lib/ai-stats.ts                     — personal trade data aggregation
lib/ai-community-stats.ts           — cross-platform profitable trader sentiment
lib/ai-prompts.ts                   — system prompt builder
lib/supabase/service.ts             — service role client (server-only)
lib/subscription-shared.ts          — shared tier utilities (no "use client")
components/ai/UsageBar.tsx           — animated usage progress bar
components/ai/QuickActionCard.tsx    — action cards (session/weekly/chat)
components/ai/ChatMessage.tsx        — message bubble (user + assistant)
components/ai/ChatInput.tsx          — input with send button + disabled state
supabase/migrations/YYYYMMDD_ai_usage.sql — migration
```

---

## 10. Non-goals (MVP)

- No voice input/output
- No image/chart generation in responses
- No conversation persistence beyond session
- No push notifications for weekly analysis
- No auto-generated analysis (always user-initiated)
- No multi-account analysis in single query (one account at a time)
