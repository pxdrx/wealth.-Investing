---
type: commit
sha: d42c66844b2483cc6c687065e8c7302a73596102
sha7: d42c668
date: "2026-04-15T02:56:50-03:00"
author: Pedro
commit_type: feat
scope: infra
files_changed: 11
insertions: 87
deletions: 4
tags: ["feat", "infra", "api", "lib", "supabase"]
---

# feat(infra): supabase pooler URL support + distributed cron locks

> Commit por **Pedro** em 2026-04-15T02:56:50-03:00
> 11 arquivo(s) — +87 / −4

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/cron/calendar-sync-pm/route.ts|app/api/cron/calendar-sync-pm/route.ts]]
- [[Sistema/Endpoints/app/api/cron/calendar-sync/route.ts|app/api/cron/calendar-sync/route.ts]]
- [[Sistema/Endpoints/app/api/cron/headlines-sync/route.ts|app/api/cron/headlines-sync/route.ts]]
- [[Sistema/Endpoints/app/api/cron/morning-briefing/route.ts|app/api/cron/morning-briefing/route.ts]]
- [[Sistema/Endpoints/app/api/cron/narrative-update/route.ts|app/api/cron/narrative-update/route.ts]]
- [[Sistema/Endpoints/app/api/cron/rates-sync/route.ts|app/api/cron/rates-sync/route.ts]]
- [[Sistema/Endpoints/app/api/cron/weekly-briefing/route.ts|app/api/cron/weekly-briefing/route.ts]]
- [[Sistema/Endpoints/app/api/cron/weekly-report/route.ts|app/api/cron/weekly-report/route.ts]]
- `lib/cron-lock.ts` [[Sistema/Arquivos/lib/cron-lock.ts|hub]]
- `lib/supabase/env.ts` [[Sistema/Arquivos/lib/supabase/env.ts|hub]]
- `lib/supabase/server.ts` [[Sistema/Arquivos/lib/supabase/server.ts|hub]]

## Mensagem

Two capacity fixes for the partnership launch (~2.5k concurrent users):

1. getSupabaseConfig() exposes SUPABASE_POOLER_URL; server-side clients prefer
   it over the direct URL. No-op when unset. Client-side (realtime) keeps the
   direct URL because PgBouncer breaks subscriptions.

2. acquireCronLock() (Redis SET NX EX) guards every /api/cron/* route against
   Vercel double-invocation. Admin-triggered runs and ?test_email/?force bypass
   the lock so manual retests always execute. Fails open if Redis is missing.
