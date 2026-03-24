# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# wealth.Investing

## Commands
```bash
npm run dev      # dev server (polling enabled for Windows)
npm run build    # production build
npm run lint     # ESLint
npm run clean    # custom cleanup script
```
Deploy is automatic via Vercel on `git push` to main.

## Stack
- Next.js 14 (App Router, no Pages Router)
- TypeScript (strict)
- Tailwind CSS + shadcn/ui (Radix primitives)
- Supabase (auth + Postgres + RLS)
- Framer Motion (animations)
- Recharts (charts)
- lucide-react (icons)
- XLSX + Cheerio (MT5 report parsing)

## Architecture

### Route structure
- `/` — public landing page (spiral animation)
- `/login` — auth (signin/signup/magic link/Google OAuth)
- `/auth/callback` — OAuth + magic link handler → checks profile → `/onboarding` or `/app`
- `/onboarding` — collects display_name for new users
- `/app/**` — authenticated area, protected by client-side AuthGate
- `/api/news` — news proxy (ISR, 5min revalidate)
- `/api/webhooks/tradingview` — TradingView alert ingestion (timing-safe secret validation)
- `/api/journal/import-mt5` — MT5 trade import (XLSX/HTML, Bearer token auth, idempotent)

### Auth flow (critical — do NOT deviate)
1. AuthGate (`components/auth/AuthGate.tsx`) guards `/app/**` client-side
2. AuthGate checks session on every pathname change, refreshes token if `expires_at` is past
3. Listens for `SIGNED_OUT` event → redirects to `/login`
4. After auth check, calls `ensureDefaultAccounts(userId)` in background
5. **Auth callback** (`/auth/callback`): validates `next` param against open redirect (`startsWith("/") && !startsWith("//")`)
6. Middleware exists but is passive — auth is enforced client-side only

### Supabase client architecture
- **Browser (client components):** `@/lib/supabase/client` — singleton with anon key
- **API routes (server):** `@/lib/supabase/server` → `createSupabaseClientForUser(accessToken)` — Bearer token pattern
- **Env validation:** throws `SupabaseConfigError` if env vars are missing/invalid
- Never use service_role key on client; API routes receive JWT via Authorization header

### Account bootstrap
On first login, `ensureDefaultAccounts()` creates 4 accounts per user:
- 2 prop accounts (The5ers 100k, FTMO 110k) with `prop_accounts` rows
- 1 personal ("Pessoal"), 1 crypto ("Cripto")
- Idempotent — deduplicates by name
- Failure stored in sessionStorage → `BootstrapWarning` banner

### API route patterns
- Auth: extract Bearer token → `createSupabaseClientForUser(token)`
- Response: `{ ok: boolean, error?: string, ...data }`
- Webhooks: `crypto.timingSafeEqual()` for secret comparison
- Import MT5: dedup by `user_id + account_id + external_source + external_id`

---

## Code Conventions

### Components
- Always `"use client"` when using hooks or events
- Named exports for reusable components; default export only for `page.tsx`
- Props typed with `interface`, never inline type

### Naming
- Components: PascalCase → `JournalKpiCards.tsx`
- Hooks: `useActiveAccount`
- Utilities: camelCase → `listMyAccountsWithProp`
- Constants: `UPPER_SNAKE_CASE`

### Styling
- Tailwind classes only — no CSS modules, no styled-components
- CSS variables for colors: `hsl(var(--card))`, `hsl(var(--background))`, etc.
- **CRITICAL:** `bg-card` class alone is NOT reliable — always add `style={{ backgroundColor: "hsl(var(--card))" }}` inline
- Cards: `rounded-[22px]`, pills/buttons: `rounded-full`
- Animations: Framer Motion with `easeApple = [0.16, 1, 0.3, 1]`
- Shadows: `shadow-soft` (light) / `dark:shadow-soft-dark`
- Landing page has its own shadow tokens: `shadow-landing-card`, `shadow-landing-card-hover`

### Design tokens (tailwind.config.ts + globals.css)
- Typography: `tracking-tight-apple`, `tracking-tighter-apple`, `leading-tight-apple`, `leading-snug-apple`
- Radius: `--radius-card: 22px`, `--radius-modal: 24px`, `--radius-input: 12px`
- Font weights: `--font-weight-heading: 600`, `--font-weight-display: 700`
- Landing colors: `l-bg`, `l-elevated`, `l-text`, `l-accent`, etc.

### Visual layer hierarchy
- Layer 0: `--background` (#f5f5f7 light / #111 dark)
- Layer 1: `--card` (white / dark gray) — cards, modals, dropdowns
- BGPattern (dots) fixed on body, z-0, opacity 0.12
- Cards use `isolate` to prevent dots bleeding through

### State management
- `ActiveAccountContext`: active account persisted in localStorage (`activeAccountId`)
- `ThemeProvider`: theme persisted in localStorage (`trading-dashboard-theme`)
- No Redux, no Zustand — Context API only

### Authenticated page layout
- `mx-auto max-w-6xl px-6 py-10`
- h1: `text-2xl font-semibold tracking-tight`
- Subtitle: `text-sm text-muted-foreground`
- Cards: shadcn `<Card>` with inline style for bg

---

## Database (Supabase)

### Tables
- `profiles` → `{ user_id, display_name }`
- `accounts` → `{ id, user_id, name, kind, is_active }` (kind: prop/personal/crypto)
- `prop_accounts` → `{ account_id, firm_name, phase, starting_balance_usd, ... }`
- `journal_trades` → `{ id, account_id, user_id, symbol, direction, pnl_usd, net_pnl_usd, ... }`
- `tv_alerts` → `{ user_id, symbol, alert_type, timeframe, message, payload, created_at }`
- `prop_payouts` → `{ account_id, amount_usd, paid_at }`
- `wallet_transactions` → `{ amount_usd, tx_type, notes }`
- `ingestion_logs` → import tracking with timing and counts

### Query conventions
- Always `.maybeSingle()` for lookups that may return null (never `.single()`)
- Always `.eq("user_id", session.user.id)` for RLS
- Always check `error` before using `data`
- Account sorting: `is_active DESC` → kind (prop→personal→crypto) → `created_at ASC`
- Profile PGRST116 error = "no rows found", treat as null not error

---

## Auth Rules (NEVER violate)
- **NEVER** use `supabase.auth.signOut()` — use manual localStorage cleanup
- **NEVER** use `router.replace()` in auth flows — use `window.location.href`
- **NEVER** use `.single()` for queries that may return null
- **NEVER** expose service_role key on client
- **NEVER** commit `.env` or secrets

## Known Issues & Fixes
- `bg-card` transparent → use inline `style={{ backgroundColor }}` with HSL var
- Logout freezes → manual localStorage cleanup instead of `signOut()`
- AuthGate infinite loop → always use `getSession()` directly, never global state
- Onboarding redirect loop → `window.location.href` instead of `router.replace()`

---

## Behavior Guidelines
1. Read files before editing — never assume content
2. Check if similar component exists before creating new ones
3. Ask if intent is unclear — don't guess
4. Never install new dependencies without justifying
5. Never modify files outside the requested scope
6. Never remove existing code without confirming
7. Always type correctly — zero `any`
8. Confirm before creating/altering Supabase tables or RLS policies

---

## gstack

Use `/browse` from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available skills: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`.

---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update tasks/lessons.md with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management
1. Plan First: Write plan to tasks/todo.md with checkable items
2. Verify Plan: Check in before starting implementation
3. Track Progress: Mark items complete as you go
4. Explain Changes: High-level summary at each step
5. Document Results: Add review section to tasks/todo.md
6. Capture Lessons: Update tasks/lessons.md after corrections

## Core Principles
- Simplicity First: Make every change as simple as possible. Impact minimal code.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimal Impact: Only touch what's necessary. No side effects with new bugs.
