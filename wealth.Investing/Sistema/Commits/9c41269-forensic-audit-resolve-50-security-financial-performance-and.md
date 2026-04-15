---
type: commit
sha: 9c41269e0551d78e2b839a5ae38ee9a4903700ee
sha7: 9c41269
date: "2026-03-28T00:49:20-03:00"
author: Pedro
commit_type: fix
scope: 
files_changed: 56
insertions: 519
deletions: 315
tags: ["fix", "api", "route", "ui", "lib"]
---

# fix: forensic audit — resolve 50+ security, financial, performance and UX issues

> Commit por **Pedro** em 2026-03-28T00:49:20-03:00
> 56 arquivo(s) — +519 / −315

## Sessão

[[Sistema/Sessões/2026-03-28]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/account/delete/route.ts|app/api/account/delete/route.ts]]
- [[Sistema/Endpoints/app/api/ai/conversations/route.ts|app/api/ai/conversations/route.ts]]
- [[Sistema/Endpoints/app/api/analyst/history/route.ts|app/api/analyst/history/route.ts]]
- [[Sistema/Endpoints/app/api/analyst/run/route.ts|app/api/analyst/run/route.ts]]
- [[Sistema/Endpoints/app/api/billing/checkout/route.ts|app/api/billing/checkout/route.ts]]
- [[Sistema/Endpoints/app/api/cron/calendar-sync-pm/route.ts|app/api/cron/calendar-sync-pm/route.ts]]
- [[Sistema/Endpoints/app/api/cron/calendar-sync/route.ts|app/api/cron/calendar-sync/route.ts]]
- [[Sistema/Endpoints/app/api/cron/headlines-sync/route.ts|app/api/cron/headlines-sync/route.ts]]
- [[Sistema/Endpoints/app/api/cron/narrative-update/route.ts|app/api/cron/narrative-update/route.ts]]
- [[Sistema/Endpoints/app/api/cron/rates-sync/route.ts|app/api/cron/rates-sync/route.ts]]
- [[Sistema/Endpoints/app/api/cron/weekly-briefing/route.ts|app/api/cron/weekly-briefing/route.ts]]
- [[Sistema/Endpoints/app/api/macro/alerts/route.ts|app/api/macro/alerts/route.ts]]
- [[Sistema/Endpoints/app/api/macro/calendar/route.ts|app/api/macro/calendar/route.ts]]
- [[Sistema/Endpoints/app/api/macro/check-rate-update/route.ts|app/api/macro/check-rate-update/route.ts]]
- [[Sistema/Endpoints/app/api/macro/compare/route.ts|app/api/macro/compare/route.ts]]
- [[Sistema/Endpoints/app/api/macro/headlines/route.ts|app/api/macro/headlines/route.ts]]
- [[Sistema/Endpoints/app/api/macro/history/route.ts|app/api/macro/history/route.ts]]
- [[Sistema/Endpoints/app/api/macro/panorama/route.ts|app/api/macro/panorama/route.ts]]
- [[Sistema/Endpoints/app/api/macro/rates/route.ts|app/api/macro/rates/route.ts]]
- [[Sistema/Endpoints/app/api/macro/refresh-calendar/route.ts|app/api/macro/refresh-calendar/route.ts]]
- [[Sistema/Endpoints/app/api/macro/refresh-rates/route.ts|app/api/macro/refresh-rates/route.ts]]
- [[Sistema/Endpoints/app/api/macro/regenerate-report/route.ts|app/api/macro/regenerate-report/route.ts]]
- [[Sistema/Endpoints/app/api/webhooks/stripe/route.ts|app/api/webhooks/stripe/route.ts]]
- [[Sistema/Rotas/app/app/account/page.tsx|app/app/account/page.tsx]]
- [[Sistema/Rotas/app/app/ai-coach/page.tsx|app/app/ai-coach/page.tsx]]
- [[Sistema/Rotas/app/app/analyst/page.tsx|app/app/analyst/page.tsx]]
- [[Sistema/Rotas/app/app/journal/page.tsx|app/app/journal/page.tsx]]
- `app/app/layout.tsx` [[Sistema/Arquivos/app/app/layout.tsx|hub]]
- [[Sistema/Rotas/app/app/macro/page.tsx|app/app/macro/page.tsx]]
- [[Sistema/Rotas/app/app/page.tsx|app/app/page.tsx]]
- [[Sistema/Rotas/app/app/prop/page.tsx|app/app/prop/page.tsx]]
- `app/globals.css` [[Sistema/Arquivos/app/globals.css|hub]]
- [[Sistema/Rotas/app/login/page.tsx|app/login/page.tsx]]
- [[Sistema/Rotas/app/onboarding/page.tsx|app/onboarding/page.tsx]]
- `components/auth/AuthGate.tsx` [[Sistema/Arquivos/components/auth/AuthGate.tsx|hub]]
- `components/context/ActiveAccountContext.tsx` [[Sistema/Arquivos/components/context/ActiveAccountContext.tsx|hub]]
- `components/context/PrivacyContext.tsx` [[Sistema/Arquivos/components/context/PrivacyContext.tsx|hub]]
- `components/context/SubscriptionContext.tsx` [[Sistema/Arquivos/components/context/SubscriptionContext.tsx|hub]]
- `components/dashboard/AccountsOverview.tsx` [[Sistema/Arquivos/components/dashboard/AccountsOverview.tsx|hub]]
- `components/dashboard/BacktestSection.tsx` [[Sistema/Arquivos/components/dashboard/BacktestSection.tsx|hub]]
- `components/dashboard/JournalBriefing.tsx` [[Sistema/Arquivos/components/dashboard/JournalBriefing.tsx|hub]]
- `components/journal/AddTradeModal.tsx` [[Sistema/Arquivos/components/journal/AddTradeModal.tsx|hub]]
- `components/journal/JournalTradesTable.tsx` [[Sistema/Arquivos/components/journal/JournalTradesTable.tsx|hub]]
- `components/layout/AppHeader.tsx` [[Sistema/Arquivos/components/layout/AppHeader.tsx|hub]]
- `components/macro/MacroWidgetBriefing.tsx` [[Sistema/Arquivos/components/macro/MacroWidgetBriefing.tsx|hub]]
- `lib/analyst/tools/finance/alpha-vantage.ts` [[Sistema/Arquivos/lib/analyst/tools/finance/alpha-vantage.ts|hub]]
- `lib/ctrader-parser.ts` [[Sistema/Arquivos/lib/ctrader-parser.ts|hub]]
- `lib/env.ts` [[Sistema/Arquivos/lib/env.ts|hub]]
- `lib/macro/narrative-generator.ts` [[Sistema/Arquivos/lib/macro/narrative-generator.ts|hub]]
- `lib/mt5-html-parser.ts` [[Sistema/Arquivos/lib/mt5-html-parser.ts|hub]]
