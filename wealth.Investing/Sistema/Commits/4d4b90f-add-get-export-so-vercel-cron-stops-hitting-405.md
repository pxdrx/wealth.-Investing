---
type: commit
sha: 4d4b90fd9bf4d8fcf2dd2d2f6444863d5c4283a5
sha7: 4d4b90f
date: "2026-04-15T15:19:12-03:00"
author: Pedro
commit_type: fix
scope: cron
files_changed: 5
insertions: 139
deletions: 1
tags: ["fix", "cron", "api", "lib"]
---

# fix(cron): add GET export so Vercel Cron stops hitting 405

> Commit por **Pedro** em 2026-04-15T15:19:12-03:00
> 5 arquivo(s) — +139 / −1

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/admin/cron-status/route.ts|app/api/admin/cron-status/route.ts]]
- [[Sistema/Endpoints/app/api/cron/morning-briefing/route.ts|app/api/cron/morning-briefing/route.ts]]
- [[Sistema/Endpoints/app/api/cron/weekly-report/route.ts|app/api/cron/weekly-report/route.ts]]
- `lib/cron-log.ts` [[Sistema/Arquivos/lib/cron-log.ts|hub]]
- `supabase/migrations/20260415_cron_runs.sql` [[Sistema/Arquivos/supabase/migrations/20260415_cron_runs.sql|hub]]

## Mensagem

Vercel Cron dispatches GET but morning-briefing and weekly-report only
exported POST — Next.js returned 405 silently, emails never fired.
Five other cron routes already had `export { POST as GET }`; these two
were the outliers.

Also adds cron_runs table + logCronRun wrapper + admin/cron-status so
the next silent failure isn't invisible.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
