---
type: commit
sha: 721fe5387e3090ad46e154d17d4e777ecf38f935
sha7: 721fe53
date: "2026-03-28T13:31:56-03:00"
author: Pedro
commit_type: fix
scope: audit
files_changed: 28
insertions: 308
deletions: 61
tags: ["fix", "audit", "api", "route", "ui", "lib"]
---

# fix(audit): resolve HIGH+MEDIUM security and technical findings

> Commit por **Pedro** em 2026-03-28T13:31:56-03:00
> 28 arquivo(s) — +308 / −61

## Sessão

[[Sistema/Sessões/2026-03-28]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/account/delete/route.ts|app/api/account/delete/route.ts]]
- [[Sistema/Endpoints/app/api/billing/verify-session/route.ts|app/api/billing/verify-session/route.ts]]
- [[Sistema/Endpoints/app/api/cron/calendar-sync-pm/route.ts|app/api/cron/calendar-sync-pm/route.ts]]
- [[Sistema/Endpoints/app/api/cron/calendar-sync/route.ts|app/api/cron/calendar-sync/route.ts]]
- [[Sistema/Endpoints/app/api/cron/headlines-sync/route.ts|app/api/cron/headlines-sync/route.ts]]
- [[Sistema/Endpoints/app/api/cron/narrative-update/route.ts|app/api/cron/narrative-update/route.ts]]
- [[Sistema/Endpoints/app/api/cron/rates-sync/route.ts|app/api/cron/rates-sync/route.ts]]
- [[Sistema/Endpoints/app/api/journal/import-mt5/route.ts|app/api/journal/import-mt5/route.ts]]
- [[Sistema/Endpoints/app/api/macro/alerts/route.ts|app/api/macro/alerts/route.ts]]
- [[Sistema/Endpoints/app/api/macro/calendar/route.ts|app/api/macro/calendar/route.ts]]
- [[Sistema/Endpoints/app/api/macro/compare/route.ts|app/api/macro/compare/route.ts]]
- [[Sistema/Endpoints/app/api/macro/headlines/route.ts|app/api/macro/headlines/route.ts]]
- [[Sistema/Endpoints/app/api/macro/history/route.ts|app/api/macro/history/route.ts]]
- [[Sistema/Endpoints/app/api/macro/panorama/route.ts|app/api/macro/panorama/route.ts]]
- [[Sistema/Endpoints/app/api/macro/rates/route.ts|app/api/macro/rates/route.ts]]
- [[Sistema/Endpoints/app/api/macro/refresh-calendar/route.ts|app/api/macro/refresh-calendar/route.ts]]
- [[Sistema/Endpoints/app/api/macro/refresh-rates/route.ts|app/api/macro/refresh-rates/route.ts]]
- [[Sistema/Endpoints/app/api/macro/regenerate-report/route.ts|app/api/macro/regenerate-report/route.ts]]
- [[Sistema/Rotas/app/app/subscription/success/page.tsx|app/app/subscription/success/page.tsx]]
- `components/account/AddAccountModal.tsx` [[Sistema/Arquivos/components/account/AddAccountModal.tsx|hub]]
- `components/account/ManageAccountsModal.tsx` [[Sistema/Arquivos/components/account/ManageAccountsModal.tsx|hub]]
- `components/journal/TradeDetailModal.tsx` [[Sistema/Arquivos/components/journal/TradeDetailModal.tsx|hub]]
- `lib/analyst/tools/finance/alpha-vantage.ts` [[Sistema/Arquivos/lib/analyst/tools/finance/alpha-vantage.ts|hub]]
- `lib/analyst/tools/finance/finnhub.ts` [[Sistema/Arquivos/lib/analyst/tools/finance/finnhub.ts|hub]]
- `lib/bootstrap/ensureDefaultAccounts.ts` [[Sistema/Arquivos/lib/bootstrap/ensureDefaultAccounts.ts|hub]]
- `lib/trade-analytics.ts` [[Sistema/Arquivos/lib/trade-analytics.ts|hub]]
- `sentry.client.config.ts` [[Sistema/Arquivos/sentry.client.config.ts|hub]]
- `supabase/migrations/20260328_prop_alerts_rls.sql` [[Sistema/Arquivos/supabase/migrations/20260328_prop_alerts_rls.sql|hub]]
