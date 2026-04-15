---
type: commit
sha: a6e3456c56627a606a9d2503f193c1d8a8dffa34
sha7: a6e3456
date: "2026-04-14T16:41:02-03:00"
author: Pedro
commit_type: feat
scope: alerts
files_changed: 4
insertions: 287
deletions: 16
tags: ["feat", "alerts", "api", "ui", "lib"]
---

# feat(alerts): persist smart alert dismissals server-side with reincidence signatures

> Commit por **Pedro** em 2026-04-14T16:41:02-03:00
> 4 arquivo(s) — +287 / −16

## Sessão

[[Sistema/Sessões/2026-04-14]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/smart-alerts/dismissals/route.ts|app/api/smart-alerts/dismissals/route.ts]]
- `components/dashboard/SmartAlertsBanner.tsx` [[Sistema/Arquivos/components/dashboard/SmartAlertsBanner.tsx|hub]]
- `lib/smart-alerts.ts` [[Sistema/Arquivos/lib/smart-alerts.ts|hub]]
- `supabase/migrations/20260414_smart_alert_dismissals.sql` [[Sistema/Arquivos/supabase/migrations/20260414_smart_alert_dismissals.sql|hub]]

## Mensagem

Smart alerts dismissed in one browser used to reappear in next session/device
because state was localStorage-only. Now persisted in smart_alert_dismissals
table with (alert_id, alert_signature) composite key.

Signature formulas encode "the same problem":
- streak:N          → reappears when streak count grows
- toxic:SYMBOL:date → reappears next day
- time:slot:isoWeek → reappears next week
- dd:date:severity  → reappears next day
- over:date:severity → reappears next day

POST is upsert (idempotent), GET filters last 30 days. localStorage kept as
optimistic cache with graceful offline degrade.

Migration NOT yet applied to remote DB — needs supabase db push.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
