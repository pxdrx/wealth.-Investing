---
type: commit
sha: 496158b3e433ad962922e49380b30c4d3ad258ed
sha7: 496158b
date: "2026-04-15T02:01:33-03:00"
author: Pedro
commit_type: feat
scope: morning-briefing
files_changed: 4
insertions: 76
deletions: 29
tags: ["feat", "morning-briefing", "api", "lib"]
---

# feat(morning-briefing): guarantee delivery to every registered account

> Commit por **Pedro** em 2026-04-15T02:01:33-03:00
> 4 arquivo(s) — +76 / −29

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/cron/calendar-sync/route.ts|app/api/cron/calendar-sync/route.ts]]
- [[Sistema/Endpoints/app/api/cron/morning-briefing/route.ts|app/api/cron/morning-briefing/route.ts]]
- [[Sistema/Endpoints/app/api/cron/rates-sync/route.ts|app/api/cron/rates-sync/route.ts]]
- `lib/macro/admin-trigger.ts` [[Sistema/Arquivos/lib/macro/admin-trigger.ts|hub]]

## Mensagem

- Paginate supabase.auth.admin.listUsers (single page capped at 1000 silently dropped users above that).
- Relax email gate: skip only when !email or actively banned; unconfirmed free users now receive the briefing (provider drops bounces).
- Structured skip reasons + totalUsers/matched/eventCount telemetry.
- dry_run=true query param returns the send queue without dispatching.
- 50ms throttle between sends to respect Resend rate limit.
- Extract isAdminRequest into lib/macro/admin-trigger; calendar-sync and rates-sync now also accept admin JWT so the audit UI can force a resync.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
