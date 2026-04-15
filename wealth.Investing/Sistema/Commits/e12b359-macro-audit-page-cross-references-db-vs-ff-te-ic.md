---
type: commit
sha: e12b3599c72df3283915e57976f6bc89e5e8791c
sha7: e12b359
date: "2026-04-15T02:02:25-03:00"
author: Pedro
commit_type: feat
scope: admin
files_changed: 6
insertions: 954
deletions: 0
tags: ["feat", "admin", "api", "route", "lib"]
---

# feat(admin): macro-audit page cross-references DB vs FF/TE/IC

> Commit por **Pedro** em 2026-04-15T02:02:25-03:00
> 6 arquivo(s) — +954 / −0

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/admin/macro-audit/route.ts|app/api/admin/macro-audit/route.ts]]
- [[Sistema/Rotas/app/app/admin/macro-audit/page.tsx|app/app/admin/macro-audit/page.tsx]]
- `lib/macro/audit/calendar-audit.ts` [[Sistema/Arquivos/lib/macro/audit/calendar-audit.ts|hub]]
- `lib/macro/audit/event-matcher.ts` [[Sistema/Arquivos/lib/macro/audit/event-matcher.ts|hub]]
- `lib/macro/audit/rates-audit.ts` [[Sistema/Arquivos/lib/macro/audit/rates-audit.ts|hub]]
- `lib/macro/audit/types.ts` [[Sistema/Arquivos/lib/macro/audit/types.ts|hub]]

## Mensagem

- lib/macro/audit/{types,event-matcher,calendar-audit,rates-audit}.ts
  Fuzzy title matcher + country normalizer across ISO-2, currency code, and TE country names. Calendar audit pulls Faireconomy + TradingEconomics + Investing.com (Apify) in parallel, compares previous/forecast/actual, recommends the value 2/3 external sources agree on. Rates audit flags mismatch (>0.001 pp), stale (>7d), and stale_change_date (>180d).
- app/api/admin/macro-audit/route.ts — admin-gated GET returns the full report; POST applies event or rate patch via service_role.
- app/app/admin/macro-audit/page.tsx — review table with per-row Apply FF/TE/IC buttons + rates grid with one-click TE-wins fix and Re-sync button.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
