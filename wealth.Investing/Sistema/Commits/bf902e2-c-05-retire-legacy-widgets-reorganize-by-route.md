---
type: commit
sha: bf902e2a3c785384b764c2a421d90ea5159b7fa7
sha7: bf902e2
date: "2026-04-20T10:04:09-03:00"
author: Pedro
commit_type: refactor
scope: app
files_changed: 11
insertions: 582
deletions: 1004
tags: ["refactor", "app", "route", "ui", "lib"]
---

# refactor(app): [C-05] retire legacy widgets, reorganize by route

> Commit por **Pedro** em 2026-04-20T10:04:09-03:00
> 11 arquivo(s) — +582 / −1004

## Sessão

[[Sistema/Sessões/2026-04-20]]

## Arquivos tocados

- [[Sistema/Rotas/app/app/backtest/page.tsx|app/app/backtest/page.tsx]]
- [[Sistema/Rotas/app/app/chart/page.tsx|app/app/chart/page.tsx]]
- [[Sistema/Rotas/app/app/journal/page.tsx|app/app/journal/page.tsx]]
- [[Sistema/Rotas/app/app/macro/page.tsx|app/app/macro/page.tsx]]
- [[Sistema/Rotas/app/app/page.tsx|app/app/page.tsx]]
- [[Sistema/Rotas/app/app/prop/page.tsx|app/app/prop/page.tsx]]
- `components/dashboard/StreaksWidget.tsx` [[Sistema/Arquivos/components/dashboard/StreaksWidget.tsx|hub]]
- `components/dashboard/TodayMatters.tsx` [[Sistema/Arquivos/components/dashboard/TodayMatters.tsx|hub]]
- `components/dashboard/TopSymbolsWidget.tsx` [[Sistema/Arquivos/components/dashboard/TopSymbolsWidget.tsx|hub]]
- `components/layout/AppSidebar.tsx` [[Sistema/Arquivos/components/layout/AppSidebar.tsx|hub]]
- `lib/app-nav.ts` [[Sistema/Arquivos/lib/app-nav.ts|hub]]

## Mensagem

Home (/app) reduced from ~1000 LOC → ~70 LOC:
- TodayMatters (now includes greeting + subtitle inside)
- DayKpis + DayTimeline (C-04, unchanged)
- SmartAlertsBanner + LiveAlertsBanner + LiveMonitoringWidget
- Everything else relocated or removed

Relocations:
- /app/journal (Visão Geral tab): + SessionHeatmap + TopSymbols + Streaks
  (PerformanceCard / MonthlyGrid / JournalBriefing are no-ops — journal
   already has CalendarPnl + MonthlyPerformanceGrid + JournalKpiCards)
- /app/prop: + AccountsOverview (top section)
- /app/macro: + MacroWidgetBriefing + MacroWidgetEvents (compact row)
- /app/chart (NEW): TradingView ticker + chart + quick asset buttons
- /app/backtest (NEW): BacktestSection w/ useDashboardData

Sidebar (C-01):
- + Gráfico + Backtest nav items (app-nav.ts)
- User-card footer now hosts StreakBadge next to display name
- Privacy toggle (Ocultar/Mostrar) moved to sidebar footer

Extractions (were inline in /app/page.tsx):
- components/dashboard/TopSymbolsWidget.tsx
- components/dashboard/StreaksWidget.tsx

Removed (AiInsightWidget / DataAccumulation / inline empty state).
Component files NOT deleted — reserved for C-11 cleanup after grep-wide
dead-code audit.

Voice copy still uses lib/greetings — TODO(A-02) to migrate to
lib/brand/voice when that ships.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
