---
type: commit
sha: 1d00f75c55c0d16ba79133556524efe3bdaafd9c
sha7: 1d00f75
date: "2026-04-15T02:07:14-03:00"
author: Pedro
commit_type: fix
scope: pre-launch
files_changed: 7
insertions: 194
deletions: 54
tags: ["fix", "pre-launch", "api", "route", "ui", "lib"]
---

# fix(pre-launch): billing, calendar, reports, ai-coach hardening

> Commit por **Pedro** em 2026-04-15T02:07:14-03:00
> 7 arquivo(s) — +194 / −54

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/billing/portal/route.ts|app/api/billing/portal/route.ts]]
- [[Sistema/Rotas/app/app/ai-coach/page.tsx|app/app/ai-coach/page.tsx]]
- `components/billing/PricingCards.tsx` [[Sistema/Arquivos/components/billing/PricingCards.tsx|hub]]
- `components/journal/DayDetailModal.tsx` [[Sistema/Arquivos/components/journal/DayDetailModal.tsx|hub]]
- `components/journal/JournalReports.tsx` [[Sistema/Arquivos/components/journal/JournalReports.tsx|hub]]
- `components/journal/PnlCalendar.tsx` [[Sistema/Arquivos/components/journal/PnlCalendar.tsx|hub]]
- `lib/trading/forex-day.ts` [[Sistema/Arquivos/lib/trading/forex-day.ts|hub]]

## Mensagem

- PricingCards: remove downgrade, use score-based logic (annual > monthly);
  show "Seu plano é superior" for lower-ranked cards
- /api/billing/portal: runtime=nodejs, env validation, Stripe-specific errors
  (portal inactive, db, network) with actionable messages; dev debug field
- Calendar timezone: align PnlCalendar fetch and DayDetailModal bounds with
  forex-day (17:00 ET) so indicator and expand show the same trades;
  add forexDayBoundsUtc() and forexMonthBoundsUtc() helpers
- JournalReports: safeGetSession, cancelled flag, 10s query timeout, 5000 cap
  to fix infinite loading on /app/journal Relatórios tab
- AI Coach: AbortSignal.timeout(12s) on conversations GET/POST; bounded
  getSession in loadUsage

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
